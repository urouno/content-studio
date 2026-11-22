// Pruebas unitarias de lógica pura del frontend.  Ejecutar: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { similarity, wordCount, estimateSeconds, median, deepSet, deepGet, debounce } from '../js/core/utils.js';
import { hasRealChanges } from '../js/core/store.js';
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

test('salir de un formulario sin editar no guarda (debounce.flush sin llamada pendiente)', () => {
  let n = 0; const d = debounce(() => { n += 1; }, 1000);
  d.flush(); assert.equal(n, 0);
  d(); d.flush(); assert.equal(n, 1);
  d.flush(); assert.equal(n, 1);
});

test('hasRealChanges: vacío = vacío, y solo cuenta cambios de contenido', () => {
  const base = { id: 'CNT-1', title: 'Hola', topic: undefined, notes: null, version: 3, updatedAt: 'a' };
  assert.equal(hasRealChanges(base, { ...base, topic: '', notes: '', version: 4, updatedAt: 'b' }), false);
  assert.equal(hasRealChanges(base, { ...base, title: 'Hola 2' }), true);
  assert.equal(hasRealChanges({ platforms: ['ig'] }, { platforms: ['ig', 'tt'] }), true);
});

test('IA: con búsqueda web van primero los proveedores que la admiten', async () => {
  const { chainFor, DEFAULT_CHAIN } = await import('../js/services/ai.js');
  assert.deepEqual(chainFor().map((c) => c.provider), DEFAULT_CHAIN);
  const g = chainFor({ grounding: true }).map((c) => c.provider);
  assert.equal(g[0], 'gemini'); assert.equal(g.length, DEFAULT_CHAIN.length);
  assert.deepEqual(chainFor({ only: 'groq' }), [{ provider: 'groq', model: 'auto' }]);
});

test('IA: el presupuesto de documentos es menor en las tareas cortas', async () => {
  const { TASK_LIMITS, DOC_LIMITS } = await import('../js/services/branddocs.js');
  assert.equal(TASK_LIMITS.guion, DOC_LIMITS);
  assert.ok(TASK_LIMITS.copies.total < DOC_LIMITS.total && TASK_LIMITS.hooks.total < DOC_LIMITS.total);
});

test('guion: los recursos visuales siguen las reglas de la skill de edición', async () => {
  const { normalizeScript, localEvaluate } = await import('../js/services/scriptkit.js');
  const base = { hook: { narrado: 'Por qué el chocolate te sube el ánimo', visual: 'taza', textual: 'Chocolate', p4: { promesa: 'sabrás por qué' } }, promise: 'x', cta: { text: 'Guárdalo para el chocolate' } };
  const crit = (s) => localEvaluate(normalizeScript({ ...base, ...s }), {}).filter((f) => ['recursos', 'empaque'].includes(f.criterion)).map((f) => f.text);
  // Cifra en pantalla que no se dice, anclaje que no está en la voz, enumeración sin lista y gancho sin prueba.
  let t = crit({ graphics: 'pocos', sections: [{ act: 'inicio', voice: 'Hay tres razones para comerlo.', resource: { type: 'tarjeta', what: '70 % cacao', anchor: 'cinco motivos' } }] });
  assert.ok(t.some((x) => /muestra 70/.test(x)));
  assert.ok(t.some((x) => /no está en lo que se dice/.test(x)));
  assert.ok(t.some((x) => /enumera/.test(x)));
  assert.ok(t.some((x) => /prueba/.test(x)));
  // Topes del video: 2 a pantalla completa con «pocos» (tope 1).
  t = crit({ graphics: 'pocos', sections: [{ act: 'inicio', voice: 'Uno dos', resource: { type: 'dato', what: 'uno', anchor: 'Uno' } }, { act: 'desenlace', voice: 'Tres cuatro', resource: { type: 'pasos', what: 'tres', anchor: 'Tres' } }] });
  assert.ok(t.some((x) => /2 gráficos a pantalla completa para un tope de 1/.test(x)));
  // Video animado: cada sección necesita su escena; la palabra detrás de la cabeza no vale.
  t = crit({ productionType: 'animado', sections: [{ act: 'inicio', voice: 'El cacao viene de lejos y tiene historia', resource: { type: 'detras', what: 'cacao', anchor: 'cacao' } }] });
  assert.ok(t.some((x) => /sin escena en un video animado/.test(x)));
  assert.ok(t.some((x) => /solo funciona con cabeza parlante/.test(x)));
  // Uno correcto no tiene avisos de recursos.
  t = crit({ graphics: 'equilibrado', hook: { ...base.hook, p4: { promesa: 'a', prueba: 'b' } }, sections: [{ act: 'inicio', voice: 'Tiene 70 por ciento de cacao.', resource: { type: 'contador', what: '70', anchor: '70 por ciento' } }] });
  assert.deepEqual(t, []);
});

