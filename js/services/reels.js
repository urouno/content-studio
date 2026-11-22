// Puente con las skills de edición de reels (editar-reels-claude y animar-reels-claude).
// La skill guarda el estilo de cada marca en `Mi estilo/marcas/<marca>.json` y su guía corta en
// `Mi estilo/Reglas-de-estilo-<Marca>.md`. Aquí se generan esos dos archivos desde la ficha de la marca, y se lee
// el archivo que ya tenga la skill para no pisar lo que se afinó en su editor en vivo.
//
// Regla de ida y vuelta: Content Studio manda en lo estable de la marca (colores con su rol, fuentes, cómo se animan
// los subtítulos, estilo de tarjetas, cámara, sonido, gráficos permitidos, correcciones y notas). Todo lo demás que
// traiga el archivo de la skill (tamaños, posiciones, márgenes…) se conserva tal cual al exportar.
// Lo variable de cada video (cuántos gráficos, escenas, música concreta) NO va aquí: se elige en cada contenido.

// ---------- Opciones reales de la skill (de su guía PLAN-Y-CATALOGO.md) ----------

export const COLOR_ROLES = [
  { id: 'texto', name: 'Texto', desc: 'Color de los subtítulos y textos.' },
  { id: 'acento', name: 'Acento', desc: 'La palabra clave y los detalles.' },
  { id: 'sobre_acento', name: 'Texto sobre el acento', desc: 'El texto que va encima de un fondo de color acento.' },
  { id: 'oscuro', name: 'Oscuro', desc: 'Fondos de tarjetas y pantallas.' },
  { id: 'detras', name: 'Palabra detrás', desc: 'La palabra gigante detrás de la cabeza.' },
];
export const FONT_ROLES = [
  { id: 'texto', name: 'Subtítulos y textos' },
  { id: 'clave', name: 'Palabra clave' },
  { id: 'tarjeta', name: 'Tarjetas' },
];
export const SUBTITLE_ANIMATIONS = [
  { id: 'alterna', name: 'Alterna: una frase palabra a palabra, la siguiente entera' },
  { id: 'variada', name: 'Variada: palabras, línea y letras' },
  { id: 'palabra', name: 'Palabra: aparece cada una con un pop' },
  { id: 'karaoke', name: 'Karaoke: se ilumina la que suena' },
  { id: 'resaltado', name: 'Resaltado: caja de color sobre la que suena' },
  { id: 'linea', name: 'Línea: la frase entera' },
  { id: 'letras', name: 'Letras: letra a letra' },
];
export const CARD_STYLES = [
  { id: 'blanca', name: 'Blanca' }, { id: 'cristal', name: 'Cristal' }, { id: 'cristal_oscuro', name: 'Cristal oscuro' }, { id: 'oscura', name: 'Oscura' },
];
export const CAMERA_MOVES = [
  { id: 'rapido', name: 'Acercamiento rápido' }, { id: 'corte', name: 'Corte a primer plano' }, { id: 'lento', name: 'Acercamiento lento' },
  { id: 'alejar', name: 'Alejar' }, { id: 'paneo', name: 'Paneo' }, { id: 'sacudida', name: 'Sacudida' },
];
export const SFX_TYPES = ['whoosh', 'whoosh_largo', 'pop', 'click', 'tick', 'impact', 'riser', 'obturador', 'ding', 'glitch'];
export const MUSIC_STYLES = [
  { id: 'house', name: 'House' }, { id: 'corporativo', name: 'Corporativo' }, { id: 'hiphop', name: 'Hip hop' }, { id: 'funk', name: 'Funk' },
  { id: 'techno', name: 'Techno' }, { id: 'cinematico', name: 'Cinemático' }, { id: 'ambiental', name: 'Ambiental' }, { id: 'lofi', name: 'Lo-fi' },
  { id: 'synthwave', name: 'Synthwave' }, { id: 'mia', name: 'La mía (de la carpeta Música)' }, { id: 'ninguna', name: 'Sin música' },
];
/** Gráficos del catálogo de la skill (los que puede limitar `graficos_permitidos`). */
export const SKILL_GRAPHICS = [
  ['gancho', 'Gancho'], ['tarjeta', 'Tarjeta'], ['lista', 'Lista'], ['contador', 'Contador'], ['barras', 'Barras'], ['subrayado', 'Subrayado'],
  ['precio', 'Precio'], ['chat', 'Chat'], ['progreso', 'Barra de progreso'], ['cinetico', 'Texto cinético'], ['detras', 'Palabra detrás'],
  ['marco', 'Marco (captura o B-roll)'], ['rotulo', 'Rótulo'], ['cierre', 'Cierre'], ['etiqueta', 'Etiqueta'], ['senal', 'Señal'],
  ['antes_despues', 'Antes / después'], ['sticker', 'Sticker'], ['pantalla', 'Pantalla de sección'], ['dato', 'Cifra gigante'],
  ['comparativa', 'Comparativa'], ['pasos', 'Pasos'], ['transicion', 'Transición'], ['escena', 'Escenas animadas'],
].map(([id, name]) => ({ id, name }));

