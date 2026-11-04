/**
 * Content Studio — Backend en Google Apps Script
 * ------------------------------------------------
 * - Base de datos: hojas de Google Sheets (una por tabla).
 * - Sincronización offline-first con control optimista de concurrencia (versiones).
 * - Proxy seguro para Gemini: la API Key vive en Script Properties, nunca en el navegador.
 * - Autenticación por token (Script Property ACCESS_TOKENS) con roles: admin, editor, viewer.
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   ACCESS_TOKENS   JSON: {"<token>": {"name": "Ana", "role": "admin"}}   (usa createToken())
 *   GEMINI_API_KEY     Clave de Google AI Studio (opcional)
 *   ANTHROPIC_API_KEY  Clave de la API de Claude (opcional; platform.claude.com)
 *   AI_EFFORT          Esfuerzo de Claude: low | medium | high (por defecto low)
 *   GEMINI_MODELS      Opcional: modelos de reserva de Gemini separados por comas
 *   SPREADSHEET_ID  Solo si el script NO está vinculado a la hoja
 *   AI_DAILY_LIMIT  Solicitudes de IA por token y día (por defecto 300)
 *   AI_MAX_TOKENS   Máximo de tokens de salida por solicitud (por defecto 16384)
 *
 * INSTALACIÓN: ejecuta la función instalar() (es la primera de la lista) y sigue
 * GUIA-DE-INSTALACION.html.
 */

/**
 * PASO ÚNICO DE INSTALACIÓN. Elige "instalar" en la lista de funciones y pulsa Ejecutar.
 * Crea todas las pestañas en la hoja y genera tu token de administrador.
 * El token aparece abajo, en el "Registro de ejecución".
 */
function instalar() {
  var r = setup_();
  var token = createToken('Administrador', 'admin');
  var hasKey = !!PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  var msg = [
    '',
    '==================== INSTALACIÓN COMPLETADA ====================',
    'Pestañas creadas: ' + r.created.length + ' · ya existentes: ' + r.checked.length,
    '',
    'TU TOKEN (cópialo y guárdalo en un lugar seguro):',
    token,
    '',
    'Gemini: ' + (hasKey ? 'clave configurada ✔' : 'sin clave todavía (paso 4 de la guía)'),
    '',
    'SIGUIENTE PASO: Implementar → Nueva implementación → Aplicación web.',
    '================================================================',
  ].join('\n');
  console.log(msg);
  return token;
}

var VERSION = '1.3.0';
var BASE = ['id', 'brandId', 'createdAt', 'updatedAt', 'deletedAt', 'version', 'updatedBy'];
var SERVER_COLS = ['syncedAt'];
var MAX_CELL = 49000;
var PULL_LIMIT = 1500;

