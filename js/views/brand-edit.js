// Pestaña «Estilo de edición» de la marca: lo estable de cómo se ve y suena la marca en sus reels, en el formato
// de las skills editar-reels-claude y animar-reels-claude (Mi estilo/marcas/<marca>.json + su guía corta).
// Lo que cambia en cada video (cuántos gráficos, escenas, música concreta) se elige en cada contenido.
import { store } from '../core/store.js';
import { icon, toast, modal, renderFields, readFields, bindAutosave } from '../core/ui.js';
import { esc, download, copyText, fmtRelative } from '../core/utils.js';
import { brandConfig } from '../services/workflow.js';
import {
  COLOR_ROLES, FONT_ROLES, SUBTITLE_ANIMATIONS, CARD_STYLES, CAMERA_MOVES, SFX_TYPES, MUSIC_STYLES, SKILL_GRAPHICS,
  editOf, buildMarcaJson, buildStyleGuide, parseMarcaJson, missingForSkill, marcaFileName, guideFileName, slugify,
} from '../services/reels.js';

const missText = (miss) => (miss.length ? `Para que la skill la use sin preguntar falta: ${esc(miss.join(', '))}.` : 'La skill la usará directamente, sin preguntas de estilo.');
const tri = (v) => (v === true ? 'si' : v === false ? 'no' : '');
const untri = (v) => (v === 'si' ? true : v === 'no' ? false : null);

/** Datos del formulario a partir de lo guardado. */
function toForm(edit, fonts) {
  return {
    file: edit.file, roles: { ...edit.roles }, fonts: { ...edit.fonts },
    ff: fonts.map((f) => ({ peso: edit.fontFiles?.[f.family]?.peso || '', archivo: edit.fontFiles?.[f.family]?.archivo || '' })),
    sub: { animacion: edit.subtitles?.animacion || '', mayusculas: tri(edit.subtitles?.mayusculas), contorno: edit.subtitles?.contorno ?? '', sin_puntuacion: tri(edit.subtitles?.sin_puntuacion) },
    cards: edit.cards, cameraMode: Array.isArray(edit.camera) ? 'solo' : 'todos', camera: Array.isArray(edit.camera) ? edit.camera : [],
    sfx: edit.sfx || [], music: edit.music, graphicsAllowed: edit.graphicsAllowed || [], never: edit.never, corrections: edit.corrections,
  };
}
/** Formulario → lo que se guarda en `visual.edit`. */
function fromForm(d, fonts, prev) {
  const fontFiles = {};
  fonts.forEach((f, i) => { if (f.family && (d.ff?.[i]?.peso || d.ff?.[i]?.archivo)) fontFiles[f.family] = { peso: d.ff[i].peso || '', archivo: d.ff[i].archivo || '' }; });
  return {
    ...prev, file: String(d.file || '').trim().replace(/\.json$/i, ''),
    roles: Object.fromEntries(Object.entries(d.roles || {}).filter(([, v]) => v)),
    fonts: Object.fromEntries(Object.entries(d.fonts || {}).filter(([, v]) => v)), fontFiles,
    subtitles: { animacion: d.sub?.animacion || '', mayusculas: untri(d.sub?.mayusculas), contorno: d.sub?.contorno === '' || d.sub?.contorno == null ? null : Number(d.sub.contorno), sin_puntuacion: untri(d.sub?.sin_puntuacion) },
    cards: d.cards || '', camera: d.cameraMode === 'solo' ? d.camera || [] : null,
    sfx: (d.sfx || []).slice(0, 3), music: d.music || '', graphicsAllowed: d.graphicsAllowed || [], never: d.never || '', corrections: d.corrections || '',
  };
}

