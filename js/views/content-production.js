// Fichas de producción (grabación) y edición (guía audiovisual).
import { store } from '../core/store.js';
import { icon, toast, confirmDialog, withBusy, emptyState, setSaving, modal } from '../core/ui.js';
import { esc, deepSet, debounce, download, copyText } from '../core/utils.js';
import { ensureProduction, ensureEdition, markRecorded, markReady, approvedVersion, currentVersion, brandConfig } from '../services/workflow.js';
import { aiProduction, aiEditing } from '../services/assistant.js';
import { normalizeScript, scriptToText } from '../services/scriptkit.js';
import { EDITING_GUIDELINES, EVIDENCE_LEGEND } from '../services/methodology.js';
import { aiGuard } from './shared.js';

function needScript(host, b, ctx) {
  host.innerHTML = `<div class="card">${emptyState('Primero aprueba un guion', 'La ficha se genera automáticamente a partir de la versión aprobada del guion (y puedes crearla desde un borrador si lo necesitas).',
    `<div class="row" style="justify-content:center"><button class="btn btn-primary" data-go>${icon('edit')}Ir al guion</button>${currentVersion(b.idea.id) ? `<button class="btn" data-draft>Crear desde el borrador actual</button>` : ''}</div>`, 'camera')}</div>`;
  host.querySelector('[data-go]').onclick = () => ctx.setTab('guion');
  return host.querySelector('[data-draft]');
}

function bindDataEditing(host, table, getRec, redraw) {
  let rec = getRec();
  const save = debounce(async () => { try { setSaving('saving'); await store.update(table, rec.id, rec); setSaving('saved'); } catch (e) { setSaving('error'); toast(e.message, 'error'); } }, 600);
  const onInput = (e) => {
    const el = e.target; if (!el.dataset.p) return;
    deepSet(rec, el.dataset.p, el.type === 'checkbox' ? el.checked : el.value);
    setSaving('dirty'); save();
    if (el.type === 'checkbox') redraw?.(rec, { progressOnly: true });
  };
  host.addEventListener('input', onInput); host.addEventListener('change', onInput);
  return { get rec() { return rec; }, set rec(v) { rec = v; }, save };
}

const progress = (items) => { const n = items.length; const d = items.filter((x) => x.done).length; return { n, d, pct: n ? d / n : 0 }; };

