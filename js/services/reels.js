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
    file: '', status: '', roles: {}, fonts: {}, fontWeights: {}, subtitles: { animacion: '', mayusculas: null, contorno: null, sin_puntuacion: null },
    cards: '', camera: null, sfx: [], music: '', graphicsAllowed: [], never: '', corrections: '', raw: null, importedAt: '',
    guide: '', guideImportedAt: '', guideLinked: false, // la guía que ya tenía la skill (sin el bloque de Content Studio)
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
  const fontFor = (role) => edit.fonts?.[role] || '';
  const ours = {
    // El nombre y la guía que ya tenga la skill se respetan (p. ej. «Reglas-de-estilo.md» de la marca personal).
    nombre: raw.nombre || brand.name,
    estado: edit.status || autoStatus(edit),
    // La guía solo se nombra si existe: la tenía la skill, se importó, se descargó desde aquí o la marca es nueva.
    guia: raw.guia || edit.guide || edit.guideLinked || !edit.raw ? guideFileName(brand, config) : '',
    colores: clean(Object.fromEntries(COLOR_ROLES.map((r) => [r.id, edit.roles?.[r.id] || '']))),
    subtitulos: clean({
      animacion: edit.subtitles?.animacion || '',
      mayusculas: edit.subtitles?.mayusculas ?? null,
      contorno: edit.subtitles?.contorno ?? null,
      sin_puntuacion: edit.subtitles?.sin_puntuacion ?? null,
    }),
    tarjetas: clean({ estilo: edit.cards || '' }),
  };
  // Fuentes, como en la skill: cada uso es {familia, peso} (la clave, además, su ancho de letra) y `archivos` tiene un
  // .woff2 por familia y peso, en Mi estilo/tipografias/.
  if (FONT_ROLES.some((r) => fontFor(r.id))) {
    const keep = isObj(raw.fuentes) ? raw.fuentes : {};
    const role = (id) => {
      const fam = fontFor(id); if (!fam) return null;
      const prev = isObj(keep[id]) ? keep[id] : {};
      const peso = Number(edit.fontWeights?.[id]) || (prev.familia === fam ? prev.peso : null) || null;
      const o = { ...prev, familia: fam };
      if (peso) o.peso = peso; else delete o.peso;
      if (id === 'clave') { if (prev.familia !== fam || !prev.ancho_car) { const w = charWidth(fam, peso); if (w) o.ancho_car = w; else delete o.ancho_car; } }
      return o;
    };
    const roles = Object.fromEntries(FONT_ROLES.map((r) => [r.id, role(r.id)]).filter(([, v]) => v));
    const archivos = Array.isArray(keep.archivos) ? keep.archivos.map((a) => ({ ...a })) : [];
    Object.values(roles).forEach((r) => {
      // Un uso sin peso (como «tarjeta» en la skill) usa el archivo que ya tenga esa familia.
      if (!r.peso && archivos.some((a) => a.familia === r.familia)) return;
      const peso = r.peso || 400;
      if (!archivos.some((a) => a.familia === r.familia && Number(a.peso || 400) === peso)) archivos.push({ familia: r.familia, peso, archivo: fontFile(r.familia, peso) });
    });
    ours.fuentes = { ...roles, archivos };
  }
  if (Array.isArray(edit.camera)) ours.zoom = { movimientos: edit.camera };
  if (edit.sfx?.length || edit.music) {
    const efectos = edit.sfx?.length ? { activo: true, tipos: Object.fromEntries(edit.sfx.slice(0, 3).map((t) => [t, {}])) } : undefined;
    ours.sonido = clean({ musica: edit.music || '', efectos });
  }
  if (edit.graphicsAllowed?.length) ours.graficos_permitidos = edit.graphicsAllowed;
  const corr = { ...(isObj(raw.correcciones) ? raw.correcciones : {}), ...parseCorrections(edit.corrections) };
  if (Object.keys(corr).length) ours.correcciones = corr;
  // Las notas de la skill (ahí guarda lo aprendido en cada reel) nunca se pierden: se suman a las de Content Studio.
  const rawNotes = (Array.isArray(raw.notas) ? raw.notas : String(raw.notas || '').split('\n')).map((x) => String(x).trim()).filter((l) => l && !AUTO_NOTE.test(l));
  const notas = [...new Set([...rawNotes, ...notesFor({ brand, config, edit })])];
  if (notas.length) ours.notas = notas; // en la skill, siempre una lista
  const out = deepMerge(raw, clean(ours));
  // `fuentes` se reescribe entera (con lo conservado ya dentro) para que no queden usos de más.
  if (ours.fuentes) out.fuentes = { ...(isObj(raw.fuentes) ? raw.fuentes : {}), ...ours.fuentes };
  // Los efectos se reemplazan enteros para no dejar tipos de más.
  if (ours.sonido?.efectos && isObj(out.sonido)) out.sonido.efectos = deepMerge(isObj(raw.sonido?.efectos) ? { ...raw.sonido.efectos, tipos: {} } : {}, ours.sonido.efectos);
  return out;
}

