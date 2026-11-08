import { store } from '../core/store.js';
import { app, go } from '../core/app.js';
import { icon, tabs, toast, modal, renderFields, readFields, validateFields, bindAutosave, confirmDialog, emptyState } from '../core/ui.js';
import { esc, fileToDataUrl, fmtDate } from '../core/utils.js';
import { KNOWLEDGE_LEVELS, PLATFORMS, STRUCTURES, CTA_TYPES, HOOK_PATTERNS, HOOK_LAYERS, OBJECTIVES, byId } from '../services/methodology.js';
import { createBrand, duplicateBrand, brandConfig, ensureBrandConfig } from '../services/workflow.js';
import { pageHeader } from './shared.js';
import { tabDocs } from './brand-docs.js';

const TABS = [
  { id: 'general', label: 'Identidad general', icon: 'brand' }, { id: 'documentos', label: 'Documentos', icon: 'book' }, { id: 'comunicacion', label: 'Comunicación', icon: 'text' },
  { id: 'visual', label: 'Identidad visual', icon: 'image' }, { id: 'redes', label: 'Redes sociales', icon: 'send' },
  { id: 'estrategia', label: 'Pilares y estrategia', icon: 'target' }, { id: 'biblioteca', label: 'Hooks y CTA', icon: 'layers' },
  { id: 'referencias', label: 'Referencias', icon: 'link' },
];

const GENERAL = [
  { name: 'name', label: 'Nombre', required: true }, { name: 'sector', label: 'Sector o nicho' },
  { name: 'color', label: 'Color en la app', type: 'color' }, { name: 'status', label: 'Estado', type: 'select', options: [{ value: 'activa', label: 'Activa' }, { value: 'archivada', label: 'Archivada' }], empty: false },
  { name: 'description', label: 'Descripción', type: 'textarea', rows: 2, span: 3 },
  { name: 'valueProp', label: 'Propuesta de valor', type: 'textarea', rows: 2, span: 3 },
  { name: 'products', label: 'Productos y servicios (fuente de verdad para la IA)', type: 'textarea', rows: 4, span: 3, hint: 'Resumen con datos verificados. El detalle va en Documentos → Productos, servicios y oferta; si ese documento tiene contenido, la IA usa el documento.' },
  { name: 'businessGoals', label: 'Objetivos comerciales', type: 'textarea', rows: 2, span: 3 },
  { name: 'audience', label: 'Público objetivo', type: 'textarea', rows: 2, span: 3, hint: 'Resumen. El perfil completo va en Documentos → Buyer persona.' },
  { name: 'painPoints', label: 'Problemas frecuentes de sus clientes', type: 'textarea', rows: 4, span: 3, hint: 'Uno por línea, con las palabras que usan los clientes. El detalle va en Documentos → Puntos de dolor, deseos y objeciones.' },
];
const VOICE = [
  { name: 'voice.personality', label: 'Personalidad', placeholder: 'Cercana, experta, con humor suave…', span: 2 },
  { name: 'voice.person', label: 'Trato', type: 'select', options: [{ value: 'tú', label: 'Tú' }, { value: 'usted', label: 'Usted' }, { value: 'vosotros', label: 'Vosotros' }, { value: 'ustedes', label: 'Ustedes' }], empty: false },
  { name: 'voice.tone', label: 'Tono de voz', type: 'textarea', rows: 2, span: 2 },
  { name: 'voice.formality', label: 'Formalidad (1 informal – 5 formal)', type: 'range', min: 1, max: 5 },
  { name: 'voice.vocabulary', label: 'Vocabulario recomendado', type: 'textarea', rows: 3 },
  { name: 'voice.avoid', label: 'Palabras y expresiones a evitar', type: 'textarea', rows: 3, hint: 'Separadas por comas. El evaluador las detecta automáticamente.' },
  { name: 'voice.knowledgeLevel', label: 'Nivel habitual de la audiencia', type: 'select', cast: 'number', options: KNOWLEDGE_LEVELS.map((l) => ({ value: l.id, label: `${l.id} · ${l.name} — ${l.desc}` })), empty: false },
  { name: 'voice.narrationStyle', label: 'Estilo de narración', type: 'textarea', rows: 2, span: 2, placeholder: 'A cámara en primera persona, voz en off, entrevista…' },
  { name: 'voice.approvedExamples', label: 'Ejemplos de guiones aprobados', type: 'textarea', rows: 6, span: 3, hint: 'Pega guiones que representen bien la voz. La IA imita el estilo, no copia el contenido.' },
];
const VISUAL = [
  { name: 'visual.subtitleStyle', label: 'Estilo de subtítulos', type: 'textarea', rows: 2, placeholder: 'Blanco con borde negro, palabra clave en color acento, 2 líneas máx.' },
  { name: 'visual.textPosition', label: 'Posición de textos', type: 'textarea', rows: 2 },
  { name: 'visual.editingStyle', label: 'Estilo de edición', type: 'textarea', rows: 2 },
  { name: 'visual.pace', label: 'Ritmo', type: 'textarea', rows: 2, placeholder: 'Cambio de plano cada 2–4 s; sin silencios' },
  { name: 'visual.transitions', label: 'Transiciones' }, { name: 'visual.music', label: 'Música' }, { name: 'visual.sfx', label: 'Efectos de sonido' },
  { name: 'visual.graphics', label: 'Recursos gráficos y referencias', type: 'textarea', rows: 2 },
  { name: 'visual.intro', label: 'Intro (si corresponde)' }, { name: 'visual.outro', label: 'Outro (si corresponde)' },
  { name: 'visual.references', label: 'Referencias visuales y audiovisuales', type: 'textarea', rows: 3, span: 2, hint: 'Enlaces a videos o cuentas de referencia (de cualquier nicho).' },
];