test('ideas: el empaque propuesto por la IA se guarda con la forma de la ficha', async () => {
  const { ideaPitch } = await import('../js/services/assistant.js');
  const p = ideaPitch({ firstFrameText: 'A', variants: [{ text: 'B' }, 'C'], p4: { prueba: 'P' } });
  assert.equal(p.variants, 'B\nC'); assert.equal(p.p4.prueba, 'P'); assert.equal(p.p4.plan, '');
});

test('ideas: el prompt pide variantes de lo que ya funcionó, ordenadas de segura a arriesgada', async () => {
  const { ideasPrompt } = await import('../js/services/prompts.js');
  const p = ideasPrompt({ count: 5, winners: ['«Café quemado» · 12.000 vistas'] });
  assert.match(p, /MÁS SEGURA a la MÁS ARRIESGADA/); assert.match(p, /Café quemado/); assert.match(p, /firstFrameText/); assert.match(p, /keepChange/);
  assert.match(ideasPrompt({ count: 3 }), /Aún no hay resultados medidos/);
});

test('marca para la skill: exporta lo estable y conserva lo afinado en el editor en vivo', async () => {
  const R = await import('../js/services/reels.js');
  // Lo que ya tenía la skill: medidas finas, otras claves y efectos.
  const skillFile = { nombre: 'Café Lumbre', estado: 'por confirmar', colores: { texto: '#ffffff', acento: '#000000' },
    subtitulos: { tam: 92, y: 1350, animacion: 'linea' }, fuentes: { clave: { familia: 'Anton', ancho_car: 0.47 }, archivos: [{ familia: 'Anton', archivo: 'Anton.woff2' }] },
    sonido: { musica_db: -12, efectos: { activo: true, tipos: { glitch: {}, riser: {} }, usos: { camara: 'riser' } } }, correcciones: { 'Lunbre': 'Lumbre' }, notas: ['Sin emojis'] };
  const imported = R.parseMarcaJson(JSON.stringify(skillFile), { fileName: 'cafe-lumbre.json' });
  assert.equal(imported.file, 'cafe-lumbre'); assert.equal(imported.fonts.clave, 'Anton'); assert.deepEqual(imported.sfx, ['glitch', 'riser']);
  assert.equal(imported.never, 'Sin emojis'); assert.match(imported.corrections, /Lunbre = Lumbre/);
  // Content Studio cambia lo estable.
  const edit = { ...imported, status: '', guideLinked: true, roles: { texto: '#FFFFFF', acento: '#F59E0B' }, fonts: { texto: 'Rajdhani', clave: 'Anton' }, subtitles: { animacion: 'karaoke', mayusculas: true, contorno: null, sin_puntuacion: null }, cards: 'cristal', camera: [], sfx: ['whoosh', 'pop'], corrections: 'Lunbre = Lumbre\nexpreso = espresso' };
  const brand = { name: 'Café Lumbre' };
  const config = { voice: { avoid: 'barato, garantizado' }, visual: { fonts: [{ role: 'Títulos', family: 'Anton' }, { role: 'Texto', family: 'Rajdhani' }], colors: [{ name: 'Ámbar', hex: '#F59E0B' }], edit } };
  const out = R.buildMarcaJson({ brand, config });
  assert.equal(out.estado, 'definida');
  assert.equal(out.colores.acento, '#F59E0B');
  assert.equal(out.subtitulos.animacion, 'karaoke'); assert.equal(out.subtitulos.tam, 92); assert.equal(out.subtitulos.y, 1350); // medidas conservadas
  assert.deepEqual(out.fuentes.clave, { familia: 'Anton', ancho_car: 0.47 }); // objeto de la skill respetado
  assert.deepEqual(out.fuentes.texto, { familia: 'Rajdhani' });
  assert.deepEqual(out.zoom.movimientos, []); // ninguno = solo zoom de fondo
  assert.deepEqual(Object.keys(out.sonido.efectos.tipos), ['whoosh', 'pop']); // sin los tipos viejos
  assert.equal(out.sonido.musica_db, -12); assert.equal(out.sonido.efectos.usos.camara, 'riser');
  assert.equal(out.correcciones.expreso, 'espresso');
  assert.ok(Array.isArray(out.notas) && out.notas.some((n) => /barato, garantizado/.test(n)));
  assert.equal(out.guia, 'Reglas-de-estilo-Cafe-Lumbre.md');
  assert.equal(out.nombre, 'Café Lumbre');
  // Reimportar no duplica la línea de palabras prohibidas.
  assert.ok(!R.parseMarcaJson(out).never.includes('barato'));
  // Sin colores ni fuentes, queda por confirmar.
  assert.equal(R.buildMarcaJson({ brand, config: { visual: {} } }).estado, 'pendiente');
  // La guía corta usa los campos audiovisuales de texto libre de la ficha.
  const md = R.buildStyleGuide({ brand, config: { ...config, visual: { ...config.visual, pace: 'Cambio de plano cada 2-4 s', intro: 'Logo 1 s' } } });
  assert.match(md, /^# Reglas de estilo · Café Lumbre/); assert.match(md, /Cambio de plano cada 2-4 s/); assert.match(md, /Intro: Logo 1 s/); assert.match(md, /220 px/);
});

test('guía de la skill: se conserva entera y solo se pone al día el bloque de Content Studio', async () => {
  const R = await import('../js/services/reels.js');
  const brand = { name: 'Marca X' };
  const config = { voice: { tone: 'Cercano', avoid: 'barato' }, visual: { colors: [{ name: 'Rojo', hex: '#D90B0B' }], edit: { roles: { acento: '#D90B0B' } } } };
  const skillGuide = '# Reglas de estilo · Marca X\n\n## Subtítulos\n- Montserrat 800, 84 px.\n\n## Aprendido en los reels\n- Whisper escribe «Marca Equis».\n';
  const once = R.mergeStyleGuide(skillGuide, { brand, config });
  assert.ok(once.startsWith(skillGuide.trim()));               // lo de la skill, intacto y primero
  assert.match(once, /Aprendido en los reels/); assert.match(once, /84 px/);
  assert.equal(once.split(R.GUIDE_START).length, 2);           // un solo bloque
  assert.match(once, /Tono: Cercano/); assert.match(once, /### Color/);
  // Volver a descargar con otros datos sustituye el bloque, no lo duplica.
  const twice = R.mergeStyleGuide(once, { brand, config: { ...config, voice: { tone: 'Directo' } } });
  assert.equal(twice.split(R.GUIDE_START).length, 2); assert.match(twice, /Tono: Directo/); assert.doesNotMatch(twice, /Tono: Cercano/);
  assert.ok(twice.startsWith(skillGuide.trim()));
  // Al importar una guía que ya trae el bloque, se guarda sin él.
  assert.equal(R.stripGuideBlock(once), skillGuide.trim());
  // Sin guía previa, se genera una entera.
  assert.match(R.mergeStyleGuide('', { brand, config }), /^# Reglas de estilo · Marca X/);
});

test('marca para la skill: el formato real de sus archivos (fuentes con peso, estado, nombre y guía)', async () => {
  const R = await import('../js/services/reels.js');
  // Forma real de un archivo de la skill (datos inventados).
  const skillFile = { nombre: 'Marca Demo S.A.', estado: 'por confirmar', guia: 'Reglas-de-estilo.md',
    fuentes: { archivos: [{ familia: 'Montserrat', peso: 800, archivo: 'montserrat-800.woff2' }, { familia: 'Montserrat', peso: 700, archivo: 'montserrat-700.woff2' }],
      texto: { familia: 'Montserrat', peso: 700 }, clave: { familia: 'Montserrat', peso: 800, ancho_car: 0.72 }, tarjeta: { familia: 'Montserrat' } },
    colores: { texto: '#FFFFFF', acento: '#3BAEEA' }, subtitulos: { tam: 70, animacion: 'resaltado' }, tarjetas: { estilo: 'blanca', y: 300 },
    notas: ['Borrador del manual de identidad.'] };
  const ed = R.parseMarcaJson(skillFile, { fileName: 'demo.json' });
  assert.equal(ed.status, 'por confirmar'); assert.equal(ed.fonts.texto, 'Montserrat'); assert.equal(ed.fontWeights.texto, '700');
  const brand = { name: 'Demo' };
  // Sin cambios: el archivo sale igual (salvo las notas propias, que siguen siendo lista).
  const same = R.buildMarcaJson({ brand, config: { visual: { edit: ed } } });
  assert.equal(same.estado, 'por confirmar'); assert.equal(same.nombre, 'Marca Demo S.A.'); assert.equal(same.guia, 'Reglas-de-estilo.md');
  assert.deepEqual(same.fuentes, skillFile.fuentes); assert.deepEqual(same.notas, skillFile.notas);
  assert.equal(R.guideFileName(brand, { visual: { edit: ed } }), 'Reglas-de-estilo.md');
  // Cambiar la clave a Anton: nuevo archivo anton-400.woff2 y su ancho de letra; se conservan los de Montserrat.
  const out = R.buildMarcaJson({ brand, config: { visual: { edit: { ...ed, status: 'definida', fonts: { ...ed.fonts, clave: 'Anton' }, fontWeights: { ...ed.fontWeights, clave: '' } } } } });
  assert.equal(out.estado, 'definida');
  assert.deepEqual(out.fuentes.clave, { familia: 'Anton', ancho_car: 0.47 });
  assert.deepEqual(out.fuentes.texto, { familia: 'Montserrat', peso: 700 });
  assert.ok(out.fuentes.archivos.some((a) => a.archivo === 'anton-400.woff2' && a.peso === 400));
  assert.equal(out.fuentes.archivos.filter((a) => a.familia === 'Montserrat').length, 2);
  // Marca nueva: fuentes como objetos con peso y archivo con la convención de la skill.
  const nueva = R.buildMarcaJson({ brand: { name: 'Nueva' }, config: { visual: { edit: { fonts: { texto: 'Outfit' }, fontWeights: { texto: '600' } } } } });
  assert.deepEqual(nueva.fuentes.texto, { familia: 'Outfit', peso: 600 });
  assert.deepEqual(nueva.fuentes.archivos, [{ familia: 'Outfit', peso: 600, archivo: 'outfit-600.woff2' }]);
  assert.equal(nueva.estado, 'por confirmar');
});

test('marca para la skill: no nombra una guía que la skill no tiene', async () => {
  const R = await import('../js/services/reels.js');
  const ed = R.parseMarcaJson({ nombre: 'Sin guía', estado: 'pendiente', notas: ['No inventes colores.'] });
  const out = R.buildMarcaJson({ brand: { name: 'Sin guía' }, config: { visual: { edit: ed } } });
  assert.equal(out.guia, undefined); assert.equal(out.estado, 'pendiente'); assert.deepEqual(out.notas, ['No inventes colores.']);
  assert.equal(R.buildMarcaJson({ brand: { name: 'Sin guía' }, config: { visual: { edit: { ...ed, guideLinked: true } } } }).guia, 'Reglas-de-estilo-Sin-guia.md');
});

test('encargo de edición: archivos del reel, tomas y mensaje para Claude Code', async () => {
  const R = await import('../js/services/reels.js');
  const idea = { id: 'CNT-ab12-cd34', title: 'Café: ¿quemado? / italiana', platforms: ['tiktok'], keyword: 'cafetera italiana', productionType: 'cabeza' };
  const script = { productionType: 'cabeza', graphics: 'pocos', promise: 'Sabrás por qué', hook: { narrado: 'Si tu café sale así', textual: '¿Café quemado?', visual: 'Chorro oscuro' },
    sections: [{ beat: 'Problema', voice: 'Hay tres errores | comunes.', onScreenText: '3 errores', resource: { type: 'lista', what: 'A · B · C', anchor: 'tres errores' } }, { voice: 'En Jalisco pasa mucho.', resource: { type: 'escena-mapa', what: 'Jalisco', anchor: 'Jalisco' } }],
    cta: { text: 'Guárdalo' }, verify: [{ claim: 'tres errores', reason: 'fuente' }] };
  const brand = { name: 'Lumbre' }; const config = { visual: { edit: { file: 'lumbre', music: 'lofi', corrections: 'Lunbre = Lumbre' } } };
  assert.equal(R.reelFolderName(idea, new Date(2026, 10, 23)), '2026-11-23 · Café ¿quemado italiana');
  const opts = R.defaultVideoOpts({ idea, script });
  assert.equal(opts.scenes, 'algunas'); assert.equal(opts.platform, 'tiktok');
  const p = R.buildProyecto({ idea, brand, config, opts, take: 'CNT-ab12-cd34 toma1.mov' });
  assert.equal(p.marca, 'lumbre'); assert.equal(p.tipo, 'cabeza parlante'); assert.equal(p.flotantes, 3); assert.equal(p.pantalla, 1);
  assert.equal(p.musica, 'lofi'); assert.equal(p.contenido, idea.id); assert.equal(p.content_studio.skill, 'editar-reels-claude');
  const anim = R.buildProyecto({ idea, brand, config, opts: { ...opts, production: 'animado', voice: 'clonada' }, durationSec: 60 });
  assert.equal(anim.content_studio.skill, 'animar-reels-claude'); assert.equal(anim.tipo, 'animacion'); assert.equal(anim.voz, 'clonada'); assert.equal(anim.formato, 'medio');
  assert.equal(R.buildProyecto({ idea, brand, config, opts: { ...opts, production: 'producto' } }).tipo, 'voz en off + imagenes de producto');
  assert.equal(R.animFormat(40), 'corto'); assert.equal(R.animFormat(90), 'largo'); assert.equal(R.animFormat(110), 'extendido');
  const md = R.buildGuionMd({ idea, brand, script });
  assert.match(md, /Si tu café sale así/); assert.match(md, /Hay tres errores \/ comunes/); assert.match(md, /Verificar antes de publicar/);
  const prop = R.buildPropuestaMd({ script, opts });
  assert.match(prop, /\| 1 \| «tres errores» \| A · B · C \| lista \|/); assert.match(prop, /escena · mapa/); assert.match(prop, /3 flotantes y 1 a pantalla completa/);
  assert.equal(R.buildVocab({ idea, brand, config }), 'Lumbre, cafetera italiana\n');
  assert.equal(R.takeName(idea.id, 2, '.MOV'), 'CNT-ab12-cd34 toma2.mov');
  const files = [{ kind: 'file', name: 'CNT-ab12-cd34 toma1.mov' }, { kind: 'file', name: 'CNT-zz toma1.mov' }, { kind: 'file', name: 'otra.mov' }];
  assert.deepEqual(R.takesOf(idea.id, files).map((f) => f.name), ['CNT-ab12-cd34 toma1.mov']);
  assert.equal(R.finalOf([{ kind: 'file', name: 'preview.mp4' }, { kind: 'file', name: 'FINAL - Café.mp4' }]).name, 'FINAL - Café.mp4');
  const msg = R.editMessage({ folderName: '2026-11-23 · Café', opts, take: 'CNT-ab12-cd34 toma1.mov' });
  assert.equal(msg, 'Usa la skill editar-reels-claude con el reel «Reels/2026-11-23 · Café» (encargo de Content Studio). La toma es «Tomas/CNT-ab12-cd34 toma1.mov».');
  assert.equal(R.spokenFromPlan({ subtitulos: [{ frase: 'No tienes que | abrir *editor*' }, { palabras: [{ w: 'de' }, { w: 'vídeos' }] }] }), 'No tienes que abrir editor de vídeos');
});

test('modo grabación: guion segundo a segundo y lista de qué preparar', async () => {
  const { timeline, prepList } = await import('../js/views/recording.js');
  const script = { hook: { narrado: 'Si tu café sale así lo estás quemando', visual: 'Chorro oscuro' }, cta: { text: 'Guárdalo para tu próximo café', visual: 'Taza servida' },
    sections: [{ beat: 'Error 1', voice: 'Primer error: apretar el café con la cuchara', visual: 'Cuchara aplastando', resource: { type: 'broll', what: 'café suelto' } }],
    verify: [{ claim: '25 segundos', reason: 'medir' }] };
  const { rows, total } = timeline(script, 120); // 2 palabras por segundo
  assert.deepEqual(rows.map((r) => r.kind), ['hook', 'section', 'cta']);
  assert.equal(rows[0].from, 0); assert.equal(rows[0].to, 4); assert.equal(rows[1].from, 4); assert.equal(total, rows.at(-1).to);
  const prep = prepList(script, 'cabeza').map((p) => p.text);
  assert.ok(prep.includes('Primer cuadro: Chorro oscuro'));
  assert.ok(prep.some((t) => /Toma de apoyo: café suelto/.test(t)));
  assert.ok(prep.some((t) => /Comprobar antes de grabar: 25 segundos/.test(t)));
  assert.ok(prep.some((t) => /Luz de frente/.test(t)));
  assert.ok(prepList(script, 'producto').some((p) => /Una toma por frase/.test(p.text)));
});

test('vía Claude: el pedido trae todo el contexto y la respuesta vuelve con el formato de la IA', async () => {
  const C = await import('../js/services/claudecode.js');
  const req = C.buildRequest({ task: 'guion', system: 'Eres guionista…', prompt: 'Devuelve JSON: {…}', json: true, grounding: false, maxTokens: 7000 });
  assert.match(req.id, /^PED-\d{14}-[a-z0-9]{4}$/); assert.equal(req.salida, 'json'); assert.equal(req.system, 'Eres guionista…'); assert.equal(req.max_palabras, 4900);
  const r = C.toResult({ id: req.id, json: { versions: [{ title: 'A' }] } }, { json: true });
  assert.deepEqual(r.json, { versions: [{ title: 'A' }] }); assert.equal(r.provider, 'claude-code');
  // También si el JSON viene como texto, o el texto con fuentes.
  assert.deepEqual(C.toResult({ texto: '```json\n{"ideas": []}\n```' }, { json: true }).json, { ideas: [] });
  const t = C.toResult({ texto: '# Investigación', fuentes: [{ titulo: 'OMS', url: 'https://who.int' }, 'https://x.org'] }, { json: false });
  assert.equal(t.text, '# Investigación'); assert.deepEqual(t.sources.map((s) => s.uri), ['https://who.int', 'https://x.org']);
  assert.throws(() => C.toResult({ error: 'falta la marca' }, { json: true }), /falta la marca/);
  assert.throws(() => C.toResult({ texto: 'no es json' }, { json: true }), /formato inesperado/);
});

test('créditos del material de terceros (FUENTES.md) para los copies', async () => {
  const { creditsFromSources } = await import('../js/services/reels.js');
  const md = `# Fuentes y derechos\n\n## B1 · moka pot\n- Autor: Shokuiku Cuisine\n- Licencia: CC BY 3.0\n- URL: https://commons.wikimedia.org/x\n\n## A2 · coffee\n- Autor: Ana\n- Licencia: CC0\n\n## C3\n- Autor: Pepe Pérez\n- Licencia: CC BY-SA 4.0\n`;
  assert.deepEqual(creditsFromSources(md), ['Shokuiku Cuisine (CC BY 3.0)', 'Pepe Pérez (CC BY-SA 4.0)']);
  assert.deepEqual(creditsFromSources('| B1 | Autor: Mia | CC BY 4.0 |'), ['Mia (CC BY 4.0)']);
  assert.deepEqual(creditsFromSources(''), []);
});

test('créditos: el formato real de FUENTES.md de la skill (lista con sublíneas)', async () => {
  const { creditsFromSources } = await import('../js/services/reels.js');
  const md = `# Fuentes del B-roll de bancos libres

Revisa este archivo antes de publicar: algunas licencias piden atribución.
- **B1** · moka pot stove · video · Wikimedia Commons
  - Autor: Autora Uno
  - Licencia: CC BY 3.0 · requiere atribución
  - URL: https://commons.wikimedia.org/wiki/File:x.webm
  - Archivo: trabajo/broll-banco/B1.mp4 (en el plan: \`assets/broll-B1.mp4\`)
- **H4** · earth from space · video · NASA
  - Autor: NASA
  - Licencia: dominio público
- **G2** · coffee · foto · Openverse
  - Autor: Autor Dos
  - Licencia: CC BY 2.0 · requiere atribución
`;
  assert.deepEqual(creditsFromSources(md), ['Autora Uno (CC BY 3.0)', 'Autor Dos (CC BY 2.0)']);
});
