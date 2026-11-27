import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { on } from '../core/events.js';
import { icon, emptyState, toast, modal, renderFields, readFields, validateFields, withBusy, confirmDialog } from '../core/ui.js';
import { esc, fmtDate, similarity } from '../core/utils.js';
import { OBJECTIVES, PLATFORMS, CONTENT_TYPES, STRUCTURES, PRODUCTION_TYPES, byId } from '../services/methodology.js';
import { PRIORITIES, statusInfo } from '../core/schema.js';
import { pageHeader, brandTag, statusBadge, openIdeaModal, filterBar, aiGuard, requireBrandSelect, platformShort } from './shared.js';
import { setStatus, findSimilarIdeas } from '../services/workflow.js';
import { aiIdeas } from '../services/assistant.js';

const state = { q: '', status: 'pendientes', pillar: '', objective: '', priority: '' };
const STATUS_CHIPS = [
  { id: 'pendientes', label: 'Pendientes', match: (i) => ['idea', 'aprobada'].includes(i.status) },
  { id: 'idea', label: 'Por aprobar', match: (i) => i.status === 'idea' },
  { id: 'aprobada', label: 'Aprobadas', match: (i) => i.status === 'aprobada' },
  { id: 'todas', label: 'Todas', match: () => true },
  { id: 'descartada', label: 'Descartadas', match: (i) => i.status === 'descartada' },
];

export function render(main) {
  const draw = () => {
    const bId = app.brandId;
    const all = store.all('ideas', { brandId: bId });
    const pillars = store.all('pillars', { brandId: bId });
    const chip = STATUS_CHIPS.find((c) => c.id === state.status) || STATUS_CHIPS[0];
    let list = all.filter((i) => {
      if (!chip.match(i)) return false;
      if (state.pillar && i.pillarId !== state.pillar) return false;
      if (state.objective && i.objective !== state.objective) return false;
      if (state.priority && String(i.priority) !== state.priority) return false;
      if (state.q && !`${i.title} ${i.topic} ${i.problem} ${i.keyword} ${i.pitch?.firstFrameText || ''}`.toLowerCase().includes(state.q.toLowerCase())) return false;
      return true;
    }).sort((a, b) => (a.priority || 2) - (b.priority || 2) || b.createdAt.localeCompare(a.createdAt));

    main.innerHTML = `${pageHeader({ title: 'Ideas', sub: 'Apunta, aprueba y pasa directo a guion.',
      actions: `<button class="btn btn-ai" data-ai>${icon('sparkle')}Con IA</button><button class="btn btn-primary" data-new>${icon('plus')}Nueva idea</button>` })}
      <div class="idea-chips" role="tablist" aria-label="Estado de ideas">${STATUS_CHIPS.map((c) => {
        const n = all.filter(c.match).length;
        return `<button type="button" role="tab" class="stage-chip ${c.id === state.status ? 'active' : ''}" data-st="${c.id}" aria-selected="${c.id === state.status}">${esc(c.label)}<em>${n}</em></button>`;
      }).join('')}</div>
      <div class="toolbar">${filterBar([
        { type: 'search', name: 'q', placeholder: 'Buscar idea…' },
        ...(pillars.length ? [{ name: 'pillar', label: 'Pilar', options: pillars.map((p) => ({ value: p.id, label: p.name })) }] : []),
        { name: 'objective', label: 'Objetivo', options: OBJECTIVES.map((o) => ({ value: o.id, label: o.name })) },
        { name: 'priority', label: 'Prioridad', options: PRIORITIES.map((p) => ({ value: String(p.id), label: p.name })) },
      ], state)}<button class="btn btn-sm btn-ghost" data-dups title="Buscar ideas parecidas">${icon('compare', 'ic-sm')}Duplicados</button></div>
      ${list.length ? `<div class="idea-list">${list.map((i) => renderIdeaItem(i, bId === 'all')).join('')}</div>`
        : `<div class="card">${emptyState(all.length ? 'Ninguna idea en esta vista' : 'Aún no hay ideas', all.length ? 'Prueba otro filtro o crea una idea nueva.' : 'Apunta ideas rápidas o genera propuestas con IA.', `<button class="btn btn-primary" data-new>${icon('plus')}Nueva idea</button>`, 'bulb')}</div>`}`;

    main.querySelectorAll('[data-new]').forEach((b) => (b.onclick = () => openIdeaModal({ onSaved: draw })));
    main.querySelector('[data-ai]').onclick = () => openAiIdeas(draw);
    main.querySelector('[data-dups]').onclick = () => showDuplicates(bId);
    main.querySelectorAll('[data-st]').forEach((b) => (b.onclick = () => { state.status = b.dataset.st; draw(); }));
    main.querySelector('.filterbar').addEventListener('input', (e) => { state[e.target.name] = e.target.value; if (e.target.type !== 'search') draw(); else { clearTimeout(draw._t); draw._t = setTimeout(() => { draw(); const s = main.querySelector('[name="q"]'); s?.focus(); s?.setSelectionRange(s.value.length, s.value.length); }, 250); } });
    main.querySelector('.idea-list')?.addEventListener('click', async (e) => {
      const ap = e.target.closest('[data-approve]'); const ds = e.target.closest('[data-discard]'); const ro = e.target.closest('[data-reopen]');
      if (ap) { e.stopPropagation(); await setStatus(ap.dataset.approve, 'aprobada'); toast('Idea aprobada', 'success'); return; }
      if (ds) { e.stopPropagation(); if (await confirmDialog({ title: 'Descartar idea', message: 'Se marcará como descartada (puedes recuperarla cuando quieras).', confirm: 'Descartar' })) await setStatus(ds.dataset.discard, 'descartada'); return; }
      if (ro) { e.stopPropagation(); await setStatus(ro.dataset.reopen, 'idea', 'Recuperada'); return; }
      if (e.target.closest('[data-stop]')) return;
      const card = e.target.closest('[data-id]'); if (card) go(`/contenido/${card.dataset.id}`);
    });
  };
  draw();
  const off = on('change', (p) => { if (!p?.remote && ['ideas', undefined].includes(p?.table)) draw(); });
  return () => { clearTimeout(draw._t); off(); };
}

