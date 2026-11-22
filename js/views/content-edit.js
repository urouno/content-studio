// Pestaña «Edición» de un contenido: el encargo para la skill de reels, la toma, el mensaje para Claude Code y lo que
// la skill entrega. Con la carpeta «Reels con Claude» conectada, «Grabado» y «Editado» se marcan solos.
import { store } from '../core/store.js';
import { icon, toast, renderFields, readFields, withBusy, emptyState } from '../core/ui.js';
import { esc, copyText, download, fmtRelative } from '../core/utils.js';
import { PRODUCTION_TYPES, GRAPHICS_PRESETS, PLATFORMS } from '../services/methodology.js';
import { approvedVersion, scriptFor, brandConfig } from '../services/workflow.js';
import * as F from '../services/folder.js';
import { reelStatus, sendToEdit, addTake, syncStatus } from '../services/production.js';
import { defaultVideoOpts, reelFolderName, editMessage, buildProyecto, buildGuionMd, buildPropuestaMd, buildVocab, MUSIC_STYLES, skillFor } from '../services/reels.js';

const fmtSize = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : `${Math.round(b / 1e6)} MB`);

export function render(host, b, ctx) {
  const { idea } = b;
  const ver = approvedVersion(idea.id);
  if (!ver) {
    host.innerHTML = `<div class="card">${emptyState('Primero aprueba el guion', 'El encargo de edición sale del guion aprobado: su texto, sus recursos visuales y la cantidad de gráficos del video.', `<button class="btn btn-primary" data-go>${icon('edit')}Ir al guion</button>`, 'film')}</div>`;
    host.querySelector('[data-go]').onclick = () => ctx.setTab('guion');
    return null;
  }
  const urls = [];
  let fs = { supported: F.folderSupported() }; let st = null;
  const script = () => scriptFor(idea.id);
  const opts0 = { ...defaultVideoOpts({ idea, script: ver.data }), ...(script()?.editOpts || {}) };

  const fields = (o) => [
    { name: 'production', label: 'Tipo de producción', type: 'select', options: PRODUCTION_TYPES.map((p) => ({ value: p.id, label: p.name })), empty: false },
    { name: 'graphics', label: 'Cantidad de gráficos', type: 'select', options: GRAPHICS_PRESETS.map((p) => ({ value: p.id, label: p.name })), empty: false, hint: 'La del guion; puedes cambiarla para este video.' },
    { name: 'scenes', label: 'Escenas animadas', type: 'select', options: [{ value: 'ninguna', label: 'Ninguna' }, { value: 'algunas', label: '2-3 escenas (animar-reels-claude)' }, { value: 'video', label: 'Video animado completo' }], empty: false },
    ...(o.production === 'cabeza' ? [{ name: 'behind', label: 'Texto detrás de la cabeza (tarda más: recorta a la persona)', type: 'checkbox', span: 3 }] : []),
    ...(o.production === 'animado' ? [{ name: 'voice', label: 'Voz', type: 'select', options: [{ value: 'grabada', label: 'Grabada (tu voz)' }, { value: 'clonada', label: 'Clonada (sintética con tu voz)' }, { value: 'generica', label: 'Genérica (sintética)' }], empty: false }] : []),
    { name: 'music', label: 'Música', type: 'select', options: [{ value: 'marca', label: 'La de la marca' }, ...MUSIC_STYLES.map((m) => ({ value: m.id, label: m.name }))], empty: false },
    { name: 'platform', label: 'Red principal', type: 'select', options: PLATFORMS.map((p) => ({ value: p.id, label: p.name })), empty: false },
    { name: 'review', label: 'Revisión', type: 'select', options: [{ value: 'guiada', label: 'Guiada (vista previa en cada pasada)' }, { value: 'rapida', label: 'Rápida (solo lo esencial)' }], empty: false },
    { name: 'editor', label: 'Abrir el editor en vivo antes de exportar', type: 'checkbox', span: 3 },
  ];
  let opts = opts0;

  const draw = async () => {
    fs = await F.folderState();
    if (fs.connected && fs.granted) st = await reelStatus(idea.id).catch((e) => { toast(e.message, 'error'); return null; });
    const folderName = st?.folder || script()?.reelFolder || reelFolderName(idea);
    const sent = !!st?.folder;
    const skill = skillFor(opts.production);
    urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    host.innerHTML = `<div class="split">
      <div class="stack-lg">
        ${folderNotice()}
        <section class="card"><div class="card-h"><h3>${icon('film')}Opciones de este video</h3><span class="xs muted">Lo edita <code>${esc(skill)}</code></span></div>
          <div class="card-b"><form class="form-grid cols-3" data-opts>${renderFields(fields(opts), opts)}</form>
          <div class="field" style="margin-top:8px"><label>Carpeta del reel</label><div class="row"><span class="small muted">Reels/</span><input class="input input-sm" data-folder value="${esc(folderName)}" ${sent ? 'disabled' : ''} style="flex:1"></div>
          <small class="hint">${sent ? 'Ya existe en la carpeta. Si la renombras en el Finder, la app la encuentra igual por su proyecto.json.' : 'Como las que crea la skill: fecha y tema.'}</small></div></div></section>
        ${st?.final ? `<section class="card"><div class="card-h"><h3>${icon('eye')}Video editado</h3><span class="xs muted">${esc(st.final.name)} · ${fmtSize(st.final.size)} · ${esc(fmtRelative(new Date(st.final.modified).toISOString()))}</span></div>
          <div class="card-b row" style="align-items:flex-start;gap:16px"><video data-final controls playsinline style="max-height:520px;max-width:100%;border-radius:12px;background:#000"></video>${st.portada ? '<img data-portada alt="Portada" style="max-height:520px;max-width:40%;border-radius:12px">' : ''}</div></section>` : ''}
      </div>
      <aside class="stack-lg sticky">
        <section class="card"><div class="card-h"><h3>${icon('check')}En la carpeta</h3>${fs.connected && fs.granted ? `<button class="btn btn-sm" data-check>${icon('refresh', 'ic-sm')}Comprobar</button>` : ''}</div><div class="card-b stack small">
          ${step(sent, 'Encargo', sent ? `Reels/${esc(st.folder)}/` : 'Aún no se ha enviado a edición')}
          ${opts.production !== 'animado' ? `<a class="btn btn-sm" href="#/grabar/${idea.id}">${icon('camera', 'ic-sm')}Modo grabación (teleprompter)</a>` : ''}
          ${step(!!st?.takes?.length, 'Toma', st?.takes?.length ? st.takes.map((t) => `${esc(t.name)} <span class="muted">(${fmtSize(t.size)})</span>`).join('<br>') : 'Grábala y añádela aquí (se copia a Tomas/ con el id del contenido)')}
          ${step(!!st?.final, 'Video editado', st?.final ? esc(st.final.name) : 'Lo deja la skill al exportar')}
          ${fs.connected && fs.granted ? `
            <button class="btn btn-primary" data-send>${icon('send', 'ic-sm')}${sent ? 'Actualizar encargo' : 'Enviar a edición'}</button>
            <label class="btn">${icon('upload', 'ic-sm')}Añadir toma<input type="file" accept="video/*,.mov,.mp4,.m4v" hidden data-take></label>
            <div data-progress class="xs muted"></div>` : `<button class="btn" data-dl>${icon('download', 'ic-sm')}Descargar el encargo</button><p class="xs muted" style="margin:0">Sin carpeta conectada: guarda los archivos en <code>Reels con Claude/Reels/${esc(folderName)}/</code> (proyecto.json) y en su subcarpeta <code>trabajo/</code> (los otros tres).</p>`}
          <button class="btn btn-ai" data-msg>${icon('copy', 'ic-sm')}Copiar mensaje para Claude Code</button>
          <p class="xs muted" style="margin:0">Pégalo en Claude Code abierto en la carpeta «Reels con Claude».</p>
        </div></section>
      </aside></div>`;
    bind();
    if (st?.final && fs.granted) {
      const u = await F.fileURL(`Reels/${st.folder}/${st.final.name}`); if (u) { urls.push(u); host.querySelector('[data-final]').src = u; }
      if (st.portada) { const p = await F.fileURL(`Reels/${st.folder}/portada.png`); if (p) { urls.push(p); host.querySelector('[data-portada]').src = p; } }
    }
  };

  const step = (ok, title, detail) => `<div class="row" style="align-items:flex-start;gap:8px"><span class="sev sev-${ok ? 'ok' : 'mejorable'}" style="margin-top:5px"></span><div><b>${title}</b><div class="xs muted">${detail}</div></div></div>`;

  const folderNotice = () => {
    if (!fs.supported) {
      return `<div class="notice warn">${icon('alert')}<div><p><b>Este navegador no deja conectar carpetas.</b> ${F.isBrave() ? 'En Brave se activa una vez: abre <code>brave://flags/#file-system-access-api</code>, elige <b>Enabled</b> y reinicia Brave.' : 'Usa Chrome, Edge o Brave (con <code>brave://flags/#file-system-access-api</code> activado).'} Mientras, puedes descargar el encargo.</p></div></div>`;
    }
    if (!fs.connected) return `<div class="notice">${icon('info')}<div><p><b>Conecta tu carpeta «Reels con Claude»</b> para que la app deje el encargo y la toma en su sitio y marque sola «Grabado» y «Editado».</p><button class="btn btn-sm btn-primary" data-connect style="margin-top:6px">${icon('link', 'ic-sm')}Conectar carpeta</button></div></div>`;
    if (!fs.granted) return `<div class="notice">${icon('lock')}<div><p>El navegador necesita tu permiso para usar la carpeta <b>${esc(fs.name)}</b> en esta sesión.</p><button class="btn btn-sm btn-primary" data-grant style="margin-top:6px">${icon('check', 'ic-sm')}Dar permiso</button></div></div>`;
    return '';
  };

  const readOpts = () => { const f = host.querySelector('[data-opts]'); return { ...opts, ...readFields(f, fields(opts)) }; };

  const bind = () => {
    const form = host.querySelector('[data-opts]');
    form.addEventListener('change', (e) => {
      opts = readOpts();
      if (e.target.name === 'production') draw();
      const s = script(); if (s) store.update('scripts', s.id, { editOpts: opts }, { silent: true });
    });
    host.querySelector('[data-connect]')?.addEventListener('click', async () => {
      try {
        await F.connectFolder();
        const chk = await F.checkStructure();
        if (chk.nested) toast('Elegiste la carpeta que contiene «Reels con Claude». Vuelve a conectar y elige «Reels con Claude».', 'error');
        else if (!chk.tomas && !chk.reels) toast('Esa carpeta no tiene Tomas/ ni Reels/: ¿es «Reels con Claude»? Puedes cambiarla en Ajustes → Carpeta de reels.', 'error');
        else toast('Carpeta conectada', 'success');
        draw();
      } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'error'); }
    });
    host.querySelector('[data-grant]')?.addEventListener('click', async () => { await F.getRoot({ ask: true }); draw(); });
    host.querySelector('[data-check]')?.addEventListener('click', (e) => withBusy(e.currentTarget, async () => { await check(true); }, 'Comprobando…'));
    host.querySelector('[data-send]')?.addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
      try {
        opts = readOpts();
        const name = await sendToEdit(idea.id, opts, host.querySelector('[data-folder]').value);
        toast(`Encargo en Reels/${name}/`, 'success'); await draw();
      } catch (err) { toast(err.message, 'error'); }
    }, 'Guardando…'));
    host.querySelector('[data-take]')?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      const prog = host.querySelector('[data-progress]');
      try {
        const name = await addTake(idea.id, file, (p) => { prog.textContent = `Copiando ${file.name}… ${Math.round(p * 100)} %`; });
        prog.textContent = ''; toast(`Toma copiada como Tomas/${name}`, 'success'); await check(false); await draw();
      } catch (err) { prog.textContent = ''; toast(err.message, 'error'); }
    });
    host.querySelector('[data-msg]').addEventListener('click', async () => {
      opts = readOpts();
      const folderName = st?.folder || host.querySelector('[data-folder]').value || reelFolderName(idea);
      await copyText(editMessage({ folderName, opts, take: st?.takes?.[0]?.name || '' }));
      toast(st?.folder || !fs.granted ? 'Mensaje copiado: pégalo en Claude Code' : 'Mensaje copiado. Antes, pulsa «Enviar a edición» para crear el encargo.', 'success');
    });
    host.querySelector('[data-dl]')?.addEventListener('click', () => {
      opts = readOpts();
      const brand = store.get('brands', idea.brandId); const config = brandConfig(idea.brandId);
      download('proyecto.json', JSON.stringify(buildProyecto({ idea, brand, config, opts }), null, 1), 'application/json');
      download('guion-aprobado.md', buildGuionMd({ idea, brand, script: ver.data }), 'text/markdown');
      download('propuesta-graficos.md', buildPropuestaMd({ script: ver.data, opts }), 'text/markdown');
      download('vocab.txt', buildVocab({ idea, brand, config }), 'text/plain');
      toast('Descargados los 4 archivos del encargo', 'success');
    });
  };

  async function check(verbose) {
    const s = await reelStatus(idea.id); st = s;
    const changed = await syncStatus(idea.id, s);
    if (changed.includes('editado')) toast('Video editado encontrado: marcado como «Editado».', 'success');
    else if (changed.includes('grabado')) toast('Toma encontrada: marcado como «Grabado».', 'success');
    else if (verbose) toast('Comprobado: sin cambios.', 'info');
    if (verbose) await draw();
  }

  draw().then(() => { if (fs.connected && fs.granted && st) check(false).then(() => {}); });
  return () => urls.forEach((u) => URL.revokeObjectURL(u));
}
