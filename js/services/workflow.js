// Reglas del flujo Idea → … → Analizado. Un contenido = una idea (id CNT-…); todas las fichas cuelgan de ella.
import { store } from '../core/store.js';
import { PIPELINE, statusIndex, defaultBrandConfig, LEGACY_STATUS } from '../core/schema.js';
import { ensureBrandDocs } from './branddocs.js';
import { nowISO, todayISO, clone, similarity } from '../core/utils.js';
import { normalizeScript, emptyScript } from './scriptkit.js';
import { STRUCTURES, byId, PUBLISH_FILTER } from './methodology.js';

export function brandConfig(brandId) {
  let cfg = store.find('brandConfigs', (c) => c.brandId === brandId);
  if (!cfg) return { ...defaultBrandConfig(), brandId, _missing: true };
  const def = defaultBrandConfig();
  return { ...cfg, voice: { ...def.voice, ...cfg.voice }, visual: { ...def.visual, ...cfg.visual }, strategy: { ...def.strategy, ...cfg.strategy } };
}
export async function ensureBrandConfig(brandId) {
  const c = store.find('brandConfigs', (x) => x.brandId === brandId);
  if (c) return c;
  return store.create('brandConfigs', { brandId, ...defaultBrandConfig() }, { silent: true });
}

export async function createBrand(data) {
  const b = await store.create('brands', { status: 'activa', color: '#4f46e5', ...data });
  await ensureBrandConfig(b.id);
  await ensureBrandDocs(b.id);
  return b;
}

// Duplicar marca: copia identidad, configuración, documentos, plataformas, pilares, hooks, CTA y recursos (no contenidos).
export async function duplicateBrand(brandId) {
  const src = store.get('brands', brandId);
  const { id, createdAt, updatedAt, version, brandId: _b, ...rest } = src;
  const nb = await store.create('brands', { status: 'activa', ...rest, name: `${src.name} (copia)` });
  const cfg = brandConfig(brandId);
  const nc = await ensureBrandConfig(nb.id);
  await store.update('brandConfigs', nc.id, { voice: clone(cfg.voice), visual: clone(cfg.visual), strategy: clone(cfg.strategy) }, { silent: true });
  const pillarMap = {};
  for (const t of ['brandDocs', 'platforms', 'pillars', 'hooks', 'ctas', 'assets']) {
    for (const r of store.all(t, { brandId })) {
      const { id: oid, createdAt: c1, updatedAt: u1, version: v1, ...copy } = r;
      const n = await store.create(t, { ...copy, brandId: nb.id }, { silent: true });
      if (t === 'pillars') pillarMap[oid] = n.id;
    }
  }
  await ensureBrandDocs(nb.id);
  return nb;
}

export async function setStatus(ideaId, status, note = '') {
  const idea = store.get('ideas', ideaId);
  if (!idea || idea.status === status) return idea;
  const hist = [...(idea.statusHistory || []), { from: idea.status, to: status, at: nowISO(), note }].slice(-50);
  return store.update('ideas', ideaId, { status, statusHistory: hist }, { summary: `Estado: ${idea.status} → ${status}` });
}
// Avanza solo si el estado actual es anterior (no retrocede automáticamente).
export async function advanceTo(ideaId, status, note) {
  const idea = store.get('ideas', ideaId);
  if (!idea) return;
  if (idea.status === 'descartada' || statusIndex(idea.status) < statusIndex(status)) return setStatus(ideaId, status, note);
  return idea;
}

export function nextStatus(s) { const i = statusIndex(s); return PIPELINE[i + 1]?.id || null; }
export function prevStatus(s) { const i = statusIndex(s); return i > 0 ? PIPELINE[i - 1].id : null; }

// ---------- Guiones ----------
export function scriptFor(ideaId) { return store.find('scripts', (s) => s.ideaId === ideaId); }
export function versionsFor(scriptId) { return store.filter('scriptVersions', (v) => v.scriptId === scriptId).sort((a, b) => b.versionNo - a.versionNo); }
export function approvedVersion(ideaId) {
  const s = scriptFor(ideaId);
  return s?.approvedVersionId ? store.get('scriptVersions', s.approvedVersionId) : null;
}
export function currentVersion(ideaId) {
  const s = scriptFor(ideaId);
  if (!s) return null;
  return store.get('scriptVersions', s.currentVersionId) || versionsFor(s.id)[0] || null;
}

export async function ensureScript(idea) {
  let s = scriptFor(idea.id);
  if (!s) s = await store.create('scripts', { brandId: idea.brandId, ideaId: idea.id, currentVersionId: null, approvedVersionId: null, locked: false, publishFilter: PUBLISH_FILTER.map(() => false) });
  return s;
}

export async function addVersion(idea, data, { origin = 'manual', label = '' } = {}) {
  const script = await ensureScript(idea);
  if (script.locked) throw new Error('El guion está aprobado y bloqueado. Desbloquéalo para crear versiones.');
  const versions = versionsFor(script.id);
  const versionNo = (versions[0]?.versionNo || 0) + 1;
  const v = await store.create('scriptVersions', {
    brandId: idea.brandId, scriptId: script.id, ideaId: idea.id, versionNo,
    label: label || (origin === 'ai' ? 'Generada con IA' : origin === 'rewrite' ? 'Reescritura' : 'Manual'),
    origin, data: normalizeScript(data), evaluation: null,
  });
  await store.update('scripts', script.id, { currentVersionId: v.id }, { silent: true });
  await advanceTo(idea.id, 'guion');
  return v;
}

export async function newBlankVersion(idea) { return addVersion(idea, emptyScript(idea), { origin: 'manual', label: 'En blanco' }); }

