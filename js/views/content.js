// Espacio de trabajo de un contenido: todas las etapas en pestañas sobre el mismo ID.
import { store } from '../core/store.js';
import { go } from '../core/app.js';
import { on } from '../core/events.js';
import { PIPELINE, statusIndex, statusInfo, ALL_STATUSES } from '../core/schema.js';
import { icon, tabs, toast, confirmDialog, renderFields, bindAutosave, withBusy, emptyState, modal } from '../core/ui.js';
import { esc, fmtDateTime, fmtRelative } from '../core/utils.js';
import { PUBLISH_FILTER } from '../services/methodology.js';
import { contentBundle, setStatus, nextStatus, prevStatus, scriptFor, ensureScript } from '../services/workflow.js';
import { aiResearch } from '../services/assistant.js';
import { brandTag, statusBadge, ideaFields, aiGuard } from './shared.js';
import * as scriptTab from './content-script.js';
import * as prodTab from './content-production.js';
import * as pubTab from './content-publish.js';

const TABS = [
  { id: 'estrategia', label: 'Estrategia', icon: 'target' },
  { id: 'guion', label: 'Guion', icon: 'edit' },
  { id: 'produccion', label: 'Producción', icon: 'camera' },
  { id: 'edicion', label: 'Edición', icon: 'scissors' },
  { id: 'copies', label: 'Copies', icon: 'text' },
  { id: 'publicacion', label: 'Publicación', icon: 'send' },
  { id: 'resultados', label: 'Resultados', icon: 'chart' },
  { id: 'historial', label: 'Historial', icon: 'history' },
];