// Debe coincidir con js/core/schema.js
var TABLES = {
  brands:         { sheet: 'Marcas',         prefix: 'MRC', cols: ['name', 'description', 'sector', 'valueProp', 'products', 'businessGoals', 'audience', 'painPoints', 'color', 'status', 'logoAssetId'] },
  brandConfigs:   { sheet: 'ConfigMarca',    prefix: 'CFG', cols: ['voice', 'visual', 'strategy'], json: ['voice', 'visual', 'strategy'] },
  platforms:      { sheet: 'Plataformas',    prefix: 'PLT', cols: ['platform', 'goal', 'formats', 'durationTarget', 'frequencyPerWeek', 'ctas', 'active'], json: ['formats', 'ctas'], num: ['durationTarget', 'frequencyPerWeek'], bool: ['active'] },
  pillars:        { sheet: 'Pilares',        prefix: 'PIL', cols: ['name', 'description', 'objective', 'share'], num: ['share'] },
  ideas:          { sheet: 'Ideas',          prefix: 'CNT', cols: ['title', 'topic', 'pillarId', 'audience', 'problem', 'keyword', 'objective', 'funnel', 'contentType', 'platforms', 'format', 'priority', 'status', 'difficulty', 'experimental', 'knowledgeLevel', 'owner', 'targetDate', 'references', 'notes', 'source', 'statusHistory'], json: ['platforms', 'statusHistory'], num: ['priority', 'knowledgeLevel'], bool: ['experimental'], required: ['title', 'status'] },
  scripts:        { sheet: 'Guiones',        prefix: 'GUI', cols: ['ideaId', 'currentVersionId', 'approvedVersionId', 'locked', 'publishFilter'], json: ['publishFilter'], bool: ['locked'], required: ['ideaId'] },
  scriptVersions: { sheet: 'VersionesGuion', prefix: 'VER', cols: ['scriptId', 'ideaId', 'versionNo', 'label', 'origin', 'data', 'evaluation'], json: ['data', 'evaluation'], num: ['versionNo'], required: ['scriptId', 'ideaId'] },
  productions:    { sheet: 'Produccion',     prefix: 'PRD', cols: ['ideaId', 'scriptVersionId', 'scenes', 'props', 'checklist', 'crewNotes', 'observations', 'recordedAt'], json: ['scenes', 'props', 'checklist'], required: ['ideaId'] },
  editions:       { sheet: 'Edicion',        prefix: 'EDI', cols: ['ideaId', 'scriptVersionId', 'guide', 'scenes', 'checklist', 'editor', 'observations', 'readyAt'], json: ['guide', 'scenes', 'checklist'], required: ['ideaId'] },
  copies:         { sheet: 'Copies',         prefix: 'CPY', cols: ['ideaId', 'platform', 'title', 'caption', 'description', 'ctaText', 'hashtags', 'coverText', 'variant', 'status'], json: ['hashtags'], num: ['variant'], required: ['ideaId', 'platform'] },
  calendar:       { sheet: 'Calendario',     prefix: 'CAL', cols: ['ideaId', 'platform', 'date', 'time', 'owner', 'status', 'notes'], required: ['ideaId', 'platform', 'date'] },
  publications:   { sheet: 'Publicaciones',  prefix: 'PUB', cols: ['ideaId', 'calendarId', 'platform', 'publishedAt', 'url', 'notes'], required: ['ideaId', 'platform'] },
  results:        { sheet: 'Resultados',     prefix: 'RES', cols: ['publicationId', 'ideaId', 'platform', 'measuredAt', 'daysSincePublish', 'metrics', 'notes'], json: ['metrics'], num: ['daysSincePublish'], required: ['ideaId'] },
  references:     { sheet: 'Referencias',    prefix: 'REF', cols: ['ideaId', 'kind', 'title', 'url', 'metrics', 'notes'] },
  hooks:          { sheet: 'Hooks',          prefix: 'HOK', cols: ['layer', 'patternId', 'text', 'objective', 'status', 'notes', 'sourceIdeaId'] },
  ctas:           { sheet: 'CTA',            prefix: 'CTA', cols: ['type', 'text', 'objective', 'status', 'notes'] },
  assets:         { sheet: 'Recursos',       prefix: 'AST', cols: ['kind', 'name', 'url', 'notes'] },
  history:        { sheet: 'Historial',      prefix: 'HIS', cols: ['table', 'recordId', 'action', 'before', 'summary'], json: ['before'], appendOnly: true },
};
var STATUS_VALUES = ['idea', 'aprobada', 'guion', 'guion_aprobado', 'por_grabar', 'grabado', 'edicion', 'listo', 'calendarizado', 'publicado', 'analizado', 'descartada'];

// ================== Entrada HTTP ==================

function doGet() {
  return json_({ ok: true, app: 'content-studio', version: VERSION, message: 'Usa POST con un token para acceder a los datos.' });
}

