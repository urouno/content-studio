// Sincronización offline-first con Google Sheets.
// 1) PUSH: envía la cola (outbox) con baseVersion para control optimista de concurrencia.
// 2) El servidor devuelve aplicados + conflictos + cambios remotos desde la última sincronización.
// 3) PULL: aplica cambios remotos que no choquen con ediciones locales pendientes.
import { store, meta, conflicts } from '../core/store.js';
import { TABLES } from '../core/schema.js';
import { settings } from '../core/settings.js';
import { emit } from '../core/events.js';
import { call, isConfigured } from './api.js';
import { nowISO } from '../core/utils.js';

const BATCH = 100;
let running = null;
let timer = null;
export const syncState = { status: 'idle', lastSync: null, lastError: null, conflicts: 0 };

function setState(patch) { Object.assign(syncState, patch); emit('sync', { ...syncState, pending: store.pendingCount() }); }

function serialize(table, rec) {
  const out = { ...rec };
  (TABLES[table].localOnly || []).forEach((f) => delete out[f]);
  return out;
}

export async function syncNow({ silent = false } = {}) {
  if (running) return running;
  if (!isConfigured()) { if (!silent) setState({ status: 'unconfigured' }); return { skipped: true }; }
  if (!navigator.onLine) { setState({ status: 'offline' }); return { skipped: true }; }
  running = (async () => {
    setState({ status: 'syncing', lastError: null });
    let pushed = 0; let pulled = 0; let conflictCount = 0; const rejectedMsgs = [];
    try {
      let since = await meta.get('lastPull', '');
      // PUSH por lotes
      const attempted = new Set();
      let more = false;
      let ops = store.pendingOps();
      do {
        const batch = ops.slice(0, BATCH);
        batch.forEach((b) => attempted.add(b.opId));
        const payloadOps = batch.map((op) => {
          const rec = store.recordFor(op);
          return rec ? { key: op.opId, table: op.table, id: op.id, baseVersion: op.baseVersion, record: serialize(op.table, rec) } : null;
        }).filter(Boolean);
        const orphan = batch.filter((op) => !store.recordFor(op)).map((op) => op.opId);
        if (orphan.length) await store.ackOps(orphan);
        const res = await call('sync', { ops: payloadOps, since });
        const appliedKeys = res.applied || [];
        await store.ackOps(appliedKeys);
        pushed += appliedKeys.length;
        for (const c of res.conflicts || []) {
          const local = store.getAny(c.table, c.id);
          // Si la hoja ya tiene exactamente esta versión, no es un conflicto real.
          if (local && c.server && Number(c.server.version) === Number(local.version) && String(c.server.updatedAt) === String(local.updatedAt) && String(c.server.updatedBy) === String(local.updatedBy)) continue;
          // Documento base creado a la vez en dos dispositivos y sin editar en este: se adopta el de la hoja.
          if (c.table === 'brandDocs' && local && c.server && Number(local.version) === 1) { await store.replaceLocal(c.table, c.server); continue; }
          conflictCount++;
          await conflicts.put({ key: `${c.table}:${c.id}`, table: c.table, id: c.id, server: c.server, detectedAt: nowISO() });
        }
        // Las claves en conflicto se retiran de la cola hasta que el usuario decida.
        await store.ackOps((res.conflicts || []).map((c) => `${c.table}:${c.id}`));
        // Los registros en conflicto no se sobrescriben: se conservan ambas versiones hasta que el usuario decida.
        const inConflict = new Set((await conflicts.all()).map((c) => c.key));
        for (const ch of res.changes || []) {
          if (inConflict.has(`${ch.table}:${ch.record.id}`)) continue;
          if (await store.applyRemote(ch.table, ch.record)) pulled++;
        }
        // Rechazados por validación: quedan en la cola (no se pierden) y se informa del motivo.
        if ((res.rejected || []).length) rejectedMsgs.push(...res.rejected.map((r) => `${r.key}: ${r.reason}`));
        since = res.serverTime || since;
        ops = store.pendingOps().filter((o) => !attempted.has(o.opId));
        more = !!res.more; // continúa paginando cambios remotos
      } while (ops.length || more);
      await meta.set('lastPull', since);
      const nConf = (await conflicts.all()).length;
      const ts = nowISO(); await meta.set('lastSyncAt', ts);
      setState({ status: rejectedMsgs.length ? 'error' : 'ok', lastSync: ts, conflicts: nConf, lastError: rejectedMsgs.length ? `${rejectedMsgs.length} cambios rechazados por el servidor: ${rejectedMsgs.slice(0, 3).join(' | ')}` : null });
      if (pulled) emit('change', { remote: true });
      return { pushed, pulled, conflicts: conflictCount };
    } catch (e) {
      setState({ status: e.code === 'OFFLINE' ? 'offline' : 'error', lastError: e.message });
      throw e;
    } finally { running = null; }
  })();
  return running;
}

// Descarga completa (primer uso en un dispositivo nuevo).
export async function fullPull() {
  await meta.set('lastPull', '');
  return syncNow();
}

export async function resolveConflict(key, choice) {
  const list = await conflicts.all();
  const c = list.find((x) => x.key === key);
  if (!c) return;
  const local = store.getAny(c.table, c.id);
  if (choice === 'remote' || !local) {
    await store.replaceLocal(c.table, c.server, { requeue: false });
  } else {
    // Mantener local: se sube con versión superior a la del servidor.
    const rec = { ...local, version: (c.server?.version || 0) + 1, updatedAt: nowISO() };
    await store.replaceLocal(c.table, rec, { requeue: true, baseVersion: c.server?.version || 0 });
  }
  await conflicts.del(key);
  setState({ conflicts: (await conflicts.all()).length });
}

export function startAutoSync() {
  const schedule = () => {
    clearTimeout(timer);
    if (!settings.get('autoSync') || !isConfigured()) return;
    timer = setTimeout(() => syncNow({ silent: true }).catch(() => {}).finally(schedule), 120000);
  };
  window.addEventListener('online', () => { setState({ status: 'idle' }); syncNow({ silent: true }).catch(() => {}); });
  window.addEventListener('offline', () => setState({ status: 'offline' }));
  let debounceT;
  window.addEventListener('cs:local-change', () => {
    if (!settings.get('autoSync') || !isConfigured()) return;
    clearTimeout(debounceT); debounceT = setTimeout(() => syncNow({ silent: true }).catch(() => {}), 8000);
  });
  conflicts.all().then((l) => setState({ conflicts: l.length, status: navigator.onLine ? (isConfigured() ? 'idle' : 'unconfigured') : 'offline' }));
  meta.get('lastSyncAt').then((v) => v && setState({ lastSync: v }));
  if (navigator.onLine && isConfigured()) syncNow({ silent: true }).catch(() => {});
  schedule();
}
