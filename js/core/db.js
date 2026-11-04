// Envoltorio mínimo de IndexedDB con promesas.
import { TABLES } from './schema.js';

const DB_NAME = 'content-studio';
const DB_VERSION = 1;
export const SYSTEM_STORES = ['outbox', 'meta', 'conflicts'];
let dbp;

export function openDB(name = DB_NAME) {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(name, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      Object.keys(TABLES).forEach((t) => {
        if (!db.objectStoreNames.contains(t)) {
          const s = db.createObjectStore(t, { keyPath: 'id' });
          s.createIndex('brandId', 'brandId', { unique: false });
        }
      });
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'opId' });
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('conflicts')) db.createObjectStore('conflicts', { keyPath: 'key' });
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('La base de datos está bloqueada por otra pestaña. Ciérrala y recarga.'));
  });
  return dbp;
}

function tx(store, mode, fn) {
  return openDB().then((db) => new Promise((resolve, reject) => {
    const stores = Array.isArray(store) ? store : [store];
    const t = db.transaction(stores, mode);
    let result;
    Promise.resolve(fn(...stores.map((s) => t.objectStore(s)))).then((r) => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error('Transacción abortada (¿espacio insuficiente?)'));
  }));
}
const reqP = (r) => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const idb = {
  getAll: (store) => tx(store, 'readonly', (s) => reqP(s.getAll())),
  get: (store, key) => tx(store, 'readonly', (s) => reqP(s.get(key))),
  put: (store, value) => tx(store, 'readwrite', (s) => { s.put(value); }),
  putMany: (store, values) => tx(store, 'readwrite', (s) => { values.forEach((v) => s.put(v)); }),
  del: (store, key) => tx(store, 'readwrite', (s) => { s.delete(key); }),
  clear: (store) => tx(store, 'readwrite', (s) => { s.clear(); }),
  // Escritura atómica de un registro + su operación pendiente + historial.
  writeAtomic: (entries) => {
    // Sin cambios no se abre transacción (IndexedDB rechaza una transacción sin almacenes).
    if (!entries || !entries.length) return Promise.resolve();
    const stores = [...new Set(entries.map((e) => e.store))];
    return tx(stores, 'readwrite', (...objs) => {
      entries.forEach((e) => {
        const s = objs[stores.indexOf(e.store)];
        if (e.delete) s.delete(e.key); else s.put(e.value);
      });
    });
  },
};

export async function estimateStorage() {
  if (!navigator.storage?.estimate) return null;
  const { usage, quota } = await navigator.storage.estimate();
  return { usage, quota };
}
export async function requestPersistence() {
  try { return navigator.storage?.persist ? await navigator.storage.persist() : false; } catch { return false; }
}