function doPost(e) {
  var started = Date.now();
  try {
    if (!e || !e.postData || !e.postData.contents) throw err_('BAD_REQUEST', 'Cuerpo vacío');
    var req;
    try { req = JSON.parse(e.postData.contents); } catch (x) { throw err_('BAD_REQUEST', 'JSON inválido'); }
    var user = auth_(req.token);
    var action = String(req.action || '');
    var out;
    switch (action) {
      case 'ping': out = ping_(user); break;
      case 'setup': requireRole_(user, ['admin', 'editor']); out = setup_(); break;
      case 'sync': out = sync_(user, req); break;
      case 'ai.generate': requireRole_(user, ['admin', 'editor']); out = aiGenerate_(user, req); break;
      case 'ai.models': requireRole_(user, ['admin', 'editor']); out = aiModels_(req); break;
      default: throw err_('UNKNOWN_ACTION', 'Acción desconocida: ' + action);
    }
    out.ok = true;
    out.ms = Date.now() - started;
    return json_(out);
  } catch (x) {
    var code = x.code || 'SERVER_ERROR';
    if (code === 'SERVER_ERROR') console.error(x && x.stack || x);
    return json_({ ok: false, error: { code: code, message: x.message || String(x), status: x.status || null, details: x.details || null } });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function err_(code, message, extra) {
  var e = new Error(message); e.code = code;
  if (extra) { e.status = extra.status; e.details = extra.details; }
  return e;
}

// ================== Autenticación ==================

function tokens_() {
  var raw = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKENS');
  if (!raw) throw err_('NOT_SETUP', 'El servidor no tiene tokens configurados. Ejecuta createToken() en el editor de Apps Script.');
  try { return JSON.parse(raw); } catch (x) { throw err_('NOT_SETUP', 'ACCESS_TOKENS no es un JSON válido.'); }
}
function auth_(token) {
  if (!token || typeof token !== 'string' || token.length < 24) throw err_('UNAUTHORIZED', 'Token ausente o inválido.');
  var all = tokens_();
  var u = all[token];
  if (!u || u.disabled) {
    Utilities.sleep(400); // frena ataques de fuerza bruta
    throw err_('UNAUTHORIZED', 'Token no autorizado.');
  }
  return { name: u.name || 'usuario', role: u.role || 'editor', hash: hash_(token) };
}
function requireRole_(user, roles) {
  if (roles.indexOf(user.role) === -1) throw err_('FORBIDDEN', 'Tu rol (' + user.role + ') no permite esta acción.');
}
function hash_(s) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s).slice(0, 8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

/** Ejecuta en el editor: crea un token y lo muestra en el registro (Ver → Registros). */
function createToken(name, role) {
  name = name || 'Administrador'; role = role || 'admin';
  var props = PropertiesService.getScriptProperties();
  var all = JSON.parse(props.getProperty('ACCESS_TOKENS') || '{}');
  var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  all[token] = { name: name, role: role, createdAt: new Date().toISOString() };
  props.setProperty('ACCESS_TOKENS', JSON.stringify(all));
  console.log('Token para ' + name + ' (' + role + '): ' + token);
  return token;
}
/** Revoca un token (pásale el token completo). */
function revokeToken(token) {
  var props = PropertiesService.getScriptProperties();
  var all = JSON.parse(props.getProperty('ACCESS_TOKENS') || '{}');
  if (all[token]) { all[token].disabled = true; props.setProperty('ACCESS_TOKENS', JSON.stringify(all)); console.log('Revocado'); }
}

// ================== Hojas ==================

function ss_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw err_('NOT_SETUP', 'No hay hoja vinculada. Crea el script desde la hoja (Extensiones → Apps Script) o define SPREADSHEET_ID.');
  return ss;
}
function headers_(t) { return BASE.concat(TABLES[t].cols).concat(SERVER_COLS); }

function setup_() {
  var ss = ss_(); var created = []; var checked = [];
  Object.keys(TABLES).forEach(function (t) {
    var def = TABLES[t]; var sh = ss.getSheetByName(def.sheet); var hs = headers_(t);
    if (!sh) {
      sh = ss.insertSheet(def.sheet); created.push(def.sheet);
      sh.getRange(1, 1, 1, hs.length).setValues([hs]);
    } else {
      checked.push(def.sheet);
      var cur = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].filter(String);
      var missing = hs.filter(function (h) { return cur.indexOf(h) === -1; });
      if (missing.length) sh.getRange(1, cur.length + 1, 1, missing.length).setValues([missing]);
    }
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, sh.getLastColumn()).setFontWeight('bold').setBackground('#eef0ff');
    // Texto plano: evita que Sheets convierta fechas, horas o números.
    sh.getRange(1, 1, sh.getMaxRows(), sh.getLastColumn()).setNumberFormat('@');
    if (t === 'ideas') {
      var col = headers_(t).indexOf('status') + 1;
      var rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS_VALUES, true).setAllowInvalid(false).build();
      sh.getRange(2, col, sh.getMaxRows() - 1, 1).setDataValidation(rule);
    }
  });
  var meta = ss.getSheetByName('_Meta') || ss.insertSheet('_Meta');
  meta.getRange(1, 1, 4, 2).setValues([['app', 'content-studio'], ['schemaVersion', VERSION], ['setupAt', new Date().toISOString()], ['aviso', 'No edites las columnas id, version ni syncedAt a mano. Para borrar, rellena deletedAt.']]);
  return { created: created, checked: checked };
}

function readTable_(t) {
  var sh = ss_().getSheetByName(TABLES[t].sheet);
  if (!sh) throw err_('NOT_SETUP', 'Falta la hoja "' + TABLES[t].sheet + '". Pulsa "Crear/verificar hojas" en Ajustes.');
  var values = sh.getDataRange().getValues();
  var header = values[0] || [];
  var idx = {}; header.forEach(function (h, i) { if (h) idx[h] = i; });
  var rows = []; var byId = {};
  for (var r = 1; r < values.length; r++) {
    var id = values[r][idx.id];
    if (!id) continue;
    byId[id] = rows.length; // índice en rows
    rows.push({ row: r + 1, values: values[r] });
  }
  return { sheet: sh, header: header, idx: idx, rows: rows, byId: byId };
}

