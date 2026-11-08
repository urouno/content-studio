// Pruebas del backend Apps Script con un simulador en memoria de SpreadsheetApp y servicios.
// No sustituye la prueba en Google real (ver docs/PRUEBAS.md), pero valida la lógica de sync.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { makeEnv } from './gas-mock.js';

const ts = () => new Date().toISOString();
const rec = (id, extra = {}) => ({ id, brandId: 'MRC-aa11-bb22', createdAt: ts(), updatedAt: ts(), deletedAt: null, version: 1, updatedBy: 'DEV-x', ...extra });

function ready(opts) {
  const env = makeEnv(opts);
  const token = env.ctx.createToken('Test', 'admin');
  const viewer = env.ctx.createToken('Lector', 'viewer');
  assert.equal(env.post({ action: 'setup', token }).ok, true);
  return { ...env, token, viewer };
}

test('rechaza tokens inválidos', () => {
  const { post } = ready();
  const r = post({ action: 'ping', token: 'x'.repeat(30) });
  assert.equal(r.ok, false); assert.equal(r.error.code, 'UNAUTHORIZED');
});

test('setup crea todas las hojas con cabeceras', () => {
  const { sheets } = ready();
  assert.ok(sheets.get('Ideas')); assert.equal(sheets.get('Ideas').data[0][0], 'id');
  assert.ok(sheets.get('Ideas').data[0].includes('syncedAt'));
  assert.equal(sheets.size, 18); // 17 tablas + _Meta
  assert.ok(sheets.get('DocumentosMarca').data[0].includes('content'));
});

test('crea, actualiza y descarga registros con tipos correctos', () => {
  const { post, token } = ready();
  const brand = rec('MRC-aa11-bb22', { brandId: 'MRC-aa11-bb22', name: 'Marca', status: 'activa' });
  const idea = rec('CNT-aa11-cc33', { title: 'Idea', status: 'idea', platforms: ['tiktok'], priority: 1, experimental: true, statusHistory: [] });
  let r = post({ action: 'sync', token, since: '', ops: [{ key: 'brands:MRC-aa11-bb22', table: 'brands', id: brand.id, baseVersion: 0, record: brand }, { key: 'ideas:CNT-aa11-cc33', table: 'ideas', id: idea.id, baseVersion: 0, record: idea }] });
  assert.equal(r.ok, true); assert.equal(r.applied.length, 2); assert.equal(r.conflicts.length, 0);
  const got = r.changes.find((c) => c.table === 'ideas').record;
  assert.deepEqual(got.platforms, ['tiktok']); assert.equal(got.priority, 1); assert.equal(got.experimental, true); assert.equal(got.version, 1);
  const since = r.serverTime;
  r = post({ action: 'sync', token, since, ops: [{ key: 'ideas:CNT-aa11-cc33', table: 'ideas', id: idea.id, baseVersion: 1, record: { ...idea, title: 'Idea v2', version: 2 } }] });
  assert.equal(r.applied.length, 1);
  r = post({ action: 'sync', token, since: '', ops: [] });
  assert.equal(r.changes.find((c) => c.table === 'ideas').record.title, 'Idea v2');
});

test('detecta conflictos de concurrencia (dos dispositivos editan la misma versión)', () => {
  const { post, token } = ready();
  const idea = rec('CNT-aa11-cc33', { title: 'Base', status: 'idea' });
  post({ action: 'sync', token, ops: [{ key: 'k1', table: 'ideas', id: idea.id, baseVersion: 0, record: idea }] });
  const a = post({ action: 'sync', token, ops: [{ key: 'k2', table: 'ideas', id: idea.id, baseVersion: 1, record: { ...idea, title: 'Dispositivo A', version: 2, updatedBy: 'DEV-a' } }] });
  assert.equal(a.applied.length, 1);
  const b = post({ action: 'sync', token, ops: [{ key: 'k3', table: 'ideas', id: idea.id, baseVersion: 1, record: { ...idea, title: 'Dispositivo B', version: 2, updatedBy: 'DEV-b' } }] });
  assert.equal(b.applied.length, 0); assert.equal(b.conflicts.length, 1);
  assert.equal(b.conflicts[0].server.title, 'Dispositivo A');
});

