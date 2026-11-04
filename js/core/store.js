// Capa de datos: caché en memoria + IndexedDB + historial + cola de sincronización (outbox).
import { idb, openDB } from './db.js';
import { TABLES } from './schema.js';
import { uid, nowISO, clone } from './utils.js';
import { emit } from './events.js';

const cache = Object.fromEntries(Object.keys(TABLES).map((t) => [t, new Map()]));
const outbox = new Map(); // key `${table}:${id}` -> op
const HISTORY_MAX_CHARS = 40000;
const lastHist = new Map();

export function deviceId() {
  let d = null;
  try { d = localStorage.getItem('cs.device'); } catch { /* sin almacenamiento */ }
  if (!d) { d = uid('DEV'); try { localStorage.setItem('cs.device', d); } catch { /* */ } }
  return d;
}

let readyPromise;
export function initStore() {
  if (readyPromise) return readyPromise;
  readyPromise = (async () => {
    await openDB();
    await Promise.all(Object.keys(TABLES).map(async (t) => {
      const rows = await idb.getAll(t);
      rows.forEach((r) => cache[t].set(r.id, r));
    }));
    (await idb.getAll('outbox')).forEach((op) => outbox.set(op.opId, op));
  })();
  return readyPromise;
}

function assertTable(t) { if (!TABLES[t]) throw new Error(`Tabla desconocida: ${t}`); }