function toRecord_(t, tb, values) {
  var def = TABLES[t]; var rec = {};
  tb.header.forEach(function (h, i) {
    if (!h) return;
    var v = values[i];
    if (v instanceof Date) v = v.toISOString();
    if (v === '' || v === null) { rec[h] = (def.json || []).indexOf(h) >= 0 ? null : (h === 'deletedAt' ? null : ''); return; }
    if ((def.json || []).indexOf(h) >= 0) { try { rec[h] = JSON.parse(v); } catch (x) { rec[h] = null; } return; }
    if (h === 'version' || (def.num || []).indexOf(h) >= 0) { var n = Number(v); rec[h] = isNaN(n) ? null : n; return; }
    if ((def.bool || []).indexOf(h) >= 0) { rec[h] = v === true || v === 'true' || v === 'TRUE'; return; }
    rec[h] = String(v);
  });
  return rec;
}

function toRow_(t, tb, rec, syncedAt) {
  var def = TABLES[t];
  return tb.header.map(function (h) {
    if (!h) return '';
    if (h === 'syncedAt') return syncedAt;
    var v = rec[h];
    if (v === undefined || v === null) return '';
    if ((def.json || []).indexOf(h) >= 0) v = JSON.stringify(v);
    else if (typeof v === 'object') v = JSON.stringify(v);
    else v = String(v);
    if (v.length > MAX_CELL) throw err_('TOO_LARGE', 'El campo "' + h + '" de ' + rec.id + ' supera el tamaño máximo de una celda (' + MAX_CELL + ' caracteres).');
    return v;
  });
}

// ================== Validación ==================

function validate_(t, op) {
  var def = TABLES[t];
  if (!def) throw err_('VALIDATION', 'Tabla no permitida: ' + t);
  var r = op.record;
  if (!r || typeof r !== 'object') throw err_('VALIDATION', 'Registro vacío');
  if (r.id !== op.id) throw err_('VALIDATION', 'El id del registro no coincide con la operación');
  if (!new RegExp('^' + def.prefix + '-[a-z0-9]+-[a-z0-9]+$').test(String(r.id))) throw err_('VALIDATION', 'Id con formato inválido: ' + r.id);
  if (t !== 'brands' && !r.brandId) throw err_('VALIDATION', 'Falta brandId en ' + r.id);
  if (t === 'brands' && r.brandId !== r.id) throw err_('VALIDATION', 'En marcas, brandId debe ser igual al id');
  if (typeof r.version !== 'number' || r.version < 1 || Math.floor(r.version) !== r.version) throw err_('VALIDATION', 'Versión inválida en ' + r.id);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(String(r.createdAt)) || !/^\d{4}-\d{2}-\d{2}T/.test(String(r.updatedAt))) throw err_('VALIDATION', 'Fechas inválidas en ' + r.id);
  (def.required || []).forEach(function (f) { if (r[f] === undefined || r[f] === null || r[f] === '') throw err_('VALIDATION', 'Falta el campo obligatorio "' + f + '" en ' + r.id); });
  if (t === 'ideas' && STATUS_VALUES.indexOf(r.status) === -1) throw err_('VALIDATION', 'Estado no válido: ' + r.status);
  if (t === 'calendar' && !/^\d{4}-\d{2}-\d{2}$/.test(String(r.date))) throw err_('VALIDATION', 'Fecha de calendario inválida: ' + r.date);
}

// ================== Sincronización ==================