test('valida datos: estado inválido, id mal formado, brandId ausente', () => {
  const { post, token } = ready();
  const r = post({ action: 'sync', token, ops: [
    { key: 'a', table: 'ideas', id: 'CNT-aa11-cc33', baseVersion: 0, record: rec('CNT-aa11-cc33', { title: 'x', status: 'inventado' }) },
    { key: 'b', table: 'ideas', id: 'bad', baseVersion: 0, record: rec('bad', { title: 'x', status: 'idea' }) },
    { key: 'c', table: 'ideas', id: 'CNT-aa11-dd44', baseVersion: 0, record: rec('CNT-aa11-dd44', { brandId: '', title: 'x', status: 'idea' }) },
    { key: 'd', table: 'secret', id: 'X', baseVersion: 0, record: {} },
  ] });
  assert.equal(r.applied.length, 0); assert.equal(r.rejected.length, 4);
});

test('el rol viewer solo puede leer', () => {
  const { post, viewer } = ready();
  const r = post({ action: 'sync', token: viewer, ops: [{ key: 'a', table: 'ideas', id: 'CNT-aa11-cc33', baseVersion: 0, record: rec('CNT-aa11-cc33', { title: 'x', status: 'idea' }) }] });
  assert.equal(r.ok, false); assert.equal(r.error.code, 'FORBIDDEN');
  assert.equal(post({ action: 'sync', token: viewer, ops: [] }).ok, true);
  assert.equal(post({ action: 'ai.generate', token: viewer, body: {} }).error.code, 'FORBIDDEN');
});

test('eliminación lógica: deletedAt se conserva y se propaga', () => {
  const { post, token } = ready();
  const c = rec('CPY-aa11-cc33', { ideaId: 'CNT-aa11-cc33', platform: 'tiktok', caption: 'x' });
  post({ action: 'sync', token, ops: [{ key: 'a', table: 'copies', id: c.id, baseVersion: 0, record: c }] });
  post({ action: 'sync', token, ops: [{ key: 'b', table: 'copies', id: c.id, baseVersion: 1, record: { ...c, deletedAt: ts(), version: 2 } }] });
  const r = post({ action: 'sync', token, since: '', ops: [] });
  assert.ok(r.changes.find((x) => x.record.id === c.id).record.deletedAt);
});

test('paginación de descarga sin perder registros entre tablas', () => {
  const { post, token, ctx } = ready();
  vm.runInContext('PULL_LIMIT = 3;', ctx);
  const ops = [];
  for (let i = 0; i < 4; i++) ops.push({ key: `i${i}`, table: 'ideas', id: `CNT-aa11-${i}x`, baseVersion: 0, record: rec(`CNT-aa11-${i}x`, { title: `I${i}`, status: 'idea' }) });
  for (let i = 0; i < 3; i++) ops.push({ key: `p${i}`, table: 'pillars', id: `PIL-aa11-${i}x`, baseVersion: 0, record: rec(`PIL-aa11-${i}x`, { name: `P${i}` }) });
  post({ action: 'sync', token, ops });
  const seen = new Set(); let since = ''; let guard = 0; let r;
  do { r = post({ action: 'sync', token, since, ops: [] }); r.changes.forEach((c) => seen.add(c.record.id)); since = r.serverTime; guard++; } while (r.more && guard < 10);
  assert.equal(seen.size, 7);
});

test('proxy de Gemini: clave en cabecera, modelo validado, límite diario', () => {
  const { post, token, props, fetchCalls, ctx } = ready({ geminiResponder: () => ({ code: 200, body: { candidates: [{ content: { parts: [{ text: 'hola' }] } }] } }) });
  assert.equal(post({ action: 'ai.generate', token, model: 'gemini-flash-latest', body: { contents: [{ parts: [{ text: 'x' }] }] } }).error.code, 'AI_NOT_CONFIGURED');
  props.set('GEMINI_API_KEY', 'SECRET'); props.set('AI_DAILY_LIMIT', '2');
  const ok = post({ action: 'ai.generate', token, model: 'gemini-flash-latest', body: { contents: [{ parts: [{ text: 'x' }] }], generationConfig: { maxOutputTokens: 999999 }, tools: [{ code_execution: {} }, { google_search: {} }] } });
  assert.equal(ok.ok, true); assert.equal(ok.data.candidates[0].content.parts[0].text, 'hola');
  const call = fetchCalls.at(-1);
  assert.equal(call.opts.headers['x-goog-api-key'], 'SECRET'); assert.ok(!call.url.includes('SECRET'));
  const sent = JSON.parse(call.opts.payload);
  assert.equal(sent.generationConfig.maxOutputTokens, 16384); assert.deepEqual(sent.tools, [{ google_search: {} }]);
  assert.equal(post({ action: 'ai.generate', token, model: '../../evil', body: { contents: [{}] } }).error.code, 'VALIDATION');
  post({ action: 'ai.generate', token, model: 'gemini-flash-latest', body: { contents: [{ parts: [{ text: 'x' }] }] } });
  assert.equal(post({ action: 'ai.generate', token, model: 'gemini-flash-latest', body: { contents: [{ parts: [{ text: 'x' }] }] } }).error.code, 'RATE_LIMIT');
  assert.ok(ctx);
});