export function tabEdit(host, brandId) {
  const cfgId = () => store.find('brandConfigs', (c) => c.brandId === brandId).id;
  const save = (edit) => store.update('brandConfigs', cfgId(), (r) => ({ ...r, visual: { ...brandConfig(brandId).visual, edit } }));
  let auto = null;

  const draw = () => {
    auto?.destroy();
    const brand = store.get('brands', brandId); const cfg = brandConfig(brandId); const edit = editOf(cfg);
    const colors = (cfg.visual.colors || []).filter((c) => c.hex);
    const fonts = (cfg.visual.fonts || []).filter((f) => f.family);
    const miss = missingForSkill(edit);
    const tri3 = [{ value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }];
    const colorOpts = colors.map((c) => ({ value: c.hex, label: `${c.name} · ${c.hex}` }));
    const fontOpts = fonts.map((f) => ({ value: f.family, label: `${f.family}${f.role ? ` (${f.role})` : ''}` }));
    const fields = [
      { type: 'section', label: 'Archivo en la skill', hint: `Se guarda como Mi estilo/marcas/${marcaFileName(brand, cfg)}` },
      { name: 'file', label: 'Nombre del archivo (sin .json)', placeholder: slugify(brand.name), hint: 'Déjalo vacío para usar el nombre de la marca. Si la skill ya tiene un archivo de esta marca, usa el mismo nombre.' },
      { type: 'section', label: 'Colores por uso', hint: colors.length ? 'Elige de la paleta (pestaña Identidad visual).' : 'Primero añade colores en la pestaña Identidad visual.' },
      ...COLOR_ROLES.map((r) => ({ name: `roles.${r.id}`, label: r.name, type: 'select', options: colorOpts, empty: 'Lo que traiga la skill', hint: r.desc })),
      { type: 'section', label: 'Tipografías', hint: fonts.length ? 'Los archivos .woff2 van en Mi estilo/tipografias/ (o los que trae la skill: Anton, Rajdhani, Cascadia Mono).' : 'Primero añade tipografías en la pestaña Identidad visual.' },
      ...FONT_ROLES.map((r) => ({ name: `fonts.${r.id}`, label: r.name, type: 'select', options: fontOpts, empty: 'Lo que traiga la skill' })),
      ...fonts.flatMap((f, i) => [
        { name: `ff.${i}.archivo`, label: `${f.family}: archivo`, placeholder: 'Anton-Regular.woff2' },
        { name: `ff.${i}.peso`, label: `${f.family}: peso`, placeholder: '400, 700, 800…' },
      ]),
      { type: 'section', label: 'Subtítulos' },
      { name: 'sub.animacion', label: 'Animación', type: 'select', options: SUBTITLE_ANIMATIONS.map((a) => ({ value: a.id, label: a.name })), empty: 'Lo que traiga la skill', span: 2 },
      { name: 'sub.mayusculas', label: 'En mayúsculas', type: 'select', options: tri3, empty: 'Lo que traiga la skill' },
      { name: 'sub.contorno', label: 'Contorno negro (px)', type: 'number', min: 0, max: 20, hint: '0 = sombra suave.' },
      { name: 'sub.sin_puntuacion', label: 'Sin puntuación', type: 'select', options: tri3, empty: 'Lo que traiga la skill' },
      { type: 'section', label: 'Gráficos' },
      { name: 'cards', label: 'Estilo de las tarjetas', type: 'select', options: CARD_STYLES.map((c) => ({ value: c.id, label: c.name })), empty: 'Lo que traiga la skill' },
      { name: 'graphicsAllowed', label: 'Gráficos que usa la marca', type: 'chips', options: SKILL_GRAPHICS.map((g) => ({ value: g.id, label: g.name })), span: 3, hint: 'Sin marcar ninguno = todos. Cuántos lleva cada video se elige en el guion.' },
      { type: 'section', label: 'Cámara' },
      { name: 'cameraMode', label: 'Movimientos de cámara', type: 'select', options: [{ value: 'todos', label: 'Todos los de la skill' }, { value: 'solo', label: 'Solo los marcados (ninguno = solo el zoom de fondo)' }], empty: false, span: 2 },
      { name: 'camera', label: 'Permitidos', type: 'chips', options: CAMERA_MOVES.map((m) => ({ value: m.id, label: m.name })), span: 3 },
      { type: 'section', label: 'Sonido', hint: 'El de siempre de la marca. La música concreta de un video se puede cambiar al editarlo.' },
      { name: 'sfx', label: 'Sus 3 efectos de sonido', type: 'chips', options: SFX_TYPES.map((s) => ({ value: s, label: s })), span: 3, hint: 'Como mucho 3: la skill no admite más.' },
      { name: 'music', label: 'Estilo de música', type: 'select', options: MUSIC_STYLES.map((m) => ({ value: m.id, label: m.name })), empty: 'Lo que traiga la skill' },
      { type: 'section', label: 'Criterio' },
      { name: 'never', label: 'Lo que nunca sale en pantalla', type: 'textarea', rows: 3, span: 3, hint: 'Una regla por línea (p. ej. «Sin emojis», «Nunca mencionar a la constructora»). Las palabras prohibidas de Comunicación se añaden solas.' },
      { name: 'corrections', label: 'Nombres propios bien escritos', type: 'textarea', rows: 3, span: 3, placeholder: 'Afinazón = Afinazone\ncubre polvos = cubrepolvos', hint: 'Cómo los oye mal la transcripción = cómo se escriben. Se corrigen solos en los subtítulos.' },
    ];
    host.innerHTML = `<div class="notice" style="margin-bottom:12px">${icon('film')}<div><p><b>Estilo de edición.</b> Lo que define cómo se ven y suenan siempre los reels de esta marca, en el formato de tu skill <code>editar-reels-claude</code>. Lo que cambia en cada video (cuántos gráficos, escenas) se elige en el guion. Deja en «Lo que traiga la skill» lo que prefieras afinar en su editor en vivo.</p></div></div>
      <div class="split"><section class="card"><div class="card-b"><form class="form-grid cols-3" data-eform>${renderFields(fields, toForm(edit, fonts))}</form></div></section>
      <aside class="stack-lg sticky">
        <section class="card"><div class="card-h"><h3>${icon('download')}Para la skill</h3>${miss.length ? '<span class="badge warn">por confirmar</span>' : '<span class="badge ok">definida</span>'}</div><div class="card-b stack small">
          <p class="xs muted" style="margin:0" data-miss>${missText(miss)}</p>
          <button class="btn btn-sm btn-primary" data-dl-json>${icon('download', 'ic-sm')}${esc(marcaFileName(brand, cfg))}</button>
          <button class="btn btn-sm" data-dl-md>${icon('download', 'ic-sm')}${esc(guideFileName(brand))}</button>
          <button class="btn btn-sm" data-preview>${icon('eye', 'ic-sm')}Ver los dos archivos</button>
          <p class="xs muted" style="margin:0">Guárdalos en <code>Reels con Claude/Mi estilo/marcas/</code> (el .json) y en <code>Mi estilo/</code> (la guía).</p>
        </div></section>
        <section class="card"><div class="card-h"><h3>${icon('upload')}Traer desde la skill</h3></div><div class="card-b stack small">
          <p class="xs muted" style="margin:0">Si ya tienes esta marca en la skill, impórtala primero: se rellenan los campos y se conservan sus medidas (tamaños y posiciones afinados en el editor en vivo).</p>
          <label class="btn btn-sm">${icon('upload', 'ic-sm')}Importar marcas/….json<input type="file" accept=".json,application/json" hidden data-import></label>
          ${edit.importedAt ? `<p class="xs muted" style="margin:0">Importado ${esc(fmtRelative(edit.importedAt))}${edit.raw ? ` · ${Object.keys(edit.raw).length} claves conservadas` : ''}.</p>` : ''}
        </div></section>
      </aside></div>`;
    const form = host.querySelector('[data-eform]');
    const syncCam = () => { const solo = form.querySelector('[name="cameraMode"]').value === 'solo'; form.querySelector('[data-chips="camera"]').closest('.field').style.display = solo ? '' : 'none'; };
    syncCam(); form.querySelector('[name="cameraMode"]').addEventListener('change', syncCam);
    // Como mucho 3 efectos.
    form.querySelector('[data-chips="sfx"]').addEventListener('change', (e) => {
      const on = form.querySelectorAll('[data-chips="sfx"] input:checked');
      if (on.length > 3) { e.target.checked = false; toast('Como mucho 3 efectos de sonido por marca.', 'error'); }
    });
    auto = bindAutosave(form, fields, () => ({}), async (d) => { await save(fromForm(d, fonts, editOf(brandConfig(brandId)))); refreshSide(); });
  };

  // Solo se redibuja el lateral (estado y nombres), para no perder el foco del formulario.
  const refreshSide = () => {
    const brand = store.get('brands', brandId); const cfg = brandConfig(brandId); const miss = missingForSkill(editOf(cfg));
    const badge = host.querySelector('aside .card-h .badge');
    if (badge) { badge.className = `badge ${miss.length ? 'warn' : 'ok'}`; badge.textContent = miss.length ? 'por confirmar' : 'definida'; }
    const m = host.querySelector('[data-miss]'); if (m) m.innerHTML = missText(miss);
    const b = host.querySelector('[data-dl-json]'); if (b) b.lastChild.textContent = marcaFileName(brand, cfg);
  };

  const files = () => {
    const brand = store.get('brands', brandId); const cfg = brandConfig(brandId);
    const assets = store.all('assets', { brandId });
    return { brand, cfg, json: JSON.stringify(buildMarcaJson({ brand, config: cfg }), null, 2), md: buildStyleGuide({ brand, config: cfg, assets }) };
  };

  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    auto?.flush();
    if (t.dataset.dlJson != null) { const f = files(); download(marcaFileName(f.brand, f.cfg), f.json, 'application/json'); }
    if (t.dataset.dlMd != null) { const f = files(); download(guideFileName(f.brand), f.md, 'text/markdown'); }
    if (t.dataset.preview != null) {
      const f = files();
      modal({ title: 'Archivos para la skill', size: 'lg', body: `<p class="small muted">Mi estilo/marcas/<b>${esc(marcaFileName(f.brand, f.cfg))}</b></p><pre class="xs" style="max-height:30vh;overflow:auto">${esc(f.json)}</pre>
        <p class="small muted">Mi estilo/<b>${esc(guideFileName(f.brand))}</b></p><pre class="xs" style="max-height:30vh;overflow:auto;white-space:pre-wrap">${esc(f.md)}</pre>`,
      actions: [{ label: `${icon('copy')}Copiar JSON`, onClick: async () => { await copyText(f.json); toast('Copiado', 'success'); return false; } }, { label: 'Cerrar', kind: 'primary' }] });
    }
  });
  host.addEventListener('change', async (e) => {
    if (e.target.dataset.import == null || !e.target.files?.[0]) return;
    const file = e.target.files[0]; e.target.value = '';
    try {
      const parsed = parseMarcaJson(await file.text(), { fileName: file.name });
      await save({ ...editOf(brandConfig(brandId)), ...parsed });
      toast(`Importado ${file.name}: revisa los campos y vuelve a descargar los archivos.`, 'success');
      draw();
    } catch (err) { toast(`No se pudo leer el archivo: ${err.message}`, 'error'); }
  });

  draw();
  return () => auto?.destroy();
}
