// Cliente de Gemini. Modo recomendado: "proxy" (la clave vive en Apps Script → Script Properties).
// Modo "direct" solo para desarrollo local: la clave se guarda en sessionStorage y se envía desde el navegador.
import { settings } from '../core/settings.js';
import { call, ApiError } from './api.js';
import { todayISO } from '../core/utils.js';
import { emit } from '../core/events.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';
const USAGE_KEY = 'cs.aiUsage';

export function aiAvailable() {
  const mode = settings.get('aiMode');
  if (mode === 'off') return { ok: false, reason: 'La IA está desactivada en Ajustes.' };
  if (!navigator.onLine) return { ok: false, reason: 'Sin conexión: la IA necesita Internet. Puedes seguir trabajando manualmente.' };
  if (mode === 'direct' && settings.get('aiProvider') === 'claude') return { ok: false, reason: 'Claude solo funciona en modo Seguro (a través de Apps Script). Cámbialo en Ajustes → IA.' };
  if (mode === 'direct' && !settings.getDirectKey()) return { ok: false, reason: 'Modo directo sin clave: añádela en Ajustes → IA (solo para esta sesión).' };
  if (mode === 'proxy' && !(settings.get('syncUrl') && settings.get('token'))) return { ok: false, reason: 'Configura el Web App de Apps Script en Ajustes → Conexión para usar la IA de forma segura.' };
  return { ok: true };
}

export function usageToday() {
  try { const u = JSON.parse(localStorage.getItem(USAGE_KEY)) || {}; return u.date === todayISO() ? u : { date: todayISO(), requests: 0, tokens: 0 }; } catch { return { date: todayISO(), requests: 0, tokens: 0 }; }
}
function addUsage(tokens = 0) {
  const u = usageToday(); u.requests++; u.tokens += tokens;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch { /* */ }
  emit('ai-usage', u);
}

export const providerName = () => (settings.get('aiProvider') === 'claude' ? 'Claude' : 'Gemini');
export const currentModel = () => (settings.get('aiProvider') === 'claude' ? settings.get('modelClaude') || 'claude-opus-5-5' : settings.get('model') || 'gemini-flash-latest');

function friendlyError(status, msg = '') {
  const p = providerName();
  const detail = msg ? ` Detalle: ${msg}` : '';
  if (status === 429) return `Límite de uso de ${p} alcanzado (por minuto o por día). Espera un momento.${detail}`;
  if (status === 402) return `Tu cuenta de la API de ${p} no tiene crédito.${detail}`;
  if (status === 401 || (status === 400 && /API key/i.test(msg))) return `La API Key de ${p} no es válida.${detail}`;
  if (status === 400 && /search|grounding|tool/i.test(msg)) return 'La búsqueda web no está disponible para este modelo o nivel. Se reintentará sin búsqueda.';
  if (status === 403) return `La clave no tiene permiso para este modelo o la API no está habilitada.${detail}`;
  if (status === 404) return `Modelo no encontrado. Elige otro en Ajustes → IA (botón "Cargar modelos").${detail}`;
  if (status >= 500) return `${p} no está disponible temporalmente (error ${status}). Suele pasar cuando el servicio está saturado: espera un minuto o cambia de modelo o de proveedor en Ajustes → IA.${detail}`;
  return msg || `Error desconocido de ${p}`;
}

