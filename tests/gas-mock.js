// Simulador en memoria de los servicios de Google Apps Script para ejecutar Code.gs en Node.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

export function makeEnv({ geminiResponder } = {}) {
  const sheets = new Map();
  const props = new Map();
  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() { const out = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.data[this.r - 1 + i]?.[this.c - 1 + j] ?? ''); out.push(row); } return out; }
    setValues(v) { v.forEach((row, i) => { const ri = this.r - 1 + i; this.sh.data[ri] = this.sh.data[ri] || []; row.forEach((x, j) => { this.sh.data[ri][this.c - 1 + j] = x; }); }); return this; }
    setNumberFormat() { return this; } setFontWeight() { return this; } setBackground() { return this; } setDataValidation() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.data = []; }
    getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
    getDataRange() { return new Range(this, 1, 1, Math.max(1, this.data.length), this.getLastColumn() || 1); }
    getLastRow() { return this.data.length; }
    getLastColumn() { return Math.max(0, ...this.data.map((r) => r.length)); }
    getMaxRows() { return 1000; } setFrozenRows() {}
  }
  const ss = { getName: () => 'Hoja de prueba', getSheetByName: (n) => sheets.get(n) || null, insertSheet: (n) => { const s = new Sheet(n); sheets.set(n, s); return s; } };
  const fetchCalls = [];
  const cache = new Map();
  const ctx = {
    console: { log() {}, error() {} },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush() {}, newDataValidation: () => ({ requireValueInList() { return this; }, setAllowInvalid() { return this; }, build() { return {}; } }), getUi: () => { throw new Error('no ui'); } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (props.has(k) ? props.get(k) : null), setProperty: (k, v) => props.set(k, String(v)), deleteProperty: (k) => props.delete(k), getProperties: () => Object.fromEntries(props) }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ text: s, setMimeType() { return this; } }) },
    Utilities: { getUuid: () => crypto.randomUUID(), sleep() {}, DigestAlgorithm: { SHA_256: 'sha256' }, computeDigest: (_a, s) => [...crypto.createHash('sha256').update(s).digest()].map((b) => (b > 127 ? b - 256 : b)), formatDate: (d) => d.toISOString().slice(0, 10) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) || null, put: (k, v) => cache.set(k, v) }) },
    UrlFetchApp: { fetch: (url, opts) => { fetchCalls.push({ url, opts }); const r = geminiResponder ? geminiResponder(url, opts) : { code: 200, body: { candidates: [] } }; return { getResponseCode: () => r.code, getContentText: () => JSON.stringify(r.body) }; } },
  };
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  return { ctx, post, sheets, props, fetchCalls };
}