// ---------- Producción ----------
export function renderProduction(host, b, ctx) {
  let prod = b.production;
  if (!prod) {
    const btn = needScript(host, b, ctx);
    btn?.addEventListener('click', async () => { await ensureProduction(b.idea.id); ctx.refresh(); });
    return null;
  }
  const ver = store.get('scriptVersions', prod.scriptVersionId) || approvedVersion(b.idea.id) || currentVersion(b.idea.id);
  const script = normalizeScript(ver?.data || {});
  const draw = () => {
    prod = store.get('productions', prod.id);
    const shots = prod.scenes.flatMap((s) => s.shots || []);
    const pShots = progress(shots); const pCheck = progress(prod.checklist || []);
    host.innerHTML = `<div class="split">
      <div class="stack-lg">
        <div class="card"><div class="card-b row-between">
          <div class="row"><span class="tag">${prod.scenes.length} escenas</span><span class="tag">${pShots.d}/${pShots.n} tomas</span><span class="tag">${pCheck.d}/${pCheck.n} checklist</span>${prod.recordedAt ? `<span class="badge" style="--bc:var(--ok)">Grabado</span>` : ''}${ver ? `<span class="xs muted">Basado en v${ver.versionNo}</span>` : ''}</div>
          <div class="row"><button class="btn btn-sm" data-print>${icon('download', 'ic-sm')}Exportar ficha</button><button class="btn btn-sm" data-regen>${icon('refresh', 'ic-sm')}Regenerar desde guion</button><button class="btn btn-sm btn-ai" data-ai>${icon('sparkle', 'ic-sm')}Detallar con IA</button>
          ${prod.recordedAt ? '' : `<button class="btn btn-sm btn-primary" data-rec>${icon('check', 'ic-sm')}Marcar como grabado</button>`}</div></div></div>
        ${prod.scenes.map((sc, si) => `<section class="card"><div class="card-h"><h3>${icon('camera')}<input class="input input-sm ghost-input" data-p="scenes.${si}.title" value="${esc(sc.title)}"></h3><span class="xs muted">${esc(sc.location || '')}</span></div>
          <div class="card-b stack">
            <div class="form-grid"><div class="field"><label>Localización</label><input class="input input-sm" data-p="scenes.${si}.location" value="${esc(sc.location || '')}"></div>
            <div class="field"><label>Indicaciones para quien graba</label><input class="input input-sm" data-p="scenes.${si}.direction" value="${esc(sc.direction || '')}" placeholder="Energía, mirada, gestos, ritmo…"></div></div>
            <table class="tbl shots"><thead><tr><th style="width:30px"></th><th>Tipo</th><th>Encuadre</th><th>Descripción</th><th>Frase</th></tr></thead><tbody>
            ${(sc.shots || []).map((sh, hi) => `<tr class="${sh.done ? 'done-row' : ''}"><td><input type="checkbox" data-p="scenes.${si}.shots.${hi}.done" ${sh.done ? 'checked' : ''} aria-label="Toma completada"></td>
              <td><input class="input input-sm" data-p="scenes.${si}.shots.${hi}.type" value="${esc(sh.type)}"></td><td><input class="input input-sm" data-p="scenes.${si}.shots.${hi}.framing" value="${esc(sh.framing)}"></td>
              <td><textarea class="input input-sm" rows="2" data-p="scenes.${si}.shots.${hi}.description">${esc(sh.description)}</textarea></td><td class="xs muted" style="max-width:240px">${esc(sh.voiceRef || '')}</td></tr>`).join('')}
            </tbody></table>
            <button class="btn btn-sm btn-ghost" data-addshot="${si}" style="align-self:flex-start">${icon('plus', 'ic-sm')}Añadir toma</button>
          </div></section>`).join('')}
        <button class="btn" data-addscene style="align-self:flex-start">${icon('plus')}Añadir escena</button>
      </div>
      <aside class="stack-lg sticky">
        <section class="card"><div class="card-h"><h3>Checklist de grabación</h3><span class="xs muted">${Math.round(pCheck.pct * 100)} %</span></div><div class="card-b stack">
          <div class="meter"><i style="width:${pCheck.pct * 100}%"></i></div>
          ${(prod.checklist || []).map((c, i) => `<label class="check"><input type="checkbox" data-p="checklist.${i}.done" ${c.done ? 'checked' : ''}><span>${esc(c.text)}</span></label>`).join('')}
          <div class="row"><input class="input input-sm" data-newcheck placeholder="Añadir tarea…" style="flex:1"><button class="btn btn-sm" data-addcheck>${icon('plus', 'ic-sm')}</button></div></div></section>
        <section class="card"><div class="card-h"><h3>Recursos físicos</h3></div><div class="card-b"><textarea class="input" rows="4" data-p="propsText" placeholder="Un recurso por línea">${esc((prod.props || []).join('\n'))}</textarea></div></section>
        <section class="card"><div class="card-h"><h3>Notas del equipo</h3></div><div class="card-b stack"><textarea class="input" rows="3" data-p="crewNotes" placeholder="Indicaciones generales">${esc(prod.crewNotes || '')}</textarea>
          <label class="field"><span>Observaciones de la grabación</span><textarea class="input" rows="3" data-p="observations">${esc(prod.observations || '')}</textarea></label></div></section>
        <section class="card"><div class="card-h"><h3>Guion final</h3><button class="btn btn-sm" data-copyscript>${icon('copy', 'ic-sm')}Copiar</button></div><div class="card-b"><pre class="xs" style="max-height:320px;overflow:auto">${esc(scriptToText(script))}</pre></div></section>
      </aside></div>`;
  };
  draw();
  const ed = bindDataEditing(host, 'productions', () => store.get('productions', prod.id), () => {
    const sh = ed.rec.scenes.flatMap((s) => s.shots || []); const pc = progress(ed.rec.checklist || []);
    const tags = host.querySelectorAll('.card-b .row .tag'); if (tags[1]) tags[1].textContent = `${progress(sh).d}/${sh.length} tomas`; if (tags[2]) tags[2].textContent = `${pc.d}/${pc.n} checklist`;
    const m = host.querySelector('aside .meter i'); if (m) m.style.width = `${pc.pct * 100}%`;
  });
  // propsText es un campo virtual
  host.addEventListener('input', (e) => { if (e.target.dataset.p === 'propsText') { ed.rec.props = e.target.value.split('\n').map((x) => x.trim()).filter(Boolean); delete ed.rec.propsText; ed.save(); } });
  const redraw = async (mut) => { ed.save.flush?.(); const r = store.get('productions', prod.id); mut(r); await store.update('productions', r.id, r); ed.rec = store.get('productions', prod.id); draw(); };
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.addshot != null) redraw((r) => r.scenes[Number(t.dataset.addshot)].shots.push({ type: 'B-roll', framing: '', description: '', voiceRef: '', done: false }));
    if (t.dataset.addscene != null) redraw((r) => r.scenes.push({ title: `Escena ${r.scenes.length + 1}`, location: '', sectionRefs: [], shots: [], direction: '', props: [] }));
    if (t.dataset.addcheck != null) { const v = host.querySelector('[data-newcheck]').value.trim(); if (v) redraw((r) => r.checklist.push({ text: v, done: false })); }
    if (t.dataset.regen != null) { if (await confirmDialog({ title: 'Regenerar ficha', message: 'Se reemplazarán escenas y tomas con las del guion aprobado. La versión actual queda en el historial.', confirm: 'Regenerar' })) { await ensureProduction(b.idea.id, { regenerate: true }); ed.rec = store.get('productions', prod.id); draw(); } }
    if (t.dataset.rec != null) { await markRecorded(b.idea.id); toast('Marcado como grabado. Ficha de edición lista.', 'success', { action: { label: 'Ir a edición', fn: () => ctx.setTab('edicion') } }); draw(); }
    if (t.dataset.copyscript != null) { await copyText(scriptToText(script)); toast('Guion copiado', 'success'); }
    if (t.dataset.print != null) download(`${b.idea.id}-produccion.txt`, productionText(store.get('productions', prod.id), script, b), 'text/plain');
    if (t.dataset.ai != null) {
      if (!aiGuard()) return;
      await withBusy(t, async () => {
        try {
          const r = await aiProduction(b.idea, script);
          const scenes = (r.scenes || []).map((s) => ({ ...s, shots: (s.shots || []).map((x) => ({ ...x, done: false })) }));
          await store.update('productions', prod.id, { scenes, props: r.props || [], crewNotes: r.crewNotes || prod.crewNotes, checklist: [...(store.get('productions', prod.id).checklist || []), ...(r.checklist || []).map((c) => ({ text: c, done: false }))] }, { summary: 'Ficha detallada con IA' });
          ed.rec = store.get('productions', prod.id); draw(); toast('Ficha detallada con IA (versión anterior en el historial)', 'success');
        } catch (err) { toast(err.message, 'error'); }
      }, 'Detallando…');
    }
  });
  return () => ed.save.flush?.();
}

