// Pruebas unitarias de lógica pura del frontend.  Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { similarity, wordCount, estimateSeconds, median, deepSet, deepGet } from '../js/core/utils.js';
import { localEvaluate, normalizeScript, scriptStats, emptyScript } from '../js/services/scriptkit.js';
import { derive } from '../js/services/analytics.js';
import { brandContext, scriptPrompt, systemPrompt } from '../js/services/prompts.js';
import { parseJSON } from '../js/services/ai.js';
import { TABLES, PIPELINE } from '../js/core/schema.js';
import { cleanDoc, docCompleteness, docsContext, templateMarkdown, baseDocId, DOC_TEMPLATES } from '../js/services/branddocs.js';
import { mdToHtml } from '../js/core/markdown.js';
import { productionState } from '../js/services/workflow.js';
import { readFileSync } from 'node:fs';

test('similarity detecta ideas casi iguales y separa distintas', () => {
  assert.ok(similarity('Si te pasa esto, tu café está quemado', 'Si te pasa esto tu cafe esta quemado!') > 0.8);
  assert.ok(similarity('Cómo limpiar el retenedor', 'Tres cafés que no deberías comprar') < 0.2);
});

test('conteo de palabras y duración', () => {
  assert.equal(wordCount('Hola, ¿qué tal? Bien.'), 4);
  assert.equal(estimateSeconds(160, 160), 60);
});

test('median ignora nulos', () => { assert.equal(median([3, null, 1, 2]), 2); assert.equal(median([]), null); });
test('deepSet / deepGet', () => { const o = {}; deepSet(o, 'a.b.0.c', 5); assert.equal(deepGet(o, 'a.b.0.c'), 5); });

test('normalizeScript completa campos faltantes', () => {
  const s = normalizeScript({ hook: { narrado: 'x' }, sections: [{ voice: 'hola', peak: '2' }] });
  assert.equal(s.hook.visual, ''); assert.equal(s.sections[0].peak, 2); assert.deepEqual(s.verify, []);
});

test('evaluador local: hook largo, sin promesa, sin CTA, palabras prohibidas', () => {
  const s = normalizeScript({ hook: { narrado: 'Hola a todos en el día de hoy vamos a hablar de un tema muy interesante sobre café y molienda' }, sections: [{ act: 'inicio', voice: 'Es exquisito.' }], cta: {} });
  const f = localEvaluate(s, { avoid: 'exquisito', durationTarget: 40 });
  const txt = f.map((x) => x.text).join(' | ');
  assert.match(txt, /hook narrado tiene \d+ palabras/);
  assert.match(txt, /No hay promesa/);
  assert.match(txt, /Falta el CTA/);
  assert.match(txt, /palabras prohibidas/);
  assert.match(txt, /poco orales/);
});

test('evaluador local: guion correcto no tiene problemas graves', () => {
  const s = normalizeScript({
    promise: 'Sabrás evitar el café quemado', hook: { narrado: 'Si te sale así, tu café está quemado', visual: 'Café oscuro', textual: '¿Café quemado?' },
    sections: [{ act: 'inicio', voice: 'Ese borboteo indica que el café se quema por exceso de calor.', peak: 1 }, { act: 'nudo', voice: 'No aprietes el café en la cafetera.', peak: 2 }, { act: 'desenlace', voice: 'Enfría la base y el café no se quema.', peak: 3 }],
    cta: { type: 'guardados', text: 'Guárdalo.' },
  });
  assert.equal(localEvaluate(s, { durationTarget: 15 }).filter((x) => x.severity === 'problema').length, 0);
});

test('picos decrecientes se señalan', () => {
  const s = normalizeScript({ promise: 'p', hook: { narrado: 'a b c', visual: 'v', textual: 't' }, sections: [{ act: 'inicio', voice: 'uno', peak: 3 }, { act: 'nudo', voice: 'dos', peak: 1 }, { act: 'desenlace', voice: 'tres', peak: 0 }], cta: { text: 'x' } });
  assert.ok(localEvaluate(s).some((x) => /decrecen/.test(x.text)));
});