export const SAFE_ZONE = { top: 220, bottom: 380, right: 140 };

export function defaultEdit() {
  return {
    file: '', roles: {}, fonts: {}, fontFiles: {}, subtitles: { animacion: '', mayusculas: null, contorno: null, sin_puntuacion: null },
    cards: '', camera: null, sfx: [], music: '', graphicsAllowed: [], never: '', corrections: '', raw: null, importedAt: '',
    guide: '', guideImportedAt: '', // la guía que ya tenía la skill (sin el bloque de Content Studio)
  };
}
export const editOf = (cfg) => ({ ...defaultEdit(), ...(cfg?.visual?.edit || {}) });

// ---------- Utilidades ----------

export const slugify = (t) => String(t || 'marca').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'marca';
const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length) && !(isObj(v) && !Object.keys(v).length)));
/** Mezcla profunda: lo de `over` gana; lo que solo está en `base` se conserva. */
export function deepMerge(base, over) {
  if (!isObj(base)) return over;
  const out = { ...base };
  Object.entries(over || {}).forEach(([k, v]) => { out[k] = isObj(v) && isObj(base[k]) ? deepMerge(base[k], v) : v; });
  return out;
}
/** «Afinazón = Afinazone» por línea → {"Afinazón": "Afinazone"} (también acepta → y :). */
export function parseCorrections(text) {
  const out = {};
  String(text || '').split('\n').forEach((l) => {
    const m = l.split(/\s*(?:=|→|->)\s*/);
    if (m.length >= 2 && m[0].trim() && m[1].trim()) out[m[0].trim()] = m.slice(1).join(' ').trim();
  });
  return out;
}
export const correctionsText = (obj) => Object.entries(obj || {}).map(([a, b]) => `${a} = ${b}`).join('\n');

/** Lo que falta para que la marca quede «definida» en la skill (si no, sale «por confirmar»). */
export function missingForSkill(edit) {
  const miss = [];
  if (!edit.roles?.texto || !edit.roles?.acento) miss.push('los colores de texto y acento');
  if (!edit.fonts?.texto) miss.push('la fuente de los subtítulos');
  if (!edit.subtitles?.animacion) miss.push('cómo se animan los subtítulos');
  if (!edit.cards) miss.push('el estilo de las tarjetas');
  return miss;
}

// ---------- Exportar ----------

/**
 * El archivo `marcas/<marca>.json` de la skill.
 * @param {{brand, config, assets?}} o  `config` es la configuración de la marca (voice, visual…).
 */
