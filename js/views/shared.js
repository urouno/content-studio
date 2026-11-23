// Piezas de interfaz compartidas entre vistas.
import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { PIPELINE, ALL_STATUSES, statusInfo, PRIORITIES } from '../core/schema.js';
import { OBJECTIVES, FUNNEL, CONTENT_TYPES, STRUCTURES, PLATFORMS, KNOWLEDGE_LEVELS, byId, PRODUCTION_TYPES, HOOK_4P } from '../services/methodology.js';
import { icon, modal, renderFields, readFields, validateFields, toast, badge, withBusy } from '../core/ui.js';
import { esc, fmtDate, todayISO, deepGet } from '../core/utils.js';
import { aiAvailable } from '../services/ai.js';
import { findSimilarIdeas } from '../services/workflow.js';
import { aiAngles } from '../services/assistant.js';

// Pasos del flujo para Inicio y para filtrar Contenidos (?g=…). Cada paso agrupa una o más etapas.
export const FLOW_STEPS = [
  { id: 'ideas', name: 'Ideas', statuses: ['idea', 'aprobada'] },
  { id: 'guion', name: 'Guion', statuses: ['guion', 'guion_aprobado'] },
  { id: 'grabar', name: 'Por grabar', statuses: ['por_grabar'] },
  { id: 'editar', name: 'Por editar', statuses: ['grabado'] },
  { id: 'publicar', name: 'Por publicar', statuses: ['listo', 'calendarizado'] },
  { id: 'publicado', name: 'Publicados', statuses: ['publicado', 'analizado'] },
];

export const statusBadge = (s) => { const i = statusInfo(s); return badge(i.name, i.color, 'dot'); };
export function brandTag(brandId) {
  const b = store.get('brands', brandId) || store.getAny('brands', brandId);
  return b ? `<span class="btag"><span class="brand-dot" style="background:${esc(b.color)}"></span><span class="small">${esc(b.name)}</span></span>` : '';
}
export const platformLabel = (id) => byId(PLATFORMS, id)?.name || id || '—';
export const platformShort = (id) => ({ tiktok: 'TT', instagram: 'IG', facebook: 'FB', youtube: 'YT', linkedin: 'IN' }[id] || id);
export const priorityLabel = (p) => PRIORITIES.find((x) => String(x.id) === String(p))?.name || '—';

export function pageHeader({ title, sub = '', actions = '', crumbs = '' }) {
  return `<div class="page-h"><div>${crumbs ? `<div class="crumbs">${crumbs}</div>` : ''}<h1>${esc(title)}</h1>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="actions">${actions}</div></div>`;
}

export function requireBrandSelect(label = 'Marca') {
  const brands = app.activeBrands();
  return { name: 'brandId', label, type: 'select', required: true, options: brands.map((b) => ({ value: b.id, label: b.name })), empty: 'Selecciona una marca' };
}

