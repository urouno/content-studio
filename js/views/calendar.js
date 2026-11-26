import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { on } from '../core/events.js';
import { statusInfo, statusIndex, PIPELINE } from '../core/schema.js';
import { icon, toast, emptyState } from '../core/ui.js';
import { esc, toDateKey, parseDateKey, addDays, startOfWeek, todayISO, fmtDate } from '../core/utils.js';
import { PLATFORMS, CONTENT_TYPES, byId } from '../services/methodology.js';
import { pageHeader, filterBar, platformShort, platformLabel, brandTag, statusBadge } from './shared.js';
import { openSchedule } from './content-publish.js';
import { schedule } from '../services/workflow.js';

// Vistas: Mes, Semana y Lista. ("Día" y "Tablero" se quitaron: el tablero ya está en Producción.)
const VIEWS = [{ id: 'mes', label: 'Mes', icon: 'calendar' }, { id: 'semana', label: 'Semana', icon: 'columns' }, { id: 'lista', label: 'Lista', icon: 'list' }];
const state = { cursor: new Date(), platform: '', status: '', showUnscheduled: true, day: null };
const isPhone = () => matchMedia('(max-width: 760px)').matches;
const MONTHS = new Intl.DateTimeFormat('es', { month: 'long', year: 'numeric' });
const WD = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function render(main, { params }) {
  let view = VIEWS.some((v) => v.id === params[0]) ? params[0] : 'mes';
  const draw = () => {
    const bId = app.brandId;
    let entries = store.all('calendar', { brandId: bId }).filter((c) => store.get('ideas', c.ideaId));
    if (state.platform) entries = entries.filter((c) => c.platform === state.platform);
    if (state.status) entries = entries.filter((c) => (state.status === 'publicado' ? c.status === 'publicado' : state.status === 'pendiente' ? c.status !== 'publicado' : true));
    const conflicts = conflictKeys(entries);
    const title = view === 'mes' ? MONTHS.format(state.cursor) : view === 'semana' ? `Semana del ${fmtDate(startOfWeek(state.cursor))}` : 'Todas las fechas';
    main.innerHTML = `${pageHeader({ title: 'Calendario editorial', sub: 'Programación interna. La publicación se hace manualmente en cada red.',
      actions: `<div class="btn-group">${VIEWS.map((v) => `<button class="btn ${v.id === view ? 'active' : ''}" data-view="${v.id}">${icon(v.icon)}${v.label}</button>`).join('')}</div>` })}
      <div class="row-between cal-bar">
        <div class="row">${['mes', 'semana'].includes(view) ? `<button class="icon-btn" data-nav="-1" aria-label="Anterior">${icon('left')}</button><button class="btn btn-sm" data-today>Hoy</button><button class="icon-btn" data-nav="1" aria-label="Siguiente">${icon('right')}</button>` : ''}<h2 class="cal-title">${esc(title)}</h2></div>
        <div class="row">${filterBar([{ name: 'platform', label: 'Plataforma', options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })) }, { name: 'status', label: 'Estado', options: [{ value: 'pendiente', label: 'Pendientes' }, { value: 'publicado', label: 'Publicados' }] }], state)}
        ${['mes', 'semana'].includes(view) ? `<label class="check"><input type="checkbox" data-unsch ${state.showUnscheduled ? 'checked' : ''}>Sin fecha</label>` : ''}</div>
      </div>
      ${conflicts.size ? `<div class="notice warn" style="margin-bottom:12px">${icon('alert')}<div><b>${conflicts.size} día(s) con más de una publicación de la misma marca en la misma plataforma.</b> <span>Están marcados en rojo.</span></div></div>` : ''}
      ${view === 'mes' ? dayStrip(entries) : ''}
      <div class="cal-layout ${['mes', 'semana'].includes(view) && state.showUnscheduled ? 'with-side' : ''}"><div class="cal-host"></div>${['mes', 'semana'].includes(view) && state.showUnscheduled ? `<aside class="cal-side card"></aside>` : ''}</div>`;
    const host = main.querySelector('.cal-host');
    if (view === 'mes') drawMonth(host, entries, conflicts);
    if (view === 'semana') drawWeek(host, entries, conflicts, 7);
    if (view === 'lista') drawList(host, entries);
    const side = main.querySelector('.cal-side');
    if (side) drawUnscheduled(side, bId);

    main.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => { view = b.dataset.view; history.replaceState(null, '', `#/calendario/${view}`); draw(); }));
    main.querySelectorAll('[data-nav]').forEach((b) => (b.onclick = () => { const n = Number(b.dataset.nav); state.cursor = view === 'mes' ? new Date(state.cursor.getFullYear(), state.cursor.getMonth() + n, 1) : addDays(state.cursor, n * 7); state.day = null; draw(); }));
    main.querySelector('[data-today]')?.addEventListener('click', () => { state.cursor = new Date(); state.day = null; draw(); });
    main.querySelector('.filterbar').addEventListener('change', (e) => { state[e.target.name] = e.target.value; draw(); });
    main.querySelector('[data-unsch]')?.addEventListener('change', (e) => { state.showUnscheduled = e.target.checked; draw(); });
    main.querySelectorAll('[data-day]').forEach((d) => d.addEventListener('dblclick', (e) => { if (e.target.closest('.cev')) return; pickIdeaForDay(d.dataset.day); }));
    const pickDay = (key) => {
      const d = parseDateKey(key); state.day = key;
      if (d.getMonth() !== state.cursor.getMonth() || d.getFullYear() !== state.cursor.getFullYear()) state.cursor = new Date(d.getFullYear(), d.getMonth(), 1);
      main.dispatchEvent(new CustomEvent('cal:redraw'));
    };
    main.querySelectorAll('[data-strip]').forEach((b) => (b.onclick = () => pickDay(b.dataset.strip)));
    main.querySelectorAll('[data-strip-nav]').forEach((b) => (b.onclick = () => pickDay(toDateKey(addDays(parseDateKey(state.day || todayISO()), Number(b.dataset.stripNav))))));
    main.querySelector('[data-pick-day]')?.addEventListener('click', (e) => pickIdeaForDay(e.currentTarget.dataset.pickDay));
  };
  draw();
  const unbind = bindDnD(main);
  const onRedraw = () => { draw(); main.querySelector('.day-agenda')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
  main.addEventListener('cal:redraw', onRedraw);
  const off = on('change', (p) => { if (!p?.remote && ['calendar', 'ideas', undefined].includes(p?.table)) draw(); });
  return () => { off(); unbind(); main.removeEventListener('cal:redraw', onRedraw); };
}

