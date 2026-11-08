// Piezas de interfaz compartidas entre vistas.
import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { PIPELINE, ALL_STATUSES, statusInfo, PRIORITIES, DIFFICULTIES } from '../core/schema.js';
import { OBJECTIVES, FUNNEL, CONTENT_TYPES, STRUCTURES, PLATFORMS, KNOWLEDGE_LEVELS, byId } from '../services/methodology.js';
import { icon, modal, renderFields, readFields, validateFields, toast, badge, withBusy } from '../core/ui.js';
import { esc, fmtDate, todayISO } from '../core/utils.js';
import { aiAvailable } from '../services/ai.js';
import { findSimilarIdeas } from '../services/workflow.js';
import { aiAngles } from '../services/assistant.js';

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
  return [
    { name: 'title', label: 'Título', required: true, span: 3, placeholder: 'Ej.: Si te pasa esto, tu café está quemado' },
    { name: 'topic', label: 'Tema' },
    { name: 'pillarId', label: 'Pilar de contenido', type: 'select', options: pillars.map((p) => ({ value: p.id, label: p.name })), empty: pillars.length ? '—' : 'Define pilares en la marca' },
    { name: 'audience', label: 'Público objetivo', placeholder: 'Situación concreta del espectador' },
    { name: 'keyword', label: 'Palabra clave del público', hint: 'Las palabras exactas que usa (ayuda a buscar y al SEO de la plataforma).' },
    { name: 'problem', label: 'Problema del espectador', type: 'textarea', rows: 2, span: 3 },
    { name: 'objective', label: 'Objetivo', type: 'select', options: OBJECTIVES.map((o) => ({ value: o.id, label: o.name })) },
    { name: 'funnel', label: 'Etapa del embudo', type: 'select', options: FUNNEL.map((o) => ({ value: o.id, label: o.name })) },
    { name: 'contentType', label: 'Tipo de contenido', type: 'select', options: CONTENT_TYPES.map((o) => ({ value: o.id, label: o.name })) },
    { name: 'format', label: 'Formato / estructura sugerida', type: 'select', options: STRUCTURES.map((o) => ({ value: o.id, label: o.name })) },
    { name: 'platforms', label: 'Plataformas', type: 'chips', options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })), span: 3 },
    { name: 'knowledgeLevel', label: 'Nivel de conocimiento', type: 'select', cast: 'number', options: KNOWLEDGE_LEVELS.map((l) => ({ value: l.id, label: `${l.id} · ${l.name}` })) },
    { name: 'priority', label: 'Prioridad', type: 'select', cast: 'number', options: PRIORITIES.map((p) => ({ value: p.id, label: p.name })) },
    { name: 'difficulty', label: 'Dificultad de grabación', type: 'select', options: DIFFICULTIES.map((p) => ({ value: p.id, label: p.name })) },
    { name: 'targetDate', label: 'Fecha objetivo', type: 'date' },
    { name: 'experimental', label: 'Contenido experimental (20 %)', type: 'checkbox' },
    { name: 'references', label: 'Referencias y conocimiento disponible', type: 'textarea', rows: 3, span: 3, hint: 'Enlaces a videos de referencia, datos verificados, fichas técnicas. La IA solo usará esto como fuente.' },
    { name: 'notes', label: 'Notas', type: 'textarea', rows: 2, span: 3 },
  ];
}