function sync_(user, req) {
  var ops = Array.isArray(req.ops) ? req.ops : [];
  if (ops.length && user.role === 'viewer') throw err_('FORBIDDEN', 'El rol "viewer" solo puede leer.');
  if (ops.length > 200) throw err_('VALIDATION', 'Demasiadas operaciones en un lote (máx. 200).');
  var since = typeof req.since === 'string' ? req.since : '';
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw err_('BUSY', 'El servidor está ocupado con otra sincronización. Reintenta en unos segundos.');
  try {
    var now = new Date().toISOString();
    var applied = []; var conflicts = []; var rejected = [];
    var byTable = {};
    ops.forEach(function (op) { (byTable[op.table] = byTable[op.table] || []).push(op); });
    Object.keys(byTable).forEach(function (t) {
      if (!TABLES[t]) { byTable[t].forEach(function (op) { rejected.push({ key: op.key, reason: 'Tabla no permitida' }); }); return; }
      var tb = readTable_(t); var appends = [];
      byTable[t].forEach(function (op) {
        try {
          validate_(t, op);
          var ri = tb.byId[op.id];
          if (ri === -1) { applied.push(op.key); return; } // duplicado dentro del mismo lote
          if (ri !== undefined) {
            if (TABLES[t].appendOnly) { applied.push(op.key); return; } // ya existe: idempotente
            var entry = tb.rows[ri];
            var cur = toRecord_(t, tb, entry.values);
            delete cur.syncedAt;
            var serverV = Number(cur.version) || 0;
            // Reenvío de un cambio que ya se guardó (p. ej. la respuesta anterior se perdió): idempotente.
            if (serverV === Number(op.record.version) && String(cur.updatedAt) === String(op.record.updatedAt) && String(cur.updatedBy) === String(op.record.updatedBy)) { applied.push(op.key); return; }
            if (serverV > (Number(op.baseVersion) || 0)) { conflicts.push({ table: t, id: op.id, server: cur }); return; }
            var rowVals = toRow_(t, tb, op.record, now);
            tb.sheet.getRange(entry.row, 1, 1, tb.header.length).setValues([rowVals]);
            entry.values = rowVals;
          } else {
            appends.push(toRow_(t, tb, op.record, now));
            tb.byId[op.id] = -1;
          }
          applied.push(op.key);
        } catch (x) {
          rejected.push({ key: op.key, reason: x.message });
        }
      });
      if (appends.length) {
        var start = tb.sheet.getLastRow() + 1;
        tb.sheet.getRange(start, 1, appends.length, tb.header.length).setNumberFormat('@').setValues(appends);
      }
    });
    SpreadsheetApp.flush();

    // Cambios remotos desde "since"
    // Se reúnen candidatos de todas las tablas y se ordenan globalmente por syncedAt, para que la
    // paginación (cursor = syncedAt) nunca se salte registros de otras tablas ni del mismo instante.
    var cand = [];
    Object.keys(TABLES).forEach(function (t) {
      var tb2 = readTable_(t); var sIdx = tb2.idx.syncedAt;
      tb2.rows.forEach(function (r) { var s = String(r.values[sIdx] || ''); if (!since || s > since) cand.push({ t: t, tb: tb2, values: r.values, s: s }); });
    });
    cand.sort(function (a, b) { return a.s < b.s ? -1 : a.s > b.s ? 1 : 0; });
    var changes = []; var more = false; var maxSynced = since;
    for (var j = 0; j < cand.length; j++) {
      if (changes.length >= PULL_LIMIT && cand[j].s !== maxSynced) { more = true; break; }
      var rec = toRecord_(cand[j].t, cand[j].tb, cand[j].values);
      delete rec.syncedAt;
      changes.push({ table: cand[j].t, record: rec });
      if (cand[j].s > maxSynced) maxSynced = cand[j].s;
    }
    return {
      applied: applied, conflicts: conflicts, rejected: rejected, changes: changes, more: more,
      serverTime: more ? maxSynced : (maxSynced > now ? maxSynced : now),
    };
  } finally {
    lock.releaseLock();
  }
}

function ping_(user) {
  var props = PropertiesService.getScriptProperties();
  var name = '';
  try { name = ss_().getName(); } catch (x) { name = '(sin hoja: ' + x.message + ')'; }
  return { user: { name: user.name, role: user.role }, spreadsheet: name, gemini: !!props.getProperty('GEMINI_API_KEY'), claude: !!props.getProperty('ANTHROPIC_API_KEY'), version: VERSION };
}

// ================== Gemini (proxy) ==================

var GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

function geminiKey_() {
  var k = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!k) throw err_('AI_NOT_CONFIGURED', 'Falta GEMINI_API_KEY en las propiedades del script.');
  return k;
}

function countAi_(user) {
  var props = PropertiesService.getScriptProperties();
  var limit = Number(props.getProperty('AI_DAILY_LIMIT') || 300);
  var day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
  var key = 'ai_' + user.hash + '_' + day;
  var lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    var n = Number(props.getProperty(key) || 0);
    if (limit && n >= limit) throw err_('RATE_LIMIT', 'Has alcanzado el límite diario de IA del servidor (' + limit + ').', { status: 429 });
    props.setProperty(key, String(n + 1));
    if (Math.random() < 0.05) cleanupCounters_(props, day);
  } finally { lock.releaseLock(); }
}
function cleanupCounters_(props, day) {
  var all = props.getProperties();
  Object.keys(all).forEach(function (k) { if (k.indexOf('ai_') === 0 && k.slice(-10) !== day) props.deleteProperty(k); });
}