export function render(main, { params, query }) {
  const [id, tabId, subId] = params;
  if (!id) return renderList(main, query);
  const brand = store.get('brands', id);
  if (!brand) { main.innerHTML = emptyState('Marca no encontrada', 'Puede estar en la papelera.', '<a class="btn" href="#/marcas">Volver</a>', 'alert'); return null; }
  let tab = TABS.some((t) => t.id === tabId) ? tabId : 'general';
  let cleanup = null;
  main.innerHTML = `${pageHeader({ title: brand.name, crumbs: `<a href="#/marcas">Marcas</a>${icon('right', 'ic-sm')}<span>${esc(brand.name)}</span>`, sub: 'Cada marca es un espacio independiente. La IA usa solo el contexto de la marca correspondiente.',
    actions: `<button class="btn" data-use>${icon('check')}Trabajar con esta marca</button>` })}<div class="btabs"></div><div class="bbody"></div>`;
  main.querySelector('[data-use]').onclick = () => { app.setBrand(id); toast(`Marca activa: ${brand.name}`, 'success'); go('/'); };
  const drawTabs = () => { main.querySelector('.btabs').innerHTML = tabs(TABS, tab); main.querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; history.replaceState(null, '', `#/marcas/${id}/${tab}`); drawTabs(); drawBody(); })); };
  const drawBody = async () => {
    try { cleanup?.(); } catch { /* */ }
    const body = main.querySelector('.bbody'); body.innerHTML = '';
    const host = document.createElement('div'); body.append(host);
    await ensureBrandConfig(id);
    cleanup = ({ general: tabGeneral, documentos: tabDocs, comunicacion: tabVoice, visual: tabVisual, redes: tabPlatforms, estrategia: tabStrategy, biblioteca: tabLibrary, referencias: tabRefs })[tab](host, id, subId) || null;
  };
  drawTabs(); drawBody();
  return () => { try { cleanup?.(); } catch { /* */ } };
}

