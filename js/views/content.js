// Espacio de trabajo de un contenido: todas las etapas en pestañas sobre el mismo ID.
import { store } from '../core/store.js';
import { go } from '../core/app.js';
import { on } from '../core/events.js';
import { PIPELINE, statusIndex, statusInfo, ALL_STATUSES } from '../core/schema.js';
import { icon, tabs, toast, confirmDialog, bindAutosave, withBusy, emptyState, modal } from '../core/ui.js';
import { esc, fmtDateTime, fmtRelative } from '../core/utils.js';
import { PUBLISH_FILTER } from '../services/methodology.js';
import { contentBundle, setStatus, nextStatus, scriptFor, ensureScript, productionState, setRecorded, setEdited } from '../services/workflow.js';
import { aiResearch } from '../services/assistant.js';
import { brandTag, statusBadge, ideaFields, aiGuard, renderIdeaForm } from './shared.js';
import * as scriptTab from './content-script.js';
import * as pubTab from './content-publish.js';
import * as editTab from './content-edit.js';
import { folderSupported } from '../services/folder.js';

const BASE_TABS = [
  { id: 'estrategia', label: 'Idea', icon: 'target' },
  { id: 'guion', label: 'Guion', icon: 'edit' },
  { id: 'edicion', label: 'Edición', icon: 'film' },
  { id: 'publicar', label: 'Publicar', icon: 'send' },
  { id: 'resultados', label: 'Resultados', icon: 'chart' },
];

function defaultTabFor(status) {
  if (['guion', 'guion_aprobado', 'por_grabar', 'grabado'].includes(status)) return 'guion';
  if (['listo', 'calendarizado'].includes(status)) return 'publicar';
  if (['publicado', 'analizado'].includes(status)) return 'resultados';
  return 'estrategia';
}