export function buildMarcaJson({ brand, config }) {
  const edit = editOf(config);
  const raw = isObj(edit.raw) ? edit.raw : {};
  const fonts = config?.visual?.fonts || [];
  const fontFor = (role) => edit.fonts?.[role] || '';
  const ours = {
    nombre: brand.name,
    estado: missingForSkill(edit).length ? 'por confirmar' : 'definida',
    guia: `Reglas-de-estilo-${guideName(brand)}.md`,
    colores: clean(Object.fromEntries(COLOR_ROLES.map((r) => [r.id, edit.roles?.[r.id] || '']))),
    subtitulos: clean({
      animacion: edit.subtitles?.animacion || '',
      mayusculas: edit.subtitles?.mayusculas ?? null,
      contorno: edit.subtitles?.contorno ?? null,
      sin_puntuacion: edit.subtitles?.sin_puntuacion ?? null,
    }),
    tarjetas: clean({ estilo: edit.cards || '' }),
  };
  // Fuentes: los archivos (.woff2 en Mi estilo/tipografias/) y qué familia va en cada uso.
  const used = [...new Set(FONT_ROLES.map((r) => fontFor(r.id)).filter(Boolean))];
  if (used.length) {
    const archivos = used.map((fam) => {
      const f = fonts.find((x) => x.family === fam) || {};
      return clean({ familia: fam, peso: edit.fontFiles?.[fam]?.peso || f.weight || '', archivo: edit.fontFiles?.[fam]?.archivo || '' });
    });
    const keep = isObj(raw.fuentes) ? raw.fuentes : {};
    // `clave` puede ser un objeto en la skill (con su ancho de letra): si ya lo es, solo se cambia la familia.
    const roleVal = (role) => (isObj(keep[role]) ? { ...keep[role], familia: fontFor(role) } : fontFor(role));
    ours.fuentes = clean({ archivos, ...Object.fromEntries(FONT_ROLES.map((r) => [r.id, fontFor(r.id) ? roleVal(r.id) : ''])) });
  }
  if (Array.isArray(edit.camera)) ours.zoom = { movimientos: edit.camera };
  if (edit.sfx?.length || edit.music) {
    const efectos = edit.sfx?.length ? { activo: true, tipos: Object.fromEntries(edit.sfx.slice(0, 3).map((t) => [t, {}])) } : undefined;
    ours.sonido = clean({ musica: edit.music || '', efectos });
  }
  if (edit.graphicsAllowed?.length) ours.graficos_permitidos = edit.graphicsAllowed;
  const corr = { ...(isObj(raw.correcciones) ? raw.correcciones : {}), ...parseCorrections(edit.corrections) };
  if (Object.keys(corr).length) ours.correcciones = corr;
  const notas = notesFor({ brand, config, edit });
  if (notas.length) ours.notas = Array.isArray(raw.notas) ? notas : notas.join('\n');
  const out = deepMerge(raw, clean(ours));
  // Las listas se sustituyen (no se mezclan) y los efectos se reemplazan enteros para no dejar tipos de más.
  if (ours.sonido?.efectos && isObj(out.sonido)) out.sonido.efectos = deepMerge(isObj(raw.sonido?.efectos) ? { ...raw.sonido.efectos, tipos: {} } : {}, ours.sonido.efectos);
  return out;
}

const guideName = (brand) => String(brand.name || 'Marca').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Marca';
export const marcaFileName = (brand, config) => `${editOf(config).file || slugify(brand.name)}.json`;
export const guideFileName = (brand) => `Reglas-de-estilo-${guideName(brand)}.md`;

/** Reglas de criterio para el editor: lo que nunca sale en pantalla y las palabras prohibidas. */
function notesFor({ config, edit }) {
  const v = config?.voice || {};
  return [
    ...String(edit.never || '').split('\n').map((x) => x.trim()).filter(Boolean),
    v.avoid && `Nunca en pantalla ni en subtítulos: ${v.avoid}.`,
  ].filter(Boolean);
}

/**
 * `Reglas-de-estilo-<Marca>.md`: la guía corta que la skill lee antes de editar. Aquí sí entran los campos
 * audiovisuales de texto libre de la ficha (ritmo, transiciones, música, intro, outro…).
 */