// Proveedor de IA: "gemini" (Google AI Studio) o "claude" (API de Anthropic).
// El navegador siempre envía el formato de Gemini; para Claude se traduce aquí y la
// respuesta se devuelve con la misma forma, así la app no necesita saber qué proveedor se usó.
function aiGenerate_(user, req) {
  var provider = String(req.provider || 'gemini');
  var b = req.body || {};
  if (!Array.isArray(b.contents) || !b.contents.length) throw err_('VALIDATION', 'Faltan "contents".');
  if (JSON.stringify(b).length > 900000) throw err_('TOO_LARGE', 'La solicitud es demasiado grande.');
  var maxTokens = Number(PropertiesService.getScriptProperties().getProperty('AI_MAX_TOKENS') || 16384);
  if (provider === 'claude') { claudeKey_(); countAi_(user); return { data: claudeGenerate_(req, b, maxTokens) }; }
  if (provider !== 'gemini') throw err_('VALIDATION', 'Proveedor de IA no permitido: ' + provider);
  var model = String(req.model || 'gemini-flash-latest');
  if (!/^gemini-[a-z0-9.\-]+$/i.test(model)) throw err_('VALIDATION', 'Modelo no permitido: ' + model);
  var gc = b.generationConfig || {};
  gc.maxOutputTokens = Math.min(Number(gc.maxOutputTokens) || 8192, maxTokens);
  var payload = { contents: b.contents, generationConfig: gc };
  if (b.systemInstruction) payload.systemInstruction = b.systemInstruction;
  // Solo se permite la herramienta de búsqueda de Google.
  if (Array.isArray(b.tools)) payload.tools = b.tools.filter(function (t) { return t && t.google_search; }).map(function () { return { google_search: {} }; });
  var key = geminiKey_();
  countAi_(user);
  // En el plan gratuito cada modelo tiene su propio límite y puede saturarse:
  // si uno falla por saturación, cuota o porque ya no existe, se prueba el siguiente.
  var candidates = geminiCandidates_(model, key);
  var errors = [];
  for (var i = 0; i < candidates.length; i++) {
    var m = candidates[i];
    var res = UrlFetchApp.fetch(GEMINI_BASE + '/models/' + encodeURIComponent(m) + ':generateContent', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      headers: { 'x-goog-api-key': key }, payload: JSON.stringify(payload),
    });
    var code = res.getResponseCode();
    var data; try { data = JSON.parse(res.getContentText()); } catch (x) { data = null; }
    if (code === 200) { data.usedModel = m; data.triedModels = errors; return { data: data }; }
    var gmsg = (data && data.error && data.error.message) || ('respondió ' + code);
    errors.push({ model: m, status: code, message: String(gmsg).slice(0, 300) });
    // Clave inválida, permisos o solicitud mal formada: probar otro modelo no ayuda.
    if (code === 400 || code === 401 || code === 403) break;
  }
  var last = errors[errors.length - 1] || { status: 500, message: 'sin respuesta' };
  var summary = errors.map(function (e) { return e.model + ' → ' + e.status + ' (' + e.message + ')'; }).join(' | ');
  throw err_('AI_ERROR', 'Gemini no respondió con ninguno de los modelos probados: ' + summary, { status: last.status, details: summary });
}

/** Modelos a probar: el elegido primero y después los Flash/Flash-Lite disponibles en la cuenta. */
function geminiCandidates_(model, key) {
  var props = PropertiesService.getScriptProperties();
  var custom = props.getProperty('GEMINI_MODELS'); // opcional: lista separada por comas
  var list = [model];
  if (custom) list = list.concat(custom.split(',').map(function (x) { return x.trim(); }).filter(String));
  else {
    var available = geminiAvailable_(key);
    var pick = function (re) { return available.filter(function (n) { return re.test(n); }); };
    list = list.concat(['gemini-flash-lite-latest', 'gemini-flash-latest'].filter(function (n) { return available.indexOf(n) !== -1; }),
      pick(/flash-lite/), pick(/flash/));
  }
  var seen = {}; var out = [];
  list.forEach(function (n) { if (n && !seen[n]) { seen[n] = true; out.push(n); } });
  return out.slice(0, 4);
}

/** Lista de modelos de texto disponibles para la clave (se guarda 6 h en caché). */
function geminiAvailable_(key) {
  var cache = CacheService.getScriptCache();
  var hit = cache && cache.get('gemini_models');
  if (hit) return JSON.parse(hit);
  var names = [];
  try {
    var res = UrlFetchApp.fetch(GEMINI_BASE + '/models?pageSize=200', { muteHttpExceptions: true, headers: { 'x-goog-api-key': key } });
    if (res.getResponseCode() === 200) {
      names = (JSON.parse(res.getContentText()).models || [])
        .filter(function (m) { return (m.supportedGenerationMethods || []).indexOf('generateContent') !== -1; })
        .map(function (m) { return String(m.name).replace('models/', ''); })
        .filter(function (n) { return /^gemini-/.test(n) && !/tts|image|live|audio|embedding|robotics|computer|exp/.test(n); })
        .sort().reverse(); // versiones más nuevas primero
    }
  } catch (x) { names = []; }
  if (cache && names.length) cache.put('gemini_models', JSON.stringify(names), 21600);
  return names;
}

