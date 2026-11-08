// Copies, calendarización/publicación y registro de resultados de un contenido.
import { store } from '../core/store.js';
import { icon, toast, confirmDialog, withBusy, emptyState, modal, renderFields, readFields, validateFields, setSaving } from '../core/ui.js';
import { esc, fmtDate, todayISO, copyText, debounce, fmtNum, fmtPct } from '../core/utils.js';
import { PLATFORMS, byId } from '../services/methodology.js';
import { METRICS, DERIVED } from '../core/schema.js';
import { approvedVersion, schedule, markPublished, addResult } from '../services/workflow.js';
import { aiCopies } from '../services/assistant.js';
import { derive } from '../services/analytics.js';
import { aiGuard, platformLabel } from './shared.js';

// ---------- Copies ----------
export function renderCopies(host, b, ctx) {
  const { idea } = b;
  const ver = approvedVersion(idea.id);
  const draw = () => {
    const copies = store.filter('copies', (c) => c.ideaId === idea.id).sort((a, c) => a.platform.localeCompare(c.platform) || (a.variant || 0) - (c.variant || 0));
    const platforms = idea.platforms?.length ? idea.platforms : ['tiktok', 'instagram'];
    host.innerHTML = `${ver ? '' : `<div class="notice warn" style="margin-bottom:12px">${icon('alert')}<div><b>Sin guion aprobado.</b><p>Los copies se generan a partir del guion aprobado para que coincidan con lo que se ve y se dice en el video. Puedes escribirlos a mano igualmente.</p></div></div>`}
      <div class="card" style="margin-bottom:16px"><div class="card-b row-between">
        <div class="row"><span class="small muted">Plataformas:</span>${PLATFORMS.map((p) => `<label class="chip-opt"><input type="checkbox" data-pl="${p.id}" ${platforms.includes(p.id) ? 'checked' : ''}><span>${esc(p.name)}</span></label>`).join('')}</div>
        <div class="row"><button class="btn btn-sm" data-manual>${icon('plus', 'ic-sm')}Copy manual</button><button class="btn btn-sm btn-ai" data-gen ${ver ? '' : 'disabled'}>${icon('sparkle', 'ic-sm')}Generar copies</button></div></div></div>
      ${copies.length ? `<div class="grid g-2">${copies.map((c) => copyCard(c)).join('')}</div>` : `<div class="card">${emptyState('Sin copies', 'Genera captions, títulos, descripciones, hashtags y texto de portada adaptados a cada plataforma.', '', 'text')}</div>`}`;
  };
  draw();
  // Cola de cambios por copy: varios campos o copies editados antes del guardado no se pierden.
  const pending = new Map();
  const saveCopy = debounce(async () => {
    for (const [id, patch] of [...pending]) {
      pending.delete(id);
      try { setSaving('saving'); await store.update('copies', id, patch); setSaving('saved'); } catch (e) { toast(e.message, 'error'); }
    }
  }, 600);
  host.addEventListener('input', (e) => {
    const card = e.target.closest('[data-copy]'); const f = e.target.dataset.f; if (!card || !f) return;
    const val = f === 'hashtags' ? e.target.value.split(/[\s,]+/).filter(Boolean).map((h) => (h.startsWith('#') ? h : `#${h}`)) : e.target.value;
    setSaving('dirty'); pending.set(card.dataset.copy, { ...(pending.get(card.dataset.copy) || {}), [f]: val }); saveCopy();
    if (f === 'caption') { const cnt = card.querySelector('[data-count]'); const max = byId(PLATFORMS, store.get('copies', card.dataset.copy).platform)?.maxCaption; cnt.textContent = `${e.target.value.length}/${max}`; cnt.classList.toggle('over', e.target.value.length > max); }
  });
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const card = t.closest('[data-copy]'); const cid = card?.dataset.copy;
    if (t.dataset.approve != null) { saveCopy.flush?.(); const c = store.get('copies', cid); await store.update('copies', cid, { status: c.status === 'aprobado' ? 'borrador' : 'aprobado' }); draw(); }
    if (t.dataset.copyall != null) { const c = store.get('copies', cid); await copyText([c.title, c.caption, c.ctaText, (c.hashtags || []).join(' ')].filter(Boolean).join('\n\n')); toast('Copy copiado al portapapeles', 'success'); }
    if (t.dataset.del != null) { if (await confirmDialog({ title: 'Eliminar copy', message: 'Irá a la papelera.', confirm: 'Eliminar' })) { await store.remove('copies', cid); draw(); ctx.refresh(); } }
    if (t.dataset.manual != null) { const pl = [...host.querySelectorAll('[data-pl]:checked')].map((x) => x.dataset.pl)[0] || 'instagram'; await store.create('copies', { brandId: idea.brandId, ideaId: idea.id, platform: pl, title: '', caption: '', description: '', ctaText: '', hashtags: [], coverText: '', variant: 1, status: 'borrador' }); draw(); }
    if (t.dataset.gen != null) {
      if (!aiGuard()) return;
      const pls = [...host.querySelectorAll('[data-pl]:checked')].map((x) => x.dataset.pl);
      if (!pls.length) { toast('Elige al menos una plataforma', 'error'); return; }
      await withBusy(t, async () => {
        try {
          const list = await aiCopies(store.get('ideas', idea.id), pls);
          for (const c of list) await store.create('copies', { brandId: idea.brandId, ideaId: idea.id, platform: c.platform, variant: c.variant || 1, title: c.title || '', caption: c.caption || '', description: c.description || '', ctaText: c.ctaText || '', hashtags: c.hashtags || [], coverText: c.coverText || '', status: 'borrador' });
          toast(`${list.length} copies generados`, 'success'); draw(); ctx.refresh();
        } catch (err) { toast(err.message, 'error'); }
      }, 'Escribiendo…');
    }
  });
  return () => saveCopy.flush?.();
}

