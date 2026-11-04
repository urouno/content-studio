// Tareas de IA. Cada tarea reúne SOLO el contexto de la marca indicada (aislamiento multimarca).
import { store } from '../core/store.js';
import { generate } from './ai.js';
import * as P from './prompts.js';
import { brandConfig, approvedVersion } from './workflow.js';
import { learningsFor } from './analytics.js';
import { normalizeScript } from './scriptkit.js';
import { structureName } from './workflow.js';

export function brandCtx(brandId) {
  const brand = store.get('brands', brandId);
  if (!brand) throw new Error('Marca no encontrada.');
  const examples = store.all('scripts', { brandId }).filter((s) => s.approvedVersionId).slice(-3)
    .map((s) => store.get('scriptVersions', s.approvedVersionId)?.data).filter(Boolean)
    .map((d) => ({ hook: d.hook?.narrado, structure: structureName(d.structureId) }));
  return {
    brand, config: brandConfig(brandId),
    platforms: store.all('platforms', { brandId }), pillars: store.all('pillars', { brandId }),
    hooks: store.all('hooks', { brandId }), ctas: store.all('ctas', { brandId }),
    examples, learnings: learningsFor(brandId),
  };
}

function recentHooks(brandId, excludeIdeaId) {
  return store.all('scriptVersions', { brandId }).filter((v) => v.ideaId !== excludeIdeaId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((v) => v.data?.hook?.narrado).filter(Boolean).slice(0, 25);
}

export async function aiIdeas(brandId, opts) {
  const ctx = brandCtx(brandId);
  const pillar = opts.pillarId ? store.get('pillars', opts.pillarId) : null;
  const existing = store.all('ideas', { brandId }).map((i) => i.title);
  const r = await generate({ system: P.systemPrompt(ctx, 'estratega de contenido'), prompt: P.ideasPrompt({ ...opts, pillar, existing }) });
  const list = r.json?.ideas || r.json || [];
  return list.map((i) => ({ ...i, pillarId: ctx.pillars.find((p) => p.name.toLowerCase() === String(i.pillar || '').toLowerCase())?.id || opts.pillarId || '' }));
}

export async function aiAngles(idea, similar) {
  const r = await generate({ system: P.systemPrompt(brandCtx(idea.brandId), 'estratega de contenido'), prompt: P.anglesPrompt({ idea, similar }) });
  return r.json?.angles || [];
}

export async function aiResearch(brandId, topic, idea) {
  const r = await generate({ system: P.systemPrompt(brandCtx(brandId), 'investigador de contenido'), prompt: P.researchPrompt({ topic, idea }), json: false, grounding: true, temperature: 0.4 });
  return { text: r.text, sources: r.sources };
}

export async function aiScripts(idea, opts) {
  const ctx = brandCtx(idea.brandId);
  const pillar = idea.pillarId ? store.get('pillars', idea.pillarId) : null;
  const r = await generate({
    system: P.systemPrompt(ctx), maxTokens: 12000,
    prompt: P.scriptPrompt({ idea, pillar, ...opts, recentHooks: recentHooks(idea.brandId, idea.id) }),
  });
  const arr = r.json?.versions || (Array.isArray(r.json) ? r.json : [r.json]);
  return arr.filter(Boolean).map(normalizeScript);
}

export async function aiRewrite(idea, script, opts) {
  const r = await generate({ system: P.systemPrompt(brandCtx(idea.brandId)), prompt: P.rewritePrompt({ script, ...opts }), temperature: 0.8, maxTokens: 10000 });
  return normalizeScript(r.json?.versions?.[0] || r.json);
}

export async function aiEvaluate(idea, script, { durationTarget, localFindings }) {
  const r = await generate({ system: P.systemPrompt(brandCtx(idea.brandId), 'editor y evaluador de guiones'), prompt: P.evaluatePrompt({ script, durationTarget, localFindings }), temperature: 0.3 });
  return r.json;
}

export async function aiHooks(idea, script, opts = {}) {
  const r = await generate({ system: P.systemPrompt(brandCtx(idea.brandId)), prompt: P.hooksPrompt({ idea, script, ...opts }) });
  return r.json?.hooks || [];
}
export async function aiCtas(idea, script) {
  const r = await generate({ system: P.systemPrompt(brandCtx(idea.brandId)), prompt: P.ctaPrompt({ idea, script, objective: idea.objective }) });
  return r.json?.ctas || [];
}

export async function aiCopies(idea, platforms) {
  const ver = approvedVersion(idea.id);
  if (!ver) throw new Error('Aprueba un guion antes de generar copies.');
  const r = await generate({ system: P.systemPrompt(brandCtx(idea.brandId), 'copywriter de redes sociales'), prompt: P.copiesPrompt({ script: ver.data, idea, platforms }), temperature: 0.85 });
  return r.json?.copies || [];
}

export async function aiProduction(idea, script) {
  const r = await generate({ system: P.systemPrompt(brandCtx(idea.brandId), 'productor audiovisual'), prompt: P.productionPrompt({ script }), temperature: 0.5 });
  return r.json;
}
export async function aiEditing(idea, script) {
  const ctx = brandCtx(idea.brandId);
  const r = await generate({ system: P.systemPrompt(ctx, 'editor de video'), prompt: P.editingPrompt({ script, visual: ctx.config.visual }), temperature: 0.5 });
  return r.json;
}
export async function aiInsights(brandId, table) {
  const ctx = brandCtx(brandId);
  const r = await generate({ system: P.systemPrompt(ctx, 'analista de contenido'), prompt: P.insightsPrompt({ table, brandName: ctx.brand.name }), temperature: 0.3 });
  return r.json;
}