/** Ejecuta en el editor: prueba Gemini con cada modelo y muestra qué funciona con tu clave. */
function diagnosticarGemini() {
  var key = geminiKey_();
  var models = geminiAvailable_(key);
  console.log('Modelos de texto disponibles para tu clave (' + models.length + '): ' + models.join(', '));
  ['gemini-flash-latest', 'gemini-flash-lite-latest'].concat(models.slice(0, 6)).forEach(function (m) {
    var res = UrlFetchApp.fetch(GEMINI_BASE + '/models/' + encodeURIComponent(m) + ':generateContent', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: { 'x-goog-api-key': key },
      payload: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Responde solo: ok' }] }], generationConfig: { maxOutputTokens: 50 } }),
    });
    var code = res.getResponseCode(); var msg = '';
    try { var d = JSON.parse(res.getContentText()); msg = code === 200 ? 'FUNCIONA' : (d.error && d.error.message); } catch (x) { msg = res.getContentText().slice(0, 120); }
    console.log((code === 200 ? '✔ ' : '✘ ') + m + ' → ' + code + ' ' + String(msg).slice(0, 160));
  });
}

function aiModels_(req) {
  if ((req && req.provider) === 'claude') return claudeModels_();
  var res = UrlFetchApp.fetch(GEMINI_BASE + '/models?pageSize=200', { muteHttpExceptions: true, headers: { 'x-goog-api-key': geminiKey_() } });
  var code = res.getResponseCode(); var data = JSON.parse(res.getContentText() || '{}');
  if (code !== 200) throw err_('AI_ERROR', (data.error && data.error.message) || ('Gemini respondió ' + code), { status: code });
  return { models: (data.models || []).map(function (m) { return { name: m.name, displayName: m.displayName, description: m.description, supportedGenerationMethods: m.supportedGenerationMethods }; }) };
}

// ================== Claude (API de Anthropic, HTTP directo) ==================
// Apps Script no tiene SDK oficial de Anthropic, por eso se usa la API REST.

var ANTHROPIC_BASE = 'https://api.anthropic.com/v1';
var ANTHROPIC_VERSION = '2026-10-21';
// Modelos que aceptan la recuperación automática ante rechazos (fallbacks: "default").
var CLAUDE_FALLBACK_MODELS = ['claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5', 'claude-fable-5-1'];

function claudeKey_() {
  var k = PropertiesService.getScriptProperties().getProperty('ANTHROPIC_API_KEY');
  if (!k) throw err_('AI_NOT_CONFIGURED', 'Falta ANTHROPIC_API_KEY en las propiedades del script.');
  return k;
}

function claudeHeaders_(withFallback) {
  var h = { 'x-api-key': claudeKey_(), 'anthropic-version': ANTHROPIC_VERSION };
  if (withFallback) h['anthropic-beta'] = 'server-side-fallback-2026-07-01';
  return h;
}