test('scriptStats usa palabras por minuto', () => {
  const s = emptyScript({}); s.hook.narrado = Array(80).fill('palabra').join(' ');
  assert.deepEqual(scriptStats(s, 160), { words: 80, seconds: 30 });
});

test('derive calcula tasas por alcance y por 1k vistas', () => {
  const d = derive({ views: 10000, reach: 8000, likes: 800, shares: 80, saves: 160, follows: 50, inquiries: 5, avgWatchSec: 10, durationSec: 40 });
  assert.equal(d.likeRate, 0.1); assert.equal(d.sendRate, 0.01); assert.equal(d.saveRate, 0.02);
  assert.equal(d.followsPer1k, 5); assert.equal(d.inquiriesPer1k, 0.5); assert.equal(d.avgPct, 0.25);
  assert.equal(derive({ avgPctViewed: 45 }).avgPct, 0.45);
});

test('aislamiento multimarca en el prompt', () => {
  const ctxA = { brand: { name: 'Marca A', products: 'Producto A' }, config: { voice: { avoid: 'barato' }, visual: {} }, platforms: [], pillars: [], hooks: [], ctas: [], examples: [], learnings: [] };
  const sys = systemPrompt(ctxA);
  assert.ok(sys.includes('Marca A')); assert.ok(sys.includes('PROHIBIDO usar: barato'));
  assert.ok(sys.includes('No inventes datos'));
  assert.ok(!sys.includes('Marca B'));
  const p = scriptPrompt({ idea: { title: 'Idea', objective: 'conversion' }, platform: 'tiktok', durationSec: 40, knowledgeLevel: 0, recentHooks: ['hook viejo'] });
  assert.ok(p.includes('hook viejo')); assert.ok(p.includes('Cero tecnicismos'));
  assert.ok(brandContext(ctxA).includes('fuente de verdad'));
});