function renderList(main, query) {
  const draw = () => {
    const brands = store.all('brands').sort((a, b) => (a.status === 'archivada') - (b.status === 'archivada') || a.name.localeCompare(b.name));
    main.innerHTML = `${pageHeader({ title: 'Marcas', sub: 'Espacios de trabajo independientes: identidad, tono, recursos, calendario y métricas propias.', actions: `<button class="btn btn-primary" data-new>${icon('plus')}Nueva marca</button>` })}
      ${brands.length ? `<div class="grid g-3">${brands.map((b) => {
        const ideas = store.all('ideas', { brandId: b.id }); const pubs = store.all('publications', { brandId: b.id }).length;
        const cfg = brandConfig(b.id);
        return `<article class="card brand-card ${b.status === 'archivada' ? 'archived' : ''}"><div class="brand-band" style="background:${esc(b.color)}"></div><div class="card-b stack">
          <div class="row-between"><h3>${esc(b.name)}</h3>${b.status === 'archivada' ? '<span class="badge">Archivada</span>' : ''}</div>
          <p class="small muted" style="margin:0">${esc(b.sector || 'Sin sector')} · ${ideas.length} contenidos · ${pubs} publicaciones</p>
          <div class="row">${(cfg.visual.colors || []).slice(0, 5).map((c) => `<span class="swatch" style="background:${esc(c.hex)}" title="${esc(c.name)} ${esc(c.hex)}"></span>`).join('')}</div>
          <div class="row"><a class="btn btn-sm btn-primary" href="#/marcas/${b.id}">${icon('edit', 'ic-sm')}Ficha</a><button class="btn btn-sm" data-use="${b.id}">Trabajar con ella</button><button class="icon-btn sm" data-dup="${b.id}" title="Duplicar configuración">${icon('copy', 'ic-sm')}</button><button class="icon-btn sm" data-del="${b.id}" title="Enviar a la papelera">${icon('trash', 'ic-sm')}</button></div>
        </div></article>`;
      }).join('')}</div>` : `<div class="card">${emptyState('Sin marcas', 'Crea la primera marca para empezar.', `<button class="btn btn-primary" data-new>${icon('plus')}Nueva marca</button>`, 'brand')}</div>`}`;
    main.querySelectorAll('[data-new]').forEach((b) => (b.onclick = openNewBrand));
    main.querySelectorAll('[data-use]').forEach((b) => (b.onclick = () => { app.setBrand(b.dataset.use); go('/'); }));
    main.querySelectorAll('[data-dup]').forEach((b) => (b.onclick = async () => { const nb = await duplicateBrand(b.dataset.dup); toast('Marca duplicada (sin contenidos)', 'success'); go(`/marcas/${nb.id}`); }));
    main.querySelectorAll('[data-del]').forEach((b) => (b.onclick = async () => {
      const br = store.get('brands', b.dataset.del);
      const n = store.all('ideas', { brandId: br.id }).length;
      if (!(await confirmDialog({ title: `Enviar "${br.name}" a la papelera`, message: `La marca dejará de aparecer. Sus ${n} contenidos se conservan y podrás restaurarla desde Ajustes → Papelera. Para archivarla sin ocultarla, cambia su estado a "Archivada".`, confirm: 'Enviar a la papelera', danger: true, typeToConfirm: br.name }))) return;
      await store.remove('brands', br.id); if (app.brandId === br.id) app.setBrand('all'); draw();
    }));
  };
  draw();
  if (query.new) openNewBrand();
  function openNewBrand() {
    const fields = GENERAL.slice(0, 3).concat(GENERAL.slice(4, 6));
    const body = document.createElement('form'); body.className = 'form-grid cols-3';
    body.innerHTML = renderFields(fields, { color: ['#4f46e5', '#0d9488', '#db2777', '#ea580c', '#2563eb', '#65a30d'][store.all('brands').length % 6] });
    modal({ title: 'Nueva marca', body, size: 'md', actions: [{ label: 'Cancelar' }, { label: 'Crear marca', kind: 'primary', onClick: async () => {
      if (!validateFields(body, fields)) return false;
      const b = await createBrand(readFields(body, fields));
      app.setBrand(b.id); toast('Marca creada. Completa su ficha de identidad.', 'success'); go(`/marcas/${b.id}`); return true;
    } }] });
  }
  return null;
}

function tabGeneral(host, id) {
  host.innerHTML = `<div class="card"><div class="card-b"><form class="form-grid cols-3">${renderFields(GENERAL, store.get('brands', id))}</form></div></div>`;
  const a = bindAutosave(host.querySelector('form'), GENERAL, () => store.get('brands', id), (d) => { if (!d.name?.trim()) throw new Error('El nombre es obligatorio'); return store.update('brands', id, d); });
  return () => a.destroy();
}

function cfgEditor(host, id, fields, extraHtml = '') {
  const cfg = brandConfig(id);
  host.innerHTML = `<div class="card"><div class="card-b"><form class="form-grid cols-3">${renderFields(fields, cfg)}</form></div></div>${extraHtml}`;
  const a = bindAutosave(host.querySelector('form'), fields, () => brandConfig(id), (d) => store.update('brandConfigs', store.find('brandConfigs', (c) => c.brandId === id).id, { voice: d.voice, visual: d.visual, strategy: d.strategy }));
  return a;
}
function tabVoice(host, id) { const a = cfgEditor(host, id, VOICE); return () => a.destroy(); }