function copyCard(c) {
  const p = byId(PLATFORMS, c.platform);
  const max = p?.maxCaption || 2200;
  return `<section class="card copy-card ${c.status === 'aprobado' ? 'approved' : ''}" data-copy="${c.id}">
    <div class="card-h"><h3>${esc(p?.name || c.platform)} <span class="xs muted">variante ${c.variant || 1}</span></h3>
      <div class="row">${c.status === 'aprobado' ? `<span class="badge" style="--bc:var(--ok)">Aprobado</span>` : '<span class="badge">Borrador</span>'}
      <button class="btn btn-sm" data-approve>${c.status === 'aprobado' ? 'Reabrir' : `${icon('check', 'ic-sm')}Aprobar`}</button><button class="icon-btn sm" data-copyall title="Copiar todo">${icon('copy', 'ic-sm')}</button><button class="icon-btn sm" data-del title="Eliminar">${icon('trash', 'ic-sm')}</button></div></div>
    <div class="card-b stack">
      ${c.platform === 'youtube' || c.title ? `<label class="field"><span>Título${p?.titleMax ? ` (≤ ${p.titleMax})` : ''}</span><input class="input" data-f="title" value="${esc(c.title)}" ${p?.titleMax ? `maxlength="${p.titleMax}"` : ''}></label>` : ''}
      <label class="field"><span class="row-between">Caption <span class="xs muted ${c.caption.length > max ? 'over' : ''}" data-count>${c.caption.length}/${max}</span></span><textarea class="input" rows="6" data-f="caption">${esc(c.caption)}</textarea></label>
      ${c.description || c.platform === 'youtube' ? `<label class="field"><span>Descripción</span><textarea class="input" rows="3" data-f="description">${esc(c.description)}</textarea></label>` : ''}
      <div class="form-grid"><label class="field"><span>CTA escrito</span><input class="input" data-f="ctaText" value="${esc(c.ctaText)}"></label>
      <label class="field"><span>Texto de portada</span><input class="input" data-f="coverText" value="${esc(c.coverText)}"></label></div>
      <label class="field"><span>Hashtags <span class="xs muted">(recomendado ${p?.hashtags?.join('–') || '3–5'})</span></span><input class="input" data-f="hashtags" value="${esc((c.hashtags || []).join(' '))}"></label>
    </div></section>`;
}

