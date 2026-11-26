import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { on } from '../core/events.js';
import { PIPELINE, statusIndex, statusInfo } from '../core/schema.js';
import { icon, emptyState, toast } from '../core/ui.js';
import { esc, fmtDate, todayISO, toDateKey, addDays, parseDateKey, median, daysBetween } from '../core/utils.js';
import { pageHeader, brandTag, statusBadge, platformLabel, openIdeaModal, FLOW_STEPS } from './shared.js';
import { brandConfig } from '../services/workflow.js';
import { loadDemo } from '../services/demo.js';
import { isConfigured } from '../services/api.js';

const SEV = { danger: 'Urgente', warn: 'Atención', info: 'Pendiente' };
const SHORT = { idea: 'registradas', aprobada: 'aprobadas', guion: 'en desarrollo', guion_aprobado: 'aprobados', por_grabar: 'por grabar', grabado: 'por editar', listo: 'editados', calendarizado: 'programados', publicado: 'publicados', analizado: 'analizados' };

export function render(main) {
  const draw = () => {
    const bId = app.brandId;
    const brands = app.activeBrands();
    if (!brands.length) {
      main.innerHTML = `${pageHeader({ title: 'Bienvenida a Content Studio', sub: 'Tu centro de operaciones de contenido multimarca.' })}
        <div class="card">${emptyState('Empieza creando tu primera marca', 'Cada marca es un espacio independiente con su identidad, tono, recursos, calendario y métricas. También puedes cargar datos de demostración para explorar la app.',
        `<div class="row" style="justify-content:center"><a class="btn btn-primary" href="#/marcas?new=1">${icon('plus')}Crear marca</a><button class="btn" data-demo>${icon('sparkle')}Cargar demostración</button></div>`, 'brand')}</div>`;
      main.querySelector('[data-demo]').onclick = async () => { await loadDemo(); toast('Datos de demostración cargados', 'success'); draw(); };
      return;
    }
    const ideas = store.all('ideas', { brandId: bId });
    const cal = store.all('calendar', { brandId: bId });
    const today = todayISO();
    const count = (st) => ideas.filter((i) => st.includes(i.status)).length;
    const monthStart = today.slice(0, 7);
    const pubMonth = store.all('publications', { brandId: bId }).filter((p) => store.get('ideas', p.ideaId) && String(p.publishedAt).startsWith(monthStart)).length;

    // Alertas: retrasos y riesgos
    const alerts = [];
    cal.filter((c) => c.status !== 'publicado' && c.date < today).forEach((c) => {
      const i = store.get('ideas', c.ideaId); if (i) alerts.push({ sev: 'danger', text: `Retrasado: "${i.title}" debía publicarse el ${fmtDate(c.date)} en ${platformLabel(c.platform)}`, id: i.id, brandId: i.brandId });
    });
    cal.filter((c) => c.status !== 'publicado' && c.date >= today && c.date <= toDateKey(addDays(new Date(), 3))).forEach((c) => {
      const i = store.get('ideas', c.ideaId); if (i && statusIndex(i.status) < statusIndex('listo')) alerts.push({ sev: 'warn', text: `En riesgo: "${i.title}" se publica el ${fmtDate(c.date)} y está en "${PIPELINE[statusIndex(i.status)]?.name}"`, id: i.id, brandId: i.brandId });
    });
    ideas.filter((i) => i.targetDate && i.targetDate < today && statusIndex(i.status) < statusIndex('publicado') && !cal.some((c) => c.ideaId === i.id)).forEach((i) => alerts.push({ sev: 'warn', text: `Fecha objetivo vencida sin calendarizar: "${i.title}"`, id: i.id, brandId: i.brandId }));
    ideas.filter((i) => i.status === 'listo' && !cal.some((c) => c.ideaId === i.id)).forEach((i) => alerts.push({ sev: 'info', text: `Editado sin fecha de publicación: "${i.title}"`, id: i.id, brandId: i.brandId }));
    ideas.filter((i) => i.priority === 1 && ['idea', 'aprobada'].includes(i.status)).slice(0, 5).forEach((i) => alerts.push({ sev: 'info', text: `Prioridad alta sin guion: "${i.title}"`, id: i.id, brandId: i.brandId }));
    store.all('publications', { brandId: bId }).filter((p) => daysBetween(p.publishedAt, new Date()) >= 7 && !store.find('results', (r) => r.publicationId === p.id)).forEach((p) => {
      const i = store.get('ideas', p.ideaId); if (i) alerts.push({ sev: 'info', text: `Registra resultados: "${i.title}" (${platformLabel(p.platform)}) lleva ${daysBetween(p.publishedAt, new Date())} días publicado`, id: i.id, brandId: i.brandId, tab: 'resultados' });
    });

    // Próximas fechas (14 días)
    const upcoming = cal.filter((c) => c.status !== 'publicado' && c.date >= today && c.date <= toDateKey(addDays(new Date(), 14))).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

    // Cumplimiento del calendario por marca (mes actual)
    const now = new Date(); const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const compliance = (bId === 'all' ? brands : brands.filter((b) => b.id === bId)).map((b) => {
      const target = Number(brandConfig(b.id).strategy?.monthlyTarget) || 0;
      const planned = store.all('calendar', { brandId: b.id }).filter((c) => c.date.startsWith(monthStart));
      const published = planned.filter((c) => c.status === 'publicado').length;
      const duePlanned = planned.filter((c) => c.date <= today).length;
      const expectedByNow = target ? Math.round((target * now.getDate()) / daysInMonth) : 0;
      return { b, target, planned: planned.length, published, duePlanned, expectedByNow };
    });

    // Flujo de producción por grupo (sustituye a los 8 contadores y a la lista de 11 barras, que repetían lo mismo).
    const cycle = ideas.map((i) => {
      const h = i.statusHistory || []; const pub = h.find((x) => x.to === 'publicado');
      return pub ? Math.max(0, daysBetween(i.createdAt, pub.at)) : null;
    }).filter((x) => x != null);
    const weekAgo = addDays(new Date(), -7).toISOString();
    const moved = ideas.filter((i) => (i.statusHistory || []).some((x) => x.at >= weekAgo)).length;
    const groups = FLOW_STEPS.map((g) => {
      const parts = g.statuses.map((id) => ({ ...statusInfo(id), n: ideas.filter((i) => i.status === id).length }));
      return { ...g, color: parts.at(-1).color, n: parts.reduce((x, p) => x + p.n, 0), parts };
    });
    const urgent = alerts.filter((a) => a.sev !== 'info').length;
    const active = ideas.filter((i) => ['guion', 'guion_aprobado', 'por_grabar', 'grabado', 'listo'].includes(i.status)).length;
    const total = groups.reduce((n, g) => n + g.n, 0);
    const next7 = cal.filter((c) => c.status !== 'publicado' && c.date >= today && c.date <= toDateKey(addDays(new Date(), 7))).length;
    const monthTarget = (bId === 'all' ? brands : brands.filter((b) => b.id === bId)).reduce((n, b) => n + (Number(brandConfig(b.id).strategy?.monthlyTarget) || 0), 0);

    const connectHint = !isConfigured() ? `<div class="notice" style="margin-bottom:16px">${icon('cloud')}<div><b>Tus datos están guardados solo en este navegador.</b><p>Para tener copia en Google Sheets y usar la IA, abre <a href="#/ajustes/conexion">Ajustes → Conexión</a> y pega la URL y el token de Apps Script.</p></div></div>` : '';
    main.innerHTML = connectHint + `${pageHeader({ title: bId === 'all' ? 'Panel general' : `Panel · ${app.brand()?.name}`, sub: new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(now),
      actions: `<button class="btn btn-primary" data-new>${icon('plus')}Nueva idea</button>` })}
      <div class="grid g-4 kpis" style="margin-bottom:16px">
        <button type="button" class="card kpi link ${urgent ? 'danger' : 'ok'}" data-jump><div class="kpi-top"><span class="eyebrow">${urgent ? 'Requiere acción' : 'Todo al día'}</span><span class="kpi-ic">${icon(urgent ? 'alert' : 'check')}</span></div><div class="v">${urgent}</div><div class="l">Retrasos y riesgos</div></button>
        <a class="card kpi link" href="#/contenidos"><div class="kpi-top"><span class="eyebrow">Total activo</span><span class="kpi-ic">${icon('layers')}</span></div><div class="v">${active}</div><div class="l">Piezas en producción</div></a>
        <a class="card kpi link info" href="#/calendario/lista"><div class="kpi-top"><span class="eyebrow">En cola</span><span class="kpi-ic">${icon('calendar')}</span></div><div class="v">${next7}</div><div class="l">Por publicar en 7 días</div></a>
        <a class="card kpi link ok" href="#/resultados"><div class="kpi-top"><span class="eyebrow">${monthTarget ? `${Math.round((pubMonth / monthTarget) * 100)} % de la meta` : 'Este mes'}</span><span class="kpi-ic">${icon('trend')}</span></div><div class="v">${pubMonth}${monthTarget ? `<span class="kpi-of"> / ${monthTarget}</span>` : ''}</div><div class="l">Publicados este mes</div></a>
      </div>
      <section class="card" style="margin-bottom:16px"><div class="card-h"><h3>${icon('columns')}Ciclo de contenido</h3><div class="row"><span class="badge" style="--bc:var(--text-3)">${total} en total</span><a class="small" href="#/contenidos">Ver tablero</a></div></div>
        <div class="card-b"><div class="cycle-bar" aria-hidden="true">${total ? groups.filter((g) => g.n).map((g) => `<i style="--bc:${g.color};flex:${g.n}"></i>`).join('') : '<i class="zero"></i>'}</div><div class="flow">${groups.map((g) => `<a class="flow-step" href="#/contenidos?g=${g.id}" style="--bc:${g.color}" title="${esc(g.parts.map((p) => `${p.name}: ${p.n}`).join('\n'))}"><b>${g.n}</b><span>${esc(g.name)}</span><small>${g.parts.length > 1 ? g.parts.filter((p) => p.n).map((p) => `${p.n} ${esc(SHORT[p.id] || p.name)}`).join(' · ') : ''}</small></a>`).join('')}</div>
        <p class="xs muted" style="margin:10px 0 0">${cycle.length ? `Ciclo medio idea → publicación: <b>${median(cycle)} días</b> · ` : ''}Contenidos que avanzaron esta semana: <b>${moved}</b></p></div></section>
      <div class="split">
        <div class="stack-lg">
          <section class="card" id="alertas"><div class="card-h"><h3>${icon('zap')}Acciones pendientes</h3>${urgent ? `<span class="badge" style="--bc:var(--coral)">${urgent} urgentes</span>` : `<span class="muted small">${alerts.length}</span>`}</div>
            <div class="card-b">${alerts.length ? `<ul class="alerts">${alerts.slice(0, 14).map((a) => { const href = `#/contenido/${a.id}${a.tab ? '/' + a.tab : ''}`; return `<li class="al-${a.sev}"><div class="al-main"><div class="al-row"><span class="al-sev">${SEV[a.sev]}</span>${bId === 'all' ? brandTag(a.brandId) : ''}</div><a href="${href}">${esc(a.text)}</a></div><a class="btn btn-sm btn-soft" href="${href}">Abrir${icon('right', 'ic-sm')}</a></li>`; }).join('')}</ul>` : `<p class="muted">Todo al día. No hay retrasos ni tareas urgentes.</p>`}</div></section>
          ${compliance.length ? `<section class="card"><div class="card-h"><h3>${icon('target')}Cumplimiento del calendario · ${new Intl.DateTimeFormat('es', { month: 'long' }).format(now)}</h3></div>
            <div class="table-wrap"><table class="tbl"><thead><tr><th>Marca</th><th class="num">Meta mes</th><th class="num">Planificados</th><th class="num">Publicados</th><th>Avance</th></tr></thead><tbody>
            ${compliance.map((c) => { const pct = c.target ? Math.min(1, c.published / c.target) : 0; const behind = c.target && c.published < c.expectedByNow; return `<tr><td>${brandTag(c.b.id)}</td><td class="num">${c.target || '—'}</td><td class="num">${c.planned}</td><td class="num">${c.published}</td><td style="min-width:160px"><div class="meter"><i style="width:${pct * 100}%;background:${behind ? 'var(--warn)' : 'var(--ok)'}"></i></div><span class="xs ${behind ? '' : 'muted'}" style="${behind ? 'color:var(--warn)' : ''}">${c.target ? (behind ? `Por debajo del ritmo (esperado ${c.expectedByNow} a hoy)` : 'En ritmo') : 'Define la meta mensual en la marca'}</span></td></tr>`; }).join('')}
            </tbody></table></div></section>` : ''}
        </div>
        <aside class="stack-lg">
          <section class="card"><div class="card-h"><h3>${icon('calendar')}Próximas publicaciones</h3><a class="small" href="#/calendario/semana">Calendario</a></div>
            <div class="card-b">${upcoming.length ? `<ul class="upcoming">${upcoming.slice(0, 10).map((c) => { const i = store.get('ideas', c.ideaId); return i ? `<li><a href="#/contenido/${i.id}"><span class="up-date"><b>${parseDateKey(c.date).getDate()}</b>${new Intl.DateTimeFormat('es', { month: 'short' }).format(parseDateKey(c.date))}</span><span class="up-t"><span class="truncate">${esc(i.title)}</span><span class="row xs muted">${platformLabel(c.platform)}${c.time ? ` · ${c.time}` : ''} ${statusBadge(i.status)}</span></span></a></li>` : ''; }).join('')}</ul>` : '<p class="muted small">Nada programado en los próximos 14 días.</p>'}</div></section>
        </aside>
      </div>`;
    main.querySelector('[data-jump]').onclick = () => main.querySelector('#alertas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    main.querySelector('[data-new]').onclick = () => openIdeaModal({ onSaved: (i) => go(`/contenido/${i.id}`) });
  };
  draw();
  const off = on('change', (p) => { if (!p?.remote) draw(); });
  return off;
}