function tabVisual(host, id) {
  const draw = () => {
    const cfg = brandConfig(id);
    const assets = store.all('assets', { brandId: id });
    host.innerHTML = `<div class="split"><div class="stack-lg">
      <section class="card"><div class="card-h"><h3>Paleta de colores</h3><button class="btn btn-sm" data-addcolor>${icon('plus', 'ic-sm')}Color</button></div><div class="card-b stack">
        ${(cfg.visual.colors || []).map((c, i) => `<div class="row"><input type="color" value="${esc(c.hex)}" data-color="${i}" aria-label="Color"><input class="input input-sm" data-cname="${i}" value="${esc(c.name)}" style="width:160px"><input class="input input-sm mono" data-chex="${i}" value="${esc(c.hex)}" style="width:110px" pattern="#[0-9a-fA-F]{6}"><button class="icon-btn sm" data-delcolor="${i}" title="Quitar">${icon('x', 'ic-sm')}</button></div>`).join('')}
      </div></section>
      <section class="card"><div class="card-h"><h3>Tipografías</h3><button class="btn btn-sm" data-addfont>${icon('plus', 'ic-sm')}Tipografía</button></div><div class="card-b stack">
        ${(cfg.visual.fonts || []).map((f, i) => `<div class="row"><input class="input input-sm" data-frole="${i}" value="${esc(f.role)}" placeholder="Uso" style="width:160px"><input class="input input-sm" data-ffam="${i}" value="${esc(f.family)}" placeholder="Nombre de la fuente" style="flex:1"><span style="font-family:${esc(f.family)};min-width:80px">Aa Bb 123</span><button class="icon-btn sm" data-delfont="${i}">${icon('x', 'ic-sm')}</button></div>`).join('')}
      </div></section>
      <section class="card"><div class="card-h"><h3>Estilo audiovisual</h3><span class="xs muted">La IA lo tiene en cuenta en guiones y copies</span></div><div class="card-b"><form class="form-grid" data-vform>${renderFields(VISUAL, cfg)}</form></div></section>
    </div>
    <aside class="stack-lg"><section class="card"><div class="card-h"><h3>${icon('image')}Recursos de la marca</h3></div><div class="card-b stack">
      <label class="dropzone" data-drop>${icon('upload')}<div class="small">Arrastra logotipos, imágenes o gráficos (≤ 1,5 MB) o haz clic</div><input type="file" accept="image/*,.svg" multiple hidden data-file></label>
      <div class="row"><input class="input input-sm" data-aurl placeholder="O pega un enlace (Drive, Dropbox, Figma…)" style="flex:1"><select class="input input-sm" data-akind style="width:auto"><option value="logo">Logo</option><option value="imagen">Imagen</option><option value="grafico">Gráfico</option><option value="fuente">Fuente</option><option value="audio">Audio</option><option value="plantilla">Plantilla</option></select><button class="btn btn-sm" data-addurl>Añadir</button></div>
      <p class="xs muted">Los archivos subidos se guardan en este dispositivo (Google Sheets no admite archivos). Para compartirlos entre equipos, usa enlaces.</p>
      <div class="assets">${assets.map((a) => `<div class="asset">${a.dataUrl && /^data:image/.test(a.dataUrl) ? `<img src="${a.dataUrl}" alt="${esc(a.name)}">` : `<div class="asset-ph">${icon(a.kind === 'audio' ? 'send' : 'link')}</div>`}<div class="xs"><b class="truncate" style="display:block">${esc(a.name)}</b><span class="muted">${esc(a.kind)}${a.dataUrl ? ' · local' : ''}</span>${a.url ? ` · <a href="${esc(a.url)}" target="_blank" rel="noopener">abrir</a>` : ''}</div><button class="icon-btn sm" data-delasset="${a.id}" title="Eliminar">${icon('trash', 'ic-sm')}</button></div>`).join('') || '<p class="xs muted">Sin recursos.</p>'}</div>
    </div></section></aside></div>`;
    const a = bindAutosave(host.querySelector('[data-vform]'), VISUAL, () => brandConfig(id), (d) => saveVisual({ ...d.visual }));
    host._auto?.destroy(); host._auto = a;
  };
  const cfgId = () => store.find('brandConfigs', (c) => c.brandId === id).id;
  const saveVisual = (patch) => store.update('brandConfigs', cfgId(), (r) => ({ ...r, visual: { ...brandConfig(id).visual, ...patch } }));
  draw();
  const mut = async (fn) => { const v = brandConfig(id).visual; fn(v); await saveVisual({ colors: v.colors, fonts: v.fonts }); draw(); };
  host.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.color != null) mut((v) => { v.colors[t.dataset.color].hex = t.value; });
    if (t.dataset.chex != null && /^#[0-9a-f]{6}$/i.test(t.value)) mut((v) => { v.colors[t.dataset.chex].hex = t.value; });
    if (t.dataset.cname != null) mut((v) => { v.colors[t.dataset.cname].name = t.value; });
    if (t.dataset.frole != null) mut((v) => { v.fonts[t.dataset.frole].role = t.value; });
    if (t.dataset.ffam != null) mut((v) => { v.fonts[t.dataset.ffam].family = t.value; });
    if (t.dataset.file != null) uploadFiles([...t.files]);
  });
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.addcolor != null) mut((v) => v.colors.push({ name: 'Nuevo', hex: '#888888' }));
    if (t.dataset.delcolor != null) mut((v) => v.colors.splice(Number(t.dataset.delcolor), 1));
    if (t.dataset.addfont != null) mut((v) => v.fonts.push({ role: 'Uso', family: '' }));
    if (t.dataset.delfont != null) mut((v) => v.fonts.splice(Number(t.dataset.delfont), 1));
    if (t.dataset.addurl != null) { const url = host.querySelector('[data-aurl]').value.trim(); if (!/^https?:\/\//.test(url)) { toast('Introduce un enlace válido (https://…)', 'error'); return; } await store.create('assets', { brandId: id, kind: host.querySelector('[data-akind]').value, name: url.split('/').filter(Boolean).pop()?.slice(0, 60) || 'Recurso', url, notes: '' }); draw(); }
    if (t.dataset.delasset) { if (await confirmDialog({ title: 'Eliminar recurso', message: 'Irá a la papelera.', confirm: 'Eliminar' })) { await store.remove('assets', t.dataset.delasset); draw(); } }
  });
  const dz = () => host.querySelector('[data-drop]');
  host.addEventListener('dragover', (e) => { if (e.target.closest('[data-drop]')) { e.preventDefault(); dz().classList.add('over'); } });
  host.addEventListener('dragleave', (e) => { if (e.target.closest('[data-drop]')) dz().classList.remove('over'); });
  host.addEventListener('drop', (e) => { if (e.target.closest('[data-drop]')) { e.preventDefault(); uploadFiles([...e.dataTransfer.files]); } });
  async function uploadFiles(files) {
    for (const f of files) {
      if (f.size > 1.5 * 1024 * 1024) { toast(`${f.name}: supera 1,5 MB. Usa un enlace.`, 'error'); continue; }
      const dataUrl = await fileToDataUrl(f);
      await store.create('assets', { brandId: id, kind: /logo/i.test(f.name) ? 'logo' : 'imagen', name: f.name, url: '', dataUrl, notes: '' });
    }
    draw();
  }
  return () => host._auto?.destroy();
}

