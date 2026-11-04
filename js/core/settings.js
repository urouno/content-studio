// Ajustes del dispositivo. No contienen claves de Gemini (esas viven en Apps Script o, en modo
// desarrollo, solo en sessionStorage durante la sesión del navegador).
import { emit } from './events.js';

const KEY = 'cs.settings';
const DEFAULTS = {
  syncUrl: '', token: '', autoSync: true,
  aiMode: 'proxy', // proxy | direct | off
  aiProvider: 'gemini', // gemini | claude
  model: 'gemini-flash-latest', modelClaude: 'claude-opus-5-5', temperature: 0.9,
  aiDailyLimit: 150, theme: 'system', currentBrand: 'all', userName: '',
};

function read() {
  try { return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { return { ...DEFAULTS }; }
}
let current = read();

export const settings = {
  get: (k) => (k ? current[k] : { ...current }),
  set(patch) {
    current = { ...current, ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(current)); } catch { /* modo privado */ }
    emit('settings', current);
  },
  // Clave directa (solo desarrollo local): sessionStorage, se borra al cerrar el navegador.
  getDirectKey() { try { return sessionStorage.getItem('cs.gk') || ''; } catch { return ''; } },
  setDirectKey(v) { try { v ? sessionStorage.setItem('cs.gk', v) : sessionStorage.removeItem('cs.gk'); } catch { /* */ } },
};

export function applyTheme() {
  const t = settings.get('theme');
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
