// Cliente de IA con varios proveedores y relevo automático.
// Modo recomendado: "proxy": las claves viven en Apps Script (Script Properties) y el servidor prueba la cadena de
// proveedores en orden (si uno falla por cuota, saturación o falta de clave, pasa al siguiente).
// Modo "direct" solo para desarrollo local y solo con Gemini: la clave se guarda en sessionStorage.
import { settings } from '../core/settings.js';
import { call, ApiError } from './api.js';
import { todayISO } from '../core/utils.js';
import { emit } from '../core/events.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';
const USAGE_KEY = 'cs.aiUsage';

/** Proveedores conocidos. `search`: admite búsqueda web (investigación). `paid`: no tiene plan gratuito. */
export const AI_PROVIDERS = [
  { id: 'gemini', name: 'Gemini', search: true, key: 'GEMINI_API_KEY', where: 'aistudio.google.com', note: 'Gratis con límites. El único gratuito con búsqueda de Google (investigación).', defModel: 'gemini-flash-latest' },
  { id: 'groq', name: 'Groq', key: 'GROQ_API_KEY', where: 'console.groq.com → API Keys (empieza por gsk_)', note: 'Gratis con límites. Muy rápido.', defModel: 'auto' },
  { id: 'openrouter', name: 'OpenRouter', key: 'OPENROUTER_API_KEY', where: 'openrouter.ai → Keys (empieza por sk-or-)', note: 'Solo se usan sus modelos gratuitos. Límite diario de solicitudes.', defModel: 'auto' },
  { id: 'cerebras', name: 'Cerebras', key: 'CEREBRAS_API_KEY', where: 'cloud.cerebras.ai → API Keys', note: 'Gratis con límites. Muy rápido.', defModel: 'auto' },
  { id: 'deepseek', name: 'DeepSeek', paid: true, key: 'DEEPSEEK_API_KEY', where: 'platform.deepseek.com → API Keys', note: 'De pago con saldo prepagado (muy barato). El chat de deepseek.com es gratis, su API no.', defModel: 'deepseek-chat' },
  { id: 'claude', name: 'Claude', paid: true, search: true, key: 'ANTHROPIC_API_KEY', where: 'platform.claude.com', note: 'De pago por uso. La suscripción Claude Pro no incluye la API.', defModel: 'claude-opus-5-5' },
];
export const providerInfo = (id) => AI_PROVIDERS.find((p) => p.id === id) || { id, name: id };
export const DEFAULT_CHAIN = ['gemini', 'groq', 'openrouter', 'cerebras'];

let lastProvider = null;

/** Cadena configurada (proveedores activos, en orden). */
export function aiChain() {
  const ch = (settings.get('aiChain') || DEFAULT_CHAIN).filter((p) => AI_PROVIDERS.some((x) => x.id === p));
  return ch.length ? ch : ['gemini'];
}
export function modelFor(p) {
  const m = settings.get('aiModels') || {};
  if (m[p]) return m[p];
  if (p === 'gemini') return settings.get('model') || 'gemini-flash-latest';
  if (p === 'claude') return settings.get('modelClaude') || 'claude-opus-5-5';
  return providerInfo(p).defModel || 'auto';
}

/**
 * Orden real para una solicitud. Con búsqueda web, primero los proveedores que la admiten
 * (los demás quedan de respaldo y responden sin búsqueda).
 */
export function chainFor({ grounding = false, only = null } = {}) {
  const base = only ? [only] : aiChain();
  const ordered = grounding ? [...base.filter((p) => providerInfo(p).search), ...base.filter((p) => !providerInfo(p).search)] : base;
  return ordered.map((p) => ({ provider: p, model: modelFor(p) }));
}