// ---------- Publicación ----------
export function renderPublishing(host, b, ctx) {
  const { idea } = b;
  const draw = () => {
    const cal = store.filter('calendar', (c) => c.ideaId === idea.id).sort((a, c) => a.date.localeCompare(c.date));
    const pubs = store.filter('publications', (p) => p.ideaId === idea.id);
    const approvedCopies = store.filter('copies', (c) => c.ideaId === idea.id && c.status === 'aprobado');
    const ready = ['listo', 'calendarizado', 'publicado', 'analizado'].includes(idea.status);
    host.innerHTML = `<div class="notice" style="margin-bottom:16px">${icon('info')}<div><p>La publicación se hace manualmente en cada red. Aquí se gestiona la fecha interna, los materiales y el estado. ${ready ? '' : '<b>El video aún no está marcado como editado:</b> puedes reservar fecha igualmente.'}</p></div></div>
      <div class="split"><div class="stack-lg">
        <section class="card"><div class="card-h"><h3>${icon('calendar')}Fechas programadas</h3><button class="btn btn-sm btn-primary" data-add>${icon('plus', 'ic-sm')}Programar</button></div>
          ${cal.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Plataforma</th><th>Fecha</th><th>Hora</th><th>Responsable</th><th>Estado</th><th></th></tr></thead><tbody>
          ${cal.map((c) => { const pub = pubs.find((p) => p.calendarId === c.id); return `<tr data-cal="${c.id}"><td>${esc(platformLabel(c.platform))}</td><td><input type="date" class="input input-sm" data-cf="date" value="${esc(c.date)}"></td><td><input type="time" class="input input-sm" data-cf="time" value="${esc(c.time || '')}"></td><td><input class="input input-sm" data-cf="owner" value="${esc(c.owner || '')}"></td>
            <td>${c.status === 'publicado' ? `<span class="badge" style="--bc:var(--ok)">Publicado ${fmtDate(pub?.publishedAt)}</span>` : c.date < todayISO() ? '<span class="badge" style="--bc:var(--danger)">Retrasado</span>' : '<span class="badge" style="--bc:var(--info)">Programado</span>'}</td>
            <td class="nowrap">${c.status === 'publicado' ? (pub?.url ? `<a class="btn btn-sm" href="${esc(pub.url)}" target="_blank" rel="noopener">${icon('link', 'ic-sm')}Ver</a>` : '') : `<button class="btn btn-sm" data-pub="${c.id}">${icon('check', 'ic-sm')}Marcar publicado</button>`} <button class="icon-btn sm" data-delcal="${c.id}" title="Quitar">${icon('x', 'ic-sm')}</button></td></tr>`; }).join('')}
          </tbody></table></div>` : `<div class="card-b muted small">Sin fechas. Programa una publicación por plataforma.</div>`}</section>
      </div>
      <aside class="stack-lg"><section class="card"><div class="card-h"><h3>Materiales para publicar</h3></div><div class="card-b stack small">
        <div class="row-between"><span>Guion aprobado</span>${approvedVersion(idea.id) ? icon('check') : '—'}</div>
        <div class="row-between"><span>Video listo</span>${ready ? icon('check') : '—'}</div>
        <div class="row-between"><span>Copies aprobados</span><b>${approvedCopies.length}</b></div>
        ${approvedCopies.map((c) => `<button class="btn btn-sm" data-copyc="${c.id}">${icon('copy', 'ic-sm')}Copiar copy ${esc(platformLabel(c.platform))} v${c.variant || 1}</button>`).join('')}
      </div></section></aside></div>`;
  };
  draw();
  host.addEventListener('change', async (e) => {
    const row = e.target.closest('[data-cal]'); const f = e.target.dataset.cf; if (!row || !f) return;
    await store.update('calendar', row.dataset.cal, { [f]: e.target.value }); toast('Fecha actualizada', 'success'); draw();
  });
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.add != null) openSchedule(idea, draw);
    if (t.dataset.delcal) { if (await confirmDialog({ title: 'Quitar del calendario', message: 'La entrada irá a la papelera.', confirm: 'Quitar' })) { await store.remove('calendar', t.dataset.delcal); draw(); ctx.refresh(); } }
    if (t.dataset.copyc) { const c = store.get('copies', t.dataset.copyc); await copyText([c.title, c.caption, c.ctaText, (c.hashtags || []).join(' ')].filter(Boolean).join('\n\n')); toast('Copiado', 'success'); }
    if (t.dataset.pub) {
      const c = store.get('calendar', t.dataset.pub);
      const fields = [{ name: 'publishedAt', label: 'Fecha de publicación', type: 'date', required: true }, { name: 'url', label: 'URL de la publicación (opcional)', type: 'url' }];
      const body = document.createElement('form'); body.className = 'form-grid'; body.innerHTML = renderFields(fields, { publishedAt: c.date <= todayISO() ? c.date : todayISO() });
      modal({ title: `Publicado en ${platformLabel(c.platform)}`, body, size: 'sm', actions: [{ label: 'Cancelar' }, { label: 'Confirmar', kind: 'primary', onClick: async () => {
        if (!validateFields(body, fields)) return false;
        const o = readFields(body, fields); await markPublished(c.id, o); toast('Publicación registrada. Registra resultados en unos días.', 'success'); draw(); ctx.refresh(); return true;
      } }] });
    }
  });
}

export function openSchedule(idea, after, preset = {}) {
  const fields = [
    { name: 'platform', label: 'Plataforma', type: 'select', required: true, options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })), empty: false },
    { name: 'date', label: 'Fecha', type: 'date', required: true }, { name: 'time', label: 'Hora', type: 'time' }, { name: 'owner', label: 'Responsable' },
  ];
  const body = document.createElement('form'); body.className = 'form-grid';
  body.innerHTML = renderFields(fields, { platform: (idea.platforms || [])[0] || 'tiktok', date: todayISO(), owner: '', ...preset });
  const plats = idea.platforms?.length > 1 ? `<label class="check span-2"><input type="checkbox" data-all checked>Programar en todas sus plataformas (${idea.platforms.map(platformLabel).join(', ')})</label>` : '';
  body.insertAdjacentHTML('beforeend', plats);
  modal({ title: `Programar: ${idea.title}`, body, size: 'sm', actions: [{ label: 'Cancelar' }, { label: 'Programar', kind: 'primary', onClick: async () => {
    if (!validateFields(body, fields)) return false;
    const o = readFields(body, fields);
    const list = body.querySelector('[data-all]')?.checked ? idea.platforms : [o.platform];
    for (const p of list) await schedule(idea.id, { ...o, platform: p });
    toast('Programado', 'success'); after?.(); return true;
  } }] });
}

// ---------- Resultados ----------
export function renderResults(host, b, ctx) {
  const { idea } = b;
  const draw = () => {
    const pubs = store.filter('publications', (p) => p.ideaId === idea.id);
    if (!pubs.length) { host.innerHTML = `<div class="card">${emptyState('Aún no está publicado', 'Marca la publicación en la pestaña Publicación para registrar resultados por plataforma.', '<button class="btn" data-go>Ir a Publicación</button>', 'chart')}</div>`; host.querySelector('[data-go]').onclick = () => ctx.setTab('publicacion'); return; }
    host.innerHTML = `<div class="stack-lg">${pubs.map((p) => {
      const res = store.filter('results', (r) => r.publicationId === p.id).sort((a, c) => String(c.measuredAt).localeCompare(String(a.measuredAt)));
      return `<section class="card"><div class="card-h"><h3>${esc(platformLabel(p.platform))} <span class="xs muted">publicado ${fmtDate(p.publishedAt)}</span></h3><button class="btn btn-sm btn-primary" data-addres="${p.id}">${icon('plus', 'ic-sm')}Registrar medición</button></div>
        ${res.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Medido</th><th class="num">Días</th><th class="num">Vistas</th><th class="num">% visto</th><th class="num">Me gusta/alc.</th><th class="num">Coment./alc.</th><th class="num">Compart./alc.</th><th class="num">Guard./alc.</th><th class="num">Seg./1k</th><th class="num">Consultas/1k</th><th></th></tr></thead><tbody>
        ${res.map((r) => { const d = derive(r.metrics); return `<tr><td class="small">${fmtDate(r.measuredAt)}</td><td class="num">${r.daysSincePublish ?? '—'}</td><td class="num">${fmtNum(d.views)}</td><td class="num">${fmtPct(d.avgPct)}</td><td class="num">${fmtPct(d.likeRate, 2)}</td><td class="num">${fmtPct(d.commentRate, 2)}</td><td class="num">${fmtPct(d.sendRate, 2)}</td><td class="num">${fmtPct(d.saveRate, 2)}</td><td class="num">${fmtNum(d.followsPer1k, 1)}</td><td class="num">${fmtNum(d.inquiriesPer1k, 2)}</td><td class="nowrap"><button class="icon-btn sm" data-editres="${r.id}" title="Editar">${icon('edit', 'ic-sm')}</button></td></tr>`; }).join('')}
        </tbody></table></div><div class="card-f xs muted">Tasas calculadas por alcance (o vistas si no hay alcance). Compara mediciones con un número de días similar desde la publicación.</div>` : '<div class="card-b small muted">Sin mediciones. Recomendado: a los 2, 7 y 30 días (la distribución puede reactivarse semanas después).</div>'}</section>`;
    }).join('')}</div>`;
  };
  draw();
  host.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.addres) openResultForm(store.get('publications', t.dataset.addres), null, draw);
    if (t.dataset.editres) { const r = store.get('results', t.dataset.editres); openResultForm(store.get('publications', r.publicationId), r, draw); }
  });
}

