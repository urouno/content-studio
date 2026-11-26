// «Vía Claude»: algunas tareas de IA se resuelven con Claude Code en tu computadora, con tu plan de Claude (sin API).
// La app deja un pedido en «Reels con Claude/Content Studio/pedidos/<id>.json»; la skill `content-studio-claude` lo
// atiende y deja la respuesta en «…/respuestas/<id>.json»; la app la lee y la usa como la de cualquier otro proveedor.
// Es la idea de Sloth: el agente trabaja con la cuenta de cada quien, y la app solo mira qué archivos aparecen.
import * as F from './folder.js';
import { settings } from '../core/settings.js';
import { parseJSON } from './ai.js';

export const CC_DIR = 'Content Studio';
export const CC_TASKS = [
  { id: 'ideas', name: 'Ideas' }, { id: 'guion', name: 'Guiones y reescrituras' }, { id: 'evaluacion', name: 'Evaluación de guiones' },
  { id: 'hooks', name: 'Hooks y CTA' }, { id: 'copies', name: 'Copies' }, { id: 'investigacion', name: 'Investigación (con búsqueda web)' },
  { id: 'documento', name: 'Documentos de marca' }, { id: 'analisis', name: 'Análisis de resultados' },
];
export const CC_MESSAGE = 'Usa la skill content-studio-claude: atiende los pedidos de Content Studio.';
const WAIT_MS = 20 * 60 * 1000; // lo que la app espera una respuesta antes de rendirse (el pedido sigue en la carpeta)
const POLL_MS = 2500;

/** ¿Esta tarea va por Claude Code? Solo si está marcada y la carpeta está conectada con permiso. */
export async function useClaudeCode(task) {
  const list = settings.get('claudeCodeTasks') || [];
  if (!task || !list.includes(task)) return false;
  const st = await F.folderState();
  return !!(st.connected && st.granted);
}

const newId = () => `PED-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6)}`;

/** El pedido tal como lo lee la skill. */
export function buildRequest({ id = newId(), task, system, prompt, json, grounding, maxTokens, label = '' }) {
  return {
    id, app: 'content-studio', version: 1, task, label, created: new Date().toISOString(),
    salida: json ? 'json' : 'texto', busqueda_web: !!grounding, max_palabras: maxTokens ? Math.round(maxTokens * 0.7) : undefined,
    system, prompt,
  };
}

/** Lee la respuesta de la skill: {id, json} · {id, texto} · {id, error}. Devuelve null si aún no está. */
export async function readResponse(id) {
  const raw = await F.readText(`${CC_DIR}/respuestas/${id}.json`);
  if (raw == null) return null;
  const r = parseJSON(raw);
  if (!r || typeof r !== 'object') return { error: 'La respuesta de Claude Code no es un JSON válido.', raw };
  return r;
}

/** Normaliza la respuesta al formato de `generate()` en ai.js. */
export function toResult(resp, { json }) {
  if (resp.error) throw new Error(`Claude Code no pudo hacerlo: ${resp.error}`);
  let text = resp.texto ?? resp.text ?? '';
  let parsed = null;
  if (json) {
    parsed = resp.json && typeof resp.json === 'object' ? resp.json : parseJSON(typeof resp.json === 'string' ? resp.json : text);
    if (parsed == null) throw new Error('Claude Code devolvió un formato inesperado.');
    text = JSON.stringify(parsed);
  }
  const sources = (Array.isArray(resp.fuentes) ? resp.fuentes : []).map((f) => (typeof f === 'string' ? { title: f, uri: f } : { title: f.title || f.titulo || f.url, uri: f.url || f.uri })).filter((f) => f.uri);
  return { text, json: parsed, sources, usage: {}, provider: 'claude-code', model: 'Claude Code' };
}

/**
 * Envía el pedido y espera la respuesta. `onSent` avisa a la interfaz para que diga qué hacer en Claude Code.
 * Si se agota la espera, el pedido sigue en la carpeta y se puede recoger después desde Ajustes → IA.
 */
export async function generateViaClaudeCode(o, { onSent, signal } = {}) {
  const req = buildRequest(o);
  await F.writeText(`${CC_DIR}/pedidos/${req.id}.json`, JSON.stringify(req, null, 1));
  onSent?.(req);
  const t0 = Date.now();
  for (;;) {
    if (signal?.aborted) throw new Error('Pedido cancelado.');
    const resp = await readResponse(req.id).catch(() => null);
    if (resp) {
      await cleanup(req.id);
      return toResult(resp, o);
    }
    if (Date.now() - t0 > WAIT_MS) throw new Error(`Claude Code no respondió en ${Math.round(WAIT_MS / 60000)} min. El pedido sigue en la carpeta: puedes ver la respuesta o descartarlo en Ajustes → IA.`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function cleanup(id) {
  await F.remove(`${CC_DIR}/pedidos/${id}.json`).catch(() => {});
  await F.remove(`${CC_DIR}/respuestas/${id}.json`).catch(() => {});
}

/** Pedidos en la carpeta: los que esperan a Claude Code y los ya respondidos que nadie recogió. */
export async function listRequests() {
  const pend = (await F.list(`${CC_DIR}/pedidos`)).filter((f) => f.kind === 'file' && f.name.endsWith('.json'));
  const done = new Set((await F.list(`${CC_DIR}/respuestas`)).filter((f) => f.kind === 'file').map((f) => f.name));
  const out = [];
  for (const f of pend) {
    const r = await F.readJSON(`${CC_DIR}/pedidos/${f.name}`);
    out.push({ id: f.name.replace(/\.json$/, ''), task: r?.task, label: r?.label, created: r?.created, answered: done.has(f.name) });
  }
  return out.sort((a, b) => String(a.created).localeCompare(String(b.created)));
}
export async function discardRequest(id) { await cleanup(id); }
