// Componentes de interfaz reutilizables: iconos, toasts, modales, confirmaciones, formularios.
import { esc, deepGet, deepSet, debounce } from './utils.js';

export const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

// Delegación de eventos: on(root, 'click', '[data-act]', fn)
export function delegate(root, type, selector, fn) {
  const h = (e) => { const el = e.target.closest(selector); if (el && root.contains(el)) fn(e, el); };
  root.addEventListener(type, h);
  return () => root.removeEventListener(type, h);
}

// ---------- Toasts ----------
export function toast(msg, type = 'info', { timeout = 3500, action } = {}) {
  const host = $('#toasts');
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = `${icon(type === 'error' ? 'alert' : type === 'success' ? 'check' : 'info')}<span>${esc(msg)}</span>${action ? `<button class="btn btn-sm btn-ghost">${esc(action.label)}</button>` : ''}<button class="toast-x" aria-label="Cerrar">×</button>`;
  host.append(el);
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
  el.querySelector('.toast-x').onclick = close;
  if (action) el.querySelector('.btn').onclick = () => { action.fn(); close(); };
  if (timeout) setTimeout(close, type === 'error' ? timeout * 2 : timeout);
  return close;
}

// ---------- Modales ----------
export function modal({ title, body, size = 'md', actions = [], onClose, dismissable = true }) {
  const root = $('#modal-root');
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = `<div class="modal modal-${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <header class="modal-h"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Cerrar">${icon('x')}</button></header>
    <div class="modal-b"></div>
    <footer class="modal-f"></footer></div>`;
  const b = wrap.querySelector('.modal-b');
  if (typeof body === 'string') b.innerHTML = body; else if (body) b.append(body);
  const f = wrap.querySelector('.modal-f');
  if (!actions.length) f.remove();
  const prevFocus = document.activeElement;
  const close = (val) => { wrap.remove(); document.removeEventListener('keydown', onKey); prevFocus?.focus?.(); onClose?.(val); };
  actions.forEach((a) => {
    const btn = document.createElement('button');
    btn.className = `btn ${a.kind ? 'btn-' + a.kind : ''}`;
    btn.innerHTML = a.label;
    btn.onclick = async () => {
      if (a.onClick) {
        btn.disabled = true;
        try { const r = await a.onClick(wrap); if (r !== false) close(r); } finally { btn.disabled = false; }
      } else close(a.value);
    };
    f.append(btn);
  });
  const onKey = (e) => { if (e.key === 'Escape' && dismissable) close(); };
  document.addEventListener('keydown', onKey);
  wrap.addEventListener('mousedown', (e) => { if (e.target === wrap && dismissable) close(); });
  wrap.querySelector('[data-close]').onclick = () => close();
  root.append(wrap);
  setTimeout(() => (wrap.querySelector('[autofocus], input, textarea, select, .modal-f .btn-primary') || wrap.querySelector('.modal'))?.focus(), 30);
  return { el: wrap, body: b, close };
}

export function confirmDialog({ title = '¿Seguro?', message = '', confirm = 'Confirmar', danger = false, typeToConfirm } = {}) {
  return new Promise((resolve) => {
    const body = `<p>${esc(message)}</p>${typeToConfirm ? `<label class="field"><span>Escribe <b>${esc(typeToConfirm)}</b> para confirmar</span><input class="input" data-ttc autocomplete="off"></label>` : ''}`;
    const m = modal({
      title, body, size: 'sm',
      actions: [
        { label: 'Cancelar', value: false },
        { label: confirm, kind: danger ? 'danger' : 'primary', onClick: (w) => {
          if (typeToConfirm && w.querySelector('[data-ttc]').value.trim() !== typeToConfirm) { toast('El texto no coincide', 'error'); return false; }
          return true;
        } },
      ],
      onClose: (v) => resolve(!!v),
    });
    return m;
  });
}

export function promptDialog({ title, label, value = '', multiline = false, placeholder = '' }) {
  return new Promise((resolve) => {
    const input = multiline ? `<textarea class="input" rows="4" data-v placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input class="input" data-v value="${esc(value)}" placeholder="${esc(placeholder)}">`;
    let out = null;
    modal({ title, size: 'sm', body: `<label class="field"><span>${esc(label)}</span>${input}</label>`,
      actions: [{ label: 'Cancelar' }, { label: 'Aceptar', kind: 'primary', onClick: (w) => { out = w.querySelector('[data-v]').value.trim(); return true; } }],
      onClose: () => resolve(out) });
  });
}