/** Estado de la marca en la skill: pendiente (nada definido), por confirmar (a medias) o definida. */
export function autoStatus(edit) {
  const miss = missingForSkill(edit);
  return miss.length === 4 ? 'pendiente' : miss.length ? 'por confirmar' : 'definida';
}
export const STATUSES = [
  { id: 'definida', name: 'Definida', desc: 'La skill la usa sin preguntar el estilo.' },
  { id: 'por confirmar', name: 'Por confirmar', desc: 'Borrador: la skill lo dice y abre el editor en vivo para que la confirmes.' },
  { id: 'pendiente', name: 'Pendiente', desc: 'Sin estilo: la skill no inventa colores ni fuentes y ofrece crearlo con referencias.' },
];

/** Nombre del .woff2 con la convención de la skill: «montserrat-800.woff2». */
export const fontFile = (fam, peso = 400) => `${slugify(fam)}-${peso || 400}.woff2`;
/** Ancho medio de letra de la palabra clave (de la guía de la skill): Anton 0.47, Montserrat 800 0.72. */
const CHAR_WIDTH = { anton: { any: 0.47 }, montserrat: { 800: 0.72, 900: 0.74, 700: 0.69 } };
function charWidth(fam, peso) { const t = CHAR_WIDTH[slugify(fam)]; return t ? t[peso] ?? t.any ?? null : null; }

const guideName = (brand) => String(brand.name || 'Marca').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'Marca';
export const marcaFileName = (brand, config) => `${editOf(config).file || slugify(brand.name)}.json`;
export const guideFileName = (brand, config) => {
  const g = config && editOf(config).raw?.guia;
  return typeof g === 'string' && /\.md$/i.test(g) ? g : `Reglas-de-estilo-${guideName(brand)}.md`;
};

