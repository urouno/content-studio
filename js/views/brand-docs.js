// Pestaña "Documentos" de la marca: documentos de referencia en Markdown que la IA usa como contexto fijo.
import { store } from '../core/store.js';
import { icon, toast, modal, confirmDialog, withBusy, setSaving, promptDialog } from '../core/ui.js';
import { esc, debounce, download, fmtRelative, fmtDateTime, copyText } from '../core/utils.js';
import { mdToHtml } from '../core/markdown.js';
import { DOC_TASKS, DOC_TIERS, DOC_LIMITS, DOC_TEMPLATES, templateFor, templateMarkdown, docsFor, ensureBrandDocs, createCustomDoc, docTasks, docCompleteness, cleanDoc, docsContext } from '../services/branddocs.js';
import { aiBrandDoc } from '../services/assistant.js';
import { aiGuard } from './shared.js';

const MAX_CHARS = 45000; // una celda de Google Sheets admite ~50.000 caracteres
const state = { mode: 'edit' };

const slug = (t) => String(t || 'documento').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const readFile = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = () => rej(r.error); r.readAsText(f); });
const approxTokens = (chars) => Math.round(chars / 4);

export function tabDocs(host, brandId, docParam) {
  let selected = docParam || null;
  let pending = null; // guardado pendiente del documento abierto

  const save = debounce(async () => {
    if (!pending) return;
    const { id, content } = pending; pending = null;
    try { setSaving('saving'); await store.update('brandDocs', id, { content }); setSaving('saved'); drawList(); } catch (e) { setSaving('error'); toast(e.message, 'error'); }
  }, 800);

  const select = (id) => {
    save.flush?.();
    selected = id;
    history.replaceState(null, '', `#/marcas/${brandId}/documentos/${id}`);
    drawList(); drawEditor();
  };

  const draw = async () => {
    await ensureBrandDocs(brandId);
    const docs = docsFor(brandId);
    if (!docs.some((d) => d.id === selected)) selected = docs[0]?.id || null;
    host.innerHTML = `<div class="notice" style="margin-bottom:12px">${icon('book')}<div><p><b>Documentos de referencia.</b> Son el contexto fijo que la IA recibe al generar ideas, guiones, hooks, copies y evaluaciones de esta marca, para que respete sus temas, identidad, comunicación y enfoque comercial. Las indicaciones en gris de cada plantilla no se envían a la IA. <a href="#" data-help>¿Qué va en cada documento?</a></p></div></div>
      <div class="docs-layout"><aside class="stack docs-side"></aside><section class="docs-main"></section></div>`;
    host.querySelector('[data-help]').onclick = (e) => { e.preventDefault(); showGuide(); };
    drawList(); drawEditor();
  };

  function drawList() {
    const side = host.querySelector('.docs-side'); if (!side) return;
    const docs = docsFor(brandId);
    const ctx = docsContext(brandId, 'guion');
    const filled = docs.filter((d) => cleanDoc(d.content)).length;
    side.innerHTML = `<section class="card"><div class="card-b stack small">
        <div class="row-between"><span>Con contenido</span><b>${filled} / ${docs.length}</b></div>
        <div class="row-between"><span>Contexto al escribir un guion</span><b title="${ctx.chars.toLocaleString('es')} caracteres">≈ ${approxTokens(ctx.chars).toLocaleString('es')} tokens</b></div>
        ${ctx.used.some((u) => u.truncated) || ctx.skipped.some((s) => s.reason === 'sin espacio en el contexto') ? `<p class="xs" style="color:var(--warn);margin:0">${icon('alert', 'ic-sm')} Algún documento supera el límite y se recorta (máx. ${DOC_LIMITS.perDoc.toLocaleString('es')} caracteres por documento y ${DOC_LIMITS.total.toLocaleString('es')} en total). Resume o desactiva lo menos útil.</p>` : ''}
        <button class="btn btn-sm" data-preview>${icon('eye', 'ic-sm')}Ver lo que recibe la IA</button></div></section>
      <nav class="card docs-list" aria-label="Documentos">${docs.map((d) => {
        const t = templateFor(d.docType); const pct = docCompleteness(d.content);
        return `<button class="doc-item ${d.id === selected ? 'active' : ''} ${d.active === false ? 'off' : ''}" data-doc="${d.id}">
          <span class="doc-t">${esc(d.title)}</span>
          <span class="row xs muted" style="gap:6px">${t ? `<span class="tier tier-${t.tier}">${DOC_TIERS[t.tier].name}</span>` : '<span class="tier">Propio</span>'}${d.active === false ? '<span>· no se usa</span>' : ''}</span>
          <span class="meter"><i style="width:${Math.round(pct * 100)}%"></i></span></button>`;
      }).join('')}</nav>
      <div class="stack">
        <button class="btn btn-sm" data-newdoc>${icon('plus', 'ic-sm')}Documento propio</button>
        <label class="btn btn-sm">${icon('upload', 'ic-sm')}Importar .md<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" multiple hidden data-importnew></label>
        <button class="btn btn-sm" data-exportall>${icon('download', 'ic-sm')}Exportar todos (.md)</button>
      </div>`;
  }

  function drawEditor() {
    const main = host.querySelector('.docs-main'); if (!main) return;
    const d = selected && store.get('brandDocs', selected);
    if (!d) { main.innerHTML = '<div class="card card-b muted">Selecciona un documento.</div>'; return; }
    const t = templateFor(d.docType);
    const tasks = docTasks(d);
    const len = String(d.content || '').length;
    main.innerHTML = `<section class="card">
      <div class="card-h" style="flex-wrap:wrap;gap:8px">
        <div style="min-width:0;flex:1">
          ${t ? `<h3>${esc(d.title)}</h3>` : `<input class="input ghost-input" data-title value="${esc(d.title)}" aria-label="Título del documento" style="font-weight:700;font-size:var(--fs-lg)">`}
          <div class="row xs muted" style="margin-top:4px">${t ? `<span class="tier tier-${t.tier}" title="${esc(DOC_TIERS[t.tier].desc)}">${DOC_TIERS[t.tier].name}</span><span>${icon('clock', 'ic-sm')} Revisar: ${esc(t.cadence)}</span>` : '<span class="tier">Documento propio</span>'}<span>Actualizado ${fmtRelative(d.updatedAt)}</span></div>
        </div>
        <div class="btn-group"><button class="btn btn-sm ${state.mode === 'edit' ? 'active' : ''}" data-mode="edit">${icon('edit', 'ic-sm')}Editar</button><button class="btn btn-sm ${state.mode === 'split' ? 'active' : ''}" data-mode="split">${icon('columns', 'ic-sm')}Dividido</button><button class="btn btn-sm ${state.mode === 'view' ? 'active' : ''}" data-mode="view">${icon('eye', 'ic-sm')}Vista previa</button></div>
      </div>
      <div class="card-b stack">
        ${t ? `<p class="small muted" style="margin:0">${esc(t.purpose)}</p>` : ''}
        <div class="row-between" style="flex-wrap:wrap;gap:8px">
          <label class="check"><input type="checkbox" data-active ${d.active !== false ? 'checked' : ''}><span><b>Usar como contexto para la IA</b></span></label>
          <div class="row" style="gap:6px">
            <button class="btn btn-sm btn-ai" data-ai>${icon('sparkle', 'ic-sm')}${cleanDoc(d.content) ? 'Completar con IA' : 'Redactar borrador con IA'}</button>
            <label class="btn btn-sm" title="Reemplaza el contenido con un archivo .md">${icon('upload', 'ic-sm')}Importar<input type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden data-import></label>
            <button class="btn btn-sm" data-export>${icon('download', 'ic-sm')}.md</button>
            <button class="btn btn-sm" data-copy title="Copiar el Markdown">${icon('copy', 'ic-sm')}</button>
            <button class="btn btn-sm" data-hist title="Versiones anteriores">${icon('history', 'ic-sm')}</button>
            ${t ? `<button class="btn btn-sm" data-reset title="Volver a la plantilla vacía">${icon('refresh', 'ic-sm')}Plantilla</button>` : `<button class="icon-btn sm" data-del title="Enviar a la papelera">${icon('trash', 'ic-sm')}</button>`}
          </div>
        </div>
        <div class="field"><label>Se usa al generar</label><div class="chips">${DOC_TASKS.map((x) => `<label class="chip-opt"><input type="checkbox" data-task="${x.id}" ${tasks.includes(x.id) ? 'checked' : ''}><span>${esc(x.name)}</span></label>`).join('')}</div>
          ${t ? '<small class="hint">La selección inicial es la recomendada para este documento. Puedes ajustarla para esta marca.</small>' : ''}</div>
        <div class="doc-edit mode-${state.mode}">
          <textarea class="input mono doc-ta" data-content spellcheck="true" aria-label="Contenido en Markdown">${esc(d.content || '')}</textarea>
          <div class="md doc-preview">${mdToHtml(d.content)}</div>
        </div>
        <div class="row-between xs muted"><span>Markdown: <code># Título</code>, <code>## Sección</code>, <code>- lista</code>, <code>**negrita**</code>, <code>| tabla |</code>. Marca lo pendiente con <code>[COMPLETAR: …]</code>.</span><span data-count class="${len > MAX_CHARS * 0.9 ? 'late-txt' : ''}">${len.toLocaleString('es')} / ${MAX_CHARS.toLocaleString('es')}</span></div>
      </div></section>`;
  }

  host.addEventListener('input', (e) => {
    const ta = e.target.closest('[data-content]');
    if (ta) {
      let v = ta.value;
      if (v.length > MAX_CHARS) { v = v.slice(0, MAX_CHARS); ta.value = v; toast(`Máximo ${MAX_CHARS.toLocaleString('es')} caracteres por documento. Divide el contenido en otro documento.`, 'error'); }
      pending = { id: selected, content: v }; setSaving('dirty'); save();
      const c = host.querySelector('[data-count]'); if (c) { c.textContent = `${v.length.toLocaleString('es')} / ${MAX_CHARS.toLocaleString('es')}`; c.classList.toggle('late-txt', v.length > MAX_CHARS * 0.9); }
      const pv = host.querySelector('.doc-preview'); if (pv && state.mode === 'split') { clearTimeout(pv._t); pv._t = setTimeout(() => { pv.innerHTML = mdToHtml(v); }, 250); }
    }
  });

  host.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset.title != null) { const v = el.value.trim() || 'Documento sin título'; await store.update('brandDocs', selected, { title: v }); drawList(); }
    if (el.dataset.active != null) { await store.update('brandDocs', selected, { active: el.checked }, { summary: el.checked ? 'Documento activado como contexto' : 'Documento desactivado como contexto' }); drawList(); }
    if (el.dataset.task != null) {
      const arr = [...host.querySelectorAll('[data-task]:checked')].map((x) => x.dataset.task);
      await store.update('brandDocs', selected, { tasks: arr }, { summary: 'Tareas de IA del documento' }); drawList();
    }
    if (el.dataset.import != null && el.files?.[0]) {
      const text = await readFile(el.files[0]); el.value = '';
      const d = store.get('brandDocs', selected);
      if (cleanDoc(d.content) && !(await confirmDialog({ title: 'Reemplazar contenido', message: `Se sustituirá el contenido de "${d.title}" por el del archivo. La versión actual queda en el historial del documento.`, confirm: 'Reemplazar' }))) return;
      save.flush?.(); await store.update('brandDocs', selected, { content: text.slice(0, MAX_CHARS) }, { summary: 'Importado desde archivo' });
      drawList(); drawEditor(); toast('Documento importado', 'success');
    }
    if (el.dataset.importnew != null && el.files?.length) {
      let last = null; const files = [...el.files];
      for (const f of files) {
        const text = await readFile(f);
        const title = /^#\s+(.+)$/m.exec(text)?.[1]?.trim() || f.name.replace(/\.(md|markdown|txt)$/i, '');
        last = await createCustomDoc(brandId, { title: title.slice(0, 120), content: text.slice(0, MAX_CHARS) });
      }
      el.value = '';
      if (last) { toast(`${files.length} documento(s) importado(s)`, 'success'); select(last.id); }
    }
  });

  host.addEventListener('click', async (e) => {
    const b = e.target.closest('button, [data-doc]'); if (!b) return;
    if (b.dataset.doc) { select(b.dataset.doc); return; }
    if (b.dataset.mode) { save.flush?.(); state.mode = b.dataset.mode; drawEditor(); return; }
    if (b.dataset.preview != null) { save.flush?.(); showContextPreview(brandId); return; }
    if (b.dataset.exportall != null) {
      save.flush?.();
      const brand = store.get('brands', brandId);
      const all = docsFor(brandId).map((d) => String(d.content || '').trim()).filter(Boolean).join('\n\n---\n\n');
      download(`${slug(brand?.name)}-documentos.md`, all, 'text/markdown'); return;
    }
    if (b.dataset.newdoc != null) {
      const title = await promptDialog({ title: 'Documento propio', label: 'Título', placeholder: 'Ej.: Lanzamiento de primavera, Protocolo de atención…' });
      if (!title) return;
      const d = await createCustomDoc(brandId, { title });
      select(d.id); return;
    }
    const d = selected && store.get('brandDocs', selected); if (!d) return;
    if (b.dataset.export != null) { save.flush?.(); download(`${slug(d.title)}.md`, store.get('brandDocs', d.id).content || '', 'text/markdown'); }
    if (b.dataset.copy != null) { save.flush?.(); await copyText(store.get('brandDocs', d.id).content || ''); toast('Markdown copiado', 'success'); }
    if (b.dataset.hist != null) { save.flush?.(); showHistory(d, () => { drawList(); drawEditor(); }); }
    if (b.dataset.reset != null) {
      if (!(await confirmDialog({ title: 'Volver a la plantilla', message: 'Se borrará el contenido y quedará la plantilla vacía. La versión actual queda en el historial del documento (botón de reloj).', confirm: 'Restaurar plantilla', danger: true }))) return;
      save.flush?.(); await store.update('brandDocs', d.id, { content: templateMarkdown(d.docType, {}) }, { summary: 'Plantilla restaurada' }); drawList(); drawEditor();
    }
    if (b.dataset.del != null) {
      if (!(await confirmDialog({ title: `Eliminar "${d.title}"`, message: 'Irá a la papelera y podrás restaurarlo desde Ajustes.', confirm: 'Eliminar', danger: true }))) return;
      save.flush?.(); await store.remove('brandDocs', d.id); selected = null; draw();
    }
    if (b.dataset.ai != null) {
      if (!aiGuard()) return;
      save.flush?.();
      await withBusy(b, async () => {
        try {
          const md = await aiBrandDoc(store.get('brandDocs', d.id));
          if (!md) throw new Error('La IA no devolvió contenido.');
          reviewDraft(d, md);
        } catch (err) { toast(err.message, 'error'); }
      }, 'Redactando…');
    }
  });

  function reviewDraft(d, md) {
    modal({
      title: `Borrador con IA · ${d.title}`, size: 'lg',
      body: `<div class="notice warn" style="margin-bottom:12px">${icon('alert')}<div><p>Revísalo antes de usarlo: la IA solo puede ordenar lo que ya sabe de la marca. Completa los marcadores <mark>[COMPLETAR]</mark> y <mark>[VERIFICAR]</mark> con datos reales.</p></div></div><div class="md doc-preview" style="max-height:60vh;overflow:auto">${mdToHtml(md)}</div>`,
      actions: [
        { label: 'Descartar' },
        { label: `${icon('copy')}Copiar`, onClick: async () => { await copyText(md); toast('Copiado', 'success'); return false; } },
        { label: 'Reemplazar el documento', kind: 'primary', onClick: async () => {
          await store.update('brandDocs', d.id, { content: md.slice(0, MAX_CHARS) }, { summary: 'Borrador generado con IA' });
          drawList(); drawEditor(); toast('Documento actualizado (la versión anterior queda en el historial)', 'success');
        } },
      ],
    });
  }

  draw();
  return () => save.flush?.();
}