export function ideaFields(brandId) {
  const pillars = brandId ? store.all('pillars', { brandId }) : [];
  // Campos principales primero; los marcados como `advanced` van en "Más detalles (opcional)".
  // "Tema" y "Dificultad de grabación" ya no se muestran (no se usaban); sus datos se conservan.
  return [
    { name: 'title', label: 'Título', required: true, span: 3, placeholder: 'Ej.: Si te pasa esto, tu café está quemado' },
    { name: 'problem', label: 'Problema del espectador', type: 'textarea', rows: 2, span: 3, hint: 'Qué le pasa o qué duda tiene quien lo va a ver.' },
    { name: 'pillarId', label: 'Pilar de contenido', type: 'select', options: pillars.map((p) => ({ value: p.id, label: p.name })), empty: pillars.length ? '—' : 'Define pilares en la marca' },
    { name: 'objective', label: 'Objetivo', type: 'select', options: OBJECTIVES.map((o) => ({ value: o.id, label: o.name })) },
    { name: 'format', label: 'Estructura del guion', type: 'select', options: STRUCTURES.map((o) => ({ value: o.id, label: o.name })) },
    { name: 'productionType', label: 'Tipo de producción', type: 'select', options: PRODUCTION_TYPES.map((p) => ({ value: p.id, label: p.name })), empty: 'Sin decidir', hint: 'Decide qué skill lo edita y qué recursos visuales se proponen en el guion.' },
    { name: 'platforms', label: 'Plataformas', type: 'chips', options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })), span: 3 },
    { name: 'priority', label: 'Prioridad', type: 'select', cast: 'number', options: PRIORITIES.map((p) => ({ value: p.id, label: p.name })) },
    { name: 'targetDate', label: 'Fecha objetivo', type: 'date' },
    { name: 'audience', label: 'Público objetivo', placeholder: 'Situación concreta del espectador', advanced: true },
    { name: 'keyword', label: 'Palabra clave del público', hint: 'Las palabras exactas que usa (ayuda al buscador de la red).', advanced: true },
    { name: 'funnel', label: 'Etapa del embudo', type: 'select', options: FUNNEL.map((o) => ({ value: o.id, label: o.name })), advanced: true },
    { name: 'contentType', label: 'Tipo de contenido', type: 'select', options: CONTENT_TYPES.map((o) => ({ value: o.id, label: o.name })), advanced: true },
    { name: 'knowledgeLevel', label: 'Nivel de conocimiento', type: 'select', cast: 'number', options: KNOWLEDGE_LEVELS.map((l) => ({ value: l.id, label: `${l.id} · ${l.name}` })), advanced: true },
    { name: 'experimental', label: 'Contenido experimental (20 %)', type: 'checkbox', advanced: true },
    { name: 'references', label: 'Referencias y datos verificados', type: 'textarea', rows: 3, span: 3, hint: 'Enlaces, datos comprobados, fichas técnicas. La IA solo usará esto como fuente.', advanced: true },
    { name: 'notes', label: 'Notas', type: 'textarea', rows: 2, span: 3, advanced: true },
    // Empaque (método de Sloth): en el feed no hay título; lo que cuenta es el primer cuadro y su texto.
    { name: 'pitch.firstFrameText', label: 'Texto del primer cuadro', placeholder: '≤ 7 palabras, grandes', span: 3, group: 'pitch' },
    { name: 'pitch.firstFrameVisual', label: 'Qué se ve en el primer cuadro', type: 'textarea', rows: 2, span: 3, hint: 'Máximo 3 elementos, con el resultado ya enseñado.', group: 'pitch' },
    { name: 'pitch.variants', label: 'Variantes del texto del primer cuadro', type: 'textarea', rows: 3, span: 3, hint: 'Una por línea. Para probar una cada día o una en cada red.', group: 'pitch' },
    ...HOOK_4P.map((p) => ({ name: `pitch.p4.${p.id}`, label: `Gancho · ${p.name}`, hint: p.desc, group: 'pitch' })),
    { name: 'pitch.basedOn', label: 'Se basa en (lo que ya funcionó)', group: 'pitch' },
    { name: 'pitch.keepChange', label: 'Qué conserva y qué cambia', span: 2, group: 'pitch' },
    { name: 'pitch.why', label: 'Por qué funcionaría', type: 'textarea', rows: 2, span: 3, group: 'pitch' },
    { name: 'pitch.risk', label: 'Riesgo: qué podría fallar', type: 'textarea', rows: 2, span: 3, group: 'pitch' },
  ];
}

/** Formulario de idea: campos principales + sección plegable "Más detalles (opcional)". */
export function renderIdeaForm(fields, data = {}) {
  const main = fields.filter((f) => !f.advanced && !f.group); const adv = fields.filter((f) => f.advanced); const pitch = fields.filter((f) => f.group === 'pitch');
  const val = (f) => deepGet(data, f.name);
  const count = (list) => list.filter((f) => f.name !== 'knowledgeLevel' && (Array.isArray(val(f)) ? val(f).length : val(f) != null && val(f) !== '' && val(f) !== false)).length;
  const block = (list, title, open) => {
    if (!list.length) return '';
    const n = count(list);
    return `<details class="more-fields span-3" ${open && n ? 'open' : ''}><summary>${icon('down', 'ic-sm')}${title}${n ? ` <span class="muted">· ${n} con datos</span>` : ''}</summary><div class="form-grid cols-3">${renderFields(list, data)}</div></details>`;
  };
  return `${renderFields(main, data)}${block(pitch, 'Empaque: primer cuadro y gancho', true)}${block(adv, 'Más detalles (opcional)', false)}`;
}