const AUTO_NOTE = /^Nunca en pantalla ni en subtítulos:/;
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
  const efectos = j.sonido?.efectos;
  return {
    file: fileName.replace(/\.json$/i, '') || slugify(j.nombre),
    roles: Object.fromEntries(COLOR_ROLES.map((r) => [r.id, j.colores?.[r.id] || '']).filter(([, v]) => v)),
    fonts: Object.fromEntries(FONT_ROLES.map((r) => [r.id, fam(fu[r.id])]).filter(([, v]) => v)),
    fontWeights: Object.fromEntries(FONT_ROLES.map((r) => [r.id, isObj(fu[r.id]) && fu[r.id].peso ? String(fu[r.id].peso) : '']).filter(([, v]) => v)),
    status: STATUSES.some((x) => x.id === j.estado) ? j.estado : '',
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

// ---------- El encargo de cada video ----------
// Al enviar un contenido a edición se crea `Reels/AAAA-MM-DD · <tema>/` con:
//   proyecto.json                 lo que la skill pregunta en su entrevista, ya respondido (+ `contenido`: el id CNT-…)
//   trabajo/guion-aprobado.md     el guion aprobado, sección a sección
//   trabajo/propuesta-graficos.md la tabla «Lo que dice · Qué aparece» con los tipos reales de la skill
//   trabajo/vocab.txt             nombres propios para la transcripción (transcribe.py --vocab)
// La toma se copia a `Tomas/CNT-… toma1.mov`: el id en el nombre la liga a su contenido.

export const PRESETS = { sin: [0, 0], pocos: [3, 1], equilibrado: [5, 2], muchos: [8, 3] };
/** De los tipos de recurso de Content Studio a los nombres de la skill (gráfico o escena de animar-reels-claude). */
export const SKILL_NAME = {
  'escena-mapa': 'escena · mapa', 'escena-iconos': 'escena · lista_iconos', 'escena-cifra': 'escena · cifra', 'escena-comparar': 'escena · comparar',
  'escena-mecanismo': 'escena · mecanismo', 'escena-objeto': 'escena · objeto', 'escena-3d': 'escena · pieza3d', 'escena-foto': 'escena · foto',
  camara: 'cámara (plan.py camara)', broll: 'toma de apoyo (marco o toma)',
};
// Los valores que escribe la propia skill en proyecto.json (comprobado con sus reels).
export const TIPO = { cabeza: 'cabeza parlante', producto: 'voz en off + imagenes de producto', animado: 'animacion' };
/** Formato de animar-reels-claude según la duración: corto 30-45 s · medio 50-70 · largo 70-95 · extendido 100-120. */
export const animFormat = (sec) => (!sec || sec <= 47 ? 'corto' : sec <= 72 ? 'medio' : sec <= 97 ? 'largo' : 'extendido');

const fileSafe = (t) => String(t || '').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** «2026-11-23 · Café quemado en la italiana» (como las carpetas que crea la skill). */
export const reelFolderName = (idea, date = new Date()) => `${localDate(date)} · ${fileSafe(idea.title).slice(0, 60) || idea.id}`;
/** «CNT-abc toma1.mov»: el id del contenido delante para encontrar sus tomas. */
export const takeName = (ideaId, n, ext) => `${ideaId} toma${n}.${String(ext || 'mov').replace(/^\./, '').toLowerCase()}`;
export const takesOf = (ideaId, files) => files.filter((f) => f.kind === 'file' && f.name.startsWith(`${ideaId} `) && /\.(mov|mp4|m4v|mkv|webm|avi|mts)$/i.test(f.name));
export const finalOf = (files) => files.find((f) => f.kind === 'file' && /^FINAL\b.*\.mp4$/i.test(f.name)) || null;
/** Qué skill hace el video. */
export const skillFor = (production) => (production === 'animado' ? 'animar-reels-claude' : 'editar-reels-claude');

/** Opciones del video que la skill pregunta en su entrevista (con lo que sugiere el guion). */
export function defaultVideoOpts({ idea, script }) {
  const sd = script || {};
  const production = sd.productionType || idea.productionType || 'cabeza';
  const kinds = (sd.sections || []).map((s) => s.resource?.type).filter(Boolean);
  return {
    production, graphics: sd.graphics || 'equilibrado',
    scenes: production === 'animado' ? 'video' : kinds.some((k) => String(k).startsWith('escena-')) ? 'algunas' : 'ninguna',
    behind: production === 'cabeza' && kinds.includes('detras'),
    music: 'marca', editor: true, review: 'guiada', voice: 'grabada', platform: (idea.platforms || [])[0] || 'instagram',
  };
}

/** proyecto.json del reel. Las claves son las que crea la skill en su paso 1; `contenido` y `content_studio` son nuestras. */
export function buildProyecto({ idea, brand, config, opts, take = '', durationSec = 0 }) {
  const edit = editOf(config);
  const [flotantes, pantalla] = PRESETS[opts.graphics] || PRESETS.equilibrado;
  const p = {
    toma: take, marca: edit.file || slugify(brand.name), tipo: TIPO[opts.production] || TIPO.cabeza,
    resolucion: '1080', revision: opts.review || 'guiada', con_graficos: opts.graphics !== 'sin', flotantes, pantalla,
    detras: !!opts.behind && opts.production === 'cabeza',
    // «La de la marca» sin música elegida en Content Studio: la decide el archivo de la marca en la skill.
    musica: opts.music === 'marca' ? (edit.music || undefined) : opts.music || 'ninguna',
    red: opts.platform || 'instagram', editor: !!opts.editor,
    contenido: idea.id,
    content_studio: {
      skill: skillFor(opts.production), escenas: opts.scenes, guion: 'trabajo/guion-aprobado.md', propuesta: 'trabajo/propuesta-graficos.md', vocab: 'trabajo/vocab.txt',
      ...(opts.production === 'animado' ? { voz: opts.voice || 'grabada' } : {}),
      creado: new Date().toISOString(),
    },
  };
  if (p.musica === undefined) delete p.musica;
  // crear.py (animar-reels-claude) lee «voz» y «formato» de proyecto.json. «voz_aprobada» la pone la skill tras oír la muestra.
  if (opts.production === 'animado') { p.voz = opts.voice || 'grabada'; p.formato = animFormat(durationSec); }
  return p;
}

/** El guion aprobado en Markdown, para leerlo en la skill (y para grabar). */
export function buildGuionMd({ idea, brand, script }) {
  const s = script || {}; const h = s.hook || {};
  const cell = (t) => String(t || '').replace(/\|/g, '/').replace(/\n+/g, ' ').trim();
  const rows = (s.sections || []).map((x, i) => `| ${i + 1} | ${cell(x.beat || x.act)} | ${cell(x.voice)} | ${cell(x.onScreenText)} | ${cell(x.visual)} | ${cell(x.edit)} |`);
  return [
    `# ${idea.title}`, '',
    `Contenido ${idea.id} · ${brand.name}`, s.promise && `Promesa: ${s.promise}`, '',
    '## Gancho (0-3 s)',
    `- Dice: «${h.narrado || ''}»`, h.textual && `- Texto del primer cuadro: ${h.textual}`, h.visual && `- Primer cuadro: ${h.visual}`, h.auditivo && `- Sonido: ${h.auditivo}`, '',
    '## Guion',
    '| # | Parte | Voz (lo que se dice) | Texto en pantalla | Visual | Edición |', '|---|---|---|---|---|---|', ...rows, '',
    s.cta?.text && `## CTA\n- «${s.cta.text}»${s.cta.visual ? ` · ${s.cta.visual}` : ''}`,
    (s.verify || []).filter((v) => v.claim).length ? `\n## Verificar antes de publicar\n${s.verify.filter((v) => v.claim).map((v) => `- ${v.claim}${v.reason ? ` (${v.reason})` : ''}`).join('\n')}` : '',
    s.visualNotes && `\n## Indicaciones visuales\n${s.visualNotes}`, s.editingNotes && `\n## Indicaciones de edición\n${s.editingNotes}`,
  ].filter((x) => x !== '' && x != null && x !== false).join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

/** La propuesta de gráficos, como la tabla que la skill enseña antes de construirlos. */
export function buildPropuestaMd({ script, opts }) {
  const s = script || {};
  const cell = (t) => String(t || '').replace(/\|/g, '/').replace(/\n+/g, ' ').trim();
  const [fl, pa] = PRESETS[opts?.graphics] || PRESETS.equilibrado;
  const rows = [];
  if (s.hook?.textual) rows.push(['0', `«${cell(s.hook.narrado)}»`, cell(s.hook.textual), 'gancho']);
  (s.sections || []).forEach((x, i) => { const r = x.resource || {}; if (r.type) rows.push([String(i + 1), `«${cell(r.anchor || x.voice.split(/[.!?]/)[0])}»`, cell(r.what), SKILL_NAME[r.type] || r.type]); });
  if (s.cta?.text) rows.push(['fin', `«${cell(s.cta.text)}»`, cell(s.cta.visual || s.cta.text), 'cierre']);
  return [
    '# Propuesta de gráficos (de Content Studio)', '',
    'Es una propuesta hecha sobre el guion. Ánclala a las palabras reales de la toma (`plan.py resumen --palabras`), aplica',
    'las reglas de la skill (ninguna cifra que no se pronuncie, nada sobre la cara, zona segura) y enseña la tabla para aprobarla.', '',
    `Topes de este video: ${opts?.graphics === 'sin' ? 'sin gráficos' : `${fl} flotantes y ${pa} a pantalla completa`}.`, '',
    '| # | Lo que dice | Qué aparece | Tipo |', '|---|---|---|---|',
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n') + '\n';
}

/** Nombres propios para la transcripción: la marca, sus correcciones y la palabra clave del público. */
export function buildVocab({ idea, brand, config }) {
  const edit = editOf(config);
  const corr = { ...(isObj(edit.raw?.correcciones) ? edit.raw.correcciones : {}), ...parseCorrections(edit.corrections) };
  return [...new Set([brand.name, ...Object.values(corr), idea.keyword].map((x) => String(x || '').trim()).filter(Boolean))].join(', ') + '\n';
}

/** El mensaje para pegar en Claude Code. */
export function editMessage({ folderName, opts, take }) {
  const skill = skillFor(opts.production);
  return [
    `Usa la skill ${skill} con el reel «Reels/${folderName}».`,
    'Lo preparó Content Studio: su proyecto.json ya trae las respuestas de la entrevista (marca, tipo, gráficos, música, red, editor), así que no las vuelvas a preguntar; solo confírmalas en una frase.',
    take ? `La toma es «Tomas/${take}».` : 'La toma está en Tomas/ con el id del contenido delante del nombre.',
    'Lee trabajo/guion-aprobado.md antes de cortar y usa trabajo/vocab.txt en --vocab al transcribir.',
    'En la pasada de gráficos, parte de trabajo/propuesta-graficos.md: ánclala a las palabras reales y enséñame la tabla antes de construir.',
  ].join('\n');
}

/** Lo que se dijo de verdad, desde el plan de la skill (sus subtítulos), para los copies. */
export function spokenFromPlan(plan) {
  const subs = Array.isArray(plan?.subtitulos) ? plan.subtitulos : [];
  return subs.map((s) => s.frase || (s.palabras || []).map((w) => w.w).join(' ')).filter(Boolean).join(' ').replace(/[*|]/g, '').replace(/\s+/g, ' ').trim();
}
