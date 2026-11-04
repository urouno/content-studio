// Cliente del Web App de Google Apps Script (sincronización + proxy de Gemini).
// Se usa Content-Type text/plain para evitar la petición preflight CORS que Apps Script no admite.
import { settings } from '../core/settings.js';
import { deviceId } from '../core/store.js';

export class ApiError extends Error {
  constructor(message, { code, status, details } = {}) { super(message); this.code = code; this.status = status; this.details = details; }
}

export function isConfigured() { return !!(settings.get('syncUrl') && settings.get('token')); }

export async function call(action, payload = {}, { timeout = 60000 } = {}) {
  const url = settings.get('syncUrl');
  const token = settings.get('token');
  if (!url || !token) throw new ApiError('Configura la URL del Web App y el token en Ajustes → Conexión.', { code: 'NOT_CONFIGURED' });
  if (!navigator.onLine) throw new ApiError('Sin conexión a Internet.', { code: 'OFFLINE' });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST', redirect: 'follow', signal: ctrl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, token, deviceId: deviceId(), ...payload }),
    });
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? 'El servidor tardó demasiado en responder.' : 'No se pudo contactar con Apps Script. Revisa la URL y que el despliegue sea "Cualquier usuario".', { code: 'NETWORK' });
  } finally { clearTimeout(t); }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new ApiError('Respuesta no válida del servidor (¿la URL apunta a /exec y el despliegue está actualizado?).', { code: 'BAD_RESPONSE', details: text.slice(0, 300) });
  }
  if (!data.ok) throw new ApiError(data.error?.message || 'Error del servidor', { code: data.error?.code, status: data.error?.status, details: data.error?.details });
  return data;
}