function tabPlatforms(host, id) {
  const draw = () => {
    const rows = store.all('platforms', { brandId: id });
    host.innerHTML = `<div class="notice" style="margin-bottom:12px">${icon('info')}<div><p>La duración objetivo se usa al generar guiones; la frecuencia semanal, para detectar huecos en el calendario; los CTA preferidos guían la IA.</p></div></div>
      <div class="stack">${PLATFORMS.map((p) => { const r = rows.find((x) => x.platform === p.id); return `<section class="card ${r?.active === false || !r ? 'muted-card' : ''}" data-pl="${p.id}"><div class="card-h"><h3>${esc(p.name)}</h3><label class="check"><input type="checkbox" data-active ${r && r.active !== false ? 'checked' : ''}>Usar esta plataforma</label></div>
        ${r && r.active !== false ? `<div class="card-b form-grid cols-3">
          <div class="field"><label>Objetivo en la plataforma</label><select class="input" data-f="goal"><option value="">—</option>${OBJECTIVES.map((o) => `<option value="${o.id}" ${r.goal === o.id ? 'selected' : ''}>${o.name}</option>`).join('')}</select></div>
          <div class="field"><label>Duración objetivo (s)</label><input class="input" type="number" min="5" max="600" data-f="durationTarget" value="${esc(r.durationTarget ?? p.defaultDuration)}"></div>
          <div class="field"><label>Publicaciones por semana</label><input class="input" type="number" min="0" max="50" step="0.5" data-f="frequencyPerWeek" value="${esc(r.frequencyPerWeek ?? '')}"></div>
          <div class="field span-3"><label>Formatos de contenido</label><div class="chips">${STRUCTURES.map((s) => `<label class="chip-opt"><input type="checkbox" data-arr="formats" value="${s.id}" ${(r.formats || []).includes(s.id) ? 'checked' : ''}><span>${esc(s.name)}</span></label>`).join('')}</div></div>
          <div class="field span-3"><label>CTA permitidos o recomendados</label><div class="chips">${CTA_TYPES.map((c) => `<label class="chip-opt"><input type="checkbox" data-arr="ctas" value="${c.id}" ${(r.ctas || []).includes(c.id) ? 'checked' : ''}><span>${esc(c.name)}</span></label>`).join('')}</div></div>
        </div>` : ''}</section>`; }).join('')}</div>`;
  };
  draw();
  host.addEventListener('change', async (e) => {
    const card = e.target.closest('[data-pl]'); if (!card) return;
    const pid = card.dataset.pl; let r = store.find('platforms', (x) => x.brandId === id && x.platform === pid);
    if (e.target.dataset.active != null) {
      if (!r) await store.create('platforms', { brandId: id, platform: pid, goal: '', formats: [], durationTarget: byId(PLATFORMS, pid).defaultDuration, frequencyPerWeek: 2, ctas: [], active: e.target.checked });
      else await store.update('platforms', r.id, { active: e.target.checked });
      draw(); return;
    }
    if (!r) return;
    if (e.target.dataset.f) await store.update('platforms', r.id, { [e.target.dataset.f]: e.target.type === 'number' ? Number(e.target.value) : e.target.value });
    if (e.target.dataset.arr) { const k = e.target.dataset.arr; await store.update('platforms', r.id, { [k]: [...card.querySelectorAll(`[data-arr="${k}"]:checked`)].map((x) => x.value) }); }
    toast('Guardado', 'success', { timeout: 1200 });
  });
}