export function aiAvailable() {
  const mode = settings.get('aiMode');
  if (mode === 'off') return { ok: false, reason: 'La IA está desactivada en Ajustes.' };
  if (!navigator.onLine) return { ok: false, reason: 'Sin conexión: la IA necesita Internet. Puedes seguir trabajando manualmente.' };
  if (mode === 'direct' && !settings.getDirectKey()) return { ok: false, reason: 'Modo directo sin clave: añádela en Ajustes → IA (solo para esta sesión).' };
  if (mode === 'proxy' && !(settings.get('syncUrl') && settings.get('token'))) return { ok: false, reason: 'Configura el Web App de Apps Script en Ajustes → Conexión para usar la IA de forma segura.' };
  return { ok: true };
}

export function usageToday() {
  try { const u = JSON.parse(localStorage.getItem(USAGE_KEY)) || {}; return u.date === todayISO() ? { byProvider: {}, ...u } : { date: todayISO(), requests: 0, tokens: 0, byProvider: {} }; } catch { return { date: todayISO(), requests: 0, tokens: 0, byProvider: {} }; }
}
function addUsage(tokens = 0, provider = '') {
  const u = usageToday(); u.requests++; u.tokens += tokens;
  if (provider) u.byProvider[provider] = (u.byProvider[provider] || 0) + 1;
  try { localStorage.setItem(USAGE_KEY, JSON.stringify(u)); } catch { /* */ }
  emit('ai-usage', u);
}

/** Nombre del proveedor que respondió la última vez (o el primero de la cadena). */
export const providerName = () => providerInfo(lastProvider || aiChain()[0]).name;
export const currentModel = () => modelFor(aiChain()[0]);

function friendlyError(status, msg = '') {
  const p = providerName();
  const detail = msg ? ` Detalle: ${msg}` : '';
  if (status === 429) return `Límite de uso de ${p} alcanzado (por minuto o por día). Espera un momento o añade otro proveedor en Ajustes → IA.${detail}`;
  if (status === 402) return `Tu cuenta de la API de ${p} no tiene crédito.${detail}`;
  if (status === 401 || (status === 400 && /API key/i.test(msg))) return `La API Key de ${p} no es válida.${detail}`;
  if (status === 403) return `La clave no tiene permiso para este modelo o la API no está habilitada.${detail}`;
  if (status === 404) return `Modelo no encontrado. Elige otro en Ajustes → IA (botón "Cargar modelos").${detail}`;
  if (status >= 500) return `La IA no está disponible temporalmente (error ${status}). Espera un minuto o cambia el orden de proveedores en Ajustes → IA.${detail}`;
  return msg || `Error desconocido de ${p}`;
}

