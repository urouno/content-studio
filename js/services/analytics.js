// Indicadores derivados y patrones. Usa medianas y muestra n; nunca afirma causalidad.
import { store } from '../core/store.js';
import { median } from '../core/utils.js';
import { STRUCTURES, HOOK_PATTERNS, CONTENT_TYPES, byId } from './methodology.js';

const num = (v) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Number(v));
const ratio = (a, b) => (a != null && b ? a / b : null);

export function derive(m = {}) {
  const views = num(m.views); const reach = num(m.reach) ?? views;
  const dur = num(m.durationSec); const avgW = num(m.avgWatchSec);
  let avgPct = num(m.avgPctViewed); if (avgPct != null && avgPct > 1) avgPct /= 100;
  if (avgPct == null && avgW != null && dur) avgPct = avgW / dur;
  let completion = num(m.completion); if (completion != null && completion > 1) completion /= 100;
  let r3 = num(m.retention3s); if (r3 != null && r3 > 1) r3 /= 100;
  const per1k = (x) => (num(x) != null && views ? (num(x) / views) * 1000 : null);
  return {
    views, reach, avgPct, completion, retention3s: r3, durationSec: dur,
    likeRate: ratio(num(m.likes), reach), commentRate: ratio(num(m.comments), reach),
    sendRate: ratio(num(m.shares), reach), saveRate: ratio(num(m.saves), reach),
    followsPer1k: per1k(m.follows), clicksPer1k: per1k(m.clicks), inquiriesPer1k: per1k(m.inquiries), conversionsPer1k: per1k(m.conversions),
    profileVisits: num(m.profileVisits),
    engagedViews: views != null ? Math.round(views * (completion ?? avgPct ?? 0)) : null,
  };
}

function durationBucket(s) {
  if (s == null) return 'sin dato';
  if (s < 15) return '< 15 s'; if (s < 30) return '15–29 s'; if (s < 45) return '30–44 s'; if (s < 60) return '45–59 s'; if (s < 90) return '60–89 s'; return '≥ 90 s';
}

/** Filas analíticas: última medición por publicación, enriquecida con datos de idea y guion aprobado. */
export function buildRows(brandId) {
  const results = store.all('results', { brandId });
  const latest = new Map();
  results.forEach((r) => {
    const k = r.publicationId || `${r.ideaId}:${r.platform}`;
    const prev = latest.get(k);
    if (!prev || String(r.measuredAt) > String(prev.measuredAt)) latest.set(k, r);
  });
  return [...latest.values()].map((r) => {
    const idea = store.get('ideas', r.ideaId) || {};
    const script = store.find('scripts', (s) => s.ideaId === r.ideaId);
    const ver = script && store.get('scriptVersions', script.approvedVersionId || script.currentVersionId);
    const sd = ver?.data || {};
    const pillar = idea.pillarId && store.get('pillars', idea.pillarId);
    const d = derive(r.metrics);
    return {
      id: r.id, ideaId: r.ideaId, title: idea.title || '(idea eliminada)', brandId: r.brandId, platform: r.platform,
      measuredAt: r.measuredAt, days: num(r.daysSincePublish),
      dims: {
        structure: byId(STRUCTURES, sd.structureId)?.name || sd.structureId || 'sin dato',
        hookPattern: byId(HOOK_PATTERNS, sd.hook?.patternId)?.name || sd.hook?.patternId || 'sin dato',
        pillar: pillar?.name || 'sin pilar', contentType: byId(CONTENT_TYPES, idea.contentType)?.name || 'sin dato',
        objective: idea.objective || 'sin dato', cta: sd.cta?.type || 'sin dato', platform: r.platform,
        duration: durationBucket(d.durationSec), experimental: idea.experimental ? 'Experimental' : 'Seguro',
      },
      m: d,
    };
  });
}

export const DIMENSIONS = [
  { id: 'structure', name: 'Estructura' }, { id: 'hookPattern', name: 'Patrón de hook' }, { id: 'pillar', name: 'Pilar' },
  { id: 'contentType', name: 'Tipo de contenido' }, { id: 'duration', name: 'Duración' }, { id: 'platform', name: 'Plataforma' },
  { id: 'cta', name: 'Tipo de CTA' }, { id: 'objective', name: 'Objetivo' }, { id: 'experimental', name: '80/20' },
];

export function groupBy(rows, dim, metric) {
  const g = new Map();
  rows.forEach((r) => { const k = r.dims[dim]; if (!g.has(k)) g.set(k, []); g.get(k).push(r.m[metric]); });
  const overall = median(rows.map((r) => r.m[metric]));
  return [...g.entries()].map(([key, vals]) => {
    const valid = vals.filter((v) => v != null);
    const med = median(valid);
    return { key, n: valid.length, median: med, vsOverall: med != null && overall ? med / overall - 1 : null, lowSample: valid.length < 5 };
  }).sort((a, b) => (b.median ?? -Infinity) - (a.median ?? -Infinity));
}

/** Frases de aprendizaje para el prompt (solo grupos con n ≥ 3 y diferencia ≥ 20 %). */
export function learningsFor(brandId) {
  const rows = buildRows(brandId);
  if (rows.length < 6) return [];
  const out = [];
  [['hookPattern', 'avgPct', '% visto'], ['structure', 'avgPct', '% visto'], ['pillar', 'saveRate', 'guardados'], ['structure', 'commentRate', 'comentarios'], ['duration', 'avgPct', '% visto']].forEach(([dim, metric, label]) => {
    const g = groupBy(rows, dim, metric).filter((x) => x.n >= 3 && x.key !== 'sin dato');
    if (g.length >= 2 && g[0].vsOverall != null && g[0].vsOverall > 0.2) out.push(`${DIMENSIONS.find((d) => d.id === dim).name} "${g[0].key}" tiene mediana de ${label} ${Math.round(g[0].vsOverall * 100)} % superior a la media (n=${g[0].n})`);
  });
  return out;
}

export function tableForPrompt(rows) {
  const lines = [];
  DIMENSIONS.forEach((d) => {
    ['avgPct', 'sendRate', 'saveRate', 'commentRate', 'followsPer1k', 'inquiriesPer1k'].forEach((m) => {
      const g = groupBy(rows, d.id, m).filter((x) => x.n > 0);
      if (g.length > 1) lines.push(`${d.name} × ${m}: ${g.map((x) => `${x.key}=${x.median?.toFixed(4)} (n=${x.n})`).join('; ')}`);
    });
  });
  return lines.join('\n');
}
