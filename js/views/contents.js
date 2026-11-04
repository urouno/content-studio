import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { on } from '../core/events.js';
import { PIPELINE, statusInfo, statusIndex } from '../core/schema.js';
import { icon, toast, emptyState } from '../core/ui.js';
import { esc, fmtDate } from '../core/utils.js';
import { PLATFORMS } from '../services/methodology.js';
import { pageHeader, renderBoard, filterBar, brandTag, statusBadge, platformShort, openIdeaModal } from './shared.js';
import { setStatus } from '../services/workflow.js';

const state = { view: 'tablero', q: '', platform: '', owner: '', hideEarly: false };

export function render(main, { query }) {
  if (query.st) { state.view = 'lista'; state.st = query.st; } else state.st = '';
  const draw = () => {
    const bId = app.brandId;
    let ideas = store.all('ideas', { brandId: bId }).filter((i) => i.status !== 'descartada');
    const owners = [...new Set(ideas.map((i) => i.owner).filter(Boolean))];
    ideas = ideas.filter((i) => (!state.platform || (i.platforms || []).includes(state.platform)) && (!state.owner || i.owner === state.owner)
      && (!state.q || i.title.toLowerCase().includes(state.q.toLowerCase())));
    const cols = state.hideEarly ? PIPELINE.filter((p) => statusIndex(p.id) >= statusIndex('aprobada')) : PIPELINE;
    main.innerHTML = `${pageHeader({ title: 'Producción', sub: 'Arrastra las tarjetas para cambiar de etapa. Ningún dato se pierde al retroceder.',
      actions: `<div class="btn-group"><button class="btn ${state.view === 'tablero' ? 'active' : ''}" data-v="tablero">${icon('columns')}Tablero</button><button class="btn ${state.view === 'lista' ? 'active' : ''}" data-v="lista">${icon('list')}Lista</button></div><button class="btn btn-primary" data-new>${icon('plus')}Nueva idea</button>` })}
      <div class="row-between" style="margin-bottom:12px">${filterBar([
        { type: 'search', name: 'q', placeholder: 'Buscar contenido…' },
        { name: 'platform', label: 'Plataforma', options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })) },
        { name: 'owner', label: 'Responsable', options: owners.map((o) => ({ value: o, label: o })) },
      ], state)}<label class="check"><input type="checkbox" data-hide ${state.hideEarly ? 'checked' : ''}>Ocultar ideas sin aprobar</label></div>
      ${state.st ? `<div class="notice" style="margin-bottom:12px">${icon('filter')}<div>Mostrando: <b>${esc(statusInfo(state.st).name)}</b> y etapas del mismo grupo. <a href="#/contenidos">Quitar filtro</a></div></div>` : ''}
      <div class="board-host"></div>`;
    const host = main.querySelector('.board-host');
    if (state.view === 'tablero') {
      renderBoard(host, ideas, {
        columns: cols, showBrand: bId === 'all',
        onOpen: (id) => go(`/contenido/${id}`),
        onMove: async (id, st) => {
          const i = store.get('ideas', id);
          if (!i || i.status === st) return;
          await setStatus(id, st, 'Movido en el tablero');
          toast(`"${i.title}" → ${statusInfo(st).name}`, 'success', { action: { label: 'Deshacer', fn: () => setStatus(id, i.status, 'Deshacer') } });
        },
      });
    } else {
      const grp = state.st ? statusInfo(state.st).group : null;
      const rows = ideas.filter((i) => !grp || statusInfo(i.status).group === grp).sort((a, b) => statusIndex(a.status) - statusIndex(b.status));
      host.innerHTML = `<div class="card">${rows.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Contenido</th>${bId === 'all' ? '<th>Marca</th>' : ''}<th>Estado</th><th>Plataformas</th><th>Publicación</th><th>Responsable</th><th>Actualizado</th></tr></thead><tbody>
        ${rows.map((i) => { const c = store.filter('calendar', (x) => x.ideaId === i.id).sort((a, b) => a.date.localeCompare(b.date))[0]; return `<tr class="clickable" data-id="${i.id}"><td><b>${esc(i.title)}</b><div class="xs muted mono">${i.id}</div></td>${bId === 'all' ? `<td>${brandTag(i.brandId)}</td>` : ''}<td>${statusBadge(i.status)}</td><td>${(i.platforms || []).map((p) => `<span class="tag">${platformShort(p)}</span>`).join(' ')}</td><td class="small">${c ? fmtDate(c.date) : '—'}</td><td class="small">${esc(i.owner || '—')}</td><td class="small muted">${fmtDate(i.updatedAt)}</td></tr>`; }).join('')}
        </tbody></table></div>` : emptyState('Sin contenidos', 'No hay contenidos en esta etapa.', '', 'film')}</div>`;
      host.querySelector('tbody')?.addEventListener('click', (e) => { const tr = e.target.closest('tr[data-id]'); if (tr) go(`/contenido/${tr.dataset.id}`); });
    }
    main.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { state.view = b.dataset.v; state.st = ''; draw(); }));
    main.querySelector('[data-new]').onclick = () => openIdeaModal({ onSaved: (i) => go(`/contenido/${i.id}`) });
    main.querySelector('[data-hide]').onchange = (e) => { state.hideEarly = e.target.checked; draw(); };
    main.querySelector('.filterbar').addEventListener('input', (e) => { state[e.target.name] = e.target.value; if (e.target.type !== 'search') draw(); else { clearTimeout(draw._t); draw._t = setTimeout(() => { draw(); const s = main.querySelector('[name="q"]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 250); } });
  };
  draw();
  return on('change', (p) => { if (!p?.remote) draw(); });
}