export function openIdeaModal({ idea = null, brandId = null, preset = {}, onSaved } = {}) {
  const bId = idea?.brandId || brandId || (app.brandId !== 'all' ? app.brandId : '');
  if (!app.activeBrands().length) { toast('Primero crea una marca.', 'error'); go('/marcas?new=1'); return; }
  const data = idea || { priority: 2, knowledgeLevel: 1, platforms: [], status: 'idea', brandId: bId, ...preset };
  const fields = [...(idea ? [] : [requireBrandSelect()]), ...ideaFields(bId)];
  const body = document.createElement('div');
  body.innerHTML = `<form class="form-grid cols-3" novalidate>${renderIdeaForm(fields, data)}</form><div class="dup-box" style="margin-top:12px"></div>`;
  const form = body.querySelector('form');
  // Al cambiar de marca, recarga los pilares de esa marca.
  form.querySelector('[name="brandId"]')?.addEventListener('change', (e) => {
    const sel = form.querySelector('[name="pillarId"]');
    const ps = store.all('pillars', { brandId: e.target.value });
    sel.innerHTML = `<option value="">—</option>${ps.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}`;
  });
  // Detección de duplicados en vivo
  const dupBox = body.querySelector('.dup-box');
  const checkDup = () => {
    const b = form.querySelector('[name="brandId"]')?.value || bId;
    const text = `${form.querySelector('[name="title"]').value} ${form.querySelector('[name="problem"]').value}`;
    if (!b || text.trim().length < 12) { dupBox.innerHTML = ''; return; }
    const sim = findSimilarIdeas(b, text, { excludeId: idea?.id });
    dupBox.innerHTML = sim.length ? `<div class="notice warn">${icon('alert')}<div><b>Ideas parecidas en esta marca</b><p>${sim.map((s) => `${esc(s.idea.title)} <span class="muted">(${Math.round(s.score * 100)} %)</span>`).join('<br>')}</p>
      <button type="button" class="btn btn-sm" data-angles style="margin-top:6px">${icon('sparkle')}Proponer enfoques distintos</button><div data-angles-out></div></div></div>` : '';
    dupBox.querySelector('[data-angles]')?.addEventListener('click', async (e) => {
      const av = aiAvailable(); if (!av.ok) { toast(av.reason, 'error'); return; }
      const cur = readFields(form, fields, { brandId: b });
      await withBusy(e.currentTarget, async () => {
        try {
          const angles = await aiAngles({ ...cur, brandId: b }, sim.map((s) => s.idea));
          dupBox.querySelector('[data-angles-out]').innerHTML = `<div class="stack" style="margin-top:8px">${angles.map((a, i) => `<div class="card card-b"><b>${esc(a.title)}</b><p class="small muted">${esc(a.difference)}</p><button type="button" class="btn btn-sm" data-use="${i}">Usar este enfoque</button></div>`).join('')}</div>`;
          dupBox.querySelectorAll('[data-use]').forEach((btn) => btn.addEventListener('click', () => {
            const a = angles[Number(btn.dataset.use)];
            form.querySelector('[name="title"]').value = a.title; form.querySelector('[name="problem"]').value = a.problem || '';
            if (a.format) form.querySelector('[name="format"]').value = a.format;
            checkDup();
          }));
        } catch (err) { toast(err.message, 'error'); }
      }, 'Pensando…');
    });
  };
  let t; form.addEventListener('input', (e) => { if (['title', 'problem'].includes(e.target.name)) { clearTimeout(t); t = setTimeout(checkDup, 500); } });
  checkDup();
  modal({
    title: idea ? 'Editar idea' : 'Nueva idea', body, size: 'lg',
    actions: [
      { label: 'Cancelar' },
      { label: idea ? 'Guardar' : 'Crear idea', kind: 'primary', onClick: async () => {
        if (!validateFields(form, fields)) return false;
        const out = readFields(form, fields, data);
        const saved = idea ? await store.update('ideas', idea.id, out) : await store.create('ideas', { ...out, status: 'idea', source: out.source || 'manual', statusHistory: [] });
        toast(idea ? 'Idea actualizada' : 'Idea creada', 'success');
        onSaved?.(saved);
        return true;
      } },
    ],
  });
}