export function openResultForm(pub, existing, after) {
  const available = METRICS.filter((m) => !m.platforms || m.platforms.includes(pub.platform));
  const ver = approvedVersion(pub.ideaId);
  const fields = [
    { name: 'measuredAt', label: 'Fecha de medición', type: 'date', required: true },
    ...available.map((m) => ({ name: `metrics.${m.id}`, label: m.name, type: 'number', min: 0, step: m.type === 'int' ? 1 : 'any' })),
    { name: 'notes', label: 'Notas (contexto: tendencia, promoción pagada, colaboración…)', type: 'textarea', rows: 2, span: 3 },
  ];
  const est = ver ? Math.round((ver.data?.sections || []).reduce((n, s) => n + String(s.voice || '').split(/\s+/).filter(Boolean).length, 0) / 2.7) : null;
  const data = existing || { measuredAt: todayISO(), metrics: { durationSec: est || '' } };
  const body = document.createElement('div');
  body.innerHTML = `<p class="small muted">Registra solo lo que la plataforma muestra; deja vacío lo que no esté disponible. "% medio visualizado" se calcula si das tiempo medio y duración.</p><form class="form-grid cols-3">${renderFields(fields, data)}</form><div data-preview class="small" style="margin-top:12px"></div>`;
  const form = body.querySelector('form');
  const preview = () => {
    const o = readFields(form, fields, {}); const d = derive(o.metrics || {});
    body.querySelector('[data-preview]').innerHTML = `<div class="divider-label">Indicadores calculados</div><div class="row">${DERIVED.filter((x) => d[x.id] != null).map((x) => `<span class="tag">${esc(x.name)}: <b>${x.fmt === 'pct' ? fmtPct(d[x.id], 2) : fmtNum(d[x.id], 2)}</b></span>`).join('') || '<span class="muted">Completa vistas o alcance.</span>'}</div>`;
  };
  form.addEventListener('input', preview); preview();
  modal({ title: `${existing ? 'Editar' : 'Registrar'} resultados · ${platformLabel(pub.platform)}`, body, size: 'lg', actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: async () => {
    if (!validateFields(form, fields)) return false;
    const o = readFields(form, fields, {});
    Object.keys(o.metrics || {}).forEach((k) => { if (o.metrics[k] == null || Number.isNaN(o.metrics[k])) delete o.metrics[k]; });
    if (existing) await store.update('results', existing.id, { measuredAt: o.measuredAt, metrics: o.metrics, notes: o.notes, daysSincePublish: Math.max(0, Math.round((new Date(o.measuredAt) - new Date(pub.publishedAt)) / 86400000)) });
    else await addResult(pub, o);
    toast('Resultados guardados', 'success'); after?.(); return true;
  } }] });
}
