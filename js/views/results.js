import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { on } from '../core/events.js';
import { icon, emptyState, toast, withBusy } from '../core/ui.js';
import { esc, fmtNum, fmtPct, fmtDate, daysBetween } from '../core/utils.js';
import { DERIVED } from '../core/schema.js';
import { OBJECTIVES, byId } from '../services/methodology.js';
import { buildRows, groupBy, DIMENSIONS, tableForPrompt } from '../services/analytics.js';
import { aiInsights } from '../services/assistant.js';
import { pageHeader, brandTag, platformLabel, aiGuard } from './shared.js';
import { openResultForm } from './content-publish.js';

const state = { dim: 'hookPattern', metric: 'avgPct', sort: 'views', dir: -1, objective: 'retencion' };
const METRIC_OPTS = DERIVED.filter((d) => d.id !== 'engagedViews');
const fmtM = (id, v) => { const d = DERIVED.find((x) => x.id === id); if (id === 'views') return fmtNum(v); return d?.fmt === 'pct' ? fmtPct(v, 2) : fmtNum(v, 2); };

export function render(main) {
  const draw = () => {
    const bId = app.brandId;
    const rows = buildRows(bId);
    const pending = store.all('publications', { brandId: bId }).filter((p) => !store.find('results', (r) => r.publicationId === p.id));
    main.innerHTML = `${pageHeader({ title: 'Resultados y aprendizaje', sub: bId === 'all' ? 'Vista comparativa de todas las marcas. Para patrones e IA, selecciona una marca.' : `Marca: ${esc(app.brand()?.name)}`,
      actions: bId !== 'all' ? `<button class="btn btn-ai" data-insights ${rows.length < 3 ? 'disabled title="Se necesitan al menos 3 contenidos medidos"' : ''}>${icon('sparkle')}Proponer mejoras con IA</button>` : '' })}
      ${pending.length ? `<section class="card" style="margin-bottom:16px"><div class="card-h"><h3>${icon('clock')}Publicaciones sin resultados</h3><span class="xs muted">${pending.length}</span></div><div class="card-b row">${pending.slice(0, 12).map((p) => { const i = store.get('ideas', p.ideaId); return i ? `<button class="btn btn-sm" data-res="${p.id}">${esc(i.title.slice(0, 40))} · ${platformLabel(p.platform)} · ${daysBetween(p.publishedAt, new Date())} d</button>` : ''; }).join('')}</div></section>` : ''}
      ${rows.length ? '' : `<div class="card">${emptyState('Aún no hay resultados registrados', 'Cuando publiques un contenido, registra sus métricas desde su pestaña Resultados o desde aquí. La app calculará tasas por alcance, comparará contenidos y detectará patrones.', '', 'chart')}</div>`}
      ${rows.length ? `
      <div class="notice" style="margin-bottom:16px">${icon('info')}<div><p><b>Cómo leer estos datos:</b> se usan medianas y la última medición de cada publicación. Los patrones muestran <b>asociaciones, no causas</b>: un patrón puede deberse al tema, la plataforma, la fecha o la duración. Con menos de 5 contenidos por grupo, trátalo como una pista y pruébalo variando una sola cosa.</p></div></div>
      <div class="grid g-4" style="margin-bottom:16px">${summaryKpis(rows)}</div>
      <div class="split">
        <section class="card"><div class="card-h"><h3>${icon('layers')}Patrones</h3><div class="row">
          <select class="input input-sm" data-dim>${DIMENSIONS.map((d) => `<option value="${d.id}" ${d.id === state.dim ? 'selected' : ''}>${d.name}</option>`).join('')}</select>
          <select class="input input-sm" data-metric>${METRIC_OPTS.map((m) => `<option value="${m.id}" ${m.id === state.metric ? 'selected' : ''}>${m.name}</option>`).join('')}</select></div></div>
          <div class="card-b">${patternTable(rows)}</div></section>
        <section class="card"><div class="card-h"><h3>${icon('target')}Mejores según objetivo</h3><select class="input input-sm" data-obj>${OBJECTIVES.map((o) => `<option value="${o.id}" ${o.id === state.objective ? 'selected' : ''}>${o.name}</option>`).join('')}</select></div>
          <div class="card-b">${objectiveTop(rows)}</div></section>
      </div>
      <section class="card" style="margin-top:16px"><div class="card-h"><h3>Contenidos medidos</h3><span class="xs muted">${rows.length}</span></div>${contentsTable(rows, bId)}</section>
      <div data-ai-out style="margin-top:16px"></div>` : ''}`;
    main.querySelector('[data-dim]')?.addEventListener('change', (e) => { state.dim = e.target.value; draw(); });
    main.querySelector('[data-metric]')?.addEventListener('change', (e) => { state.metric = e.target.value; draw(); });
    main.querySelector('[data-obj]')?.addEventListener('change', (e) => { state.objective = e.target.value; draw(); });
    main.querySelectorAll('[data-sort]').forEach((th) => th.addEventListener('click', () => { if (state.sort === th.dataset.sort) state.dir *= -1; else { state.sort = th.dataset.sort; state.dir = -1; } draw(); }));
    main.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => openResultForm(store.get('publications', b.dataset.res), null, draw)));
    main.querySelector('tbody.mt')?.addEventListener('click', (e) => { const tr = e.target.closest('[data-idea]'); if (tr) go(`/contenido/${tr.dataset.idea}/resultados`); });
    main.querySelector('[data-insights]')?.addEventListener('click', async (e) => {
      if (!aiGuard()) return;
      await withBusy(e.currentTarget, async () => {
        try { const r = await aiInsights(bId, tableForPrompt(rows)); renderInsights(main.querySelector('[data-ai-out]'), r, bId); } catch (err) { toast(err.message, 'error'); }
      }, 'Analizando…');
    });
  };
  draw();
  return on('change', (p) => { if (!p?.remote && ['results', 'publications', undefined].includes(p?.table)) draw(); });
}

