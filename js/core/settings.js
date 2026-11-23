// Ajustes del dispositivo. No contienen claves de Gemini (esas viven en Apps Script o, en modo
// desarrollo, solo en sessionStorage durante la sesión del navegador).
import { emit } from './events.js';

const KEY = 'cs.settings';
const DEFAULTS = {
  syncUrl: '', token: '', autoSync: true,
  aiMode: 'proxy', // proxy | direct | off
  // Proveedores de IA en orden: si uno falla, responde el siguiente (ver js/services/ai.js).
  aiChain: null, // null = valor por defecto (groq, gemini, openrouter, cerebras)
  aiModels: {}, // modelo por proveedor ("auto" = el mejor disponible en la cuenta)
  aiProvider: 'gemini', // antiguo: proveedor único (se migra a aiChain)
  model: 'gemini-flash-latest', modelClaude: 'claude-opus-5-5', temperature: 0.9,
  claudeCodeTasks: [], // tareas que resuelve Claude Code en tu computadora (ver js/services/claudecode.js)
  aiDailyLimit: 150, theme: 'dark', currentBrand: 'all', userName: '',
};

function read() {
  let s;
  try { s = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY)) || {}) }; } catch { s = { ...DEFAULTS }; }
  // Migración: antes había un solo proveedor. Quien usaba Claude lo conserva primero.
  if (!Array.isArray(s.aiChain) || !s.aiChain.length) {
    s.aiChain = s.aiProvider === 'claude' ? ['claude', 'groq', 'gemini', 'openrouter', 'cerebras'] : ['groq', 'gemini', 'openrouter', 'cerebras'];
  }
  // v2.1 (diseño Studio Pulse): el tema oscuro pasa a ser el predeterminado una sola vez; luego respeta lo que elijas.
  if (!s.uiVersion) { s.theme = 'dark'; s.uiVersion = 2; }
  return s;
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