export const store = {
  all(table, { brandId, deleted = false } = {}) {
    assertTable(table);
    let rows = [...cache[table].values()];
    rows = rows.filter((r) => (deleted ? !!r.deletedAt : !r.deletedAt));
    if (brandId && brandId !== 'all' && table !== 'brands') rows = rows.filter((r) => r.brandId === brandId);
    return rows;
  },
  get(table, id) { assertTable(table); const r = cache[table].get(id); return r && !r.deletedAt ? r : null; },
  getAny(table, id) { return cache[table].get(id) || null; },
  find(table, pred, opts) { return store.all(table, opts).find(pred) || null; },
  filter(table, pred, opts) { return store.all(table, opts).filter(pred); },

  async create(table, data = {}, { silent = false } = {}) {
    assertTable(table);
    const ts = nowISO();
    const rec = {
      ...data,
      id: data.id || uid(TABLES[table].prefix),
      brandId: table === 'brands' ? (data.id || null) : data.brandId,
      createdAt: data.createdAt || ts, updatedAt: ts, deletedAt: data.deletedAt || null,
      version: 1, updatedBy: deviceId(),
    };
    if (table === 'brands') rec.brandId = rec.id;
    if (table !== 'brands' && !rec.brandId) throw new Error('Falta la marca (brandId).');
    await persist(table, rec, null, 'create', silent);
    return rec;
  },

  async update(table, id, patch, { silent = false, summary } = {}) {
    assertTable(table);
    const before = cache[table].get(id);
    if (!before) throw new Error(`No existe ${table}/${id}`);
    const next = typeof patch === 'function' ? patch(clone(before)) : { ...clone(before), ...patch };
    next.id = before.id; next.createdAt = before.createdAt;
    next.updatedAt = nowISO(); next.version = (before.version || 0) + 1; next.updatedBy = deviceId();
    await persist(table, next, before, 'update', silent, summary);
    return next;
  },

  async remove(table, id) { return store.update(table, id, { deletedAt: nowISO() }, { summary: 'Enviado a la papelera' }); },
  async restore(table, id) { return store.update(table, id, { deletedAt: null }, { summary: 'Restaurado' }); },
  // Borrado definitivo: solo local y solo desde la papelera. En Sheets permanece como eliminación lógica.
  async purge(table, id) {
    const r = cache[table].get(id);
    if (!r?.deletedAt) throw new Error('Solo se pueden borrar definitivamente elementos de la papelera.');
    cache[table].delete(id);
    await idb.del(table, id);
    emit(`change:${table}`, { id, action: 'purge' }); emit('change', { table, id });
  },

  trash() {
    return Object.keys(TABLES).filter((t) => t !== 'history')
      .flatMap((t) => store.all(t, { deleted: true }).map((r) => ({ table: t, record: r })))
      .sort((a, b) => b.record.deletedAt.localeCompare(a.record.deletedAt));
  },

  historyFor(recordId) {
    return [...cache.history.values()].filter((h) => h.recordId === recordId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async revert(historyId) {
    const h = cache.history.get(historyId);
    if (!h?.before) throw new Error('Esta entrada no tiene una versión anterior completa.');
    const snapshot = typeof h.before === 'string' ? JSON.parse(h.before) : h.before;
    const { id, createdAt, version, ...rest } = snapshot;
    return store.update(h.table, h.recordId, (cur) => ({ ...cur, ...rest }), { summary: `Restaurada versión del ${h.createdAt.slice(0, 16).replace('T', ' ')}` });
  },

  // --- Sincronización ---
  pendingOps() { return [...outbox.values()].sort((a, b) => a.ts.localeCompare(b.ts)); },
  pendingCount() { return outbox.size; },
  async ackOps(keys, serverMeta = {}) {
    keys.forEach((k) => outbox.delete(k));
    await idb.writeAtomic(keys.map((k) => ({ store: 'outbox', delete: true, key: k })));
    emit('outbox', outbox.size);
    if (serverMeta.touched) emit('change', { remote: true });
  },
  // Aplica un registro remoto sin generar operación pendiente.
  async applyRemote(table, rec) {
    if (!TABLES[table]) return false;
    const key = `${table}:${rec.id}`;
    if (outbox.has(key)) return false; // hay cambios locales sin subir: lo resolverá el servidor como conflicto
    const local = cache[table].get(rec.id);
    if (local && (local.version || 0) > (rec.version || 0)) return false;
    const merged = { ...rec };
    (TABLES[table].localOnly || []).forEach((f) => { if (local?.[f] != null) merged[f] = local[f]; });
    cache[table].set(rec.id, merged);
    await idb.put(table, merged);
    return true;
  },
  async replaceLocal(table, rec, { requeue = false, baseVersion } = {}) {
    cache[table].set(rec.id, rec);
    const entries = [{ store: table, value: rec }];
    const key = `${table}:${rec.id}`;
    if (requeue) {
      const op = { opId: key, table, id: rec.id, baseVersion, ts: nowISO() };
      outbox.set(key, op); entries.push({ store: 'outbox', value: op });
    } else if (outbox.has(key)) { outbox.delete(key); entries.push({ store: 'outbox', delete: true, key }); }
    await idb.writeAtomic(entries);
    emit(`change:${table}`, { id: rec.id }); emit('change', { table, id: rec.id }); emit('outbox', outbox.size);
  },
  recordFor(op) { return cache[op.table]?.get(op.id) || null; },

  exportAll() {
    return { exportedAt: nowISO(), app: 'content-studio', version: 1,
      tables: Object.fromEntries(Object.keys(TABLES).map((t) => [t, [...cache[t].values()]])) };
  },
  async importAll(data, { replace = false, queue = true } = {}) {
    if (!data?.tables) throw new Error('Archivo no válido: falta "tables".');
    for (const t of Object.keys(TABLES)) {
      const rows = data.tables[t] || [];
      if (replace) { cache[t].clear(); await idb.clear(t); }
      const entries = [];
      rows.forEach((r) => {
        cache[t].set(r.id, r); entries.push({ store: t, value: r });
        if (queue) {
          const key = `${t}:${r.id}`; const op = { opId: key, table: t, id: r.id, baseVersion: 0, ts: nowISO() };
          outbox.set(key, op); entries.push({ store: 'outbox', value: op });
        }
      });
      if (entries.length) await idb.writeAtomic(entries);
    }
    emit('change', { import: true }); emit('outbox', outbox.size);
  },
  async wipe() {
    for (const t of Object.keys(TABLES)) { cache[t].clear(); await idb.clear(t); }
    outbox.clear(); await idb.clear('outbox'); await idb.clear('conflicts');
    emit('change', { wipe: true }); emit('outbox', 0);
  },
};

async function persist(table, rec, before, action, silent, summary) {
  const key = `${table}:${rec.id}`;
  const prevOp = outbox.get(key);
  // baseVersion = última versión conocida por el servidor (se conserva al combinar ediciones).
  const op = { opId: key, table, id: rec.id, baseVersion: prevOp ? prevOp.baseVersion : (before?.version || 0), ts: nowISO() };
  const entries = [{ store: table, value: rec }, { store: 'outbox', value: op }];
  let hist = null;
  // Agrupa ediciones seguidas (autoguardado) del mismo registro en una sola entrada de historial cada 2 min.
  const lastAt = lastHist.get(key);
  const grouped = action === 'update' && !summary && lastAt && Date.now() - lastAt < 120000;
  if (table !== 'history' && !silent && !grouped) {
    lastHist.set(key, Date.now());
    let snap = before ? JSON.stringify(before) : null;
    if (snap && snap.length > HISTORY_MAX_CHARS) snap = null; // demasiado grande para una celda de Sheets
    hist = {
      id: uid('HIS'), brandId: rec.brandId || rec.id, table, recordId: rec.id, action,
      before: snap, summary: summary || describeChange(before, rec, action),
      createdAt: nowISO(), updatedAt: nowISO(), deletedAt: null, version: 1, updatedBy: deviceId(),
    };
    const hkey = `history:${hist.id}`;
    const hop = { opId: hkey, table: 'history', id: hist.id, baseVersion: 0, ts: nowISO() };
    entries.push({ store: 'history', value: hist }, { store: 'outbox', value: hop });
  }
  // Escritura atómica: si falla, la caché no cambia (prevención de pérdida/incoherencia).
  await idb.writeAtomic(entries);
  cache[table].set(rec.id, rec);
  outbox.set(key, op);
  if (hist) { cache.history.set(hist.id, hist); outbox.set(`history:${hist.id}`, entries.at(-1).value); }
  emit(`change:${table}`, { id: rec.id, action }); emit('change', { table, id: rec.id, action }); emit('outbox', outbox.size);
  window.dispatchEvent(new Event('cs:local-change'));
}

function describeChange(before, after, action) {
  if (action === 'create') return 'Creado';
  if (!before) return 'Actualizado';
  if (!before.deletedAt && after.deletedAt) return 'Enviado a la papelera';
  const changed = Object.keys(after).filter((k) => !['updatedAt', 'version', 'updatedBy'].includes(k) && JSON.stringify(after[k]) !== JSON.stringify(before[k]));
  return changed.length ? `Cambió: ${changed.slice(0, 6).join(', ')}${changed.length > 6 ? '…' : ''}` : 'Sin cambios de contenido';
}

// Metadatos locales (último sync, ajustes no sensibles).
export const meta = {
  async get(key, def = null) { const r = await idb.get('meta', key); return r ? r.value : def; },
  async set(key, value) { await idb.put('meta', { key, value }); },
};
export const conflicts = {
  all: () => idb.getAll('conflicts'),
  put: (c) => idb.put('conflicts', c),
  del: (key) => idb.del('conflicts', key),
};