function summaryKpis(rows) {
  const med = (k) => { const a = rows.map((r) => r.m[k]).filter((x) => x != null).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)] : null; };
  return [
    ['Contenidos medidos', fmtNum(rows.length)], ['Mediana % visto', fmtPct(med('avgPct'))], ['Mediana compartidos/alcance', fmtPct(med('sendRate'), 2)], ['Mediana consultas/1k', fmtNum(med('inquiriesPer1k'), 2)],
  ].map(([l, v]) => `<div class="card kpi"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('');
}

function patternTable(rows) {
  const g = groupBy(rows, state.dim, state.metric).filter((x) => x.n > 0);
  if (!g.length) return '<p class="muted small">No hay datos de esta métrica.</p>';
  const max = Math.max(...g.map((x) => x.median || 0)) || 1;
  return `<table class="tbl"><thead><tr><th>${esc(DIMENSIONS.find((d) => d.id === state.dim).name)}</th><th class="num">n</th><th class="num">Mediana</th><th style="width:35%"></th><th class="num">vs. total</th></tr></thead><tbody>
    ${g.map((x) => `<tr><td>${esc(x.key)}${x.lowSample ? ' <span class="tag" title="Menos de 5 contenidos: muestra insuficiente">n bajo</span>' : ''}</td><td class="num">${x.n}</td><td class="num">${fmtM(state.metric, x.median)}</td><td><div class="meter"><i style="width:${((x.median || 0) / max) * 100}%;${x.lowSample ? 'opacity:.45' : ''}"></i></div></td><td class="num ${x.vsOverall > 0 ? 'pos' : x.vsOverall < 0 ? 'neg' : ''}">${x.vsOverall == null ? '—' : `${x.vsOverall > 0 ? '+' : ''}${Math.round(x.vsOverall * 100)} %`}</td></tr>`).join('')}
  </tbody></table>`;
}

function objectiveTop(rows) {
  const o = byId(OBJECTIVES, state.objective);
  const metric = o.primary[0];
  const list = rows.filter((r) => r.m[metric] != null).sort((a, b) => b.m[metric] - a.m[metric]).slice(0, 6);
  return `<p class="xs muted">Métrica principal: <b>${esc(DERIVED.find((d) => d.id === metric)?.name || metric)}</b> · control: ${o.control.map((c) => esc(DERIVED.find((d) => d.id === c)?.name || c)).join(', ')}</p>
    ${list.length ? `<ol class="toplist">${list.map((r) => `<li><a href="#/contenido/${r.ideaId}/resultados">${esc(r.title)}</a><span class="xs muted">${esc(platformLabel(r.platform))} · ${esc(r.dims.structure)} · ${esc(r.dims.hookPattern)}</span><b>${fmtM(metric, r.m[metric])}</b></li>`).join('')}</ol>` : '<p class="muted small">Sin datos para esta métrica.</p>'}
    <p class="xs muted">Un contenido con muchas vistas puede no cumplir su objetivo, y uno con pocas vistas sí. Compara contenidos con el mismo objetivo.</p>`;
}

function contentsTable(rows, bId) {
  const cols = [['title', 'Contenido'], ['views', 'Vistas'], ['avgPct', '% visto'], ['likeRate', 'MG/alc.'], ['commentRate', 'Com./alc.'], ['sendRate', 'Comp./alc.'], ['saveRate', 'Guard./alc.'], ['followsPer1k', 'Seg./1k'], ['inquiriesPer1k', 'Cons./1k'], ['conversionsPer1k', 'Conv./1k']];
  const val = (r, k) => (k === 'title' ? r.title : r.m[k]);
  const sorted = [...rows].sort((a, b) => { const x = val(a, state.sort); const y = val(b, state.sort); if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * state.dir; });
  return `<div class="table-wrap"><table class="tbl"><thead><tr>${cols.map(([k, l]) => `<th class="${k === 'title' ? '' : 'num'} sortable" data-sort="${k}">${l}${state.sort === k ? (state.dir < 0 ? ' ↓' : ' ↑') : ''}</th>`).join('')}<th>Plataforma</th><th>Días</th>${bId === 'all' ? '<th>Marca</th>' : ''}</tr></thead><tbody class="mt">
    ${sorted.map((r) => `<tr class="clickable" data-idea="${r.ideaId}"><td><b>${esc(r.title)}</b><div class="xs muted">${esc(r.dims.structure)} · ${esc(r.dims.hookPattern)} · ${esc(r.dims.duration)}</div></td>${cols.slice(1).map(([k]) => `<td class="num">${fmtM(k, r.m[k])}</td>`).join('')}<td class="small">${esc(platformLabel(r.platform))}</td><td class="num">${r.days ?? '—'}</td>${bId === 'all' ? `<td>${brandTag(r.brandId)}</td>` : ''}</tr>`).join('')}
  </tbody></table></div>`;
}

function renderInsights(host, r, bId) {
  if (!r) return;
  host.innerHTML = `<section class="card"><div class="card-h"><h3>${icon('sparkle')}Propuestas de mejora (IA)</h3><span class="xs muted">Hipótesis a probar, no conclusiones</span></div><div class="card-b grid g-3">
    <div><h4>Observaciones</h4><ul class="small">${(r.observations || []).map((o) => `<li><b>${esc(o.pattern)}</b> <span class="tag">confianza ${esc(o.confidence)}</span><br><span class="muted">${esc(o.evidence)}</span>${o.confounders ? `<br><span class="xs muted">Posibles factores: ${esc(o.confounders)}</span>` : ''}</li>`).join('')}</ul></div>
    <div><h4>Hipótesis y cómo probarlas</h4><ul class="small">${(r.hypotheses || []).map((h) => `<li><b>${esc(h.hypothesis)}</b><br><span class="muted">${esc(h.test)}</span></li>`).join('')}</ul></div>
    <div><h4>Próximas ideas</h4><div class="stack">${(r.nextIdeas || []).map((n, i) => `<div class="card card-b"><b class="small">${esc(n.title)}</b><p class="xs muted">${esc(n.why)}</p><button class="btn btn-sm" data-mk="${i}">${icon('plus', 'ic-sm')}Crear idea</button></div>`).join('')}</div></div>
  </div>${r.caveats ? `<div class="card-f xs muted">${esc(r.caveats)}</div>` : ''}</section>`;
  host.querySelectorAll('[data-mk]').forEach((b) => b.addEventListener('click', async () => {
    const n = r.nextIdeas[Number(b.dataset.mk)];
    const idea = await store.create('ideas', { brandId: bId, title: n.title, notes: `Propuesta a partir de resultados (hipótesis): ${n.why}`, status: 'idea', priority: 2, platforms: [], source: 'ai', statusHistory: [], experimental: true });
    toast('Idea creada (marcada como experimental)', 'success', { action: { label: 'Abrir', fn: () => go(`/contenido/${idea.id}`) } });
    b.disabled = true;
  }));
}

export { fmtDate };
