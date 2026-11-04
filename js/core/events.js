// Bus de eventos mínimo para que las vistas se actualicen ante cambios de datos.
const listeners = new Map();
export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt)?.delete(fn);
}
export function emit(evt, payload) {
  (listeners.get(evt) || []).forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });
  if (evt !== '*') (listeners.get('*') || []).forEach((fn) => { try { fn(evt, payload); } catch (e) { console.error(e); } });
}
