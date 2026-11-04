import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { on } from '../core/events.js';
import { PIPELINE, statusIndex } from '../core/schema.js';
import { icon, emptyState, toast } from '../core/ui.js';
import { esc, fmtDate, todayISO, toDateKey, addDays, parseDateKey, median, daysBetween } from '../core/utils.js';
import { pageHeader, brandTag, statusBadge, platformLabel, openIdeaModal } from './shared.js';
import { brandConfig } from '../services/workflow.js';
import { loadDemo } from '../services/demo.js';
import { isConfigured } from '../services/api.js';

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
    const pubMonth = store.all('publications', { brandId: bId }).filter((p) => String(p.publishedAt).startsWith(monthStart)).length;
    const scheduled = cal.filter((c) => c.status !== 'publicado' && c.date >= today).length;

    const kpis = [
      { v: bId === 'all' ? brands.length : 1, l: bId === 'all' ? 'Marcas activas' : 'Marca seleccionada', href: '#/marcas' },
      { v: count(['idea', 'aprobada']), l: 'Ideas pendientes', href: '#/ideas' },
      { v: count(['guion']), l: 'Guiones en desarrollo', href: '#/contenidos?st=guion' },
      { v: count(['guion_aprobado', 'por_grabar']), l: 'Por grabar', href: '#/contenidos?st=por_grabar' },
      { v: count(['grabado', 'edicion']), l: 'En edición', href: '#/contenidos?st=edicion' },
      { v: count(['listo']), l: 'Listos para publicar', href: '#/contenidos?st=listo' },
      { v: scheduled, l: 'Programados (internos)', href: '#/calendario/lista' },
      { v: pubMonth, l: 'Publicados este mes', href: '#/resultados' },
    ];

    // Alertas: retrasos y riesgos
    const alerts = [];
    cal.filter((c) => c.status !== 'publicado' && c.date < today).forEach((c) => {
      const i = store.get('ideas', c.ideaId); if (i) alerts.push({ sev: 'danger', text: `Retrasado: "${i.title}" debía publicarse el ${fmtDate(c.date)} en ${platformLabel(c.platform)}`, id: i.id, brandId: i.brandId });
    });
    cal.filter((c) => c.status !== 'publicado' && c.date >= today && c.date <= toDateKey(addDays(new Date(), 3))).forEach((c) => {
      const i = store.get('ideas', c.ideaId); if (i && statusIndex(i.status) < statusIndex('listo')) alerts.push({ sev: 'warn', text: `En riesgo: "${i.title}" se publica el ${fmtDate(c.date)} y está en "${PIPELINE[statusIndex(i.status)]?.name}"`, id: i.id, brandId: i.brandId });
    });
    ideas.filter((i) => i.targetDate && i.targetDate < today && statusIndex(i.status) < statusIndex('publicado') && !cal.some((c) => c.ideaId === i.id)).forEach((i) => alerts.push({ sev: 'warn', text: `Fecha objetivo vencida sin calendarizar: "${i.title}"`, id: i.id, brandId: i.brandId }));
    ideas.filter((i) => i.status === 'listo' && !cal.some((c) => c.ideaId === i.id)).forEach((i) => alerts.push({ sev: 'info', text: `Listo sin fecha de publicación: "${i.title}"`, id: i.id, brandId: i.brandId }));
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

    // Indicadores de producción
    const cycle = ideas.map((i) => {
      const h = i.statusHistory || []; const pub = h.find((x) => x.to === 'publicado');
      return pub ? Math.max(0, daysBetween(i.createdAt, pub.at)) : null;
    }).filter((x) => x != null);
    const weekAgo = addDays(new Date(), -7).toISOString();
    const moved = ideas.filter((i) => (i.statusHistory || []).some((x) => x.at >= weekAgo)).length;
    const funnel = PIPELINE.map((p) => ({ ...p, n: ideas.filter((i) => i.status === p.id).length }));
    const maxF = Math.max(1, ...funnel.map((f) => f.n));

    const connectHint = !isConfigured() ? `<div class="notice" style="margin-bottom:16px">${icon('cloud')}<div><b>Tus datos están guardados solo en este navegador.</b><p>Para tener copia en Google Sheets y usar la IA, abre <a href="#/ajustes/conexion">Ajustes → Conexión</a> y pega la URL y el token de Apps Script.</p></div></div>` : '';
    main.innerHTML = connectHint + `${pageHeader({ title: bId === 'all' ? 'Panel general' : `Panel · ${app.brand()?.name}`, sub: new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' }).format(now),
      actions: `<button class="btn btn-primary" data-new>${icon('plus')}Nueva idea</button>` })}
      <div class="grid g-4 kpis" style="margin-bottom:16px">${kpis.map((k) => `<a class="card kpi link" href="${k.href}"><div class="v">${k.v}</div><div class="l">${esc(k.l)}</div></a>`).join('')}</div>
      <div class="split">
        <div class="stack-lg">
          <section class="card"><div class="card-h"><h3>${icon('flag')}Prioridades, retrasos y pendientes</h3><span class="muted small">${alerts.length}</span></div>
            <div class="card-b">${alerts.length ? `<ul class="alerts">${alerts.slice(0, 14).map((a) => `<li class="al-${a.sev}"><a href="#/contenido/${a.id}${a.tab ? '/' + a.tab : ''}">${esc(a.text)}</a>${bId === 'all' ? brandTag(a.brandId) : ''}</li>`).join('')}</ul>` : `<p class="muted">Todo al día. No hay retrasos ni tareas urgentes.</p>`}</div></section>
          <section class="card"><div class="card-h"><h3>${icon('layers')}Flujo de producción</h3><a class="small" href="#/contenidos">Ver tablero</a></div>
            <div class="card-b funnel">${funnel.map((f) => `<a class="frow" href="#/contenidos?st=${f.id}"><span>${esc(f.name)}</span><div class="meter"><i style="width:${(f.n / maxF) * 100}%;background:${f.color}"></i></div><b>${f.n}</b></a>`).join('')}</div></section>
          ${compliance.length ? `<section class="card"><div class="card-h"><h3>${icon('target')}Cumplimiento del calendario · ${new Intl.DateTimeFormat('es', { month: 'long' }).format(now)}</h3></div>
            <div class="table-wrap"><table class="tbl"><thead><tr><th>Marca</th><th class="num">Meta mes</th><th class="num">Planificados</th><th class="num">Publicados</th><th>Avance</th></tr></thead><tbody>
            ${compliance.map((c) => { const pct = c.target ? Math.min(1, c.published / c.target) : 0; const behind = c.target && c.published < c.expectedByNow; return `<tr><td>${brandTag(c.b.id)}</td><td class="num">${c.target || '—'}</td><td class="num">${c.planned}</td><td class="num">${c.published}</td><td style="min-width:160px"><div class="meter"><i style="width:${pct * 100}%;background:${behind ? 'var(--warn)' : 'var(--ok)'}"></i></div><span class="xs ${behind ? '' : 'muted'}" style="${behind ? 'color:var(--warn)' : ''}">${c.target ? (behind ? `Por debajo del ritmo (esperado ${c.expectedByNow} a hoy)` : 'En ritmo') : 'Define la meta mensual en la marca'}</span></td></tr>`; }).join('')}
            </tbody></table></div></section>` : ''}
        </div>
        <aside class="stack-lg">
          <section class="card"><div class="card-h"><h3>${icon('calendar')}Próximas publicaciones</h3><a class="small" href="#/calendario/semana">Calendario</a></div>
            <div class="card-b">${upcoming.length ? `<ul class="upcoming">${upcoming.slice(0, 10).map((c) => { const i = store.get('ideas', c.ideaId); return i ? `<li><a href="#/contenido/${i.id}"><span class="up-date"><b>${parseDateKey(c.date).getDate()}</b>${new Intl.DateTimeFormat('es', { month: 'short' }).format(parseDateKey(c.date))}</span><span class="up-t"><span class="truncate">${esc(i.title)}</span><span class="row xs muted">${platformLabel(c.platform)}${c.time ? ` · ${c.time}` : ''} ${statusBadge(i.status)}</span></span></a></li>` : ''; }).join('')}</ul>` : '<p class="muted small">Nada programado en los próximos 14 días.</p>'}</div></section>
          <section class="card"><div class="card-h"><h3>${icon('clock')}Indicadores de producción</h3></div>
            <div class="card-b stack small">
              <div class="row-between"><span>Ciclo medio idea → publicación</span><b>${cycle.length ? `${median(cycle)} días` : '—'}</b></div>
              <div class="row-between"><span>Contenidos que avanzaron esta semana</span><b>${moved}</b></div>
              <div class="row-between"><span>Ideas descartadas</span><b>${ideas.filter((i) => i.status === 'descartada').length}</b></div>
              <div class="row-between"><span>Cambios pendientes de sincronizar</span><b>${store.pendingCount()}</b></div>
            </div></section>
        </aside>
      </div>`;
    main.querySelector('[data-new]').onclick = () => openIdeaModal({ onSaved: (i) => go(`/contenido/${i.id}`) });
  };
  draw();
  const off = on('change', (p) => { if (!p?.remote) draw(); });
  return off;
}