export function ideaCard(idea, { draggable = false, showBrand = true } = {}) {
  const st = statusInfo(idea.status);
  const pls = (idea.platforms || []).map((p) => platformLabel(p));
  const cal = store.filter('calendar', (c) => c.ideaId === idea.id).sort((a, b) => a.date.localeCompare(b.date))[0];
  const late = cal && cal.status !== 'publicado' && cal.date < todayISO();
  return `<article class="kcard ${late ? 'late' : ''}" data-id="${idea.id}" ${draggable ? 'draggable="true"' : ''} tabindex="0" style="--bc:${st.color}">
    <div class="kcard-top"><span class="kcard-fmt truncate">${icon('film', 'ic-sm')}<span class="truncate">${esc(pls.join(' · ') || 'Sin plataforma')}</span></span>${idea.priority === 1 ? '<span class="prio-hi">Alta</span>' : ''}</div>
    <div class="kcard-t">${esc(idea.title)}</div>
    <div class="kcard-meta">${showBrand ? brandTag(idea.brandId) : ''}${idea.experimental ? '<span class="tag">20 %</span>' : ''}${cal ? `<span class="row ${late ? 'late-txt' : ''}" style="gap:4px">${icon('calendar', 'ic-sm')}${late ? 'Retrasado · ' : ''}${fmtDate(cal.date)}</span>` : ''}</div>
    ${draggable ? `<div class="kcard-foot"><button type="button" class="kmove" data-move title="Mover a otra etapa" aria-label="Mover a otra etapa"><span>Mover</span>${icon('arrow', 'ic-sm')}</button></div>` : ''}
  </article>`;
}

/** Tablero Kanban por estado con drag & drop. onMove(id, status).
 *  En celular se muestra una etapa a la vez (selector de etapas arriba) y cada tarjeta tiene "Mover a…". */