function showHistory(d, after) {
  const entries = store.historyFor(d.id).filter((h) => h.before);
  const m = modal({
    title: `Versiones anteriores · ${d.title}`, size: 'lg',
    body: entries.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Fecha</th><th>Cambio</th><th></th></tr></thead><tbody>${entries.map((h) => `<tr><td class="nowrap small">${fmtDateTime(h.createdAt)}</td><td class="small">${esc(h.summary)}</td><td class="nowrap"><button class="btn btn-sm" data-v="${h.id}">${icon('eye', 'ic-sm')}Ver</button> <button class="btn btn-sm" data-r="${h.id}">${icon('history', 'ic-sm')}Restaurar</button></td></tr>`).join('')}</tbody></table></div><div data-view style="margin-top:12px"></div>`
      : '<p class="muted">Todavía no hay versiones anteriores guardadas. Se guarda una cada vez que editas (agrupando las ediciones seguidas de 2 minutos).</p>',
    actions: [{ label: 'Cerrar' }],
  });
  m.body.addEventListener('click', async (e) => {
    const v = e.target.closest('[data-v]'); const r = e.target.closest('[data-r]');
    const h = entries.find((x) => x.id === (v || r)?.dataset.v || x.id === (v || r)?.dataset.r); if (!h) return;
    const snap = typeof h.before === 'string' ? JSON.parse(h.before) : h.before;
    if (v) m.body.querySelector('[data-view]').innerHTML = `<div class="md doc-preview" style="max-height:45vh;overflow:auto">${mdToHtml(snap.content)}</div>`;
    if (r) { await store.revert(h.id); toast('Versión restaurada (la actual queda en el historial)', 'success'); m.close(); after?.(); }
  });
}

function showContextPreview(brandId) {
  const body = document.createElement('div');
  body.innerHTML = `<div class="row" style="margin-bottom:10px"><label class="small">Tarea</label><select class="input input-sm" data-t style="width:auto">${DOC_TASKS.map((t) => `<option value="${t.id}" ${t.id === 'guion' ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div><div data-out></div>`;
  const out = body.querySelector('[data-out]');
  const render = () => {
    const r = docsContext(brandId, body.querySelector('[data-t]').value);
    out.innerHTML = `<p class="small muted">${r.used.length} documento(s) · ${r.chars.toLocaleString('es')} caracteres (≈ ${approxTokens(r.chars).toLocaleString('es')} tokens).
      ${r.skipped.length ? `No se envían: ${r.skipped.map((s) => `${esc(s.title)} (${esc(s.reason)})`).join(', ')}.` : ''}</p>
      ${r.text ? `<pre class="xs" style="max-height:55vh;overflow:auto;white-space:pre-wrap">${esc(r.text)}</pre>` : '<p class="muted">Ningún documento con contenido para esta tarea. Rellena al menos los documentos esenciales.</p>'}`;
  };
  body.querySelector('[data-t]').addEventListener('change', render);
  render();
  modal({ title: 'Contexto que recibe la IA', size: 'lg', body, actions: [{ label: 'Cerrar' }] });
}

function showGuide() {
  const rows = ['esencial', 'tactico', 'recomendado'].flatMap((tier) => DOC_TEMPLATES_BY_TIER(tier));
  modal({
    title: 'Documentos de referencia de la marca', size: 'lg',
    body: `<p class="small">Cada marca tiene el mismo juego de documentos base. <b>Todo su contenido es editable</b> y es lo que adapta la IA a la identidad y la estrategia de la marca. La estructura (secciones) es una guía: puedes añadir, quitar o reordenar secciones. También puedes desactivar un documento, elegir en qué tareas se usa o crear documentos propios.</p>
      <div class="table-wrap"><table class="tbl"><thead><tr><th>Documento</th><th>Tipo</th><th>Para qué sirve</th><th>Revisión</th></tr></thead><tbody>
      ${rows.map((t) => `<tr><td><b>${esc(t.title)}</b><div class="xs muted">${t.sections.map((s) => esc(s.title)).join(' · ')}</div></td><td><span class="tier tier-${t.tier}">${DOC_TIERS[t.tier].name}</span></td><td class="small">${esc(t.purpose)}</td><td class="small">${esc(t.cadence)}</td></tr>`).join('')}
      </tbody></table></div>
      <p class="xs muted">Prioridad si se contradicen: Reglas → Productos y oferta → resto. Guía completa en docs/DOCUMENTOS_DE_MARCA.md.</p>`,
    actions: [{ label: 'Cerrar' }],
  });
}
const DOC_TEMPLATES_BY_TIER = (tier) => DOC_TEMPLATES.filter((t) => t.tier === tier);