export function openIdeaModal({ idea = null, brandId = null, preset = {}, onSaved } = {}) {
  const bId = idea?.brandId || brandId || (app.brandId !== 'all' ? app.brandId : '');
  if (!app.activeBrands().length) { toast('Primero crea una marca.', 'error'); go('/marcas?new=1'); return; }
  const data = idea || { priority: 2, knowledgeLevel: 1, platforms: [], status: 'idea', brandId: bId, ...preset };
  const fields = [...(idea ? [] : [requireBrandSelect()]), ...ideaFields(bId)];
  const body = document.createElement('div');
  body.innerHTML = `<form class="form-grid cols-3" novalidate>${renderFields(fields, data)}</form><div class="dup-box" style="margin-top:12px"></div>`;
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
  const pl = (idea.platforms || []).map((p) => `<span class="tag">${platformShort(p)}</span>`).join(' ');
  const cal = store.filter('calendar', (c) => c.ideaId === idea.id).sort((a, b) => a.date.localeCompare(b.date))[0];
  const late = cal && cal.status !== 'publicado' && cal.date < todayISO();
  return `<article class="kcard ${late ? 'late' : ''}" data-id="${idea.id}" ${draggable ? 'draggable="true"' : ''} tabindex="0">
    ${showBrand ? `<div class="kcard-brand">${brandTag(idea.brandId)}</div>` : ''}
    <div class="kcard-t">${esc(idea.title)}</div>
    <div class="row xs muted">${pl}${idea.priority === 1 ? `<span class="badge" style="--bc:var(--danger)">Alta</span>` : ''}${idea.experimental ? '<span class="tag">20 %</span>' : ''}${cal ? `<span class="${late ? 'late-txt' : ''}">${icon('calendar', 'ic-sm')} ${fmtDate(cal.date)}</span>` : ''}</div>
  </article>`;
}

/** Tablero Kanban por estado con drag & drop. onMove(id, status). */
export function renderBoard(host, ideas, { onMove, onOpen, showBrand = true, columns = PIPELINE } = {}) {
  host.innerHTML = `<div class="board">${columns.map((col) => {
    const items = ideas.filter((i) => i.status === col.id);
    return `<section class="bcol" data-status="${col.id}" aria-label="${esc(col.name)}">
      <header><span class="dotc" style="background:${col.color}"></span><h4>${esc(col.name)}</h4><em>${items.length}</em></header>
      <div class="bcol-b">${items.map((i) => ideaCard(i, { draggable: true, showBrand })).join('') || '<div class="bcol-empty">—</div>'}</div></section>`;
  }).join('')}</div>`;
  let dragId = null;
  host.addEventListener('dragstart', (e) => { const c = e.target.closest('.kcard'); if (!c) return; dragId = c.dataset.id; e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; c.classList.add('dragging'); });
  host.addEventListener('dragend', (e) => { e.target.closest('.kcard')?.classList.remove('dragging'); host.querySelectorAll('.bcol.over').forEach((x) => x.classList.remove('over')); });
  host.addEventListener('dragover', (e) => { const col = e.target.closest('.bcol'); if (!col) return; e.preventDefault(); host.querySelectorAll('.bcol.over').forEach((x) => x !== col && x.classList.remove('over')); col.classList.add('over'); });
  host.addEventListener('drop', (e) => { const col = e.target.closest('.bcol'); if (!col) return; e.preventDefault(); const id = e.dataTransfer.getData('text/plain') || dragId; col.classList.remove('over'); if (id) onMove?.(id, col.dataset.status); });
  host.addEventListener('click', (e) => { const c = e.target.closest('.kcard'); if (c) onOpen?.(c.dataset.id); });
  host.addEventListener('keydown', (e) => { const c = e.target.closest('.kcard'); if (c && e.key === 'Enter') onOpen?.(c.dataset.id); });
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
  return `<div class="filterbar">${filters.map((f) => {
    if (f.type === 'search') return `<label class="searchbox">${icon('search', 'ic-sm')}<input class="input input-sm" type="search" name="${f.name}" value="${esc(values[f.name] || '')}" placeholder="${esc(f.placeholder || 'Buscar…')}" aria-label="Buscar"></label>`;
    return `<select class="input input-sm" name="${f.name}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}: todas</option>${f.options.map((o) => `<option value="${esc(o.value)}" ${String(values[f.name] ?? '') === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
  }).join('')}</div>`;
}