function tabStrategy(host, id) {
  const STRAT = [
    { name: 'strategy.monthlyTarget', label: 'Meta de publicaciones al mes', type: 'number', min: 0, hint: 'La agencia de referencia recomienda 4–12 al mes.' },
    { name: 'strategy.safeRatio', label: '% de contenido "seguro" (regla 80/20)', type: 'number', min: 0, max: 100 },
    { name: 'strategy.wpm', label: 'Palabras por minuto al hablar', type: 'number', min: 80, max: 240, hint: 'Para estimar la duración del guion (habitual: 150–170).' },
    { name: 'strategy.notes', label: 'Notas estratégicas (estrategia one-shot o largo plazo, temporadas, fechas clave…)', type: 'textarea', rows: 3, span: 3 },
  ];
  const draw = () => {
    const pillars = store.all('pillars', { brandId: id });
    const ideas = store.all('ideas', { brandId: id }).filter((i) => i.status !== 'descartada');
    const exp = ideas.filter((i) => i.experimental).length;
    host.innerHTML = `<div class="split"><div class="stack-lg">
      <section class="card"><div class="card-h"><h3>Pilares de contenido</h3><button class="btn btn-sm btn-primary" data-addp>${icon('plus', 'ic-sm')}Pilar</button></div>
        ${pillars.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Pilar</th><th>Descripción</th><th>Objetivo</th><th class="num">% deseado</th><th class="num">Contenidos</th><th></th></tr></thead><tbody>
        ${pillars.map((p) => `<tr data-p="${p.id}"><td><input class="input input-sm" data-f="name" value="${esc(p.name)}"></td><td><input class="input input-sm" data-f="description" value="${esc(p.description || '')}"></td>
          <td><select class="input input-sm" data-f="objective"><option value="">—</option>${OBJECTIVES.map((o) => `<option value="${o.id}" ${p.objective === o.id ? 'selected' : ''}>${o.name}</option>`).join('')}</select></td>
          <td class="num"><input class="input input-sm" type="number" min="0" max="100" data-f="share" value="${esc(p.share ?? '')}" style="width:70px"></td><td class="num">${ideas.filter((i) => i.pillarId === p.id).length}</td><td><button class="icon-btn sm" data-delp="${p.id}">${icon('trash', 'ic-sm')}</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="card-b small muted">Define 3–5 pilares: territorios donde se cruzan lo que la marca sabe y lo que a su audiencia le importa.</div>'}</section>
      <section class="card"><div class="card-h"><h3>Parámetros</h3></div><div class="card-b"><form class="form-grid cols-3" data-sf>${renderFields(STRAT, brandConfig(id))}</form></div></section>
    </div><aside class="stack-lg"><section class="card"><div class="card-h"><h3>Equilibrio actual</h3></div><div class="card-b stack small">
      <div class="row-between"><span>Contenidos activos</span><b>${ideas.length}</b></div>
      <div class="row-between"><span>Experimentales</span><b>${ideas.length ? Math.round((exp / ideas.length) * 100) : 0} % <span class="muted">(objetivo ${100 - (brandConfig(id).strategy.safeRatio ?? 80)} %)</span></b></div>
      ${['venta', 'familiaridad', 'memorable'].map((t) => `<div class="row-between"><span>Tipo ${t}</span><b>${ideas.filter((i) => i.contentType === t).length}</b></div>`).join('')}
      <p class="xs muted">Combina los tres tipos: solo venta quema la audiencia; solo familiaridad convierte poco; solo memorable es difícil de sostener.</p></div></section></aside></div>`;
    const a = bindAutosave(host.querySelector('[data-sf]'), STRAT, () => brandConfig(id), (d) => store.update('brandConfigs', store.find('brandConfigs', (c) => c.brandId === id).id, (r) => ({ ...r, strategy: { ...brandConfig(id).strategy, ...d.strategy } })));
    host._auto?.destroy(); host._auto = a;
  };
  draw();
  host.addEventListener('change', async (e) => { const tr = e.target.closest('[data-p]'); if (tr && e.target.dataset.f) await store.update('pillars', tr.dataset.p, { [e.target.dataset.f]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }); });
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.addp != null) { await store.create('pillars', { brandId: id, name: 'Nuevo pilar', description: '', objective: '', share: null }); draw(); }
    if (t.dataset.delp) { if (await confirmDialog({ title: 'Eliminar pilar', message: 'Las ideas asociadas conservarán la referencia pero aparecerán "sin pilar".', confirm: 'Eliminar' })) { await store.remove('pillars', t.dataset.delp); draw(); } }
  });
  return () => host._auto?.destroy();
}

function tabLibrary(host, id) {
  const draw = () => {
    const hooks = store.all('hooks', { brandId: id }); const ctas = store.all('ctas', { brandId: id });
    host.innerHTML = `<div class="grid g-2">
      <section class="card"><div class="card-h"><h3>Hooks</h3><button class="btn btn-sm btn-primary" data-addh>${icon('plus', 'ic-sm')}Hook</button></div>
        ${hooks.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Texto</th><th>Capa</th><th>Patrón</th><th>Estado</th><th></th></tr></thead><tbody>${hooks.map((h) => `<tr data-h="${h.id}"><td><textarea class="input input-sm" rows="2" data-f="text">${esc(h.text)}</textarea>${h.notes ? `<div class="xs muted">${esc(h.notes)}</div>` : ''}</td>
          <td><select class="input input-sm" data-f="layer">${HOOK_LAYERS.map((l) => `<option value="${l.id}" ${h.layer === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}</select></td>
          <td><select class="input input-sm" data-f="patternId"><option value="">—</option>${HOOK_PATTERNS.map((p) => `<option value="${p.id}" ${h.patternId === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></td>
          <td><select class="input input-sm" data-f="status"><option value="aprobado" ${h.status === 'aprobado' ? 'selected' : ''}>Aprobado</option><option value="evitar" ${h.status === 'evitar' ? 'selected' : ''}>Evitar</option></select></td>
          <td><button class="icon-btn sm" data-delh="${h.id}">${icon('trash', 'ic-sm')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card-b small muted">Guarda hooks aprobados (y ejemplos a evitar). La IA los usa como referencia de estilo, no los copia.</div>'}</section>
      <section class="card"><div class="card-h"><h3>CTA</h3><button class="btn btn-sm btn-primary" data-addc>${icon('plus', 'ic-sm')}CTA</button></div>
        ${ctas.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Texto</th><th>Tipo</th><th>Estado</th><th></th></tr></thead><tbody>${ctas.map((c) => `<tr data-c="${c.id}"><td><textarea class="input input-sm" rows="2" data-f="text">${esc(c.text)}</textarea></td>
          <td><select class="input input-sm" data-f="type">${CTA_TYPES.map((t) => `<option value="${t.id}" ${c.type === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}</select></td>
          <td><select class="input input-sm" data-f="status"><option value="aprobado" ${c.status === 'aprobado' ? 'selected' : ''}>Aprobado</option><option value="evitar" ${c.status === 'evitar' ? 'selected' : ''}>Evitar</option></select></td>
          <td><button class="icon-btn sm" data-delc="${c.id}">${icon('trash', 'ic-sm')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card-b small muted">Define CTA por objetivo: comentarios, guardados, DMs, ventas…</div>'}</section></div>`;
  };
  draw();
  host.addEventListener('change', async (e) => {
    const f = e.target.dataset.f; if (!f) return;
    const h = e.target.closest('[data-h]'); const c = e.target.closest('[data-c]');
    if (h) await store.update('hooks', h.dataset.h, { [f]: e.target.value });
    if (c) await store.update('ctas', c.dataset.c, { [f]: e.target.value });
  });
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.addh != null) { await store.create('hooks', { brandId: id, layer: 'narrado', patternId: '', text: '', objective: '', status: 'aprobado', notes: '' }); draw(); }
    if (t.dataset.addc != null) { await store.create('ctas', { brandId: id, type: 'comentarios', text: '', objective: '', status: 'aprobado', notes: '' }); draw(); }
    if (t.dataset.delh) { await store.remove('hooks', t.dataset.delh); draw(); toast('Hook enviado a la papelera', 'success'); }
    if (t.dataset.delc) { await store.remove('ctas', t.dataset.delc); draw(); toast('CTA enviado a la papelera', 'success'); }
  });
}

function tabRefs(host, id) {
  const draw = () => {
    const refs = store.all('references', { brandId: id });
    host.innerHTML = `<section class="card"><div class="card-h"><h3>Referencias de la marca</h3><button class="btn btn-sm btn-primary" data-add>${icon('plus', 'ic-sm')}Referencia</button></div>
      ${refs.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Tipo</th><th>Título</th><th>Enlace</th><th>Métricas observadas</th><th>Notas</th><th></th></tr></thead><tbody>${refs.map((r) => `<tr data-r="${r.id}">
        <td><select class="input input-sm" data-f="kind">${['video', 'competencia', 'cuenta', 'articulo', 'dato', 'otro'].map((k) => `<option ${r.kind === k ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
        <td><input class="input input-sm" data-f="title" value="${esc(r.title)}"></td><td><input class="input input-sm" data-f="url" value="${esc(r.url)}">${r.url ? `<a class="xs" href="${esc(r.url)}" target="_blank" rel="noopener">abrir</a>` : ''}</td>
        <td><input class="input input-sm" data-f="metrics" value="${esc(r.metrics || '')}" placeholder="p. ej. 200k me gusta"></td><td><input class="input input-sm" data-f="notes" value="${esc(r.notes || '')}"></td>
        <td><button class="icon-btn sm" data-del="${r.id}">${icon('trash', 'ic-sm')}</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="card-b small muted">Registra videos de referencia con buenos resultados (de cualquier nicho), cuentas de competencia y datos verificados. Método sugerido: busca el tema en la plataforma y filtra por Me gusta en los últimos meses.</div>'}</section>`;
  };
  draw();
  host.addEventListener('change', async (e) => { const r = e.target.closest('[data-r]'); if (r && e.target.dataset.f) await store.update('references', r.dataset.r, { [e.target.dataset.f]: e.target.value }); });
  host.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.add != null) { await store.create('references', { brandId: id, ideaId: '', kind: 'video', title: '', url: '', metrics: '', notes: '' }); draw(); }
    if (t.dataset.del) { await store.remove('references', t.dataset.del); draw(); }
  });
}

export { fmtDate };
