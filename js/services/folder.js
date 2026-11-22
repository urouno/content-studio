// Carpeta «Reels con Claude» conectada desde el navegador (File System Access API: Chrome, Edge y Brave con
// brave://flags/#file-system-access-api activado). La app escribe ahí los encargos y los archivos de marca de la skill
// de edición, y lee lo que la skill entrega (FINAL - *.mp4, portada.png) para marcar los estados solos.
// El acceso a la carpeta se recuerda (IndexedDB); el permiso lo vuelve a pedir el navegador en cada sesión.
import { idb } from '../core/db.js';

const KEY = 'reelsFolder';
let root = null;

export const folderSupported = () => typeof window !== 'undefined' && typeof window.showDirectoryPicker === 'function';
export const isBrave = () => typeof navigator !== 'undefined' && !!navigator.brave;

/** Pide al usuario la carpeta «Reels con Claude» y la recuerda. */
export async function connectFolder() {
  const h = await window.showDirectoryPicker({ id: 'reels-con-claude', mode: 'readwrite' });
  await idb.put('meta', { key: KEY, handle: h, name: h.name, at: new Date().toISOString() });
  root = h;
  return h;
}
export async function disconnectFolder() { root = null; await idb.del('meta', KEY); }

/** {name, connected, granted} sin pedir nada al usuario. */
export async function folderState() {
  if (!folderSupported()) return { supported: false };
  const m = await idb.get('meta', KEY).catch(() => null);
  if (!m?.handle) return { supported: true, connected: false };
  root = m.handle;
  const p = await m.handle.queryPermission?.({ mode: 'readwrite' }).catch(() => 'prompt');
  return { supported: true, connected: true, granted: p === 'granted', name: m.name };
}

/** La carpeta, si hay permiso. Con `ask`, lo pide (tiene que venir de un clic del usuario). */
export async function getRoot({ ask = false } = {}) {
  if (!root) { const m = await idb.get('meta', KEY).catch(() => null); root = m?.handle || null; }
  if (!root) return null;
  let p = await root.queryPermission({ mode: 'readwrite' });
  if (p !== 'granted' && ask) p = await root.requestPermission({ mode: 'readwrite' });
  return p === 'granted' ? root : null;
}

const parts = (path) => String(path).split('/').filter(Boolean);

async function dirAt(path, { create = false } = {}) {
  let d = await getRoot();
  if (!d) throw new Error('La carpeta de reels no está conectada o falta el permiso (Ajustes → Carpeta de reels).');
  for (const name of parts(path)) {
    try { d = await d.getDirectoryHandle(name, { create }); } catch (e) { if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') return null; throw e; }
  }
  return d;
}
async function fileAt(path, { create = false } = {}) {
  const ps = parts(path); const name = ps.pop();
  const d = await dirAt(ps.join('/'), { create });
  if (!d) return null;
  try { return await d.getFileHandle(name, { create }); } catch (e) { if (e.name === 'NotFoundError' || e.name === 'TypeMismatchError') return null; throw e; }
}

export async function exists(path) { return !!(await fileAt(path)) || !!(await dirAt(path)); }
export async function readText(path) { const f = await fileAt(path); return f ? (await f.getFile()).text() : null; }
export async function readJSON(path) { const t = await readText(path); if (t == null) return null; try { return JSON.parse(t); } catch { return null; } }
export async function writeText(path, text) {
  const f = await fileAt(path, { create: true });
  const w = await f.createWritable(); await w.write(text); await w.close();
}
/** Copia un archivo (una toma de varios GB) sin cargarlo entero en memoria. */
export async function copyFile(path, file, onProgress) {
  const f = await fileAt(path, { create: true });
  const w = await f.createWritable();
  if (!onProgress) { await file.stream().pipeTo(w); return; } // pipeTo cierra el archivo al terminar
  let done = 0;
  const counter = new TransformStream({ transform(chunk, ctl) { done += chunk.byteLength; onProgress(done / file.size); ctl.enqueue(chunk); } });
  await file.stream().pipeThrough(counter).pipeTo(w);
}
/** [{name, kind, size?, modified?}] de una carpeta (vacío si no existe). */
export async function list(path = '') {
  const d = await dirAt(path); if (!d) return [];
  const out = [];
  for await (const [name, h] of d.entries()) {
    if (name.startsWith('.')) continue;
    if (h.kind === 'file') { const f = await h.getFile(); out.push({ name, kind: 'file', size: f.size, modified: f.lastModified }); } else out.push({ name, kind: 'directory' });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}
/** URL temporal para ver un archivo (video o imagen) en la app. */
export async function fileURL(path) { const f = await fileAt(path); return f ? URL.createObjectURL(await f.getFile()) : null; }

/** Comprueba que la carpeta elegida es la de la skill. */
export async function checkStructure() {
  const names = (await list('')).filter((x) => x.kind === 'directory').map((x) => x.name);
  const has = (n) => names.includes(n);
  return { misEstilo: has('Mi estilo'), tomas: has('Tomas'), reels: has('Reels'), marcas: has('Mi estilo') && (await exists('Mi estilo/marcas')), nested: has('Reels con Claude'), names };
}
