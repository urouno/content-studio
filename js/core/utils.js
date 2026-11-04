export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function uid(prefix = 'ID') {
  const rnd = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}

export const nowISO = () => new Date().toISOString();
export const todayISO = () => toDateKey(new Date());
export function toDateKey(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}
export function parseDateKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export function startOfWeek(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
export function daysBetween(a, b) { return Math.round((parseDateKey(toDateKey(b)) - parseDateKey(toDateKey(a))) / 86400000); }

const DF = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' });
const DTF = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtDate = (v) => (v ? DF.format(typeof v === 'string' && v.length === 10 ? parseDateKey(v) : new Date(v)) : '—');
export const fmtDateTime = (v) => (v ? DTF.format(new Date(v)) : '—');
export function fmtRelative(v) {
  if (!v) return 'nunca';
  const s = Math.round((Date.now() - new Date(v)) / 1000);
  if (s < 60) return 'hace unos segundos';
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return fmtDate(v);
}
export const fmtNum = (n, d = 0) => (n == null || Number.isNaN(n) ? '—' : Number(n).toLocaleString('es', { maximumFractionDigits: d }));
export const fmtPct = (n, d = 1) => (n == null || Number.isNaN(n) ? '—' : `${(n * 100).toLocaleString('es', { maximumFractionDigits: d })} %`);

export function debounce(fn, ms = 400) {
  let t; const d = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  d.flush = (...a) => { clearTimeout(t); fn(...a); };
  return d;
}

export const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

export function deepGet(obj, path) { return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj); }
export function deepSet(obj, path, val) {
  const keys = path.split('.'); let o = obj;
  keys.slice(0, -1).forEach((k) => { if (o[k] == null || typeof o[k] !== 'object') o[k] = {}; o = o[k]; });
  o[keys.at(-1)] = val; return obj;
}

export function wordCount(text) { return (String(text || '').trim().match(/[\p{L}\p{N}'’-]+/gu) || []).length; }
export function estimateSeconds(words, wpm = 160) { return Math.round((words / (wpm || 160)) * 60); }

export function median(arr) {
  const a = arr.filter((x) => typeof x === 'number' && !Number.isNaN(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export function normalizeText(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
const STOP = new Set('de la el los las un una unos unas y o a en con para por que como del al lo se su sus tu tus te mi mis es son esto este esta estos estas ese esa eso muy mas más pero si no ya le les nos hay qué cómo cuando donde sobre entre sin hasta desde'.split(' '));
export function tokens(s) { return normalizeText(s).split(' ').filter((w) => w.length > 2 && !STOP.has(w)); }
function trigrams(s) { const t = ` ${normalizeText(s)} `; const set = new Set(); for (let i = 0; i < t.length - 2; i++) set.add(t.slice(i, i + 3)); return set; }
function jaccard(a, b) { if (!a.size || !b.size) return 0; let i = 0; a.forEach((x) => { if (b.has(x)) i++; }); return i / (a.size + b.size - i); }
// Similitud 0..1 combinando palabras significativas y trigramas (robusto a plurales y erratas).
export function similarity(a, b) {
  const w = jaccard(new Set(tokens(a)), new Set(tokens(b)));
  const t = jaccard(trigrams(a), trigrams(b));
  return Math.round((0.6 * w + 0.4 * t) * 100) / 100;
}

export function download(filename, content, type = 'application/json') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {
    const ta = document.createElement('textarea'); ta.value = text; document.body.append(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  }
}

export function fileToDataUrl(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
}

export const splitList = (s) => String(s || '').split(/\n|,/).map((x) => x.trim()).filter(Boolean);
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