test('celdas demasiado grandes se rechazan sin romper el lote', () => {
  const { post, token } = ready();
  const big = rec('VER-aa11-cc33', { scriptId: 'GUI-aa11-cc33', ideaId: 'CNT-aa11-cc33', versionNo: 1, data: { x: 'a'.repeat(60000) } });
  const fine = rec('PIL-aa11-cc33', { name: 'ok' });
  const r = post({ action: 'sync', token, ops: [{ key: 'big', table: 'scriptVersions', id: big.id, baseVersion: 0, record: big }, { key: 'fine', table: 'pillars', id: fine.id, baseVersion: 0, record: fine }] });
  assert.deepEqual(r.applied, ['fine']); assert.equal(r.rejected[0].key, 'big');
});

test('instalar() crea las hojas y un token de administrador válido', () => {
  const env = makeEnv();
  const token = env.ctx.instalar();
  assert.ok(token.length >= 24);
  assert.ok(env.sheets.get('Ideas'));
  const r = env.post({ action: 'ping', token });
  assert.equal(r.ok, true); assert.equal(r.user.role, 'admin');
});

test('proxy de Claude: cabeceras, traducción de formato y errores', () => {
  let reply = { code: 200, body: { model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: '{"ok":true}' }], usage: { input_tokens: 10, output_tokens: 5 } } };
  const { post, token, props, fetchCalls } = ready({ geminiResponder: () => reply });
  const body = { systemInstruction: { parts: [{ text: 'Eres guionista' }] }, contents: [{ role: 'user', parts: [{ text: 'Hola' }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 4000, responseMimeType: 'application/json' } };
  assert.equal(post({ action: 'ai.generate', token, provider: 'claude', model: 'claude-opus-5-5', body }).error.code, 'AI_NOT_CONFIGURED');
  props.set('ANTHROPIC_API_KEY', 'SK-SECRET');
  const ok = post({ action: 'ai.generate', token, provider: 'claude', model: 'claude-opus-5-5', body });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.candidates[0].content.parts[0].text, '{"ok":true}');
  assert.equal(ok.data.usageMetadata.totalTokenCount, 15);
  const call = fetchCalls.at(-1);
  assert.equal(call.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(call.opts.headers['x-api-key'], 'SK-SECRET');
  assert.equal(call.opts.headers['anthropic-version'], '2026-10-21');
  assert.equal(call.opts.headers['anthropic-beta'], 'server-side-fallback-2026-07-01');
  const sent = JSON.parse(call.opts.payload);
  assert.equal(sent.temperature, undefined); // la versión 2026-10-21 rechaza temperature
  assert.equal(sent.fallbacks, 'default'); assert.equal(sent.max_tokens, 4000);
  assert.match(sent.system, /JSON válido/); assert.deepEqual(sent.messages, [{ role: 'user', content: 'Hola' }]);
  // Búsqueda web en Haiku usa la variante básica y no lleva fallbacks
  post({ action: 'ai.generate', token, provider: 'claude', model: 'claude-haiku-5-5', body: { ...body, tools: [{ google_search: {} }] } });
  const hs = JSON.parse(fetchCalls.at(-1).opts.payload);
  assert.equal(hs.tools[0].type, 'web_search_20250305'); assert.equal(hs.fallbacks, undefined);
  // Errores
  reply = { code: 529, body: { type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } } };
  const over = post({ action: 'ai.generate', token, provider: 'claude', model: 'claude-opus-5-5', body });
  assert.equal(over.error.status, 529); assert.match(over.error.message, /saturado/);
  reply = { code: 402, body: { type: 'error', error: { type: 'billing_error', message: 'credit' } } };
  assert.match(post({ action: 'ai.generate', token, provider: 'claude', model: 'claude-opus-5-5', body }).error.message, /crédito/);
  reply = { code: 200, body: { stop_reason: 'refusal', content: [], usage: {} } };
  assert.match(post({ action: 'ai.generate', token, provider: 'claude', model: 'claude-opus-5-5', body }).error.message, /rechazó/);
  assert.equal(post({ action: 'ai.generate', token, provider: 'otro', body }).error.code, 'VALIDATION');
});