export async function saveVersionData(versionId, data) {
  const v = store.get('scriptVersions', versionId);
  const s = store.get('scripts', v.scriptId);
  if (s?.locked && s.approvedVersionId === versionId) throw new Error('Versión aprobada y bloqueada.');
  return store.update('scriptVersions', versionId, { data: normalizeScript(data) }, { summary: 'Edición de guion' });
}

export async function approveVersion(ideaId, versionId) {
  const s = scriptFor(ideaId);
  await store.update('scripts', s.id, { approvedVersionId: versionId, currentVersionId: versionId, locked: true }, { summary: 'Versión aprobada y bloqueada' });
  await advanceTo(ideaId, 'guion_aprobado');
  await advanceTo(ideaId, 'por_grabar');
}
export async function unlockScript(ideaId) {
  const s = scriptFor(ideaId);
  await store.update('scripts', s.id, { locked: false }, { summary: 'Guion desbloqueado' });
  const idea = store.get('ideas', ideaId);
  if (statusIndex(idea.status) >= statusIndex('guion_aprobado')) await setStatus(ideaId, 'guion', 'Guion desbloqueado para cambios');
}

// ---------- Grabación y edición ----------
// Solo se registra si el contenido está grabado (teléfono) y editado (Claude). El estado del flujo
// es la fuente de verdad: "grabado" = grabado y pendiente de editar; "listo" = editado.
const LOCKED_AFTER = ['publicado', 'analizado'];
export function productionState(idea) {
  if (!idea || idea.status === 'descartada') return { recorded: false, edited: false, locked: true };
  const i = statusIndex(idea.status);
  const recorded = i >= statusIndex('grabado') || (idea.status === 'calendarizado');
  const edited = i >= statusIndex('listo');
  return { recorded, edited, locked: LOCKED_AFTER.includes(idea.status) };
}
const hasCalendar = (ideaId) => store.filter('calendar', (c) => c.ideaId === ideaId).length > 0;

export async function setRecorded(ideaId, value) {
  const idea = store.get('ideas', ideaId);
  const st = productionState(idea);
  if (st.locked || st.recorded === value) return idea;
  if (value) return advanceTo(ideaId, 'grabado', 'Marcado como grabado');
  return setStatus(ideaId, 'por_grabar', 'Desmarcado como grabado');
}
export async function setEdited(ideaId, value) {
  const idea = store.get('ideas', ideaId);
  const st = productionState(idea);
  if (st.locked || st.edited === value) return idea;
  if (value) {
    await advanceTo(ideaId, 'listo', 'Marcado como editado');
    if (hasCalendar(ideaId)) await advanceTo(ideaId, 'calendarizado');
    return store.get('ideas', ideaId);
  }
  return setStatus(ideaId, 'grabado', 'Desmarcado como editado');
}

// Convierte estados que ya no existen (p. ej. "edicion") en su equivalente actual.
export async function migrateLegacyStatuses() {
  let n = 0;
  for (const idea of store.all('ideas')) {
    const to = LEGACY_STATUS[idea.status];
    if (to) { await setStatus(idea.id, to, 'Migración: estado simplificado'); n++; }
  }
  return n;
}

// ---------- Calendario / publicación ----------
export async function schedule(ideaId, { platform, date, time = '', owner = '' }) {
  const idea = store.get('ideas', ideaId);
  const c = await store.create('calendar', { brandId: idea.brandId, ideaId, platform, date, time, owner, status: 'programado', notes: '' });
  if (statusIndex(idea.status) >= statusIndex('listo')) await advanceTo(ideaId, 'calendarizado');
  if (!idea.targetDate) await store.update('ideas', ideaId, { targetDate: date }, { silent: true });
  return c;
}
export async function markPublished(calendarId, { url = '', publishedAt } = {}) {
  const c = store.get('calendar', calendarId);
  await store.update('calendar', calendarId, { status: 'publicado' });
  const pub = await store.create('publications', { brandId: c.brandId, ideaId: c.ideaId, calendarId, platform: c.platform, publishedAt: publishedAt || todayISO(), url, notes: '' });
  await advanceTo(c.ideaId, 'publicado');
  return pub;
}
export async function addResult(pub, { measuredAt, metrics, notes = '' }) {
  const days = Math.max(0, Math.round((new Date(measuredAt) - new Date(pub.publishedAt)) / 86400000));
  const r = await store.create('results', { brandId: pub.brandId, ideaId: pub.ideaId, publicationId: pub.id, platform: pub.platform, measuredAt, daysSincePublish: days, metrics, notes });
  await advanceTo(pub.ideaId, 'analizado');
  return r;
}

// ---------- Duplicados ----------
export function findSimilarIdeas(brandId, text, { excludeId, threshold = 0.42 } = {}) {
  return store.all('ideas', { brandId }).filter((i) => i.id !== excludeId)
    .map((i) => ({ idea: i, score: similarity(text, `${i.title} ${i.problem || ''}`) }))
    .filter((x) => x.score >= threshold).sort((a, b) => b.score - a.score).slice(0, 5);
}

// ---------- Contexto completo de un contenido ----------
export function contentBundle(ideaId) {
  const idea = store.get('ideas', ideaId) || store.getAny('ideas', ideaId);
  if (!idea) return null;
  const script = scriptFor(ideaId);
  return {
    idea, brand: store.get('brands', idea.brandId), script,
    versions: script ? versionsFor(script.id) : [],
    copies: store.filter('copies', (c) => c.ideaId === ideaId),
    calendar: store.filter('calendar', (c) => c.ideaId === ideaId),
    publications: store.filter('publications', (c) => c.ideaId === ideaId),
    results: store.filter('results', (c) => c.ideaId === ideaId),
    references: store.filter('references', (c) => c.ideaId === ideaId),
  };
}

export function structureName(id) { return byId(STRUCTURES, id)?.name || id || '—'; }