function claudeGenerate_(req, b, maxTokens) {
  var model = String(req.model || 'claude-opus-5-5');
  if (!/^claude-[a-z0-9.\-]+$/i.test(model)) throw err_('VALIDATION', 'Modelo no permitido: ' + model);
  var gc = b.generationConfig || {};
  var textOf = function (c) { return ((c && c.parts) || []).map(function (p) { return p.text || ''; }).join('\n'); };
  var system = textOf(b.systemInstruction);
  if (gc.responseMimeType === 'application/json') {
    system += '\n\nFORMATO DE SALIDA: responde únicamente con un objeto JSON válido. Sin texto antes ni después y sin bloques de código.';
  }
  var payload = {
    model: model,
    max_tokens: Math.min(Number(gc.maxOutputTokens) || 8192, maxTokens),
    messages: b.contents.map(function (c) { return { role: c.role === 'model' ? 'assistant' : 'user', content: textOf(c) }; }),
    // "low" responde rápido y basta para redactar; se puede cambiar con la propiedad AI_EFFORT.
    output_config: { effort: PropertiesService.getScriptProperties().getProperty('AI_EFFORT') || 'low' },
  };
  if (system) payload.system = system;
  var withFallback = CLAUDE_FALLBACK_MODELS.indexOf(model) !== -1;
  if (withFallback) payload.fallbacks = 'default';
  if (Array.isArray(b.tools) && b.tools.some(function (t) { return t && t.google_search; })) {
    payload.tools = [{ type: /haiku/.test(model) ? 'web_search_20250305' : 'web_search_20260209', name: 'web_search', max_uses: 5 }];
  }
  var res = UrlFetchApp.fetch(ANTHROPIC_BASE + '/messages', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: claudeHeaders_(withFallback), payload: JSON.stringify(payload), timeoutSeconds: 300,
  });
  var code = res.getResponseCode();
  var data; try { data = JSON.parse(res.getContentText()); } catch (x) { data = null; }
  if (code !== 200) {
    var type = data && data.error && data.error.type;
    var msg = (data && data.error && data.error.message) || ('Claude respondió ' + code);
    var friendly = {
      authentication_error: 'La clave de Claude (ANTHROPIC_API_KEY) no es válida.',
      billing_error: 'Tu cuenta de la API de Anthropic no tiene crédito. Añade saldo en platform.claude.com → Billing.',
      permission_error: 'Tu clave de Claude no tiene permiso para este modelo.',
      not_found_error: 'Modelo de Claude no encontrado: ' + model + '.',
      rate_limit_error: 'Límite de uso de Claude alcanzado. Espera un momento.',
      overloaded_error: 'Claude está saturado en este momento. Inténtalo en unos segundos.',
    }[type];
    throw err_('AI_ERROR', 'Claude (' + model + '): ' + (friendly || msg), { status: code, details: msg });
  }
  if (data.stop_reason === 'refusal') throw err_('AI_ERROR', 'Claude rechazó la solicitud por sus filtros de seguridad. Reformula el contenido.', { status: 400 });
  var text = (data.content || []).filter(function (c) { return c.type === 'text'; }).map(function (c) { return c.text; }).join('');
  var sources = [];
  (data.content || []).forEach(function (c) {
    if (c.type === 'web_search_tool_result' && Array.isArray(c.content)) {
      c.content.forEach(function (r) { if (r.url) sources.push({ web: { uri: r.url, title: r.title || r.url } }); });
    }
  });
  var finish = { end_turn: 'STOP', stop_sequence: 'STOP', max_tokens: 'MAX_TOKENS', pause_turn: 'STOP' }[data.stop_reason] || 'STOP';
  var u = data.usage || {};
  // Misma forma que una respuesta de Gemini.
  return {
    candidates: [{ content: { parts: [{ text: text }] }, finishReason: finish, groundingMetadata: { groundingChunks: sources } }],
    usageMetadata: { totalTokenCount: (u.input_tokens || 0) + (u.output_tokens || 0) },
    modelVersion: data.model,
  };
}

function claudeModels_() {
  var res = UrlFetchApp.fetch(ANTHROPIC_BASE + '/models?limit=100', { muteHttpExceptions: true, headers: claudeHeaders_(false) });
  var code = res.getResponseCode(); var data = JSON.parse(res.getContentText() || '{}');
  if (code !== 200) throw err_('AI_ERROR', 'Claude: ' + ((data.error && data.error.message) || ('respondió ' + code)), { status: code });
  return { models: (data.data || []).map(function (m) { return { name: m.id, displayName: m.display_name || m.id, description: '', supportedGenerationMethods: ['generateContent'] }; }) };
}

/** Ejecuta en el editor para comprobar la clave de Claude. */
function testClaude() {
  var r = claudeGenerate_({ model: 'claude-opus-5-5' }, { contents: [{ role: 'user', parts: [{ text: 'Di "hola" en una palabra.' }] }], generationConfig: { maxOutputTokens: 200 } }, 200);
  var txt = r.candidates[0].content.parts[0].text;
  console.log('Claude responde: ' + txt);
  return txt;
}

// ================== Utilidades para el editor ==================


function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Content Studio')
      .addItem('Crear / verificar hojas', 'menuSetup')
      .addItem('Generar token de administrador', 'menuToken')
      .addItem('Probar Gemini', 'testGemini')
      .addToUi();
  } catch (x) { /* sin interfaz (ejecución como web app) */ }
}
function menuSetup() { var r = setup_(); SpreadsheetApp.getUi().alert('Hojas creadas: ' + r.created.length + '. Verificadas: ' + r.checked.length + '.'); }
function menuToken() {
  var t = createToken('Administrador', 'admin');
  SpreadsheetApp.getUi().alert('Copia este token en la app (Ajustes → Conexión). No lo compartas:\n\n' + t);
}
function testGemini() {
  var r = aiGenerate_({ hash: 'editor-test' }, { model: 'gemini-flash-latest', body: { contents: [{ role: 'user', parts: [{ text: 'Di "hola" en una palabra.' }] }], generationConfig: { maxOutputTokens: 20 } } });
  var txt = r.data.candidates[0].content.parts[0].text;
  console.log(txt);
  try { SpreadsheetApp.getUi().alert('Gemini responde: ' + txt); } catch (x) { /* */ }
}