async function rawGenerate(body, model) {
  const mode = settings.get('aiMode');
  if (mode === 'proxy') {
    const res = await call('ai.generate', { provider: settings.get('aiProvider') || 'gemini', model, body }, { timeout: 330000 });
    return res.data;
  }
  const key = settings.getDirectKey();
  const r = await fetch(`${ENDPOINT}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(friendlyError(r.status, data.error?.message), { status: r.status, details: data.error?.message });
  return data;
}

/**
 * Genera contenido.
 * @param {object} o { system, prompt, json, temperature, grounding, maxTokens }
 * @returns {Promise<{text, json, sources, usage}>}
 */
export async function generate({ system, prompt, json = true, temperature, grounding = false, maxTokens = 8192 }) {
  const avail = aiAvailable();
  if (!avail.ok) throw new ApiError(avail.reason, { code: 'AI_UNAVAILABLE' });
  const limit = settings.get('aiDailyLimit');
  if (limit && usageToday().requests >= limit) throw new ApiError(`Límite diario local de ${limit} solicitudes alcanzado (Ajustes → IA).`, { code: 'LOCAL_LIMIT' });
  const model = currentModel();
  const body = {
    systemInstruction: system ? { parts: [{ text: system }] } : undefined,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: temperature ?? settings.get('temperature') ?? 0.9, maxOutputTokens: maxTokens },
  };
  // La búsqueda de Google no se combina con salida JSON forzada en todos los modelos.
  if (grounding) body.tools = [{ google_search: {} }];
  else if (json) body.generationConfig.responseMimeType = 'application/json';

  let data; let attempt = 0;
  for (;;) {
    try { data = await rawGenerate(body, model); break; } catch (e) {
      attempt++;
      const retriable = e.status === 429 || e.status >= 500 || e.code === 'NETWORK';
      if (grounding && body.tools && (e.status === 400 || e.status === 403 || /search|ground/i.test(e.message))) {
        delete body.tools; grounding = false; if (json) body.generationConfig.responseMimeType = 'application/json';
        emit('toast', { msg: 'Búsqueda con Google no disponible: se generará sin ella.', type: 'info' });
        continue;
      }
      if (retriable && attempt < 3) { await new Promise((r) => setTimeout(r, 1500 * attempt ** 2)); continue; }
      throw e.status ? new ApiError(friendlyError(e.status, e.details || e.message), { status: e.status, code: e.code, details: e.details }) : e;
    }
  }
  const cand = data?.candidates?.[0];
  if (!cand) {
    const block = data?.promptFeedback?.blockReason;
    throw new ApiError(block ? `Gemini bloqueó la solicitud (${block}). Reformula el contenido.` : 'Gemini no devolvió respuesta.');
  }
  if (cand.finishReason === 'SAFETY') throw new ApiError('Respuesta bloqueada por filtros de seguridad de Gemini.');
  const text = (cand.content?.parts || []).map((p) => p.text || '').join('');
  const usage = data.usageMetadata || {};
  addUsage(usage.totalTokenCount || 0);
  const sources = (cand.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter(Boolean).map((w) => ({ title: w.title, uri: w.uri }));
  let parsed = null;
  if (json) {
    parsed = parseJSON(text);
    if (parsed == null) {
      if (cand.finishReason === 'MAX_TOKENS') throw new ApiError('La respuesta se cortó por longitud. Pide menos versiones o reduce la duración.');
      throw new ApiError('La IA devolvió un formato inesperado. Vuelve a intentarlo.', { details: text.slice(0, 500) });
    }
  }
  return { text, json: parsed, sources, usage };
}

export function parseJSON(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { /* intenta extraer */ }
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* */ } }
  const start = text.search(/[[{]/); const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));
  if (start >= 0 && end > start) { try { return JSON.parse(text.slice(start, end + 1)); } catch { /* */ } }
  return null;
}

export async function listModels() {
  const mode = settings.get('aiMode');
  let models;
  const provider = settings.get('aiProvider') || 'gemini';
  if (mode === 'proxy') models = (await call('ai.models', { provider })).models;
  else {
    const r = await fetch(`${ENDPOINT}/models?pageSize=200`, { headers: { 'x-goog-api-key': settings.getDirectKey() } });
    const d = await r.json();
    if (!r.ok) throw new ApiError(friendlyError(r.status, d.error?.message));
    models = d.models || [];
  }
  return models.filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && (provider === 'claude' ? /claude/i.test(m.name) : /gemini/i.test(m.name)))
    .map((m) => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name, desc: m.description || '' }));
}