test('errores de Gemini incluyen el modelo y el detalle real', () => {
  const { post, token, props } = ready({ geminiResponder: () => ({ code: 503, body: { error: { message: 'The model is overloaded. Please try again later.' } } }) });
  props.set('GEMINI_API_KEY', 'X');
  const r = post({ action: 'ai.generate', token, model: 'gemini-flash-latest', body: { contents: [{ parts: [{ text: 'x' }] }] } });
  assert.equal(r.error.status, 503); assert.match(r.error.message, /gemini-flash-latest/); assert.match(r.error.details, /overloaded/);
});

test('Gemini prueba otro modelo cuando el primero está saturado', () => {
  const { post, token, props, fetchCalls } = ready({ geminiResponder: (url) => {
    if (url.includes('/models?')) return { code: 200, body: { models: [
      { name: 'models/gemini-flash-latest', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.5-flash-lite', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/gemini-3.6-flash-preview-tts', supportedGenerationMethods: ['generateContent'] },
      { name: 'models/text-embedding-004', supportedGenerationMethods: ['embedContent'] } ] } };
    if (url.includes('gemini-flash-latest:')) return { code: 503, body: { error: { message: 'The model is overloaded.' } } };
    return { code: 200, body: { candidates: [{ content: { parts: [{ text: 'hola' }] } }] } };
  } });
  props.set('GEMINI_API_KEY', 'K');
  const r = post({ action: 'ai.generate', token, model: 'gemini-flash-latest', body: { contents: [{ parts: [{ text: 'x' }] }] } });
  assert.equal(r.ok, true); assert.equal(r.data.usedModel, 'gemini-3.5-flash-lite');
  assert.equal(r.data.triedModels[0].status, 503);
  assert.ok(!fetchCalls.some((c) => c.url.includes('tts:')), 'no debe probar modelos de voz');
});

test('Gemini no insiste con otros modelos si la clave es inválida', () => {
  const { post, token, props, fetchCalls } = ready({ geminiResponder: (url) => (url.includes('/models?') ? { code: 400, body: {} } : { code: 400, body: { error: { message: 'API key not valid' } } }) });
  props.set('GEMINI_API_KEY', 'K'); props.set('GEMINI_MODELS', 'gemini-a,gemini-b');
  const r = post({ action: 'ai.generate', token, model: 'gemini-flash-latest', body: { contents: [{ parts: [{ text: 'x' }] }] } });
  assert.equal(r.error.status, 400); assert.equal(fetchCalls.filter((c) => c.url.includes(':generateContent')).length, 1);
});

test('reenviar un cambio ya guardado no crea conflicto (idempotente)', () => {
  const { post, token } = ready();
  const idea = rec('CNT-aa11-cc33', { title: 'Una', status: 'idea' });
  const op = { key: 'k', table: 'ideas', id: idea.id, baseVersion: 0, record: idea };
  assert.equal(post({ action: 'sync', token, ops: [op] }).applied.length, 1);
  const again = post({ action: 'sync', token, ops: [op] });
  assert.deepEqual(again.applied, ['k']); assert.equal(again.conflicts.length, 0);
});

test('crea al vuelo la hoja de una tabla nueva si falta (actualización sin reinstalar)', () => {
  const { post, token, sheets } = ready();
  sheets.delete('DocumentosMarca');
  const doc = rec('DOC-aa11bb22-buyer', { docType: 'buyer', title: 'Buyer persona', content: '# Buyer\n\n## Perfil\nLaura', active: true, order: 3, tasks: ['ideas', 'guion'] });
  const r = post({ action: 'sync', token, since: '', ops: [{ key: 'brandDocs:' + doc.id, table: 'brandDocs', id: doc.id, baseVersion: 0, record: doc }] });
  assert.equal(r.ok, true); assert.equal(r.applied.length, 1);
  assert.ok(sheets.get('DocumentosMarca'));
  const got = r.changes.find((c) => c.table === 'brandDocs').record;
  assert.deepEqual(got.tasks, ['ideas', 'guion']); assert.equal(got.active, true); assert.equal(got.order, 3);
});
