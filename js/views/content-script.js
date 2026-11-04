// Pestaña Guion: generador, editor por secciones, versiones, comparación, evaluador y aprobación.
import { store } from '../core/store.js';
import { icon, toast, modal, renderFields, readFields, withBusy, confirmDialog, emptyState, setSaving } from '../core/ui.js';
import { esc, clone, deepSet, debounce, copyText, download, fmtDateTime } from '../core/utils.js';
import { STRUCTURES, HOOK_PATTERNS, CTA_TYPES, KNOWLEDGE_LEVELS, PLATFORMS, OBJECTIVES, CONTENT_TYPES, EVAL_CRITERIA, byId } from '../services/methodology.js';
import { scriptStats, localEvaluate, normalizeScript, scriptToText, spokenText } from '../services/scriptkit.js';
import { addVersion, newBlankVersion, saveVersionData, approveVersion, unlockScript, scriptFor, versionsFor, brandConfig } from '../services/workflow.js';
import { aiScripts, aiRewrite, aiEvaluate, aiHooks, aiCtas } from '../services/assistant.js';
import { aiGuard } from './shared.js';

const ACTS = [{ value: 'inicio', label: 'Inicio' }, { value: 'nudo', label: 'Nudo' }, { value: 'desenlace', label: 'Desenlace' }];
const FUNCTIONS = ['contexto', 'problema', 'dato', 'explicacion', 'ejemplo', 'giro', 'resultado', 'transicion', 'cta'];

function targetDuration(idea, platform) {
  const p = store.find('platforms', (x) => x.brandId === idea.brandId && x.platform === platform);
  return Number(p?.durationTarget) || byId(PLATFORMS, platform)?.defaultDuration || 45;
}