export function buildStyleGuide({ brand, config, assets = [] }) {
  const v = config?.voice || {}; const vis = config?.visual || {}; const edit = editOf(config);
  const colors = vis.colors || [];
  const roleName = (hex) => colors.find((c) => String(c.hex).toLowerCase() === String(hex).toLowerCase())?.name;
  const line = (label, val) => (val ? `- ${label}: ${val}` : '');
  const sec = (title, lines) => { const l = lines.filter(Boolean); return l.length ? `## ${title}\n${l.join('\n')}\n` : ''; };
  const logos = assets.filter((a) => a.kind === 'logo').map((a) => a.name);
  return [
    `# Reglas de estilo · ${brand.name}`,
    '',
    sec('Marca y tono', [brand.description && `- ${brand.description}`, line('Sector', brand.sector), line('Personalidad', v.personality), line('Tono', v.tone), line('Trato', v.person)]),
    sec('Lienzo y zona segura', [`- 1080×1920, sin HDR. Nada importante en los ${SAFE_ZONE.top} px de arriba, ${SAFE_ZONE.bottom} px de abajo ni ${SAFE_ZONE.right} px de la derecha.`, line('Posición de los textos', vis.textPosition)]),
    sec('Tipografía', [...FONT_ROLES.map((r) => line(r.name, edit.fonts?.[r.id])), ...(vis.fonts || []).filter((f) => f.family && !Object.values(edit.fonts || {}).includes(f.family)).map((f) => line(f.role, f.family))]),
    sec('Color', [...COLOR_ROLES.map((r) => edit.roles?.[r.id] && `- ${r.name}: ${edit.roles[r.id]}${roleName(edit.roles[r.id]) ? ` (${roleName(edit.roles[r.id])})` : ''}`), ...colors.filter((c) => !Object.values(edit.roles || {}).map((x) => String(x).toLowerCase()).includes(String(c.hex).toLowerCase())).map((c) => `- ${c.name}: ${c.hex}`)]),
    sec('Subtítulos', [vis.subtitleStyle && `- ${vis.subtitleStyle}`, edit.subtitles?.animacion && `- Animación: ${SUBTITLE_ANIMATIONS.find((a) => a.id === edit.subtitles.animacion)?.name || edit.subtitles.animacion}`, edit.subtitles?.mayusculas != null && `- ${edit.subtitles.mayusculas ? 'En mayúsculas' : 'Sin mayúsculas'}`]),
    sec('Motion graphics', [edit.cards && `- Tarjetas: ${CARD_STYLES.find((c) => c.id === edit.cards)?.name || edit.cards}`, vis.editingStyle && `- ${vis.editingStyle}`, line('Recursos gráficos', vis.graphics), edit.graphicsAllowed?.length && `- Solo estos gráficos: ${edit.graphicsAllowed.join(', ')}`]),
    sec('Ritmo y cortes', [vis.pace && `- ${vis.pace}`, line('Transiciones', vis.transitions), Array.isArray(edit.camera) && `- Cámara: ${edit.camera.length ? edit.camera.map((c) => CAMERA_MOVES.find((m) => m.id === c)?.name || c).join(', ') : 'sin movimientos, solo el zoom de fondo'}`]),
    sec('Sonido', [line('Música', vis.music || MUSIC_STYLES.find((m) => m.id === edit.music)?.name), line('Efectos', vis.sfx || (edit.sfx || []).join(', ')), '- Voz siempre encima. −14 LUFS.']),
    sec('Apertura y cierre', [line('Intro', vis.intro), line('Outro', vis.outro)]),
    sec('Marcas y logos', [logos.length && `- Logos: ${logos.join(', ')} (en Mi estilo/logos/). Nunca recreados.`]),
    sec('Prohibido', [...notesFor({ config, edit }).map((n) => `- ${n}`)]),
    vis.references ? sec('Referencias', [`- ${vis.references}`]) : '',
  ].filter((x) => x !== '').join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

// ---------- Importar ----------

/**
 * Lee un `marcas/<marca>.json` de la skill y devuelve los campos de «Estilo de edición».
 * El archivo entero se guarda en `raw` para conservar al exportar lo que Content Studio no edita.
 */
export function parseMarcaJson(json, { fileName = '' } = {}) {
  const j = typeof json === 'string' ? JSON.parse(json) : json;
  if (!isObj(j)) throw new Error('El archivo no es un JSON de marca.');
  const fam = (x) => (isObj(x) ? x.familia || x.family || '' : x || '');
  const fu = isObj(j.fuentes) ? j.fuentes : {};
  const files = Array.isArray(fu.archivos) ? fu.archivos : [];
  const efectos = j.sonido?.efectos;
  return {
    file: fileName.replace(/\.json$/i, '') || slugify(j.nombre),
    roles: Object.fromEntries(COLOR_ROLES.map((r) => [r.id, j.colores?.[r.id] || '']).filter(([, v]) => v)),
    fonts: Object.fromEntries(FONT_ROLES.map((r) => [r.id, fam(fu[r.id])]).filter(([, v]) => v)),
    fontFiles: Object.fromEntries(files.filter((f) => f && fam(f)).map((f) => [fam(f), { peso: f.peso || '', archivo: f.archivo || '' }])),
    subtitles: {
      animacion: j.subtitulos?.animacion || '', mayusculas: j.subtitulos?.mayusculas ?? null,
      contorno: j.subtitulos?.contorno ?? null, sin_puntuacion: j.subtitulos?.sin_puntuacion ?? null,
    },
    cards: j.tarjetas?.estilo || '',
    camera: Array.isArray(j.zoom?.movimientos) ? j.zoom.movimientos : null,
    sfx: isObj(efectos?.tipos) ? Object.keys(efectos.tipos).slice(0, 3) : [],
    music: typeof j.sonido?.musica === 'string' ? j.sonido.musica : '',
    graphicsAllowed: Array.isArray(j.graficos_permitidos) ? j.graficos_permitidos : [],
    // La línea de palabras prohibidas la añade Content Studio desde la comunicación de la marca: no se duplica.
    never: (Array.isArray(j.notas) ? j.notas : String(j.notas || '').split('\n')).filter((l) => l && !/^Nunca en pantalla ni en subtítulos:/.test(l)).join('\n'),
    corrections: correctionsText(j.correcciones),
    raw: j, importedAt: new Date().toISOString(),
  };
}

// ---------- La guía que ya tiene la skill ----------
// La guía de la skill (`Reglas-de-estilo-<Marca>.md`) crece con cada reel («Aprendido en los reels») y lleva medidas
// afinadas a mano. Nunca se sustituye: Content Studio solo mantiene un bloque marcado al final, que reescribe en cada
// descarga sin tocar lo demás.

export const GUIDE_START = '<!-- content-studio:inicio (este bloque lo reescribe Content Studio; edita la marca allí) -->';
export const GUIDE_END = '<!-- content-studio:fin -->';
export const GUIDE_MAX = 40000; // cabe en una celda de Google Sheets

/** El bloque de Content Studio para añadir a una guía existente: lo de la marca que la guía no tiene por qué saber. */
export function buildGuideBlock({ brand, config, assets = [] }) {
  const full = buildStyleGuide({ brand, config, assets }).split('\n').slice(1).join('\n').trim();
  const body = full.replace(/^## /gm, '### ');
  return `${GUIDE_START}
## Desde Content Studio
Datos de la ficha de la marca en Content Studio. Para lo visual afinado en los reels (medidas, tiempos, posiciones), manda lo
escrito más arriba en esta guía.

${body}
${GUIDE_END}`;
}

/** Guía final: la existente con el bloque de Content Studio puesto al día (o la generada entera si no hay ninguna). */
export function mergeStyleGuide(existing, { brand, config, assets = [] }) {
  const ex = String(existing || '').replace(/\r/g, '').trim();
  if (!ex) return buildStyleGuide({ brand, config, assets });
  const block = buildGuideBlock({ brand, config, assets });
  const i = ex.indexOf(GUIDE_START); const j = ex.indexOf(GUIDE_END);
  if (i !== -1 && j > i) return `${ex.slice(0, i).trimEnd()}\n\n${block}\n${ex.slice(j + GUIDE_END.length).trim() ? `\n${ex.slice(j + GUIDE_END.length).trim()}\n` : ''}`;
  return `${ex}\n\n${block}\n`;
}

/** Quita el bloque de Content Studio de una guía (para guardar solo lo que escribió la skill o el usuario). */
export const stripGuideBlock = (md) => {
  const s = String(md || ''); const i = s.indexOf(GUIDE_START); const j = s.indexOf(GUIDE_END);
  return i !== -1 && j > i ? `${s.slice(0, i).trimEnd()}\n${s.slice(j + GUIDE_END.length)}`.trim() : s.trim();
};