let boardCur = null;
export function renderBoard(host, ideas, { onMove, onOpen, showBrand = true, columns = PIPELINE } = {}) {
  const counts = Object.fromEntries(columns.map((c) => [c.id, ideas.filter((i) => i.status === c.id).length]));
  if (!columns.some((c) => c.id === boardCur)) boardCur = (columns.find((c) => counts[c.id]) || columns[0]).id;
  host.innerHTML = `<div class="board-stages" role="tablist" aria-label="Etapas">${columns.map((c) => `<button type="button" role="tab" class="stage-chip ${c.id === boardCur ? 'active' : ''}" data-stage="${c.id}" aria-selected="${c.id === boardCur}"><span class="dotc" style="background:${c.color}"></span>${esc(c.name)}<em>${counts[c.id]}</em></button>`).join('')}</div>
    <div class="board">${columns.map((col) => {
    const items = ideas.filter((i) => i.status === col.id);
    return `<section class="bcol ${col.id === boardCur ? 'cur' : ''}" data-status="${col.id}" aria-label="${esc(col.name)}">
      <header><span class="dotc" style="background:${col.color}"></span><h4>${esc(col.name)}</h4><em>${items.length}</em></header>
      <div class="bcol-b">${items.map((i) => ideaCard(i, { draggable: true, showBrand })).join('') || '<div class="bcol-empty">Sin contenidos en esta etapa</div>'}</div></section>`;
  }).join('')}</div>`;
  const chips = host.querySelector('.board-stages');
  const act = chips.querySelector('.active'); if (act) chips.scrollLeft = act.offsetLeft - 16;
  chips.addEventListener('click', (e) => {
    const c = e.target.closest('[data-stage]'); if (!c) return;
    boardCur = c.dataset.stage;
    chips.querySelectorAll('.stage-chip').forEach((x) => { const on = x === c; x.classList.toggle('active', on); x.setAttribute('aria-selected', on); });
    host.querySelectorAll('.bcol').forEach((x) => x.classList.toggle('cur', x.dataset.status === boardCur));
  });
  let dragId = null;
  host.addEventListener('dragstart', (e) => { const c = e.target.closest('.kcard'); if (!c) return; dragId = c.dataset.id; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
  host.addEventListener('dragend', (e) => { e.target.closest('.kcard')?.classList.remove('dragging'); host.querySelectorAll('.bcol.over').forEach((x) => x.classList.remove('over')); });
  host.addEventListener('dragover', (e) => { const col = e.target.closest('.bcol'); if (!col) return; e.preventDefault(); host.querySelectorAll('.bcol.over').forEach((x) => x !== col && x.classList.remove('over')); col.classList.add('over'); });
  host.addEventListener('drop', (e) => { const col = e.target.closest('.bcol'); if (!col) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; col.classList.remove('over'); if (id) onMove?.(id, col.dataset.status); });
  host.addEventListener('click', (e) => {
    const mv = e.target.closest('[data-move]');
    if (mv) { e.stopPropagation(); openMoveMenu(mv.closest('.kcard').dataset.id, columns, onMove); return; }
    const c = e.target.closest('.kcard'); if (c) onOpen?.(c.dataset.id);
  });
  host.addEventListener('keydown', (e) => { const c = e.target.closest('.kcard'); if (c && e.key === 'Enter' && !e.target.closest('[data-move]')) onOpen?.(c.dataset.id); });
}

function openMoveMenu(id, columns, onMove) {
  const idea = store.get('ideas', id); if (!idea) return;
  const m = modal({ title: 'Mover a otra etapa', size: 'sm', body: `<p class="small muted" style="margin-top:0">${esc(idea.title)}</p><div class="move-list">${columns.map((c) => `<button type="button" class="btn ${c.id === idea.status ? 'active' : ''}" data-to="${c.id}" ${c.id === idea.status ? 'disabled' : ''}><span class="dotc" style="background:${c.color}"></span>${esc(c.name)}${c.id === idea.status ? ' <span class="muted">(actual)</span>' : ''}</button>`).join('')}</div>`, actions: [{ label: 'Cancelar' }] });
  m.body.addEventListener('click', (e) => { const b = e.target.closest('[data-to]'); if (!b) return; m.close(); boardCur = b.dataset.to; onMove?.(id, b.dataset.to); });
}

export function statusSelect(current, name = 'status') {
  return `<select class="input input-sm" name="${name}">${ALL_STATUSES.map((s) => `<option value="${s.id}" ${s.id === current ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`;
}

export function aiGuard() {
  const a = aiAvailable();
  if (!a.ok) { toast(a.reason, 'error', { action: { label: 'Ajustes', fn: () => go('/ajustes/ia') } }); return false; }
  return true;
}

export function filterBar(filters, values) {
  const search = filters.filter((f) => f.type === 'search'); const sels = filters.filter((f) => f.type !== 'search');
  const active = sels.filter((f) => values[f.name] && values[f.name] !== f.def).length;
  const wide = typeof matchMedia === 'function' && matchMedia('(min-width: 761px)').matches;
  const sel = (f) => `<select class="input input-sm" name="${f.name}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}: todas</option>${f.options.map((o) => `<option value="${esc(o.value)}" ${String(values[f.name] ?? '') === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  // En celular los filtros quedan dentro de un botón "Filtros"; en escritorio siempre visibles.
  return `<div class="filterbar">${search.map((f) => `<label class="searchbox">${icon('search', 'ic-sm')}<input class="input input-sm" type="search" name="${f.name}" value="${esc(values[f.name] || '')}" placeholder="${esc(f.placeholder || 'Buscar…')}" aria-label="Buscar"></label>`).join('')}
    ${sels.length ? `<details class="fdet" ${wide || active ? 'open' : ''}><summary class="btn btn-sm">${icon('filter', 'ic-sm')}Filtros${active ? ` <em>${active}</em>` : ''}</summary><div class="fdet-b">${sels.map(sel).join('')}</div></details>` : ''}</div>`;
}