export function render(host, b, ctx) {
  const { idea } = b;
  const cfg = brandConfig(idea.brandId);
  const wpm = cfg.strategy?.wpm || 160;
  const mainPlatform = (idea.platforms || [])[0] || 'tiktok';
  let script = scriptFor(idea.id);
  let versions = script ? versionsFor(script.id) : [];
  let current = script && (store.get('scriptVersions', script.currentVersionId) || versions[0]);
  let draft = current ? normalizeScript(clone(current.data)) : null;
  let durationTarget = targetDuration(idea, mainPlatform);

  if (!current) {
    host.innerHTML = `<div class="card">${emptyState('Todavía no hay guion', 'Genera versiones con IA a partir de la idea, la identidad de la marca y la metodología, o escribe uno desde cero con la estructura en tres actos.',
      `<div class="row" style="justify-content:center"><button class="btn btn-ai" data-gen>${icon('sparkle')}Generar con IA</button><button class="btn" data-blank>${icon('edit')}Escribir manualmente</button></div>`, 'edit')}</div>`;
    host.querySelector('[data-gen]').onclick = () => openGenerate(idea, ctx);
    host.querySelector('[data-blank]').onclick = async () => { await newBlankVersion(store.get('ideas', idea.id)); ctx.refresh(); };
    return null;
  }

  const markSave = () => { dirty = true; save(); };
  const locked = () => !!(script.locked && script.approvedVersionId === current.id);
  let dirty = false;
  const save = debounce(async () => {
    if (!dirty || locked()) return;
    dirty = false;
    try { setSaving('saving'); await saveVersionData(current.id, draft); current = store.get('scriptVersions', current.id); setSaving('saved'); } catch (e) { setSaving('error'); toast(e.message, 'error'); }
  }, 700);

  const draw = () => {
    script = scriptFor(idea.id); versions = versionsFor(script.id);
    const lk = locked();
    const st = scriptStats(draft, wpm);
    const dis = lk ? 'disabled' : '';
    const approved = script.approvedVersionId;
    host.innerHTML = `<div class="split script-split">
      <div class="stack-lg">
        <div class="card"><div class="card-b row-between script-toolbar">
          <div class="row">
            <select class="input input-sm" data-ver aria-label="Versión" style="width:auto">${versions.map((v) => `<option value="${v.id}" ${v.id === current.id ? 'selected' : ''}>v${v.versionNo} · ${esc(v.label)}${v.id === approved ? ' ✓ aprobada' : ''}</option>`).join('')}</select>
            <span class="tag">${st.words} palabras</span><span class="tag ${Math.abs(st.seconds - durationTarget) / durationTarget > 0.25 ? 'warn-tag' : ''}">≈ ${st.seconds} s / objetivo ${durationTarget} s</span>
            ${lk ? `<span class="badge" style="--bc:var(--ok)">${icon('lock', 'ic-sm')}Aprobada y bloqueada</span>` : ''}
          </div>
          <div class="row">
            <button class="btn btn-sm btn-ai" data-gen>${icon('sparkle', 'ic-sm')}Generar versiones</button>
            <button class="btn btn-sm" data-dup>${icon('copy', 'ic-sm')}Duplicar</button>
            <button class="btn btn-sm" data-compare ${versions.length < 2 ? 'disabled' : ''}>${icon('compare', 'ic-sm')}Comparar</button>
            <button class="btn btn-sm" data-export>${icon('download', 'ic-sm')}Texto</button>
            ${lk ? `<button class="btn btn-sm" data-unlock>${icon('unlock', 'ic-sm')}Desbloquear</button>` : `<button class="btn btn-sm btn-primary" data-approve>${icon('lock', 'ic-sm')}Aprobar versión</button>`}
          </div></div></div>

        <section class="card"><div class="card-h"><h3>Planteamiento</h3></div><div class="card-b"><div class="form-grid cols-3" data-meta>
          ${renderFields([
            { name: 'title', label: 'Título interno', span: 2 },
            { name: 'objective', label: 'Objetivo', type: 'select', options: OBJECTIVES.map((o) => ({ value: o.id, label: o.name })) },
            { name: 'audience', label: 'Público' },
            { name: 'knowledgeLevel', label: 'Nivel de conocimiento', type: 'select', cast: 'number', options: KNOWLEDGE_LEVELS.map((l) => ({ value: l.id, label: `${l.id} · ${l.name}` })), empty: false },
            { name: 'contentType', label: 'Tipo', type: 'select', options: CONTENT_TYPES.map((o) => ({ value: o.id, label: o.name })) },
            { name: 'problem', label: 'Problema del espectador', type: 'textarea', rows: 2, span: 3 },
            { name: 'promise', label: 'Promesa de valor (qué obtiene al terminar)', type: 'textarea', rows: 2, span: 2 },
            { name: 'structureId', label: 'Estructura narrativa', type: 'select', options: STRUCTURES.map((o) => ({ value: o.id, label: o.name })) },
          ], draft)}</div></div></section>

        <section class="card hook-card"><div class="card-h"><h3>${icon('target')}Hook principal</h3>
          <div class="row">${lk ? '' : `<button class="btn btn-sm" data-ai="hook">${icon('wand', 'ic-sm')}Mejorar hook</button><button class="btn btn-sm" data-ai="hooks-more">${icon('sparkle', 'ic-sm')}Más alternativas</button>`}</div></div>
          <div class="card-b"><div class="form-grid">
            <div class="field span-2"><label>Narrado <span class="xs muted">(≤ 12 palabras, ~3 s)</span></label><textarea class="input" rows="2" data-p="hook.narrado" ${dis}>${esc(draft.hook.narrado)}</textarea></div>
            <div class="field"><label>Visual (0–3 s)</label><textarea class="input" rows="2" data-p="hook.visual" ${dis}>${esc(draft.hook.visual)}</textarea></div>
            <div class="field"><label>Texto en pantalla</label><textarea class="input" rows="2" data-p="hook.textual" ${dis}>${esc(draft.hook.textual)}</textarea></div>
            <div class="field"><label>Auditivo</label><input class="input" data-p="hook.auditivo" value="${esc(draft.hook.auditivo)}" ${dis}></div>
            <div class="field"><label>Patrón</label><select class="input" data-p="hook.patternId" ${dis}><option value="">—</option>${HOOK_PATTERNS.map((h) => `<option value="${h.id}" ${h.id === draft.hook.patternId ? 'selected' : ''}>${esc(h.name)}</option>`).join('')}</select></div>
          </div>
          ${draft.hookAlternatives.length ? `<div class="divider-label">Hooks alternativos</div><div class="alts">${draft.hookAlternatives.map((h, i) => `<div class="alt"><div><b>${esc(h.narrado)}</b><div class="xs muted">${esc(byId(HOOK_PATTERNS, h.patternId)?.name || h.patternId || '')}${h.visual ? ` · Visual: ${esc(h.visual)}` : ''}${h.textual ? ` · Texto: ${esc(h.textual)}` : ''}</div></div>${lk ? '' : `<div class="row"><button class="btn btn-sm" data-swap="${i}" title="Usar como principal">Usar</button><button class="icon-btn sm" data-delalt="${i}" title="Quitar">${icon('x', 'ic-sm')}</button></div>`}</div>`).join('')}</div>` : ''}
          ${lk ? '' : `<button class="btn btn-sm btn-ghost" data-save-hook>${icon('plus', 'ic-sm')}Guardar hook en la biblioteca de la marca</button>`}
          </div></section>

        <section class="card"><div class="card-h"><h3>${icon('list')}Desarrollo</h3><span class="xs muted">Cada frase con una función. Marca los picos de interés (0–3): deben crecer hacia el final.</span></div>
          <div class="card-b sections">${draft.sections.map((s, i) => sectionCard(s, i, draft.sections.length, lk)).join('')}
          ${lk ? '' : `<button class="btn btn-sm" data-addsec>${icon('plus', 'ic-sm')}Añadir sección</button>`}</div></section>

        <section class="card"><div class="card-h"><h3>${icon('send')}CTA</h3>${lk ? '' : `<button class="btn btn-sm" data-ai="ctas">${icon('sparkle', 'ic-sm')}Proponer CTA</button>`}</div><div class="card-b"><div class="form-grid cols-3">
          <div class="field"><label>Tipo</label><select class="input" data-p="cta.type" ${dis}><option value="">—</option>${CTA_TYPES.map((c) => `<option value="${c.id}" ${c.id === draft.cta.type ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
          <div class="field span-2"><label>Texto hablado</label><input class="input" data-p="cta.text" value="${esc(draft.cta.text)}" ${dis}></div>
          <div class="field span-3"><label>Cómo se muestra</label><input class="input" data-p="cta.visual" value="${esc(draft.cta.visual)}" ${dis}></div>
          </div><div data-cta-out></div></div></section>

        <section class="card"><div class="card-h"><h3>${icon('alert')}Afirmaciones a verificar</h3>${lk ? '' : `<button class="btn btn-sm" data-addver>${icon('plus', 'ic-sm')}Añadir</button>`}</div><div class="card-b">
          ${draft.verify.length ? draft.verify.map((v, i) => `<div class="row verify-row"><input class="input input-sm" data-p="verify.${i}.claim" value="${esc(v.claim)}" placeholder="Afirmación" ${dis} style="flex:2"><input class="input input-sm" data-p="verify.${i}.reason" value="${esc(v.reason)}" placeholder="Motivo / fuente" ${dis} style="flex:1">${lk ? '' : `<button class="icon-btn sm" data-delver="${i}" title="Quitar">${icon('x', 'ic-sm')}</button>`}</div>`).join('') : '<p class="small muted">Sin afirmaciones marcadas. Toda cifra, dato técnico o beneficio debe estar verificado.</p>'}
          </div></section>

        <section class="card"><div class="card-h"><h3>Indicaciones generales</h3></div><div class="card-b form-grid">
          <div class="field"><label>Visuales</label><textarea class="input" rows="3" data-p="visualNotes" ${dis}>${esc(draft.visualNotes)}</textarea></div>
          <div class="field"><label>Edición</label><textarea class="input" rows="3" data-p="editingNotes" ${dis}>${esc(draft.editingNotes)}</textarea></div>
        </div></section>
      </div>

      <aside class="stack-lg sticky eval-col">
        ${lk ? '' : `<section class="card"><div class="card-h"><h3>${icon('wand')}Reescribir con IA</h3></div><div class="card-b stack">
          <p class="xs muted">Cada acción crea una nueva versión; la actual se conserva.</p>
          <div class="grid g-2" style="gap:6px">
            <button class="btn btn-sm" data-ai="shorter">Reducir duración</button><button class="btn btn-sm" data-ai="longer">Ampliar duración</button>
            <button class="btn btn-sm" data-ai="simplify">Simplificar lenguaje</button><button class="btn btn-sm" data-ai="free">Instrucción libre…</button>
          </div>
          <div class="row"><select class="input input-sm" data-structure style="flex:1">${STRUCTURES.map((s) => `<option value="${s.id}" ${s.id === draft.structureId ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><button class="btn btn-sm" data-ai="structure">Cambiar estructura</button></div>
          <div class="row"><select class="input input-sm" data-platform style="flex:1">${PLATFORMS.map((p) => `<option value="${p.id}" ${p.id === mainPlatform ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select><button class="btn btn-sm" data-ai="platform">Adaptar</button></div>
          <div class="row"><label class="small">Duración objetivo</label><input class="input input-sm" type="number" min="5" max="600" data-dur value="${durationTarget}" style="width:80px"><span class="small muted">s</span></div>
        </div></section>`}
        <section class="card"><div class="card-h"><h3>${icon('check')}Evaluación</h3><button class="btn btn-sm btn-ai" data-eval>${icon('sparkle', 'ic-sm')}Evaluar con IA</button></div>
          <div class="card-b"><p class="xs muted">Observaciones para mejorar. No son predicciones de retención ni de viralidad.</p><div data-local></div><div data-aieval></div></div></section>
      </aside></div>`;
    drawLocal(); drawAiEval();
    bind();
  };

  const drawLocal = () => {
    const el = host.querySelector('[data-local]'); if (!el) return;
    const f = localEvaluate(draft, { durationTarget, avoid: cfg.voice?.avoid, keyword: idea.keyword, wpm });
    el.innerHTML = `<div class="divider-label">Revisión automática (${f.length})</div>${f.length ? f.map((x) => `<div class="finding"><span class="sev sev-${x.severity}"></span><div><div class="small">${esc(x.text)}</div>${x.fix ? `<div class="fix">${esc(x.fix)}</div>` : ''}<div class="xs muted">${esc(byId(EVAL_CRITERIA, x.criterion)?.name || x.criterion)}</div></div></div>`).join('') : '<p class="small" style="color:var(--ok)">Sin observaciones automáticas.</p>'}`;
  };
  const drawAiEval = () => {
    const el = host.querySelector('[data-aieval]'); if (!el) return;
    const ev = store.get('scriptVersions', current.id)?.evaluation;
    if (!ev) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="divider-label">Evaluación IA · ${fmtDateTime(ev.at)}</div>${ev.summary ? `<p class="small"><b>${esc(ev.summary)}</b></p>` : ''}
      ${(ev.criteria || []).map((c) => `<div class="finding"><span class="sev sev-${c.status === 'ok' ? 'ok' : c.status === 'problema' ? 'problema' : 'mejorable'}"></span><div><div class="small"><b>${esc(byId(EVAL_CRITERIA, c.id)?.name || c.id)}</b> — ${esc(c.observation)}</div>${c.suggestion ? `<div class="fix">→ ${esc(c.suggestion)}</div>` : ''}</div></div>`).join('')}
      ${(ev.dropOffRisks || []).length ? `<div class="divider-label">Posibles puntos de abandono</div>${ev.dropOffRisks.map((d) => `<div class="finding"><span class="sev sev-mejorable"></span><div class="small"><b>${d.section === -1 ? 'Hook' : `Sección ${Number(d.section) + 1}`}</b>: ${esc(d.reason)}<div class="fix">→ ${esc(d.fix)}</div></div></div>`).join('')}` : ''}
      ${(ev.unverifiedClaims || []).length ? `<div class="divider-label">Afirmaciones sin verificar</div><ul class="small">${ev.unverifiedClaims.map((u) => `<li>${esc(u.claim)} <span class="muted">— ${esc(u.reason)}</span></li>`).join('')}</ul>` : ''}`;
  };

  const bind = () => {
    host.querySelector('[data-ver]').onchange = (e) => { save.flush(); current = store.get('scriptVersions', e.target.value); draft = normalizeScript(clone(current.data)); store.update('scripts', script.id, { currentVersionId: current.id }, { silent: true }); draw(); };
    host.querySelector('[data-gen]').onclick = () => openGenerate(store.get('ideas', idea.id), ctx);
    host.querySelector('[data-dup]').onclick = async () => { save.flush(); try { await addVersion(store.get('ideas', idea.id), clone(draft), { label: `Copia de v${current.versionNo}` }); ctx.refresh(); } catch (e) { toast(e.message, 'error'); } };
    host.querySelector('[data-compare]').onclick = () => openCompare(versions, current.id);
    host.querySelector('[data-export]').onclick = () => {
      const txt = scriptToText(draft, { brandName: store.get('brands', idea.brandId)?.name });
      modal({ title: 'Guion en texto', size: 'lg', body: `<pre class="small">${esc(txt)}</pre>`, actions: [
        { label: `${icon('download')}Descargar .txt`, onClick: () => { download(`${idea.id}-v${current.versionNo}.txt`, txt, 'text/plain'); return false; } },
        { label: `${icon('copy')}Copiar`, kind: 'primary', onClick: async () => { await copyText(txt); toast('Copiado', 'success'); return false; } }] });
    };
    host.querySelector('[data-approve]')?.addEventListener('click', async () => {
      save.flush();
      const issues = localEvaluate(draft, { durationTarget, avoid: cfg.voice?.avoid, keyword: idea.keyword, wpm }).filter((x) => x.severity === 'problema');
      const pf = (scriptFor(idea.id).publishFilter || []).filter(Boolean).length;
      const msg = [issues.length ? `Hay ${issues.length} problema(s) en la revisión automática.` : '', pf < 5 ? `El filtro antes de aprobar (pestaña Estrategia) tiene ${pf}/5 respuestas confirmadas.` : '', 'Al aprobar se bloquea la versión y se crean las fichas de producción y edición.'].filter(Boolean).join(' ');
      if (!(await confirmDialog({ title: `Aprobar v${current.versionNo}`, message: msg, confirm: 'Aprobar y bloquear' }))) return;
      await approveVersion(idea.id, current.id);
      toast('Guion aprobado. Fichas de producción y edición creadas.', 'success', { action: { label: 'Ir a producción', fn: () => ctx.setTab('produccion') } });
      ctx.refresh();
    });
    host.querySelector('[data-eval]').onclick = (e) => runEval(e.currentTarget);
    host.querySelector('[data-unlock]')?.addEventListener('click', async () => {
      if (!(await confirmDialog({ title: 'Desbloquear guion', message: 'Podrás editar y crear versiones. El contenido volverá a "Guion en desarrollo"; las fichas de producción y edición se conservan (puedes regenerarlas después).', confirm: 'Desbloquear' }))) return;
      await unlockScript(idea.id); ctx.refresh();
    });

    // Edición de campos con data-p (rutas dentro del borrador)
    const metaFields = ['title', 'objective', 'audience', 'knowledgeLevel', 'contentType', 'problem', 'promise', 'structureId'];
    host.querySelector('[data-meta]').querySelectorAll('input,select,textarea').forEach((el) => { if (locked()) el.disabled = true; });
    if (host._bound) return;
    host._bound = true;
    host.addEventListener('input', onInput);
    host.addEventListener('change', onInput);
    function onInput(e) {
      const el = e.target;
      if (locked()) return;
      if (el.closest('[data-meta]') && metaFields.includes(el.name)) { draft[el.name] = el.name === 'knowledgeLevel' ? Number(el.value) : el.value; }
      else if (el.dataset.p) { deepSet(draft, el.dataset.p, el.type === 'range' ? Number(el.value) : el.value); if (el.type === 'range') { const o = el.parentElement.querySelector('output'); if (o) o.textContent = el.value; } }
      else if (el.dataset.dur) { durationTarget = Number(el.value) || durationTarget; }
      else return;
      setSaving('dirty'); markSave(); drawLocal();
      const st = scriptStats(draft, wpm); const tags = host.querySelectorAll('.script-toolbar .tag');
      if (tags[0]) tags[0].textContent = `${st.words} palabras`; if (tags[1]) tags[1].textContent = `≈ ${st.seconds} s / objetivo ${durationTarget} s`;
    }
    host.addEventListener('click', async (e) => {
      const t = e.target.closest('button'); if (!t || locked()) return;
      const ds = t.dataset;
      if (ds.addsec != null) { draft.sections.push({ act: 'nudo', beat: '', function: 'explicacion', voice: '', onScreenText: '', visual: '', edit: '', peak: 0 }); markSave(); draw(); }
      if (ds.delsec != null) { if (await confirmDialog({ title: 'Quitar sección', message: 'Puedes recuperarla desde el historial.', confirm: 'Quitar' })) { draft.sections.splice(Number(ds.delsec), 1); markSave(); draw(); } }
      if (ds.up != null) { const i = Number(ds.up); if (i > 0) { [draft.sections[i - 1], draft.sections[i]] = [draft.sections[i], draft.sections[i - 1]]; markSave(); draw(); } }
      if (ds.down != null) { const i = Number(ds.down); if (i < draft.sections.length - 1) { [draft.sections[i + 1], draft.sections[i]] = [draft.sections[i], draft.sections[i + 1]]; markSave(); draw(); } }
      if (ds.swap != null) { const i = Number(ds.swap); const old = draft.hook; draft.hook = { ...draft.hookAlternatives[i] }; draft.hookAlternatives[i] = old; markSave(); draw(); }
      if (ds.delalt != null) { draft.hookAlternatives.splice(Number(ds.delalt), 1); markSave(); draw(); }
      if (ds.addver != null) { draft.verify.push({ claim: '', reason: '' }); markSave(); draw(); }
      if (ds.delver != null) { draft.verify.splice(Number(ds.delver), 1); markSave(); draw(); }
      if (ds.saveHook != null) {
        await store.create('hooks', { brandId: idea.brandId, layer: 'narrado', patternId: draft.hook.patternId, text: draft.hook.narrado, objective: draft.objective, status: 'aprobado', notes: [draft.hook.visual && `Visual: ${draft.hook.visual}`, draft.hook.textual && `Texto: ${draft.hook.textual}`].filter(Boolean).join(' · '), sourceIdeaId: idea.id });
        toast('Hook guardado en la biblioteca de la marca', 'success');
      }
      if (ds.rewsec != null) runAi('section', t, { target: Number(ds.rewsec) });
      if (ds.ai) runAi(ds.ai, t);
    });
  };

  async function runAi(mode, btn, extra = {}) {
    if (!aiGuard()) return;
    save.flush();
    const freshIdea = store.get('ideas', idea.id);
    if (mode === 'hooks-more') {
      await withBusy(btn, async () => { try { const hs = await aiHooks(freshIdea, draft); draft.hookAlternatives = [...draft.hookAlternatives, ...hs.map((h) => ({ patternId: h.patternId, narrado: h.narrado, visual: h.visual, textual: h.textual, auditivo: h.auditivo }))].slice(0, 10); markSave(); draw(); toast(`${hs.length} alternativas añadidas`, 'success'); } catch (e) { toast(e.message, 'error'); } }, 'Pensando…');
      return;
    }
    if (mode === 'ctas') {
      await withBusy(btn, async () => {
        try {
          const cs = await aiCtas(freshIdea, draft);
          const out = host.querySelector('[data-cta-out]');
          out.innerHTML = `<div class="divider-label">Propuestas</div>${cs.map((c, i) => `<div class="alt"><div><b>${esc(c.text)}</b><div class="xs muted">${esc(byId(CTA_TYPES, c.type)?.name || c.type)} · ${esc(c.why || '')}</div></div><button class="btn btn-sm" data-usecta="${i}">Usar</button></div>`).join('')}`;
          out.querySelectorAll('[data-usecta]').forEach((bb) => bb.addEventListener('click', () => { const c = cs[Number(bb.dataset.usecta)]; draft.cta.type = c.type; draft.cta.text = c.text; markSave(); draw(); }));
        } catch (e) { toast(e.message, 'error'); }
      }, 'Pensando…');
      return;
    }
    let instruction = '';
    if (mode === 'free') { instruction = await askInstruction(); if (!instruction) return; }
    const opts = {
      mode: mode === 'free' ? 'free' : mode, target: extra.target, instruction,
      durationSec: mode === 'shorter' ? Math.round(Math.min(durationTarget, scriptStats(draft, wpm).seconds * 0.75)) : mode === 'longer' ? Math.round(Math.max(durationTarget, scriptStats(draft, wpm).seconds * 1.3)) : durationTarget,
      structureId: host.querySelector('[data-structure]')?.value, platform: host.querySelector('[data-platform]')?.value, knowledgeLevel: Math.max(0, (draft.knowledgeLevel ?? 1) - 1),
    };
    if (mode === 'platform') opts.durationSec = targetDuration(idea, opts.platform);
    const labels = { section: `Reescritura sección ${(extra.target ?? 0) + 1}`, hook: 'Hook mejorado', shorter: 'Más corta', longer: 'Más larga', simplify: 'Lenguaje simplificado', structure: `Estructura: ${byId(STRUCTURES, opts.structureId)?.name}`, platform: `Adaptada a ${byId(PLATFORMS, opts.platform)?.name}`, free: 'Instrucción libre' };
    await withBusy(btn, async () => {
      try {
        const res = await aiRewrite(freshIdea, draft, opts);
        const v = await addVersion(freshIdea, res, { origin: 'rewrite', label: labels[mode] || 'Reescritura' });
        toast(`Nueva versión v${v.versionNo} creada (${labels[mode]})`, 'success', { action: { label: 'Comparar', fn: () => openCompare(versionsFor(script.id), v.id, current.id) } });
        current = v; draft = normalizeScript(clone(v.data)); draw();
      } catch (e) { toast(e.message, 'error'); }
    }, 'Reescribiendo…');
  }

  async function runEval(btn) {
    if (!aiGuard()) return;
    save.flush();
    const localFindings = localEvaluate(draft, { durationTarget, avoid: cfg.voice?.avoid, keyword: idea.keyword, wpm });
    await withBusy(btn, async () => {
      try {
        const ev = await aiEvaluate(store.get('ideas', idea.id), draft, { durationTarget, localFindings });
        await store.update('scriptVersions', current.id, { evaluation: { ...ev, at: new Date().toISOString() } }, { silent: true });
        drawAiEval();
      } catch (e) { toast(e.message, 'error'); }
    }, 'Evaluando…');
  }

  draw();
  return () => save.flush();
}

function sectionCard(s, i, n, lk) {
  const dis = lk ? 'disabled' : '';
  return `<div class="sec" data-sec="${i}">
    <div class="sec-h"><span class="sec-n">${i + 1}</span>
      <select class="input input-sm" data-p="sections.${i}.act" ${dis} style="width:auto">${ACTS.map((a) => `<option value="${a.value}" ${a.value === s.act ? 'selected' : ''}>${a.label}</option>`).join('')}</select>
      <input class="input input-sm" data-p="sections.${i}.beat" value="${esc(s.beat)}" placeholder="Paso de la estructura" ${dis} style="flex:1">
      <select class="input input-sm" data-p="sections.${i}.function" ${dis} style="width:auto" title="Función de la sección">${FUNCTIONS.map((f) => `<option ${f === s.function ? 'selected' : ''}>${f}</option>`).join('')}</select>
      <span class="range peak" title="Pico de interés"><span class="xs muted">Pico</span><input type="range" min="0" max="3" data-p="sections.${i}.peak" value="${s.peak || 0}" ${dis}><output>${s.peak || 0}</output></span>
      ${lk ? '' : `<span class="row" style="gap:0"><button class="icon-btn sm" data-up="${i}" title="Subir" ${i === 0 ? 'disabled' : ''}>↑</button><button class="icon-btn sm" data-down="${i}" title="Bajar" ${i === n - 1 ? 'disabled' : ''}>↓</button><button class="icon-btn sm" data-rewsec="${i}" title="Reescribir solo esta sección con IA">${icon('wand', 'ic-sm')}</button><button class="icon-btn sm" data-delsec="${i}" title="Quitar">${icon('x', 'ic-sm')}</button></span>`}
    </div>
    <div class="form-grid">
      <div class="field span-2"><label>Voz (lo que se dice)</label><textarea class="input voice" rows="3" data-p="sections.${i}.voice" ${dis}>${esc(s.voice)}</textarea></div>
      <div class="field"><label>Texto en pantalla</label><input class="input input-sm" data-p="sections.${i}.onScreenText" value="${esc(s.onScreenText)}" ${dis}></div>
      <div class="field"><label>Visual / B-roll</label><input class="input input-sm" data-p="sections.${i}.visual" value="${esc(s.visual)}" ${dis}></div>
      <div class="field span-2"><label>Edición</label><input class="input input-sm" data-p="sections.${i}.edit" value="${esc(s.edit)}" ${dis}></div>
    </div></div>`;
}

function askInstruction() {
  return new Promise((resolve) => {
    let v = '';
    modal({ title: 'Instrucción para la IA', size: 'sm', body: '<label class="field"><span>¿Qué quieres cambiar?</span><textarea class="input" rows="4" data-v placeholder="Ej.: añade un ejemplo con objetos de cocina en la sección 2"></textarea></label>',
      actions: [{ label: 'Cancelar' }, { label: 'Aplicar', kind: 'primary', onClick: (w) => { v = w.querySelector('[data-v]').value.trim(); return true; } }], onClose: () => resolve(v) });
  });
}

function openGenerate(idea, ctx) {
  if (!aiGuard()) return;
  const mainPlatform = (idea.platforms || [])[0] || 'tiktok';
  const fields = [
    { name: 'platform', label: 'Plataforma', type: 'select', options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })), empty: false },
    { name: 'durationSec', label: 'Duración objetivo (s)', type: 'number', min: 5, max: 600 },
    { name: 'versions', label: 'Versiones', type: 'select', cast: 'number', options: [1, 2, 3].map((n) => ({ value: n, label: String(n) })), empty: false },
    { name: 'structureId', label: 'Estructura', type: 'select', options: STRUCTURES.map((s) => ({ value: s.id, label: s.name })), empty: 'Que la IA elija según el objetivo' },
    { name: 'knowledgeLevel', label: 'Nivel de conocimiento', type: 'select', cast: 'number', options: KNOWLEDGE_LEVELS.map((l) => ({ value: l.id, label: `${l.id} · ${l.name} — ${l.desc}` })), empty: false },
    { name: 'extra', label: 'Indicaciones adicionales (opcional)', type: 'textarea', rows: 2, span: 2 },
  ];
  const body = document.createElement('div');
  body.innerHTML = `<div class="notice" style="margin-bottom:12px">${icon('info')}<div><p>Se usa la metodología, la identidad de <b>${esc(store.get('brands', idea.brandId)?.name)}</b> (solo esta marca), la idea, las referencias registradas y los hooks recientes para evitar repeticiones.</p></div></div>
    <form class="form-grid">${renderFields(fields, { platform: mainPlatform, durationSec: targetDuration(idea, mainPlatform), versions: 2, structureId: idea.format || '', knowledgeLevel: idea.knowledgeLevel ?? brandConfig(idea.brandId).voice.knowledgeLevel ?? 1 })}</form>`;
  const form = body.querySelector('form');
  form.querySelector('[name="platform"]').addEventListener('change', (e) => { form.querySelector('[name="durationSec"]').value = targetDuration(idea, e.target.value); });
  modal({ title: 'Generar guion con IA', body, size: 'md', actions: [
    { label: 'Cancelar' },
    { label: `${icon('sparkle')}Generar`, kind: 'ai', onClick: async (w) => {
      const o = readFields(form, fields);
      let ok = false;
      await withBusy(w.querySelector('.btn-ai'), async () => {
        try {
          const list = await aiScripts(idea, o);
          for (const [i, s] of list.entries()) await addVersion(store.get('ideas', idea.id), s, { origin: 'ai', label: `IA ${i + 1}/${list.length} · ${byId(STRUCTURES, s.structureId)?.name || 'estructura libre'}` });
          toast(`${list.length} versión(es) generadas`, 'success'); ok = true;
        } catch (e) { toast(e.message, 'error'); }
      }, 'Escribiendo guion…');
      if (ok) { ctx.refresh(); return true; }
      return false;
    } }] });
}

function openCompare(versions, aId, bId) {
  let a = aId; let b = bId || versions.find((v) => v.id !== aId)?.id;
  const body = document.createElement('div');
  const draw = () => {
    const va = versions.find((v) => v.id === a); const vb = versions.find((v) => v.id === b);
    const opt = (sel) => versions.map((v) => `<option value="${v.id}" ${v.id === sel ? 'selected' : ''}>v${v.versionNo} · ${esc(v.label)}</option>`).join('');
    const col = (v, other) => {
      const d = normalizeScript(v.data); const o = normalizeScript(other.data);
      const diff = (x, y) => (x !== y ? 'diff' : '');
      const st = scriptStats(d);
      return `<div class="cmp-col"><div class="row small muted">${st.words} palabras · ≈ ${st.seconds} s · ${esc(byId(STRUCTURES, d.structureId)?.name || '—')}</div>
        <div class="cmp-block ${diff(d.hook.narrado, o.hook.narrado)}"><b>Hook</b><p>${esc(d.hook.narrado)}</p><p class="xs muted">${esc(d.hook.visual)}</p></div>
        <div class="cmp-block ${diff(d.promise, o.promise)}"><b>Promesa</b><p>${esc(d.promise)}</p></div>
        ${d.sections.map((s, i) => `<div class="cmp-block ${diff(s.voice, o.sections[i]?.voice)}"><b>${i + 1}. ${esc(s.beat || s.act)}</b> <span class="xs muted">pico ${s.peak}</span><p>${esc(s.voice)}</p></div>`).join('')}
        <div class="cmp-block ${diff(d.cta.text, o.cta.text)}"><b>CTA</b><p>${esc(d.cta.text)}</p></div></div>`;
    };
    body.innerHTML = `<div class="grid g-2"><select class="input" data-a>${opt(a)}</select><select class="input" data-b>${opt(b)}</select></div>
      <p class="xs muted" style="margin:8px 0">Los bloques resaltados son diferentes entre versiones.</p>
      <div class="grid g-2 cmp">${va && vb ? col(va, vb) + col(vb, va) : ''}</div>`;
    body.querySelector('[data-a]').onchange = (e) => { a = e.target.value; draw(); };
    body.querySelector('[data-b]').onchange = (e) => { b = e.target.value; draw(); };
  };
  draw();
  modal({ title: 'Comparar versiones', body, size: 'xl', actions: [{ label: 'Cerrar' }] });
}

export { spokenText };
