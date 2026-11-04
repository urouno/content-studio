// Reglas del flujo Idea → … → Analizado. Un contenido = una idea (id CNT-…); todas las fichas cuelgan de ella.
import { store } from '../core/store.js';
import { PIPELINE, statusIndex, defaultBrandConfig } from '../core/schema.js';
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
  return b;
}

// Duplicar marca: copia identidad, configuración, plataformas, pilares, hooks, CTA y recursos (no contenidos).
export async function duplicateBrand(brandId) {
  const src = store.get('brands', brandId);
  const { id, createdAt, updatedAt, version, brandId: _b, ...rest } = src;
  const nb = await createBrand({ ...rest, name: `${src.name} (copia)` });
  const cfg = brandConfig(brandId);
  const nc = await ensureBrandConfig(nb.id);
  await store.update('brandConfigs', nc.id, { voice: clone(cfg.voice), visual: clone(cfg.visual), strategy: clone(cfg.strategy) }, { silent: true });
  const pillarMap = {};
  for (const t of ['platforms', 'pillars', 'hooks', 'ctas', 'assets']) {
    for (const r of store.all(t, { brandId })) {
      const { id: oid, createdAt: c1, updatedAt: u1, version: v1, ...copy } = r;
      const n = await store.create(t, { ...copy, brandId: nb.id }, { silent: true });
      if (t === 'pillars') pillarMap[oid] = n.id;
    }
  }
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
  // Al aprobar se generan automáticamente las fichas de producción y edición (editables).
  await ensureProduction(ideaId);
  await ensureEdition(ideaId);
  await advanceTo(ideaId, 'por_grabar');
}
export async function unlockScript(ideaId) {
  const s = scriptFor(ideaId);
  await store.update('scripts', s.id, { locked: false }, { summary: 'Guion desbloqueado' });
  const idea = store.get('ideas', ideaId);
  if (statusIndex(idea.status) >= statusIndex('guion_aprobado')) await setStatus(ideaId, 'guion', 'Guion desbloqueado para cambios');
}

// ---------- Producción ----------
export function productionFromScript(script) {
  const scenes = [];
  script.sections.forEach((sec, i) => {
    const loc = /exterior|calle|tienda|local|cocina|quir|estudio/i.exec(sec.visual || '')?.[0] || 'Principal';
    const last = scenes.at(-1);
    const shot = { type: 'A-roll', framing: 'Plano medio vertical, ojos en el tercio superior', description: `Decir: sección ${i + 1}`, voiceRef: (sec.voice || '').slice(0, 120), done: false };
    const broll = sec.visual ? [{ type: 'B-roll', framing: 'Detalle / plano recurso', description: sec.visual, voiceRef: '', done: false }] : [];
    if (last && last.location === loc) { last.shots.push(shot, ...broll); last.sectionRefs.push(i); } else scenes.push({ title: `Escena ${scenes.length + 1}: ${sec.beat || sec.act}`, location: loc, sectionRefs: [i], shots: [shot, ...broll], direction: '', props: [] });
  });
  if (script.hook?.visual) scenes.unshift({ title: 'Hook visual (0–3 s)', location: 'Según hook', sectionRefs: [-1], shots: [{ type: 'Hook', framing: 'El plano más llamativo', description: script.hook.visual, voiceRef: script.hook.narrado, done: false }], direction: 'Grabar varias opciones del arranque. Empieza en movimiento, sin saludo.', props: [] });
  const checklist = [
    'Batería y almacenamiento suficientes', 'Lente limpia', 'Luz frontal suave (ventana o foco)', 'Micrófono conectado y probado',
    'Grabar en vertical 9:16, 4K/1080p a 30 fps o más', 'Dejar 1 s de margen al inicio y final de cada toma',
    'Grabar el hook con 2–3 variantes', 'Grabar B-roll de todas las secciones', 'Revisar que se entiende el producto/servicio',
    'Máximo 2 intentos por frase si salen bien',
  ].map((t) => ({ text: t, done: false }));
  return { scenes, props: [], checklist, crewNotes: script.visualNotes || '' };
}
export async function ensureProduction(ideaId, { regenerate = false } = {}) {
  const idea = store.get('ideas', ideaId);
  const ver = approvedVersion(ideaId) || currentVersion(ideaId);
  const existing = store.find('productions', (p) => p.ideaId === ideaId);
  if (existing && !regenerate) return existing;
  const p = productionFromScript(normalizeScript(ver?.data || {}));
  if (existing) return store.update('productions', existing.id, { ...p, scriptVersionId: ver?.id }, { summary: 'Ficha de producción regenerada' });
  return store.create('productions', { brandId: idea.brandId, ideaId, scriptVersionId: ver?.id, ...p, observations: '', recordedAt: null });
}
export async function markRecorded(ideaId) {
  const p = store.find('productions', (x) => x.ideaId === ideaId);
  if (p) await store.update('productions', p.id, { recordedAt: nowISO() });
  await advanceTo(ideaId, 'grabado');
  await ensureEdition(ideaId);
  await advanceTo(ideaId, 'edicion');
}