test('parseJSON tolera bloques de código y texto alrededor', () => {
  assert.deepEqual(parseJSON('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJSON('Aquí tienes: {"b":[1,2]} gracias'), { b: [1, 2] });
  assert.equal(parseJSON('nada'), null);
});

test('el esquema del frontend coincide con el de Apps Script', () => {
  const gs = readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8');
  for (const [t, def] of Object.entries(TABLES)) {
    const m = gs.match(new RegExp(`${t}:\\s*\\{ sheet: '([^']+)',\\s*prefix: '([A-Z]+)', cols: \\[([^\\]]*)\\]`));
    assert.ok(m, `Falta la tabla ${t} en Code.gs`);
    assert.equal(m[1], def.sheet, `Hoja distinta en ${t}`); assert.equal(m[2], def.prefix, `Prefijo distinto en ${t}`);
    const cols = m[3].split(',').map((x) => x.trim().replace(/'/g, '')).filter(Boolean);
    const expected = def.cols.filter((c) => !(def.localOnly || []).includes(c));
    assert.deepEqual(cols, expected, `Columnas distintas en ${t}`);
  }
});

test('flujo simplificado: sin fichas de producción ni edición', () => {
  assert.ok(!TABLES.productions && !TABLES.editions);
  assert.deepEqual(PIPELINE.map((p) => p.id).slice(4, 7), ['por_grabar', 'grabado', 'listo']);
  assert.ok(!PIPELINE.some((p) => p.id === 'edicion'));
  assert.deepEqual(productionState({ status: 'por_grabar' }), { recorded: false, edited: false, locked: false });
  assert.deepEqual(productionState({ status: 'grabado' }), { recorded: true, edited: false, locked: false });
  assert.deepEqual(productionState({ status: 'calendarizado' }), { recorded: true, edited: true, locked: false });
  assert.equal(productionState({ status: 'publicado' }).locked, true);
});

test('documentos de marca: la plantilla vacía no envía nada a la IA', () => {
  const md = templateMarkdown('buyer', {});
  assert.match(md, /^# Buyer persona/); assert.match(md, /## Perfil principal/);
  assert.equal(cleanDoc(md), ''); assert.equal(docCompleteness(md), 0);
  const filled = templateMarkdown('buyer', { audience: 'Personas que toman café en casa' });
  assert.match(cleanDoc(filled), /## Perfil principal\nPersonas que toman café en casa/);
  assert.ok(!cleanDoc(filled).includes('<!--')); assert.ok(!cleanDoc(filled).includes('## Situación y contexto'));
  assert.ok(docCompleteness(filled) > 0 && docCompleteness(filled) < 0.5);
});

test('documentos de marca: tipos base, ids deterministas y contexto por tarea', () => {
  const types = DOC_TEMPLATES.map((t) => t.type);
  for (const t of ['identidad', 'buyer', 'dolores', 'discurso', 'oferta', 'reglas', 'foco']) assert.ok(types.includes(t), t);
  assert.equal(baseDocId('MRC-ab12-cd34', 'buyer'), 'DOC-ab12cd34-buyer');
  assert.match(baseDocId('MRC-ab12-cd34', 'buyer'), /^DOC-[a-z0-9]+-[a-z0-9]+$/);
  const docs = [
    { id: 'D1', docType: 'reglas', title: 'Reglas', content: '# Reglas\n## Prohibido\nNo prometer curas', active: true, order: 0 },
    { id: 'D2', docType: 'voz', title: 'Voz', content: '# Voz\n## Cómo sonamos\nCercana', active: true, order: 1 },
    { id: 'D3', docType: 'buyer', title: 'Buyer', content: '# Buyer\n## Perfil\nLaura', active: false, order: 2 },
    { id: 'D4', docType: 'custom', title: 'Lanzamiento', content: '# L\n\nNuevo curso en marzo', active: true, order: 3, tasks: ['ideas'] },
  ];
  const ideas = docsContext('MRC-x', 'ideas', { docs });
  assert.ok(ideas.text.includes('No prometer curas')); assert.ok(ideas.text.includes('Nuevo curso en marzo'));
  assert.ok(!ideas.text.includes('Cercana'), 'la voz no se usa para ideas'); assert.ok(!ideas.text.includes('Laura'), 'desactivado');
  const guion = docsContext('MRC-x', 'guion', { docs });
  assert.ok(guion.text.includes('Cercana')); assert.ok(!guion.text.includes('Nuevo curso'));
  const small = docsContext('MRC-x', 'guion', { docs, limits: { perDoc: 10, total: 1000 } });
  assert.ok(small.used.every((u) => u.truncated));
});

test('los documentos llegan al prompt y sustituyen el resumen de la ficha', () => {
  const ctx = { brand: { name: 'Marca A', products: 'Resumen de productos', audience: 'Resumen de público' }, config: { voice: {}, visual: {} }, docs: '### Productos\nCurso de 3 horas', filled: new Set(['oferta']) };
  const sys = systemPrompt(ctx);
  assert.ok(sys.includes('DOCUMENTOS DE REFERENCIA')); assert.ok(sys.includes('Curso de 3 horas'));
  assert.ok(!sys.includes('Resumen de productos')); assert.ok(sys.includes('Resumen de público'));
});

test('mdToHtml escapa HTML y muestra las indicaciones como ayuda', () => {
  const h = mdToHtml('# T\n<!-- ayuda -->\n<script>alert(1)</script>\n- **uno** [COMPLETAR: precio]\n\n| a | b |\n|---|---|\n| 1 | 2 |');
  assert.ok(!h.includes('<script>')); assert.ok(h.includes('&lt;script&gt;'));
  assert.ok(h.includes('class="md-hint"')); assert.ok(h.includes('<b>uno</b>')); assert.ok(h.includes('<mark>'));
  assert.ok(h.includes('<table'));
});
