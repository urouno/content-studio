import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { on } from '../core/events.js';
import { icon, emptyState, toast, modal, renderFields, readFields, validateFields, withBusy, confirmDialog } from '../core/ui.js';
import { esc, fmtDate, similarity } from '../core/utils.js';
import { OBJECTIVES, PLATFORMS, CONTENT_TYPES, STRUCTURES, byId } from '../services/methodology.js';
import { PRIORITIES } from '../core/schema.js';
import { pageHeader, brandTag, statusBadge, openIdeaModal, filterBar, aiGuard, requireBrandSelect, platformShort, priorityLabel } from './shared.js';
import { setStatus, findSimilarIdeas } from '../services/workflow.js';
import { aiIdeas } from '../services/assistant.js';

const state = { q: '', status: 'pendientes', pillar: '', objective: '', priority: '' };

export function render(main) {
  const draw = () => {
    const bId = app.brandId;
    const all = store.all('ideas', { brandId: bId });
    const pillars = store.all('pillars', { brandId: bId });
    let list = all.filter((i) => {
      if (state.status === 'pendientes' && !['idea', 'aprobada'].includes(i.status)) return false;
      if (state.status && !['pendientes', 'todas'].includes(state.status) && i.status !== state.status) return false;
      if (state.pillar && i.pillarId !== state.pillar) return false;
      if (state.objective && i.objective !== state.objective) return false;
      if (state.priority && String(i.priority) !== state.priority) return false;
      if (state.q && !`${i.title} ${i.topic} ${i.problem} ${i.keyword}`.toLowerCase().includes(state.q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (a.priority || 2) - (b.priority || 2) || b.createdAt.localeCompare(a.createdAt));

    main.innerHTML = `${pageHeader({ title: 'Banco de ideas', sub: 'Cada idea es un contenido con identificador único que avanza por todo el flujo.',
      actions: `<button class="btn" data-dups>${icon('compare')}Detectar duplicados</button><button class="btn btn-ai" data-ai>${icon('sparkle')}Generar ideas con IA</button><button class="btn btn-primary" data-new>${icon('plus')}Nueva idea</button>` })}
      ${filterBar([
        { type: 'search', name: 'q', placeholder: 'Buscar por título, tema, problema…' },
        { name: 'status', label: 'Estado', options: [{ value: 'pendientes', label: 'Pendientes (idea / aprobada)' }, { value: 'todas', label: 'Todas' }, { value: 'idea', label: 'Idea registrada' }, { value: 'aprobada', label: 'Aprobada' }, { value: 'descartada', label: 'Descartadas' }] },
        { name: 'pillar', label: 'Pilar', options: pillars.map((p) => ({ value: p.id, label: p.name })) },
        { name: 'objective', label: 'Objetivo', options: OBJECTIVES.map((o) => ({ value: o.id, label: o.name })) },
        { name: 'priority', label: 'Prioridad', options: PRIORITIES.map((p) => ({ value: String(p.id), label: p.name })) },
      ], state).replace('<option value="">Estado: todas</option>', '')}
      <div class="card">${list.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Idea</th>${bId === 'all' ? '<th>Marca</th>' : ''}<th>Pilar</th><th>Objetivo</th><th>Formato</th><th>Plataformas</th><th>Prioridad</th><th>Estado</th><th></th></tr></thead><tbody>
        ${list.map((i) => `<tr class="clickable" data-id="${i.id}"><td style="max-width:380px"><b>${esc(i.title)}</b>${i.problem ? `<div class="xs muted truncate">${esc(i.problem)}</div>` : ''}<div class="xs muted mono">${i.id}</div></td>
          ${bId === 'all' ? `<td>${brandTag(i.brandId)}</td>` : ''}
          <td class="small">${esc(store.get('pillars', i.pillarId)?.name || '—')}</td>
          <td class="small">${esc(byId(OBJECTIVES, i.objective)?.name || '—')}</td>
          <td class="small">${esc(byId(STRUCTURES, i.format)?.name || '—')}${i.experimental ? ' <span class="tag">20 %</span>' : ''}</td>
          <td>${(i.platforms || []).map((p) => `<span class="tag">${platformShort(p)}</span>`).join(' ')}</td>
          <td class="small">${priorityLabel(i.priority)}</td>
          <td>${statusBadge(i.status)}</td>
          <td class="nowrap" data-stop>${i.status === 'idea' ? `<button class="btn btn-sm" data-approve="${i.id}" title="Aprobar idea">${icon('check', 'ic-sm')}Aprobar</button>` : ''}
            ${i.status !== 'descartada' && ['idea', 'aprobada'].includes(i.status) ? `<button class="icon-btn sm" data-discard="${i.id}" title="Descartar">${icon('x', 'ic-sm')}</button>` : ''}
            ${i.status === 'descartada' ? `<button class="btn btn-sm" data-reopen="${i.id}">Recuperar</button>` : ''}</td></tr>`).join('')}
        </tbody></table></div>` : emptyState(all.length ? 'Ninguna idea coincide con los filtros' : 'Aún no hay ideas', all.length ? 'Ajusta los filtros o crea una idea nueva.' : 'Registra ideas manualmente o genera propuestas con IA a partir de la identidad de la marca.', `<button class="btn btn-primary" data-new>${icon('plus')}Nueva idea</button>`, 'bulb')}</div>`;

    main.querySelectorAll('[data-new]').forEach((b) => (b.onclick = () => openIdeaModal({ onSaved: draw })));
    main.querySelector('[data-ai]').onclick = () => openAiIdeas(draw);
    main.querySelector('[data-dups]').onclick = () => showDuplicates(bId);
    main.querySelector('.filterbar').addEventListener('input', (e) => { state[e.target.name] = e.target.value; if (e.target.type !== 'search') draw(); else { clearTimeout(draw._t); draw._t = setTimeout(() => { draw(); const s = main.querySelector('[name="q"]'); s.focus(); s.setSelectionRange(s.value.length, s.value.length); }, 250); } });
    main.querySelector('tbody')?.addEventListener('click', async (e) => {
      const ap = e.target.closest('[data-approve]'); const ds = e.target.closest('[data-discard]'); const ro = e.target.closest('[data-reopen]');
      if (ap) { await setStatus(ap.dataset.approve, 'aprobada'); toast('Idea aprobada', 'success'); return; }
      if (ds) { if (await confirmDialog({ title: 'Descartar idea', message: 'Se marcará como descartada (no se borra; puedes recuperarla).', confirm: 'Descartar' })) await setStatus(ds.dataset.discard, 'descartada'); return; }
      if (ro) { await setStatus(ro.dataset.reopen, 'idea', 'Recuperada'); return; }
      if (e.target.closest('[data-stop]')) return;
      const tr = e.target.closest('tr[data-id]'); if (tr) go(`/contenido/${tr.dataset.id}`);
    });
  };
  draw();
  return on('change', (p) => { if (!p?.remote && ['ideas', undefined].includes(p?.table)) draw(); });
}

function openAiIdeas(after) {
  if (!aiGuard()) return;
  const bId = app.brandId !== 'all' ? app.brandId : '';
  const fields = [
    requireBrandSelect(),
    { name: 'count', label: 'Cantidad', type: 'number', min: 1, max: 15 },
    { name: 'pillarId', label: 'Pilar', type: 'select', options: (bId ? store.all('pillars', { brandId: bId }) : []).map((p) => ({ value: p.id, label: p.name })), empty: 'Todos los pilares' },
    { name: 'objective', label: 'Objetivo', type: 'select', options: OBJECTIVES.map((o) => ({ value: o.id, label: o.name })), empty: 'Mezcla 80/20' },
    { name: 'platform', label: 'Plataforma principal', type: 'select', options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })) },
    { name: 'topic', label: 'Tema, frase o concepto de partida (opcional)', type: 'textarea', rows: 2, span: 3 },
  ];
  const body = document.createElement('div');
  body.innerHTML = `<form class="form-grid cols-3">${renderFields(fields, { brandId: bId, count: 6 })}</form><div class="ai-out" style="margin-top:16px"></div>`;
  const form = body.querySelector('form'); const out = body.querySelector('.ai-out');
  form.querySelector('[name="brandId"]').addEventListener('change', (e) => {
    form.querySelector('[name="pillarId"]').innerHTML = `<option value="">Todos los pilares</option>${store.all('pillars', { brandId: e.target.value }).map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}`;
  });
  let results = []; let brandForResults = '';
  const m = modal({
    title: 'Generar ideas con IA', body, size: 'lg',
    actions: [
      { label: 'Cerrar' },
      { label: `${icon('sparkle')}Generar`, kind: 'ai', onClick: async (w) => {
        if (!validateFields(form, fields)) return false;
        const o = readFields(form, fields);
        const btn = w.querySelector('.btn-ai');
        await withBusy(btn, async () => {
          try {
            results = await aiIdeas(o.brandId, { count: Math.min(15, o.count || 6), pillarId: o.pillarId, objective: o.objective, platform: o.platform, topic: o.topic });
            brandForResults = o.brandId;
            out.innerHTML = `<div class="divider-label">Propuestas · selecciona las que quieras añadir</div>
              <div class="stack">${results.map((r, i) => {
                const sim = findSimilarIdeas(o.brandId, `${r.title} ${r.problem}`);
                return `<label class="card card-b check" style="align-items:flex-start"><input type="checkbox" data-i="${i}" ${sim.length ? '' : 'checked'}><span><b>${esc(r.title)}</b>
                  <span class="row xs muted" style="margin:4px 0">${esc(byId(OBJECTIVES, r.objective)?.name || r.objective || '')} · ${esc(byId(CONTENT_TYPES, r.contentType)?.name || '')} · ${esc(byId(STRUCTURES, r.format)?.name || r.format || '')}${r.experimental ? ' · <span class="tag">experimental</span>' : ''}</span>
                  <span class="small">${esc(r.problem || '')}</span>${r.why ? `<span class="xs muted" style="display:block;margin-top:4px">Hipótesis: ${esc(r.why)}</span>` : ''}
                  ${sim.length ? `<span class="xs" style="display:block;color:var(--warn);margin-top:4px">${icon('alert', 'ic-sm')} Parecida a: ${sim.map((s) => esc(s.idea.title)).join('; ')}</span>` : ''}</span></label>`;
              }).join('')}</div>
              <div class="row" style="margin-top:12px;justify-content:flex-end"><button class="btn btn-primary" data-add>${icon('plus')}Añadir seleccionadas</button></div>`;
            out.querySelector('[data-add]').onclick = async () => {
              const picked = [...out.querySelectorAll('[data-i]:checked')].map((c) => results[Number(c.dataset.i)]);
              for (const r of picked) {
                await store.create('ideas', {
                  brandId: brandForResults, title: r.title, topic: r.topic || '', pillarId: r.pillarId || '', audience: r.audience || '', problem: r.problem || '', keyword: r.keyword || '',
                  objective: r.objective || '', funnel: r.funnel || '', contentType: r.contentType || '', format: byId(STRUCTURES, r.format) ? r.format : '',
                  platforms: o.platform ? [o.platform] : [], priority: 2, difficulty: r.difficulty || '', experimental: !!r.experimental, knowledgeLevel: 1,
                  notes: [r.hookIdea && `Idea de hook: ${r.hookIdea}`, r.why && `Por qué (hipótesis IA): ${r.why}`].filter(Boolean).join('\n'), status: 'idea', source: 'ai', statusHistory: [],
                });
              }
              toast(`${picked.length} ideas añadidas`, 'success'); m.close(); after?.();
            };
          } catch (e) { toast(e.message, 'error'); }
        }, 'Generando…');
        return false;
      } },
    ],
  });
}

function showDuplicates(bId) {
  const ideas = store.all('ideas', { brandId: bId }).filter((i) => i.status !== 'descartada');
  const pairs = [];
  for (let a = 0; a < ideas.length; a++) for (let b = a + 1; b < ideas.length; b++) {
    if (ideas[a].brandId !== ideas[b].brandId) continue; // nunca compara entre marcas
    const s = similarity(`${ideas[a].title} ${ideas[a].problem || ''}`, `${ideas[b].title} ${ideas[b].problem || ''}`);
    if (s >= 0.42) pairs.push({ a: ideas[a], b: ideas[b], s });
  }
  pairs.sort((x, y) => y.s - x.s);
  modal({ title: 'Ideas similares', size: 'lg', body: pairs.length ? `<p class="muted small">Similitud calculada localmente (palabras y fragmentos de texto). Revisa si son la misma idea o enfoques distintos.</p><div class="table-wrap"><table class="tbl"><thead><tr><th>Idea A</th><th>Idea B</th><th class="num">Similitud</th></tr></thead><tbody>${pairs.slice(0, 40).map((p) => `<tr><td><a href="#/contenido/${p.a.id}">${esc(p.a.title)}</a></td><td><a href="#/contenido/${p.b.id}">${esc(p.b.title)}</a></td><td class="num">${Math.round(p.s * 100)} %</td></tr>`).join('')}</tbody></table></div>` : emptyState('Sin duplicados', 'No se encontraron ideas demasiado parecidas.', '', 'check'), actions: [{ label: 'Cerrar' }] });
  document.querySelectorAll('.modal a').forEach((a) => a.addEventListener('click', () => document.querySelector('.modal-backdrop')?.remove()));
}