// ---------- Edición ----------
export function editionFromScript(script, cfg) {
  const vis = cfg.visual || {};
  const guide = {
    colors: vis.colors || [], fonts: vis.fonts || [], subtitleStyle: vis.subtitleStyle, textPosition: vis.textPosition,
    pace: vis.pace, transitions: vis.transitions, music: vis.music, sfx: vis.sfx, graphics: vis.graphics,
    intro: vis.intro, outro: vis.outro, editingStyle: vis.editingStyle, notes: script.editingNotes || '',
  };
  let t = 0; const wps = (cfg.strategy?.wpm || 160) / 60;
  const scenes = [{ sectionIndex: -1, time: '0–3 s', onScreenText: script.hook.textual, subtitle: vis.subtitleStyle || '', broll: script.hook.visual, graphics: '', transition: 'Sin intro: empezar en la acción', sfx: script.hook.auditivo, music: '', camera: '', notes: 'Hook: las 4 capas deben decir lo mismo', done: false }];
  t = 3;
  script.sections.forEach((s, i) => {
    const dur = Math.max(2, Math.round((s.voice || '').split(/\s+/).filter(Boolean).length / wps));
    scenes.push({ sectionIndex: i, time: `${t}–${t + dur} s`, onScreenText: s.onScreenText, subtitle: vis.subtitleStyle || '', broll: s.visual, graphics: '', transition: vis.transitions || 'Corte', sfx: s.peak >= 2 ? 'Efecto sutil en la revelación (opcional)' : '', music: '', camera: s.peak >= 2 ? 'Zoom o cambio de plano en el pico' : '', notes: s.edit, done: false });
    t += dur;
  });
  scenes.push({ sectionIndex: 99, time: `${t}–${t + 4} s`, onScreenText: script.cta.text, subtitle: vis.subtitleStyle || '', broll: script.cta.visual, graphics: vis.outro || '', transition: '', sfx: '', music: '', camera: '', notes: 'CTA', done: false });
  const checklist = ['Subtítulos revisados (ortografía y sincronía)', 'Texto fuera de zonas seguras', 'Contraste de texto suficiente', 'Música por debajo de la voz', 'Colores y tipografías de la marca', 'Sin silencios ni respiraciones largas', 'El hook funciona sin sonido', 'Exportar 9:16 1080×1920']
    .map((x) => ({ text: x, done: false }));
  return { guide, scenes, checklist };
}
export async function ensureEdition(ideaId, { regenerate = false } = {}) {
  const idea = store.get('ideas', ideaId);
  const ver = approvedVersion(ideaId) || currentVersion(ideaId);
  const existing = store.find('editions', (p) => p.ideaId === ideaId);
  if (existing && !regenerate) return existing;
  const e = editionFromScript(normalizeScript(ver?.data || {}), brandConfig(idea.brandId));
  if (existing) return store.update('editions', existing.id, { ...e, scriptVersionId: ver?.id }, { summary: 'Ficha de edición regenerada' });
  return store.create('editions', { brandId: idea.brandId, ideaId, scriptVersionId: ver?.id, ...e, editor: '', observations: '', readyAt: null });
}
export async function markReady(ideaId) {
  const e = store.find('editions', (x) => x.ideaId === ideaId);
  if (e) await store.update('editions', e.id, { readyAt: nowISO() });
  await advanceTo(ideaId, 'listo');
  if (store.filter('calendar', (c) => c.ideaId === ideaId).length) await advanceTo(ideaId, 'calendarizado');
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
    production: store.find('productions', (p) => p.ideaId === ideaId),
    edition: store.find('editions', (p) => p.ideaId === ideaId),
    copies: store.filter('copies', (c) => c.ideaId === ideaId),
    calendar: store.filter('calendar', (c) => c.ideaId === ideaId),
    publications: store.filter('publications', (c) => c.ideaId === ideaId),
    results: store.filter('results', (c) => c.ideaId === ideaId),
    references: store.filter('references', (c) => c.ideaId === ideaId),
  };
}

export function structureName(id) { return byId(STRUCTURES, id)?.name || id || '—'; }