// ---------- Formularios declarativos ----------
// field: { name:'voice.tone', label, type:'text|textarea|select|number|date|checkbox|chips|color', options:[{value,label}], hint, rows, required, placeholder, span }
export function renderFields(fields, data = {}) {
  return fields.map((f) => {
    if (f.type === 'section') return `<h3 class="form-section">${esc(f.label)}${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</h3>`;
    const v = deepGet(data, f.name);
    const id = `f-${f.name.replace(/\W/g, '-')}-${Math.random().toString(36).slice(2, 6)}`;
    const req = f.required ? 'required' : '';
    const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : '';
    let input;
    switch (f.type) {
      case 'textarea': input = `<textarea id="${id}" class="input" name="${f.name}" rows="${f.rows || 3}" ${req} ${ph}>${esc(v)}</textarea>`; break;
      case 'select': input = `<select id="${id}" class="input" name="${f.name}" ${req}>${f.empty !== false ? `<option value="">${esc(f.empty || '—')}</option>` : ''}${(f.options || []).map((o) => `<option value="${esc(o.value)}" ${String(o.value) === String(v ?? '') ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`; break;
      case 'number': input = `<input id="${id}" class="input" type="number" name="${f.name}" value="${esc(v)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} step="${f.step || 'any'}" ${req} ${ph}>`; break;
      case 'date': input = `<input id="${id}" class="input" type="date" name="${f.name}" value="${esc(v)}" ${req}>`; break;
      case 'time': input = `<input id="${id}" class="input" type="time" name="${f.name}" value="${esc(v)}">`; break;
      case 'checkbox': return `<label class="check ${f.span ? 'span-' + f.span : ''}"><input type="checkbox" name="${f.name}" ${v ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
      case 'chips': {
        const arr = Array.isArray(v) ? v.map(String) : [];
        input = `<div class="chips" data-chips="${f.name}">${(f.options || []).map((o) => `<label class="chip-opt"><input type="checkbox" value="${esc(o.value)}" ${arr.includes(String(o.value)) ? 'checked' : ''}><span>${esc(o.label)}</span></label>`).join('')}</div>`; break;
      }
      case 'range': input = `<div class="range"><input id="${id}" type="range" name="${f.name}" min="${f.min}" max="${f.max}" step="${f.step || 1}" value="${esc(v ?? f.min)}"><output>${esc(v ?? f.min)}</output></div>`; break;
      default: input = `<input id="${id}" class="input" type="${f.type || 'text'}" name="${f.name}" value="${esc(v)}" ${req} ${ph} ${f.maxlength ? `maxlength="${f.maxlength}"` : ''}>`;
    }
    return `<div class="field ${f.span ? 'span-' + f.span : ''}"><label for="${id}">${esc(f.label)}${f.required ? ' <i class="req">*</i>' : ''}</label>${input}${f.hint ? `<small class="hint">${esc(f.hint)}</small>` : ''}</div>`;
  }).join('');
}

export function readFields(root, fields, base = {}) {
  const out = structuredClone(base);
  fields.forEach((f) => {
    if (f.type === 'section') return;
    let val;
    if (f.type === 'chips') {
      val = $$(`[data-chips="${f.name}"] input:checked`, root).map((i) => i.value);
    } else {
      const el = root.querySelector(`[name="${CSS.escape(f.name)}"]`);
      if (!el) return;
      if (f.type === 'checkbox') val = el.checked;
      else if (f.type === 'number' || f.type === 'range') val = el.value === '' ? null : Number(el.value);
      else val = el.value;
      if (f.cast === 'number' && val !== '' && val != null) val = Number(val);
    }
    deepSet(out, f.name, val);
  });
  return out;
}

export function validateFields(root, fields) {
  const errors = [];
  $$('.field.invalid', root).forEach((x) => x.classList.remove('invalid'));
  fields.forEach((f) => {
    if (!f.required) return;
    const el = root.querySelector(`[name="${CSS.escape(f.name)}"]`);
    if (el && !String(el.value).trim()) { errors.push(f.label); el.closest('.field')?.classList.add('invalid'); }
  });
  if (errors.length) toast(`Completa: ${errors.join(', ')}`, 'error');
  return !errors.length;
}

// Guardado automático con indicador. onSave(data) puede ser async.
export function bindAutosave(root, fields, getBase, onSave, { delay = 600 } = {}) {
  const indicator = $('#save-indicator');
  const run = debounce(async () => {
    try {
      setSaving('saving');
      await onSave(readFields(root, fields, getBase()));
      setSaving('saved');
    } catch (e) { console.error(e); setSaving('error'); toast(e.message || 'No se pudo guardar', 'error'); }
  }, delay);
  const handler = (e) => {
    if (e.target.type === 'range') { const o = e.target.parentElement.querySelector('output'); if (o) o.textContent = e.target.value; }
    if (indicator) setSaving('dirty');
    run();
  };
  root.addEventListener('input', handler);
  root.addEventListener('change', handler);
  return { flush: () => run.flush(), destroy: () => { run.flush(); root.removeEventListener('input', handler); root.removeEventListener('change', handler); } };
}

export function setSaving(state) {
  const el = $('#save-indicator'); if (!el) return;
  const map = { dirty: ['Cambios sin guardar…', 'dirty'], saving: ['Guardando…', 'saving'], saved: ['Guardado', 'saved'], error: ['Error al guardar', 'error'] };
  const [txt, cls] = map[state] || map.saved;
  el.className = `save-ind ${cls}`; el.textContent = txt;
  if (state === 'saved') { clearTimeout(el._t); el._t = setTimeout(() => { el.className = 'save-ind'; el.textContent = ''; }, 2500); }
}

export const emptyState = (title, text, actionHtml = '', ic = 'sparkle') => `<div class="empty">${icon(ic, 'ic-xl')}<h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHtml}</div>`;

export function badge(text, color, cls = '') { return `<span class="badge ${cls}" style="${color ? `--bc:${color}` : ''}">${esc(text)}</span>`; }

export function tabs(items, active, attr = 'data-tab') {
  return `<nav class="tabs" role="tablist">${items.map((t) => `<button role="tab" class="tab ${t.id === active ? 'active' : ''}" ${attr}="${t.id}" aria-selected="${t.id === active}">${t.icon ? icon(t.icon) : ''}<span>${esc(t.label)}</span>${t.count != null ? `<em>${t.count}</em>` : ''}</button>`).join('')}</nav>`;
}

// Botón con estado de carga para llamadas asíncronas (IA, sync).
export async function withBusy(btn, fn, label = 'Procesando…') {
  if (!btn) return fn();
  const html = btn.innerHTML; btn.disabled = true; btn.classList.add('busy');
  btn.innerHTML = `<span class="spinner"></span>${esc(label)}`;
  try { return await fn(); } finally { btn.disabled = false; btn.classList.remove('busy'); btn.innerHTML = html; }
}