function productionText(p, script, b) {
  return [`FICHA DE PRODUCCIÓN — ${b.idea.title} (${b.idea.id})`, `Marca: ${b.brand?.name}`, '',
    ...p.scenes.flatMap((s) => [`== ${s.title} · ${s.location || ''}`, s.direction ? `Dirección: ${s.direction}` : '', ...(s.shots || []).map((x) => `  [${x.done ? 'x' : ' '}] ${x.type} | ${x.framing} | ${x.description}${x.voiceRef ? ` | "${x.voiceRef}"` : ''}`), '']),
    'RECURSOS:', ...(p.props || []).map((x) => `- ${x}`), '', 'CHECKLIST:', ...(p.checklist || []).map((c) => `[${c.done ? 'x' : ' '}] ${c.text}`), '', `Notas: ${p.crewNotes || ''}`, '', '--- GUION ---', scriptToText(script)].filter((x) => x !== '').join('\n');
}

// ---------- Edición ----------
export function renderEditing(host, b, ctx) {
  let edi = b.edition;
  if (!edi) {
    const btn = needScript(host, b, ctx);
    btn?.addEventListener('click', async () => { await ensureEdition(b.idea.id); ctx.refresh(); });
    return null;
  }
  const ver = store.get('scriptVersions', edi.scriptVersionId) || approvedVersion(b.idea.id) || currentVersion(b.idea.id);
  const script = normalizeScript(ver?.data || {});
  const cfg = brandConfig(b.idea.brandId);
  const assets = store.all('assets', { brandId: b.idea.brandId });
  const draw = () => {
    edi = store.get('editions', edi.id);
    const g = { ...edi.guide, ...cfg.visual, notes: edi.guide?.notes };
    const pc = progress(edi.checklist || []);
    host.innerHTML = `<div class="split">
      <div class="stack-lg">
        <div class="card"><div class="card-b row-between">
          <div class="row"><span class="tag">${edi.scenes.length} momentos</span><span class="tag">${pc.d}/${pc.n} checklist</span>${edi.readyAt ? `<span class="badge" style="--bc:var(--ok)">Video listo</span>` : ''}</div>
          <div class="row"><button class="btn btn-sm" data-export>${icon('download', 'ic-sm')}Exportar guía</button><button class="btn btn-sm" data-regen>${icon('refresh', 'ic-sm')}Regenerar</button><button class="btn btn-sm btn-ai" data-ai>${icon('sparkle', 'ic-sm')}Detallar con IA</button>
          ${edi.readyAt ? '' : `<button class="btn btn-sm btn-primary" data-ready>${icon('check', 'ic-sm')}Marcar video listo</button>`}</div></div></div>
        <section class="card"><div class="card-h"><h3>${icon('scissors')}Indicaciones por momento</h3><span class="xs muted">Se basa en la versión ${ver ? `v${ver.versionNo}` : '—'} del guion</span></div>
          <div class="table-wrap"><table class="tbl edit-tbl"><thead><tr><th style="width:30px"></th><th>Tiempo</th><th>Voz / momento</th><th>Texto en pantalla</th><th>B-roll / visual</th><th>Gráficos</th><th>Transición</th><th>Sonido</th><th>Cámara / zoom</th><th>Notas</th></tr></thead><tbody>
          ${edi.scenes.map((s, i) => { const sec = s.sectionIndex === -1 ? { voice: script.hook.narrado, beat: 'Hook' } : s.sectionIndex === 99 ? { voice: script.cta.text, beat: 'CTA' } : script.sections[s.sectionIndex] || {}; return `<tr class="${s.done ? 'done-row' : ''}">
            <td><input type="checkbox" data-p="scenes.${i}.done" ${s.done ? 'checked' : ''} aria-label="Momento editado"></td>
            <td><input class="input input-sm" data-p="scenes.${i}.time" value="${esc(s.time)}" style="width:80px"></td>
            <td class="xs" style="max-width:220px"><b>${esc(sec.beat || '')}</b><br>${esc((sec.voice || '').slice(0, 160))}</td>
            ${['onScreenText', 'broll', 'graphics', 'transition', 'sfx', 'camera', 'notes'].map((k) => `<td><textarea class="input input-sm" rows="2" data-p="scenes.${i}.${k}">${esc(s[k] || '')}</textarea></td>`).join('')}</tr>`; }).join('')}
          </tbody></table></div>
          <div class="card-f"><button class="btn btn-sm btn-ghost" data-addmoment>${icon('plus', 'ic-sm')}Añadir momento</button></div></section>
        <section class="card"><div class="card-h"><h3>Observaciones</h3></div><div class="card-b form-grid">
          <div class="field"><label>Editor/a</label><input class="input" data-p="editor" value="${esc(edi.editor || '')}"></div>
          <div class="field"><label>Notas de edición</label><textarea class="input" rows="2" data-p="guide.notes">${esc(edi.guide?.notes || '')}</textarea></div>
          <div class="field span-2"><label>Observaciones / revisión</label><textarea class="input" rows="3" data-p="observations">${esc(edi.observations || '')}</textarea></div></div></section>
      </div>
      <aside class="stack-lg sticky">
        <section class="card"><div class="card-h"><h3>${icon('brand')}Guía de marca</h3><a class="xs" href="#/marcas/${b.idea.brandId}/visual">Editar identidad</a></div><div class="card-b stack small">
          <div class="row">${(g.colors || []).map((c) => `<span class="row" style="gap:4px"><span class="swatch" style="background:${esc(c.hex)}"></span><span class="xs"><b>${esc(c.name)}</b><br><span class="mono">${esc(c.hex)}</span></span></span>`).join('')}</div>
          ${(g.fonts || []).filter((f) => f.family).map((f) => `<div><span class="muted">${esc(f.role)}:</span> <b style="font-family:${esc(f.family)}">${esc(f.family)}</b></div>`).join('')}
          ${[['Subtítulos', g.subtitleStyle], ['Posición de textos', g.textPosition], ['Estilo de edición', g.editingStyle], ['Ritmo', g.pace], ['Transiciones', g.transitions], ['Música', g.music], ['Efectos', g.sfx], ['Gráficos', g.graphics], ['Intro', g.intro], ['Outro', g.outro], ['Referencias', g.references]].filter(([, v]) => v).map(([k, v]) => `<div><span class="muted">${k}:</span> ${esc(v)}</div>`).join('') || '<p class="muted">Completa la identidad visual de la marca para que aparezca aquí.</p>'}
          ${assets.length ? `<div class="divider-label">Recursos de la marca</div><div class="assets-mini">${assets.slice(0, 12).map((a) => `<a href="${esc(a.url || a.dataUrl || '#')}" target="_blank" rel="noopener" title="${esc(a.name)}">${a.dataUrl && /^data:image/.test(a.dataUrl) ? `<img src="${a.dataUrl}" alt="${esc(a.name)}">` : `<span class="tag">${esc(a.kind)}: ${esc(a.name)}</span>`}</a>`).join('')}</div>` : ''}
        </div></section>
        <section class="card"><div class="card-h"><h3>Checklist de edición</h3><span class="xs muted">${Math.round(pc.pct * 100)} %</span></div><div class="card-b stack">
          ${(edi.checklist || []).map((c, i) => `<label class="check"><input type="checkbox" data-p="checklist.${i}.done" ${c.done ? 'checked' : ''}><span>${esc(c.text)}</span></label>`).join('')}</div></section>
        <section class="card"><div class="card-h"><h3>Buenas prácticas</h3></div><div class="card-b stack xs">
          ${EDITING_GUIDELINES.map((x) => `<div><span class="ev" title="${esc(EVIDENCE_LEGEND[x.level])}">${x.level}</span> ${esc(x.tip)}</div>`).join('')}</div></section>
      </aside></div>`;
  };
  draw();
  const ed = bindDataEditing(host, 'editions', () => store.get('editions', edi.id));
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.addmoment != null) { ed.save.flush?.(); const r = store.get('editions', edi.id); r.scenes.push({ sectionIndex: 50, time: '', onScreenText: '', broll: '', graphics: '', transition: '', sfx: '', camera: '', notes: '', done: false }); await store.update('editions', r.id, r); ed.rec = store.get('editions', edi.id); draw(); }
    if (t.dataset.regen != null) { if (await confirmDialog({ title: 'Regenerar guía de edición', message: 'Se recalculará desde el guion y la identidad de la marca. La versión actual queda en el historial.', confirm: 'Regenerar' })) { await ensureEdition(b.idea.id, { regenerate: true }); ed.rec = store.get('editions', edi.id); draw(); } }
    if (t.dataset.ready != null) { await markReady(b.idea.id); toast('Video listo. Ya puedes calendarizarlo y preparar los copies.', 'success', { action: { label: 'Copies', fn: () => ctx.setTab('copies') } }); draw(); }
    if (t.dataset.export != null) {
      const r = store.get('editions', edi.id);
      const txt = [`GUÍA DE EDICIÓN — ${b.idea.title} (${b.idea.id})`, `Marca: ${b.brand?.name}`, `Colores: ${(cfg.visual.colors || []).map((c) => `${c.name} ${c.hex}`).join(', ')}`, `Tipografías: ${(cfg.visual.fonts || []).map((f) => `${f.role}: ${f.family}`).join(', ')}`, `Subtítulos: ${cfg.visual.subtitleStyle || ''}`, `Ritmo: ${cfg.visual.pace || ''}`, '',
        ...r.scenes.map((s) => `[${s.time}] TEXTO: ${s.onScreenText || '-'} | B-ROLL: ${s.broll || '-'} | GRÁF: ${s.graphics || '-'} | TRANS: ${s.transition || '-'} | SONIDO: ${s.sfx || '-'} | CÁMARA: ${s.camera || '-'} | ${s.notes || ''}`), '', `Notas: ${r.guide?.notes || ''}`].join('\n');
      modal({ title: 'Guía de edición', size: 'lg', body: `<pre class="xs">${esc(txt)}</pre>`, actions: [{ label: `${icon('download')}Descargar`, onClick: () => { download(`${b.idea.id}-edicion.txt`, txt, 'text/plain'); return false; } }, { label: `${icon('copy')}Copiar`, kind: 'primary', onClick: async () => { await copyText(txt); toast('Copiado', 'success'); return false; } }] });
    }
    if (t.dataset.ai != null) {
      if (!aiGuard()) return;
      await withBusy(t, async () => {
        try {
          const r = await aiEditing(b.idea, script);
          const scenes = (r.scenes || []).map((s) => ({ sectionIndex: s.sectionIndex, time: s.time || '', onScreenText: s.onScreenText || '', broll: s.broll || '', graphics: s.graphics || '', transition: s.transition || '', sfx: s.sfx || '', camera: s.camera || '', notes: [s.subtitle && `Subtítulo: ${s.subtitle}`, s.music && `Música: ${s.music}`, s.notes].filter(Boolean).join(' · '), done: false }));
          const cur = store.get('editions', edi.id);
          await store.update('editions', edi.id, { scenes, guide: { ...cur.guide, notes: [cur.guide?.notes, r.global?.notes, r.global?.pace && `Ritmo: ${r.global.pace}`, r.global?.music && `Música: ${r.global.music}`].filter(Boolean).join('\n') } }, { summary: 'Guía detallada con IA' });
          ed.rec = store.get('editions', edi.id); draw(); toast('Guía detallada con IA (versión anterior en el historial)', 'success');
        } catch (err) { toast(err.message, 'error'); }
      }, 'Detallando…');
    }
  });
  return () => ed.save.flush?.();
}