export function render(main, { params }) {
  const [id, tabParam] = params;
  let cleanupTab = null;
  const b0 = contentBundle(id);
  if (!b0) { main.innerHTML = emptyState('Contenido no encontrado', 'Puede que se haya eliminado. Revisa la papelera en Ajustes.', '<a class="btn" href="#/ideas">Volver a ideas</a>', 'alert'); return; }
  if (b0.idea.deletedAt) { main.innerHTML = `<div class="notice warn">${icon('trash')}<div><b>Este contenido está en la papelera.</b><p><button class="btn btn-sm" data-restore>Restaurar</button></p></div></div>`; main.querySelector('[data-restore]').onclick = async () => { await store.restore('ideas', id); go(`/contenido/${id}`); }; return; }

  let pubSub = tabParam === 'copies' ? 'copies' : 'fechas';
  let tab = defaultTabFor(b0.idea.status);
  if (tabParam === 'copies' || tabParam === 'publicacion') tab = 'publicar';
  else if (tabParam === 'historial' || BASE_TABS.some((t) => t.id === tabParam)) tab = tabParam;

  main.innerHTML = '<div class="content-head"></div><div class="content-tabs"></div><div class="content-body"></div>';
  const head = main.querySelector('.content-head');
  const tabsEl = main.querySelector('.content-tabs');
  const body = main.querySelector('.content-body');

  const switchTab = (next) => {
    if (next === 'copies') { tab = 'publicar'; pubSub = 'copies'; }
    else if (next === 'publicacion') { tab = 'publicar'; pubSub = 'fechas'; }
    else tab = next;
    history.replaceState(null, '', `#/contenido/${id}/${tab}`);
    drawTabs(); drawBody();
  };

  const drawHead = () => {
    const b = contentBundle(id); if (!b) return;
    const { idea } = b;
    const idx = statusIndex(idea.status);
    const nx = nextStatus(idea.status);
    const ps = productionState(idea);
    const flag = (key, label, ic, on, hint) => `<label class="pflag ${on ? 'on' : ''} ${ps.locked ? 'locked' : ''}" title="${esc(hint)}"><input type="checkbox" data-flag="${key}" ${on ? 'checked' : ''} ${ps.locked ? 'disabled' : ''}>${icon(ic, 'ic-sm')}<span>${label}</span></label>`;
    const nextBtn = nx && idea.status !== 'descartada' ? `<button class="btn btn-primary" data-next>Avanzar a: ${esc(statusInfo(nx).name)}${icon('right', 'ic-sm')}</button>` : '';
    head.innerHTML = `<div class="crumbs"><a href="#/contenidos">Contenidos</a>${icon('right', 'ic-sm')}${brandTag(idea.brandId)}</div>
      <h1 class="content-title">${esc(idea.title)}</h1>
      <div class="content-meta">
        <div class="row small muted">${statusBadge(idea.status)}<span>Actualizado ${fmtRelative(idea.updatedAt)}</span>
          ${idea.status === 'descartada' ? '' : `<span class="row pflags">${flag('rec', 'Grabado', 'camera', ps.recorded, ps.locked ? 'Ya está publicado' : 'Grabado con el teléfono')}${flag('edit', 'Editado', 'scissors', ps.edited, ps.locked ? 'Ya está publicado' : 'Editado con Claude')}</span>`}</div>
        <div class="head-actions">${nextBtn}
          <select class="input input-sm" data-status aria-label="Cambiar etapa" title="Cambiar a cualquier etapa (no se pierde información)">${ALL_STATUSES.map((s) => `<option value="${s.id}" ${s.id === idea.status ? 'selected' : ''}>${s.id === idea.status ? 'Etapa: ' : ''}${esc(s.name)}</option>`).join('')}</select>
          <button class="icon-btn" data-hist title="Historial de cambios" aria-label="Historial de cambios">${icon('history')}</button>
          <button class="icon-btn" data-del title="Enviar a la papelera" aria-label="Enviar a la papelera">${icon('trash')}</button>
        </div></div>
      <ol class="stepper" aria-label="Etapa ${idx + 1} de ${PIPELINE.length}">${PIPELINE.map((p, i) => `<li class="${i < idx ? 'done' : i === idx ? 'cur' : ''}" title="${esc(p.name)}"><span></span><em>${esc(p.name)}</em></li>`).join('')}</ol>
      ${idx >= 0 ? `<p class="stepper-m xs muted">Etapa ${idx + 1} de ${PIPELINE.length}: <b>${esc(PIPELINE[idx].name)}</b></p>` : ''}`;
    head.querySelector('[data-next]')?.addEventListener('click', () => setStatus(id, nx));
    head.querySelector('[data-status]').addEventListener('change', (e) => setStatus(id, e.target.value, 'Cambio manual'));
    head.querySelector('[data-hist]').addEventListener('click', () => openHistoryModal(id, () => { drawHead(); drawTabs(); drawBody(); }));
    head.querySelectorAll('[data-flag]').forEach((cb) => cb.addEventListener('change', async () => {
      const on = cb.checked;
      if (cb.dataset.flag === 'rec') { await setRecorded(id, on); toast(on ? 'Marcado como grabado. Pendiente de editar.' : 'Marcado como pendiente de grabar', 'success'); }
      else { await setEdited(id, on); toast(on ? 'Marcado como editado. Ya puedes preparar copies y programarlo.' : 'Marcado como pendiente de editar', 'success', on ? { action: { label: 'Publicar', fn: () => switchTab('copies') } } : undefined); }
    }));
    head.querySelector('[data-del]').addEventListener('click', async () => {
      if (!(await confirmDialog({ title: 'Enviar a la papelera', message: 'El contenido y sus fichas quedarán en la papelera (Ajustes → Papelera) y podrás restaurarlo.', confirm: 'Enviar a la papelera', danger: true }))) return;
      const bb = contentBundle(id);
      for (const t of ['copies', 'calendar', 'publications', 'results']) for (const r of bb[t]) await store.remove(t, r.id);
      await store.remove('ideas', id);
      toast('Enviado a la papelera', 'success', { action: { label: 'Deshacer', fn: async () => { await store.restore('ideas', id); for (const t of ['copies', 'calendar', 'publications', 'results']) for (const r of bb[t]) await store.restore(t, r.id); go(`/contenido/${id}`); } } });
      go('/contenidos');
    });
  };

  const drawTabs = () => {
    const b = contentBundle(id);
    const showEdit = folderSupported() || !!b.script?.reelFolder || tab === 'edicion';
    const visibleTabs = BASE_TABS.filter((t) => t.id !== 'edicion' || showEdit);
    const pubCount = (b.calendar.length + b.copies.length) || null;
    const counts = { guion: b.versions.length || null, publicar: pubCount, resultados: b.results.length || null };
    tabsEl.innerHTML = tabs(visibleTabs.map((t) => ({ ...t, count: counts[t.id] })), tab);
    tabsEl.querySelectorAll('[data-tab]').forEach((el) => el.addEventListener('click', () => switchTab(el.dataset.tab)));
  };

  const drawBody = () => {
    try { cleanupTab?.(); } catch (e) { console.error(e); }
    body.innerHTML = '';
    // Contenedor nuevo por pestaña: evita que se acumulen listeners entre pestañas.
    const host = document.createElement('div'); body.append(host);
    const b = contentBundle(id);
    const ctx = { id, refresh: () => { drawTabs(); drawBody(); }, setTab: switchTab };
    switch (tab) {
      case 'estrategia': cleanupTab = strategyTab(host, b, ctx); break;
      case 'guion': cleanupTab = scriptTab.render(host, b, ctx); break;
      case 'edicion': cleanupTab = editTab.render(host, b, ctx); break;
      case 'publicar': cleanupTab = publishUnifiedTab(host, b, ctx, pubSub, (sub) => { pubSub = sub; }); break;
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

// ---------- Publicar (Fechas + Copies unificados) ----------
function publishUnifiedTab(host, b, ctx, initialSub, onSubChange) {
  let sub = initialSub || 'fechas';
  let innerCleanup = null;
  host.innerHTML = `<div class="subtabs" role="tablist" aria-label="Publicación">
    <button type="button" class="subtab ${sub === 'fechas' ? 'active' : ''}" data-psub="fechas">${icon('calendar', 'ic-sm')}Fechas y publicación${b.calendar.length ? ` <span class="count">${b.calendar.length}</span>` : ''}</button>
    <button type="button" class="subtab ${sub === 'copies' ? 'active' : ''}" data-psub="copies">${icon('text', 'ic-sm')}Copies y textos${b.copies.length ? ` <span class="count">${b.copies.length}</span>` : ''}</button>
  </div><div data-phost></div>`;
  const phost = host.querySelector('[data-phost]');
  const drawSub = () => {
    try { innerCleanup?.(); } catch { /* */ }
    phost.innerHTML = '';
    const inner = document.createElement('div'); phost.append(inner);
    const cur = contentBundle(b.idea.id);
    innerCleanup = sub === 'copies' ? pubTab.renderCopies(inner, cur, ctx) : pubTab.renderPublishing(inner, cur, ctx);
  };
  host.querySelectorAll('[data-psub]').forEach((btn) => btn.addEventListener('click', () => {
    sub = btn.dataset.psub;
    onSubChange?.(sub);
    host.querySelectorAll('[data-psub]').forEach((x) => x.classList.toggle('active', x.dataset.psub === sub));
    drawSub();
  }));
  drawSub();
  return () => { try { innerCleanup?.(); } catch { /* */ } };
}

// ---------- Estrategia (Idea) ----------
function strategyTab(host, b, ctx) {
  const { idea } = b;
  const fields = ideaFields(idea.brandId);
  const script = scriptFor(idea.id);
  const filter = script?.publishFilter || PUBLISH_FILTER.map(() => false);
  const checkedCount = filter.filter(Boolean).length;
  const wide = typeof matchMedia === 'function' ? matchMedia('(min-width: 761px)').matches : true;
  host.innerHTML = `<div class="split">
    <section class="card"><div class="card-h"><h3>Propósito de la idea</h3><span class="xs muted">Se guarda automáticamente</span></div>
      <div class="card-b"><form class="form-grid cols-3" data-form>${renderIdeaForm(fields, idea)}</form></div></section>
    <aside class="stack-lg sticky">
      <section class="card"><div class="card-b">
        <details class="more-fields" ${wide ? 'open' : ''}><summary>${icon('search', 'ic-sm')}Investigación con IA</summary>
          <div class="stack" style="margin-top:10px">
            <p class="small muted" style="margin:0">Busca preguntas frecuentes, mitos y datos con fuentes.</p>
            <div class="row"><input class="input input-sm" data-topic value="${esc(idea.topic || idea.title)}" style="flex:1"><button class="btn btn-sm btn-ai" data-research>${icon('sparkle', 'ic-sm')}Investigar</button></div>
            <div data-research-out class="research small"></div>
          </div>
        </details>
      </div></section>
      <section class="card"><div class="card-b">
        <details class="more-fields" ${checkedCount > 0 && checkedCount < PUBLISH_FILTER.length ? 'open' : ''}><summary>${icon('check', 'ic-sm')}Filtro antes de aprobar <span class="xs muted" data-pf-count>(${checkedCount}/${PUBLISH_FILTER.length})</span></summary>
          <div class="stack" style="margin-top:10px">
            ${PUBLISH_FILTER.map((q, i) => `<label class="check"><input type="checkbox" data-pf="${i}" ${filter[i] ? 'checked' : ''}><span>${esc(q)}</span></label>`).join('')}
          </div>
        </details>
      </div></section>
    </aside></div>`;
  const form = host.querySelector('[data-form]');
  const auto = bindAutosave(form, fields, () => store.get('ideas', idea.id), (data) => store.update('ideas', idea.id, data));
  host.querySelectorAll('[data-pf]').forEach((cb) => cb.addEventListener('change', async () => {
    const s = await ensureScript(store.get('ideas', idea.id));
    const arr = PUBLISH_FILTER.map((_, i) => host.querySelector(`[data-pf="${i}"]`).checked);
    const cnt = host.querySelector('[data-pf-count]');
    if (cnt) cnt.textContent = `(${arr.filter(Boolean).length}/${PUBLISH_FILTER.length})`;
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
          form.querySelector('.more-fields')?.setAttribute('open', '');
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

// ---------- Historial (modal desde cabecera o ruta directa) ----------
function openHistoryModal(id, onReverted) {
  const b = contentBundle(id); if (!b) return;
  const host = document.createElement('div');
  const m = modal({ title: 'Historial de cambios', size: 'lg', body: host, actions: [{ label: 'Cerrar' }] });
  historyTab(host, b, { refresh: () => { m.close(); onReverted?.(); } });
}

function historyTab(host, b, ctx) {
  const ids = [b.idea.id, b.script?.id, ...b.versions.map((v) => v.id), ...b.copies.map((c) => c.id), ...b.calendar.map((c) => c.id), ...b.publications.map((p) => p.id), ...b.results.map((r) => r.id)].filter(Boolean);
  const entries = ids.flatMap((rid) => store.historyFor(rid)).sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  const labels = { ideas: 'Idea', scripts: 'Guion', scriptVersions: 'Versión de guion', copies: 'Copy', calendar: 'Calendario', publications: 'Publicación', results: 'Resultado' };
  host.innerHTML = `<div class="card">${entries.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Elemento</th><th>Cambio</th><th>Dispositivo</th><th></th></tr></thead><tbody>
    ${entries.map((h) => `<tr><td class="nowrap small">${fmtDateTime(h.createdAt)}</td><td class="small">${labels[h.table] || h.table}</td><td class="small">${esc(h.summary)}</td><td class="xs muted mono">${esc(h.updatedBy || '').slice(-6)}</td><td class="nowrap">${h.before ? `<button class="btn btn-sm" data-view="${h.id}">${icon('eye', 'ic-sm')}Ver</button> <button class="btn btn-sm" data-revert="${h.id}">${icon('history', 'ic-sm')}Restaurar</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>` : emptyState('Sin historial', 'Los cambios aparecerán aquí.', '', 'history')}</div>`;
  host.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-view]'); const r = e.target.closest('[data-revert]');
    if (v) {
      const h = entries.find((x) => x.id === v.dataset.view);
      if (h?.before) {
        const snap = typeof h.before === 'string' ? JSON.parse(h.before) : h.before;
        modal({ title: 'Versión anterior', size: 'lg', body: `<pre class="xs">${esc(JSON.stringify(snap, null, 2))}</pre>`, actions: [{ label: 'Cerrar' }] });
      }
    }
    if (r) {
      if (!(await confirmDialog({ title: 'Restaurar versión anterior', message: 'El estado actual se guardará en el historial, así que también podrás deshacer esta restauración.', confirm: 'Restaurar' }))) return;
      try { await store.revert(r.dataset.revert); toast('Versión restaurada', 'success'); ctx.refresh(); } catch (err) { toast(err.message, 'error'); }
    }
  });
}
