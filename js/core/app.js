// Estado global de la app: marca activa y navegación.
import { settings } from './settings.js';
import { store } from './store.js';
import { emit } from './events.js';

export const app = {
  get brandId() {
    const b = settings.get('currentBrand');
    if (b && b !== 'all' && !store.get('brands', b)) return 'all';
    return b || 'all';
  },
  setBrand(id) { settings.set({ currentBrand: id }); emit('brand', id); },
  brand() { const id = app.brandId; return id === 'all' ? null : store.get('brands', id); },
  activeBrands() { return store.all('brands').filter((b) => b.status !== 'archivada').sort((a, b) => a.name.localeCompare(b.name)); },
};

export function go(path) { if (location.hash !== `#${path}`) location.hash = path; else window.dispatchEvent(new HashChangeEvent('hashchange')); }