export function render(main, { params }) {
  const [id, tabParam] = params;
  let tab = TABS.some((t) => t.id === tabParam) ? tabParam : 'estrategia';
  let cleanupTab = null;
  const b0 = contentBundle(id);
  if (!b0) { main.innerHTML = emptyState('Contenido no encontrado', 'Puede que se haya eliminado. Revisa la papelera en Ajustes.', '<a class="btn" href="#/ideas">Volver a ideas</a>', 'alert'); return; }
  if (b0.idea.deletedAt) { main.innerHTML = `<div class="notice warn">${icon('trash')}<div><b>Este contenido está en la papelera.</b><p><button class="btn btn-sm" data-restore>Restaurar</button></p></div></div>`; main.querySelector('[data-restore]').onclick = async () => { await store.restore('ideas', id); go(`/contenido/${id}`); }; return; }

  main.innerHTML = '<div class="content-head"></div><div class="content-tabs"></div><div class="content-body"></div>';
  const head = main.querySelector('.content-head');
  const tabsEl = main.querySelector('.content-tabs');
  const body = main.querySelector('.content-body');

  const drawHead = () => {
    const b = contentBundle(id); if (!b) return;
    const { idea } = b;
    const idx = statusIndex(idea.status);
    const nx = nextStatus(idea.status); const pv = prevStatus(idea.status);
    head.innerHTML = `<div class="crumbs"><a href="#/contenidos">Producción</a>${icon('right', 'ic-sm')}${brandTag(idea.brandId)}<span class="mono xs">${idea.id}</span></div>
      <div class="row-between" style="align-items:flex-start;margin-bottom:12px">
        <div><h1 class="content-title">${esc(idea.title)}</h1><div class="row small muted" style="margin-top:4px">${statusBadge(idea.status)}<span>Actualizado ${fmtRelative(idea.updatedAt)}</span></div></div>
        <div class="row">
          ${pv ? `<button class="btn btn-sm" data-prev title="Regresar a la etapa anterior sin perder información">${icon('left', 'ic-sm')}${esc(statusInfo(pv).name)}</button>` : ''}
          ${nx && idea.status !== 'descartada' ? `<button class="btn btn-sm btn-primary" data-next>${esc(statusInfo(nx).name)}${icon('right', 'ic-sm')}</button>` : ''}
          <select class="input input-sm" data-status aria-label="Cambiar estado" style="width:auto">${ALL_STATUSES.map((s) => `<option value="${s.id}" ${s.id === idea.status ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
          <button class="icon-btn" data-del title="Enviar a la papelera">${icon('trash')}</button>
        </div></div>
      <ol class="stepper">${PIPELINE.map((p, i) => `<li class="${i < idx ? 'done' : i === idx ? 'cur' : ''}" title="${esc(p.name)}"><span></span><em>${esc(p.name)}</em></li>`).join('')}</ol>`;
    head.querySelector('[data-next]')?.addEventListener('click', () => setStatus(id, nx));
    head.querySelector('[data-prev]')?.addEventListener('click', () => setStatus(id, pv, 'Regreso manual'));
    head.querySelector('[data-status]').addEventListener('change', (e) => setStatus(id, e.target.value, 'Cambio manual'));
    head.querySelector('[data-del]').addEventListener('click', async () => {
      if (!(await confirmDialog({ title: 'Enviar a la papelera', message: 'El contenido y sus fichas quedarán en la papelera (Ajustes → Papelera) y podrás restaurarlo.', confirm: 'Enviar a la papelera', danger: true }))) return;
      const bb = contentBundle(id);
      for (const t of ['copies', 'calendar']) for (const r of bb[t]) await store.remove(t, r.id);
      await store.remove('ideas', id);
      toast('Enviado a la papelera', 'success', { action: { label: 'Deshacer', fn: async () => { await store.restore('ideas', id); for (const t of ['copies', 'calendar']) for (const r of bb[t]) await store.restore(t, r.id); go(`/contenido/${id}`); } } });
      go('/contenidos');
    });
  };

  const drawTabs = () => {
    const b = contentBundle(id);
    const counts = { guion: b.versions.length || null, copies: b.copies.length || null, publicacion: b.calendar.length || null, resultados: b.results.length || null };
    tabsEl.innerHTML = tabs(TABS.map((t) => ({ ...t, count: counts[t.id] })), tab);
    tabsEl.querySelectorAll('[data-tab]').forEach((el) => el.addEventListener('click', () => { tab = el.dataset.tab; history.replaceState(null, '', `#/contenido/${id}/${tab}`); drawTabs(); drawBody(); }));
  };

  const drawBody = () => {
    try { cleanupTab?.(); } catch (e) { console.error(e); }
    body.innerHTML = '';
    // Contenedor nuevo por pestaña: evita que se acumulen listeners entre pestañas.
    const host = document.createElement('div'); body.append(host);
    const b = contentBundle(id);
    const ctx = { id, refresh: () => { drawTabs(); drawBody(); }, setTab: (t) => { tab = t; history.replaceState(null, '', `#/contenido/${id}/${t}`); drawTabs(); drawBody(); } };
    switch (tab) {
      case 'estrategia': cleanupTab = strategyTab(host, b, ctx); break;
      case 'guion': cleanupTab = scriptTab.render(host, b, ctx); break;
      case 'produccion': cleanupTab = prodTab.renderProduction(host, b, ctx); break;
      case 'edicion': cleanupTab = prodTab.renderEditing(host, b, ctx); break;
      case 'copies': cleanupTab = pubTab.renderCopies(host, b, ctx); break;
      case 'publicacion': cleanupTab = pubTab.renderPublishing(host, b, ctx); break;
      case 'resultados': cleanupTab = pubTab.renderResults(host, b, ctx); break;
      case 'historial': cleanupTab = historyTab(host, b, ctx); break;
      default: break;
    }
  };

  drawHead(); drawTabs(); drawBody();
  const off = on('change:ideas', (p) => { if (p.id === id) drawHead(); });
  const off2 = on('change', (p) => { if (p?.remote) { drawHead(); drawTabs(); } });
  return () => { off(); off2(); try { cleanupTab?.(); } catch { /* */ } };
}

// ---------- Estrategia ----------
function strategyTab(host, b, ctx) {
  const { idea } = b;
  const fields = ideaFields(idea.brandId);
  const script = scriptFor(idea.id);
  const filter = script?.publishFilter || PUBLISH_FILTER.map(() => false);
  host.innerHTML = `<div class="split">
    <section class="card"><div class="card-h"><h3>Propósito de la idea</h3><span class="xs muted">Se guarda automáticamente</span></div>
      <div class="card-b"><form class="form-grid cols-3" data-form>${renderFields(fields, idea)}</form></div></section>
    <aside class="stack-lg sticky">
      <section class="card"><div class="card-h"><h3>${icon('search')}Investigación</h3></div><div class="card-b stack">
        <p class="small muted">Busca preguntas frecuentes, mitos y datos con fuentes. Usa Google Search cuando el modelo y tu nivel lo permiten.</p>
        <div class="row"><input class="input input-sm" data-topic value="${esc(idea.topic || idea.title)}" style="flex:1"><button class="btn btn-sm btn-ai" data-research>${icon('sparkle', 'ic-sm')}Investigar</button></div>
        <div data-research-out class="research small"></div></div></section>
      <section class="card"><div class="card-h"><h3>${icon('check')}Filtro antes de aprobar</h3></div><div class="card-b stack">
        ${PUBLISH_FILTER.map((q, i) => `<label class="check"><input type="checkbox" data-pf="${i}" ${filter[i] ? 'checked' : ''}><span>${esc(q)}</span></label>`).join('')}
        <p class="xs muted">Adaptado del filtro de la agencia de referencia (ver Método).</p></div></section>
    </aside></div>`;
  const form = host.querySelector('[data-form]');
  const auto = bindAutosave(form, fields, () => store.get('ideas', idea.id), (data) => store.update('ideas', idea.id, data));
  host.querySelectorAll('[data-pf]').forEach((cb) => cb.addEventListener('change', async () => {
    const s = await ensureScript(store.get('ideas', idea.id));
    const arr = PUBLISH_FILTER.map((_, i) => host.querySelector(`[data-pf="${i}"]`).checked);
    await store.update('scripts', s.id, { publishFilter: arr }, { silent: true });
  }));
  const out = host.querySelector('[data-research-out]');
  host.querySelector('[data-research]').addEventListener('click', async (e) => {
    if (!aiGuard()) return;
    const topic = host.querySelector('[data-topic]').value.trim(); if (!topic) return;
    await withBusy(e.currentTarget, async () => {
      try {
        const r = await aiResearch(idea.brandId, topic, idea);
        out.innerHTML = `<div class="md">${mdLite(r.text)}</div>${r.sources.length ? `<div class="divider-label">Fuentes</div><ul class="xs">${r.sources.map((s) => `<li><a href="${esc(s.uri)}" target="_blank" rel="noopener">${esc(s.title || s.uri)}</a></li>`).join('')}</ul>` : '<p class="xs muted">Sin fuentes web: trata los datos como no verificados.</p>'}
          <button class="btn btn-sm" data-save-ref>${icon('plus', 'ic-sm')}Añadir a referencias de la idea</button>`;
        out.querySelector('[data-save-ref]').onclick = async () => {
          const cur = store.get('ideas', idea.id);
          const add = `\n\n--- Investigación IA (${new Date().toLocaleDateString('es')}) · verificar antes de usar ---\n${r.text}\n${r.sources.map((s) => `- ${s.title}: ${s.uri}`).join('\n')}`;
          await store.update('ideas', idea.id, { references: `${cur.references || ''}${add}`.trim() });
          form.querySelector('[name="references"]').value = store.get('ideas', idea.id).references;
          toast('Añadido a referencias', 'success');
        };
      } catch (err) { toast(err.message, 'error'); }
    }, 'Investigando…');
  });
  return () => auto.destroy();
}

// Markdown mínimo y seguro (escapa antes de formatear).
export function mdLite(t) {
  return esc(t).replace(/^### (.*)$/gm, '<h4>$1</h4>').replace(/^## (.*)$/gm, '<h4>$1</h4>').replace(/^# (.*)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>').replace(/^\s*\d+\. (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`).replace(/\n{2,}/g, '<br><br>');
}

// ---------- Historial ----------
function historyTab(host, b, ctx) {
  const ids = [b.idea.id, b.script?.id, ...b.versions.map((v) => v.id), b.production?.id, b.edition?.id, ...b.copies.map((c) => c.id), ...b.calendar.map((c) => c.id), ...b.publications.map((p) => p.id), ...b.results.map((r) => r.id)].filter(Boolean);
  const entries = ids.flatMap((rid) => store.historyFor(rid)).sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  const labels = { ideas: 'Idea', scripts: 'Guion', scriptVersions: 'Versión de guion', productions: 'Producción', editions: 'Edición', copies: 'Copy', calendar: 'Calendario', publications: 'Publicación', results: 'Resultado' };
  host.innerHTML = `<div class="card">${entries.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Elemento</th><th>Cambio</th><th>Dispositivo</th><th></th></tr></thead><tbody>
    ${entries.map((h) => `<tr><td class="nowrap small">${fmtDateTime(h.createdAt)}</td><td class="small">${labels[h.table] || h.table}</td><td class="small">${esc(h.summary)}</td><td class="xs muted mono">${esc(h.updatedBy || '').slice(-6)}</td><td class="nowrap">${h.before ? `<button class="btn btn-sm" data-view="${h.id}">${icon('eye', 'ic-sm')}Ver</button> <button class="btn btn-sm" data-revert="${h.id}">${icon('history', 'ic-sm')}Restaurar</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : emptyState('Sin historial', 'Los cambios aparecerán aquí.', '', 'history')}</div>`;
  host.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-view]'); const r = e.target.closest('[data-revert]');
    if (v) { const h = store.historyFor && entries.find((x) => x.id === v.dataset.view); modal({ title: 'Versión anterior', size: 'lg', body: `<pre class="xs">${esc(JSON.stringify(JSON.parse(h.before), null, 2))}</pre>`, actions: [{ label: 'Cerrar' }] }); }
    if (r) {
      if (!(await confirmDialog({ title: 'Restaurar versión anterior', message: 'El estado actual se guardará en el historial, así que también podrás deshacer esta restauración.', confirm: 'Restaurar' }))) return;
      try { await store.revert(r.dataset.revert); toast('Versión restaurada', 'success'); ctx.refresh(); } catch (err) { toast(err.message, 'error'); }
    }
  });
}