function renderIdeaItem(i, showBrand) {
  const st = statusInfo(i.status);
  const sub = i.pitch?.firstFrameText || i.problem || '';
  const pillar = i.pillarId ? store.get('pillars', i.pillarId)?.name : '';
  const fmt = i.format ? byId(STRUCTURES, i.format)?.name : '';
  const tags = [
    ...(i.platforms || []).map((p) => `<span class="tag">${platformShort(p)}</span>`),
    fmt && `<span class="tag">${esc(fmt)}</span>`,
    pillar && `<span class="tag">${esc(pillar)}</span>`,
    i.experimental && '<span class="tag">20 %</span>',
  ].filter(Boolean).join('');
  return `<article class="icard" data-id="${i.id}" style="--bc:${st.color}" tabindex="0">
    <div class="icard-main">
      <div class="icard-top">
        ${showBrand ? brandTag(i.brandId) : ''}
        ${statusBadge(i.status)}
        ${i.priority === 1 ? '<span class="prio-hi">Alta</span>' : ''}
      </div>
      <h3 class="icard-title">${esc(i.title)}</h3>
      ${sub ? `<p class="icard-sub">${esc(sub)}</p>` : ''}
      ${tags ? `<div class="icard-tags">${tags}</div>` : ''}
    </div>
    <div class="icard-act" data-stop>
      ${i.status === 'idea' ? `<button class="btn btn-sm btn-soft" data-approve="${i.id}">${icon('check', 'ic-sm')}Aprobar</button>` : ''}
      ${i.status === 'aprobada' ? `<a class="btn btn-sm btn-primary" href="#/contenido/${i.id}/guion">${icon('edit', 'ic-sm')}Guion</a>` : ''}
      ${['idea', 'aprobada'].includes(i.status) ? `<button class="icon-btn sm" data-discard="${i.id}" title="Descartar" aria-label="Descartar">${icon('x', 'ic-sm')}</button>` : ''}
      ${i.status === 'descartada' ? `<button class="btn btn-sm" data-reopen="${i.id}">Recuperar</button>` : ''}
    </div>
  </article>`;
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
                return `<label class="card card-b check" style="align-items:flex-start"><input type="checkbox" data-i="${i}" ${sim.length ? '' : 'checked'}><span><span class="xs muted">${i + 1} de ${results.length} · ${i < results.length / 3 ? 'más segura' : i >= (results.length * 2) / 3 ? 'más arriesgada' : 'intermedia'}</span><br><b>${esc(r.title)}</b>
                  <span class="row xs muted" style="margin:4px 0">${esc(byId(OBJECTIVES, r.objective)?.name || r.objective || '')} · ${esc(byId(CONTENT_TYPES, r.contentType)?.name || '')} · ${esc(byId(STRUCTURES, r.format)?.name || r.format || '')} · ${esc(byId(PRODUCTION_TYPES, r.productionType)?.name || '')}${r.experimental ? ' · <span class="tag">experimental</span>' : ''}</span>
                  ${r.firstFrameText ? `<span class="first-frame"><b>${esc(r.firstFrameText)}</b>${r.firstFrameVisual ? `<span class="xs muted">${esc(r.firstFrameVisual)}</span>` : ''}</span>` : ''}
                  <span class="small">${esc(r.problem || '')}</span>
                  ${r.basedOn ? `<span class="xs" style="display:block;margin-top:4px">${icon('refresh', 'ic-sm')} Variante de «${esc(r.basedOn)}»${r.keepChange ? `: ${esc(r.keepChange)}` : ''}</span>` : ''}
                  ${r.why ? `<span class="xs muted" style="display:block;margin-top:4px">Por qué: ${esc(r.why)}</span>` : ''}
                  ${r.risk ? `<span class="xs" style="display:block;margin-top:2px;color:var(--warn)">Riesgo: ${esc(r.risk)}</span>` : ''}
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
                  productionType: byId(PRODUCTION_TYPES, r.productionType) ? r.productionType : '',
                  pitch: r.pitch || {},
                  notes: [r.hookIdea && `Idea de hook: ${r.hookIdea}`, r.cta && `CTA: ${r.cta}`].filter(Boolean).join('\n'), status: 'idea', source: 'ai', statusHistory: [],
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
  const m = modal({ title: 'Ideas similares', size: 'lg', body: pairs.length ? `<p class="muted small">Similitud calculada localmente (palabras y fragmentos de texto). Revisa si son la misma idea o enfoques distintos.</p><div class="table-wrap"><table class="tbl"><thead><tr><th>Idea A</th><th>Idea B</th><th class="num">Similitud</th></tr></thead><tbody>${pairs.slice(0, 40).map((p) => `<tr><td><a href="#/contenido/${p.a.id}">${esc(p.a.title)}</a></td><td><a href="#/contenido/${p.b.id}">${esc(p.b.title)}</a></td><td class="num">${Math.round(p.s * 100)} %</td></tr>`).join('')}</tbody></table></div>` : emptyState('Sin duplicados', 'No se encontraron ideas demasiado parecidas.', '', 'check'), actions: [{ label: 'Cerrar' }] });
  m.body.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => m.close()));
}