// Tira con los 7 días de la semana elegida (o la actual): número, día y un punto por publicación.
function dayStrip(entries) {
  const today = todayISO(); const sel = state.day || today;
  const start = startOfWeek(parseDateKey(sel)); const byDay = groupByDay(entries);
  return `<div class="daystrip-wrap"><button type="button" class="icon-btn" data-strip-nav="-7" aria-label="Semana anterior">${icon('left')}</button><div class="daystrip" role="group" aria-label="Días de la semana">${WD.map((w, k) => {
    const d = addDays(start, k); const key = toDateKey(d); const list = byDay.get(key) || [];
    return `<button type="button" class="ds-day ${key === today ? 'today' : ''} ${key === state.day ? 'sel' : ''}" data-strip="${key}" aria-pressed="${key === state.day}" title="${list.length} publicación(es)"><small>${w}</small><b>${d.getDate()}</b><i>${list.slice(0, 4).map((c) => `<s style="--bc:${esc(store.get('brands', c.brandId)?.color || 'var(--cyan)')}"></s>`).join('')}</i></button>`;
  }).join('')}</div><button type="button" class="icon-btn" data-strip-nav="7" aria-label="Semana siguiente">${icon('right')}</button></div>`;
}

function conflictKeys(entries) {
  const m = new Map();
  entries.forEach((c) => { const k = `${c.brandId}|${c.platform}|${c.date}`; m.set(k, (m.get(k) || 0) + 1); });
  return new Set([...m.entries()].filter(([, n]) => n > 1).map(([k]) => k));
}