async function rawGenerate(body, chain) {
  const mode = settings.get('aiMode');
  if (mode === 'proxy') {
    const res = await call('ai.generate', { chain, body }, { timeout: 330000 });
    return res.data;
  }
  // Directo (desarrollo): solo Gemini.
  const model = modelFor('gemini');
  const key = settings.getDirectKey();
  const r = await fetch(`${ENDPOINT}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(friendlyError(r.status, data.error?.message), { status: r.status, details: data.error?.message });
  return { ...data, usedProvider: 'gemini', usedModel: model };
}

/**
 * Genera contenido.
 * @param {object} o { system, prompt, json, temperature, grounding, maxTokens, only }
 *   `only`: probar solo ese proveedor (lo usa «Probar cada proveedor» en Ajustes).
 * @returns {Promise<{text, json, sources, usage, provider, model}>}
 */
export async function generate({ system, prompt, json = true, temperature, grounding = false, maxTokens = 8192, only = null }) {
  const avail = aiAvailable();
  if (!avail.ok) throw new ApiError(avail.reason, { code: 'AI_UNAVAILABLE' });
  const limit = settings.get('aiDailyLimit');
  if (limit && usageToday().requests >= limit) throw new ApiError(`Límite diario local de ${limit} solicitudes alcanzado (Ajustes → IA).`, { code: 'LOCAL_LIMIT' });
  const chain = settings.get('aiMode') === 'direct' ? [{ provider: 'gemini', model: modelFor('gemini') }] : chainFor({ grounding, only });
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
    try { data = await rawGenerate(body, chain); break; } catch (e) {
      attempt++;
      if (grounding && body.tools && chain.length === 1 && (e.status === 400 || e.status === 403 || /search|ground/i.test(e.message))) {
        delete body.tools; grounding = false; if (json) body.generationConfig.responseMimeType = 'application/json';
        emit('toast', { msg: 'Búsqueda web no disponible: se generará sin ella.', type: 'info' });
        continue;
      }
      // El servidor ya probó todos los proveedores: solo se reintenta un corte de red.
      if (e.code === 'NETWORK' && attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      throw e.status ? new ApiError(e.message && chain.length > 1 ? e.message : friendlyError(e.status, e.details || e.message), { status: e.status, code: e.code, details: e.details }) : e;
    }
  }
  const provider = data?.usedProvider || chain[0].provider;
  lastProvider = provider;
  const cand = data?.candidates?.[0];
  if (!cand) {
    const block = data?.promptFeedback?.blockReason;
    throw new ApiError(block ? `${providerName()} bloqueó la solicitud (${block}). Reformula el contenido.` : `${providerName()} no devolvió respuesta.`);
  }
  if (cand.finishReason === 'SAFETY') throw new ApiError(`Respuesta bloqueada por los filtros de seguridad de ${providerName()}.`);
  if (!only && chain.length > 1 && provider !== chain[0].provider) emit('toast', { msg: `Respondió ${providerName()} (${providerInfo(chain[0].provider).name} no estaba disponible).`, type: 'info' });
  if (grounding && data.noSearch) emit('toast', { msg: `${providerName()} respondió sin búsqueda web: revisa los datos.`, type: 'info' });
  const text = (cand.content?.parts || []).map((p) => p.text || '').join('');
  const usage = data.usageMetadata || {};
  addUsage(usage.totalTokenCount || 0, provider);
  const sources = (cand.groundingMetadata?.groundingChunks || []).map((c) => c.web).filter(Boolean).map((w) => ({ title: w.title, uri: w.uri }));
  let parsed = null;
  if (json) {
    parsed = parseJSON(text);
    if (parsed == null) {
      if (cand.finishReason === 'MAX_TOKENS') throw new ApiError('La respuesta se cortó por longitud. Pide menos versiones o reduce la duración.');
      throw new ApiError(`${providerName()} devolvió un formato inesperado. Vuelve a intentarlo.`, { details: text.slice(0, 500) });
    }
  }
  return { text, json: parsed, sources, usage, provider, model: data.usedModel || '' };
}

export function parseJSON(text) {
  if (!text) return null;
  const t = String(text).replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  try { return JSON.parse(t); } catch { /* intenta extraer */ }
  const m = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1]); } catch { /* */ } }
  const start = t.search(/[[{]/); const end = Math.max(t.lastIndexOf('}'), t.lastIndexOf(']'));
  if (start >= 0 && end > start) { try { return JSON.parse(t.slice(start, end + 1)); } catch { /* */ } }
  return null;
}

/** Modelos disponibles de un proveedor (para elegir en Ajustes). */
export async function listModels(provider = 'gemini') {
  const mode = settings.get('aiMode');
  let models;
  if (mode === 'proxy') models = (await call('ai.models', { provider })).models;
  else {
    if (provider !== 'gemini') throw new ApiError('En modo directo solo se puede usar Gemini.');
    const r = await fetch(`${ENDPOINT}/models?pageSize=200`, { headers: { 'x-goog-api-key': settings.getDirectKey() } });
    const d = await r.json();
    if (!r.ok) throw new ApiError(friendlyError(r.status, d.error?.message));
    models = d.models || [];
  }
  return models.filter((m) => (m.supportedGenerationMethods || []).includes('generateContent') && (provider === 'claude' ? /claude/i.test(m.name) : provider === 'gemini' ? /gemini/i.test(m.name) : true))
    .map((m) => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name, desc: m.description || '' }));
}