function ev(c, conflicts) {
  const i = store.get('ideas', c.ideaId); const b = store.get('brands', c.brandId);
  const conflict = conflicts.has(`${c.brandId}|${c.platform}|${c.date}`);
  const late = c.status !== 'publicado' && c.date < todayISO();
  const st = statusInfo(i.status);
  return `<div class="cev ${c.status === 'publicado' ? 'pub' : ''} ${conflict ? 'conflict' : ''} ${late ? 'late' : ''}" draggable="${c.status !== 'publicado'}" data-cal="${c.id}" data-idea="${i.id}" title="${esc(`${i.title}\n${b?.name} · ${platformLabel(c.platform)}\n${st.name}${c.owner ? `\nResponsable: ${c.owner}` : ''}${i.priority === 1 ? '\nPrioridad alta' : ''}`)}" style="--bc:${esc(b?.color || '#888')}">
    <span class="cev-p">${platformShort(c.platform)}</span><span class="cev-t">${c.time ? `<b>${esc(c.time)}</b> ` : ''}${esc(i.title)}</span><span class="cev-s" style="background:${st.color}"></span></div>`;
}

function drawMonth(host, entries, conflicts) {
  const first = new Date(state.cursor.getFullYear(), state.cursor.getMonth(), 1);
  const start = startOfWeek(first); const month = first.getMonth(); const today = todayISO();
  const byDay = groupByDay(entries);
  const weeklyTarget = Math.round(weeklyTargetFor(app.brandId));
  const thisWeek = toDateKey(startOfWeek(new Date()));
  let html = `<div class="month">${WD.map((d) => `<div class="mh">${d}</div>`).join('')}<div class="mh">Semana</div>`;
  for (let w = 0; w < 6; w++) {
    let weekCount = 0;
    for (let d = 0; d < 7; d++) {
      const day = addDays(start, w * 7 + d); const k = toDateKey(day); const list = byDay.get(k) || [];
      weekCount += list.length;
      html += `<div class="mday ${day.getMonth() !== month ? 'out' : ''} ${k === today ? 'today' : ''} ${k === state.day ? 'sel' : ''}" data-day="${k}"><span class="mnum">${day.getDate()}</span>${list.map((c) => ev(c, conflicts)).join('')}</div>`;
    }
    // Solo se marca "faltan" en la semana actual y las siguientes (las pasadas ya no se pueden llenar).
    const wk = toDateKey(addDays(start, w * 7));
    const gap = weeklyTarget && wk >= thisWeek && weekCount < weeklyTarget;
    html += `<div class="mweek ${gap ? 'gap' : ''}" title="${weeklyTarget ? `Objetivo semanal: ${weeklyTarget}` : 'Define la frecuencia por plataforma en la marca'}"><b>${weekCount}</b>${weeklyTarget ? `<span>de ${weeklyTarget}</span>` : ''}${gap ? `<span class="xs">faltan ${weeklyTarget - weekCount}</span>` : ''}</div>`;
    if (addDays(start, (w + 1) * 7).getMonth() !== month && w >= 3) break;
  }
  // En celular: al tocar un día se muestra abajo la lista de ese día.
  const sel = state.day || (isPhone() ? today : null);
  const agenda = (isPhone() || state.day) && sel ? `<section class="day-agenda"><div class="row-between"><h3>${icon('clock')}${esc(new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(parseDateKey(sel)))}</h3><button class="btn btn-sm" data-pick-day="${sel}">${icon('plus', 'ic-sm')}Programar</button></div>
    <div class="stack">${(byDay.get(sel) || []).sort((a, b) => (a.time || '').localeCompare(b.time || '')).map(dayCard).join('') || '<p class="small muted">Sin publicaciones este día.</p>'}</div></section>` : '';
  host.innerHTML = `${html}</div><p class="xs muted cal-help" style="margin-top:8px">Arrastra para cambiar la fecha. Doble clic en un día para programar. La columna "Semana" compara con la frecuencia objetivo de las plataformas.</p>${agenda}`;
}

function drawWeek(host, entries, conflicts, days) {
  const start = days === 7 ? startOfWeek(state.cursor) : new Date(state.cursor.getFullYear(), state.cursor.getMonth(), state.cursor.getDate());
  const byDay = groupByDay(entries); const today = todayISO();
  host.innerHTML = `<div class="week" style="grid-template-columns:repeat(${days},minmax(0,1fr))">${Array.from({ length: days }, (_, d) => {
    const day = addDays(start, d); const k = toDateKey(day); const list = (byDay.get(k) || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    return `<div class="wday ${k === today ? 'today' : ''}" data-day="${k}"><header>${new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric' }).format(day)}</header>
      <div class="wday-b">${list.map((c) => days === 1 ? dayCard(c) : ev(c, conflicts)).join('') || '<div class="wempty">Sin publicaciones</div>'}</div></div>`;
  }).join('')}</div>`;
}

function dayCard(c) {
  const i = store.get('ideas', c.ideaId);
  return `<div class="tl-row"><div class="tl-time">${c.time ? esc(c.time) : '—'}</div><a class="card card-b dcard" href="#/contenido/${i.id}" data-cal="${c.id}" style="--bc:${esc(statusInfo(i.status).color)}"><div class="row-between"><b>${esc(i.title)}</b>${statusBadge(i.status)}</div>
    <div class="row small muted">${brandTag(c.brandId)}<span>${esc(platformLabel(c.platform))}</span>${c.time ? `<span>${icon('clock', 'ic-sm')} ${esc(c.time)}</span>` : ''}${c.owner ? `<span>${icon('user', 'ic-sm')} ${esc(c.owner)}</span>` : ''}</div></a></div>`;
}

function drawList(host, entries) {
  const rows = entries.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  host.innerHTML = `<div class="card">${rows.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Contenido</th><th>Marca</th><th>Plataforma</th><th>Estado</th><th>Responsable</th><th>Prioridad</th><th>Tipo</th></tr></thead><tbody>
    ${rows.map((c) => { const i = store.get('ideas', c.ideaId); const late = c.status !== 'publicado' && c.date < todayISO(); return `<tr class="clickable" data-open="${i.id}"><td class="nowrap ${late ? 'late-txt' : ''}">${fmtDate(c.date)} ${c.time || ''}${late ? ' · retrasado' : ''}</td><td><b>${esc(i.title)}</b></td><td>${brandTag(c.brandId)}</td><td>${esc(platformLabel(c.platform))}</td><td>${c.status === 'publicado' ? '<span class="badge" style="--bc:var(--ok)">Publicado</span>' : statusBadge(i.status)}</td><td class="small">${esc(c.owner || '—')}</td><td class="small">${i.priority === 1 ? 'Alta' : i.priority === 3 ? 'Baja' : 'Media'}</td><td class="small">${esc(byId(CONTENT_TYPES, i.contentType)?.name || i.contentType || '—')}</td></tr>`; }).join('')}
    </tbody></table></div>` : emptyState('Sin publicaciones programadas', 'Programa contenidos desde su pestaña Publicación o arrastrándolos al calendario.', '', 'calendar')}</div>`;
  host.querySelector('tbody')?.addEventListener('click', (e) => { const tr = e.target.closest('[data-open]'); if (tr) go(`/contenido/${tr.dataset.open}`); });
}

function drawUnscheduled(side, bId) {
  const items = store.all('ideas', { brandId: bId }).filter((i) => statusIndex(i.status) >= statusIndex('aprobada') && statusIndex(i.status) < statusIndex('publicado') && !store.find('calendar', (c) => c.ideaId === i.id))
    .sort((a, b) => statusIndex(b.status) - statusIndex(a.status));
  side.innerHTML = `<div class="card-h"><h3>Sin fecha</h3><span class="xs muted">${items.length}</span></div><div class="card-b stack">${items.length ? items.map((i) => `<div class="cev side" draggable="true" data-idea="${i.id}" style="--bc:${esc(store.get('brands', i.brandId)?.color || '#888')}"><span class="cev-t">${esc(i.title)}</span><span class="xs muted">${esc(statusInfo(i.status).name)}</span></div>`).join('') : '<p class="xs muted">Todo lo aprobado tiene fecha.</p>'}<p class="xs muted">Arrastra un contenido a un día, o tócalo para programarlo.</p></div>`;
}

function bindDnD(main) {
  const onStart = (e) => {
    const el = e.target.closest('.cev'); if (!el) return;
    e.dataTransfer.setData('text/plain', JSON.stringify({ cal: el.dataset.cal || null, idea: el.dataset.idea }));
    e.dataTransfer.effectAllowed = 'move'; el.classList.add('dragging');
  };
  const onEnd = (e) => { e.target.closest?.('.cev')?.classList.remove('dragging'); main.querySelectorAll('.over').forEach((x) => x.classList.remove('over')); };
  const onOver = (e) => { const d = e.target.closest('[data-day]'); if (!d) return; e.preventDefault(); main.querySelectorAll('[data-day].over').forEach((x) => x !== d && x.classList.remove('over')); d.classList.add('over'); };
  const onDrop = async (e) => {
    const d = e.target.closest('[data-day]'); if (!d) return; e.preventDefault(); d.classList.remove('over');
    let p; try { p = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }
    if (p.cal) {
      const c = store.get('calendar', p.cal); if (!c || c.date === d.dataset.day) return;
      const prev = c.date;
      await store.update('calendar', c.id, { date: d.dataset.day });
      toast(`Movido al ${fmtDate(d.dataset.day)}`, 'success', { action: { label: 'Deshacer', fn: () => store.update('calendar', c.id, { date: prev }) } });
    } else if (p.idea) {
      const i = store.get('ideas', p.idea); if (i) openSchedule(i, null, { date: d.dataset.day });
    }
  };
  const onClick = (e) => {
    const cell = e.target.closest('.month [data-day]');
    if (cell && isPhone()) { state.day = cell.dataset.day; main.dispatchEvent(new CustomEvent('cal:redraw')); return; }
    const el = e.target.closest('.cev'); if (el && el.closest('.cal-host, .cal-side')) go(`/contenido/${el.dataset.idea}/publicacion`);
  };
  const pairs = [['dragstart', onStart], ['dragend', onEnd], ['dragover', onOver], ['drop', onDrop], ['click', onClick]];
  pairs.forEach(([t, f]) => main.addEventListener(t, f));
  return () => pairs.forEach(([t, f]) => main.removeEventListener(t, f));
}

function pickIdeaForDay(day) {
  const items = store.all('ideas', { brandId: app.brandId }).filter((i) => !['descartada', 'publicado', 'analizado'].includes(i.status));
  if (!items.length) { toast('No hay contenidos para programar', 'info'); return; }
  import('../core/ui.js').then(({ modal }) => {
    const m = modal({ title: `Programar el ${fmtDate(day)}`, size: 'md', body: `<div class="stack">${items.slice(0, 60).map((i) => `<button class="btn" data-pick="${i.id}" style="justify-content:space-between;height:auto;padding:8px 12px"><span class="truncate">${esc(i.title)}</span>${statusBadge(i.status)}</button>`).join('')}</div>` });
    m.body.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) { m.close(); openSchedule(store.get('ideas', b.dataset.pick), null, { date: day }); } });
  });
}

function groupByDay(entries) { const m = new Map(); entries.forEach((c) => { if (!m.has(c.date)) m.set(c.date, []); m.get(c.date).push(c); }); return m; }

function weeklyTargetFor(bId) {
  const plats = store.all('platforms', { brandId: bId }).filter((p) => p.active !== false);
  return plats.reduce((n, p) => n + (Number(p.frequencyPerWeek) || 0), 0);
}

export { schedule, PIPELINE };
