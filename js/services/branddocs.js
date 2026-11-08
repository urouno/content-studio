// Documentos de referencia de cada marca (Markdown). Son el contexto fijo que recibe la IA al
// generar ideas, guiones, hooks, copies, evaluaciones e investigación. Ver docs/DOCUMENTOS_DE_MARCA.md.
//
// Cada marca recibe el mismo juego de documentos base (plantillas) y puede:
//   - editar todo su contenido (es lo que define la identidad y la estrategia de la marca),
//   - decidir si cada documento se usa como contexto y en qué tareas de IA,
//   - añadir documentos propios (por ejemplo, un lanzamiento o un protocolo del sector).
// Las indicaciones de la plantilla van en comentarios <!-- --> y nunca se envían a la IA.
import { store } from '../core/store.js';

// Tareas de IA que pueden recibir documentos.
export const DOC_TASKS = [
  { id: 'ideas', name: 'Ideas' },
  { id: 'guion', name: 'Guiones' },
  { id: 'hooks', name: 'Hooks y CTA' },
  { id: 'copies', name: 'Copies' },
  { id: 'evaluacion', name: 'Evaluación' },
  { id: 'investigacion', name: 'Investigación' },
  { id: 'analisis', name: 'Análisis de resultados' },
];
const ALL_TASKS = DOC_TASKS.map((t) => t.id);

export const DOC_TIERS = {
  esencial: { name: 'Esencial', desc: 'Sin él la IA generará contenido genérico.' },
  recomendado: { name: 'Recomendado', desc: 'Mejora mucho la precisión y la coherencia.' },
  tactico: { name: 'Táctico', desc: 'Cambia a menudo: revísalo en cada campaña o mes.' },
};

const s = (title, hint, prefill) => ({ title, hint, prefill });

// Orden = prioridad dentro del presupuesto de contexto (lo primero nunca se recorta).
export const DOC_TEMPLATES = [
  {
    type: 'reglas', title: 'Reglas, límites y temas sensibles', tier: 'esencial', cadence: 'Cuando cambie la normativa o haya un incidente',
    purpose: 'Lo que la marca NUNCA puede decir o hacer. Tiene prioridad sobre cualquier otro documento.',
    tasks: ALL_TASKS,
    sections: [
      s('Afirmaciones prohibidas', 'Promesas, garantías o claims que no se pueden hacer (p. ej. "resultados garantizados", "sin dolor", "cura"). Una por línea.'),
      s('Temas vetados', 'Temas, polémicas, marcas o personas que no se tocan.'),
      s('Requisitos legales y del sector', 'Normativa publicitaria, sanitaria, financiera, de menores, sorteos, etc. Avisos o disclaimers obligatorios y cuándo usarlos.'),
      s('Datos que siempre hay que verificar', 'Precios, plazos, cifras, estudios… Quién los valida antes de publicar.'),
      s('Tratamiento de clientes y terceros', 'Uso de imagen de clientes, testimonios, menciones a competidores, permisos necesarios.'),
    ],
  },
  {
    type: 'oferta', title: 'Productos, servicios y oferta', tier: 'esencial', cadence: 'Cada vez que cambie el catálogo o los precios',
    purpose: 'Fuente de verdad de lo que la marca vende. La IA no debe mencionar nada que no esté aquí.',
    tasks: ['ideas', 'guion', 'hooks', 'copies', 'evaluacion', 'investigacion'],
    sections: [
      s('Catálogo', 'Por cada producto o servicio: nombre, para quién es, qué incluye, características verificadas, precio o rango, formato y disponibilidad.', (b) => b.products),
      s('Beneficios por producto', 'Traduce cada característica a lo que gana el cliente (característica → ventaja → beneficio).'),
      s('Producto estrella y producto de entrada', 'Qué se quiere vender más y cuál es la primera compra natural (consulta gratuita, muestra, curso corto…).'),
      s('Condiciones', 'Envíos, plazos, garantías, devoluciones, formas de pago, zona de servicio.'),
      s('Lo que NO ofrecemos', 'Servicios que la gente pregunta pero la marca no da. Evita que la IA los invente.'),
    ],
  },
  {
    type: 'identidad', title: 'Identidad y posicionamiento', tier: 'esencial', cadence: 'Anual o ante un cambio de estrategia',
    purpose: 'Quién es la marca, por qué existe y qué lugar quiere ocupar en la mente de su público.',
    tasks: ALL_TASKS,
    sections: [
      s('Historia y propósito', 'Cómo nació, por qué existe más allá de vender, quién hay detrás.', (b) => b.description),
      s('Misión, visión y valores', 'Valores con un ejemplo de cómo se demuestran en el día a día (no solo la palabra).'),
      s('Posicionamiento', 'Frase: "Para [público] que [necesidad], [marca] es [categoría] que [beneficio principal] porque [prueba]".', (b) => b.valueProp),
      s('Diferenciales', 'Lo que la marca hace distinto y puede demostrar. Ordénalos de más a menos importante.'),
      s('Personalidad de marca', 'Si la marca fuera una persona: 3–5 rasgos, arquetipo (sabio, cuidador, rebelde…) y lo que NO es.'),
    ],
  },
  {
    type: 'buyer', title: 'Buyer persona', tier: 'esencial', cadence: 'Semestral o cuando aprendas algo nuevo del cliente',
    purpose: 'A quién le habla la marca, descrito con hechos y con sus propias palabras. Puedes incluir varios perfiles.',
    tasks: ALL_TASKS,
    sections: [
      s('Perfil principal', 'Nombre ficticio, edad, situación, ocupación, dónde vive, nivel de conocimiento del tema (0 a 3).', (b) => b.audience),
      s('Situación y contexto', 'Qué está pasando en su vida cuando necesita a la marca. Momento del día, lugar, con quién.'),
      s('Objetivos y motivaciones', 'Qué quiere conseguir y por qué. Qué significa el éxito para esta persona.'),
      s('Cómo decide y compra', 'Qué investiga, en quién confía, qué compara, quién influye, cuánto tarda en decidir y qué le hace comprar.'),
      s('Consumo de contenido', 'Redes que usa, formatos y creadores que sigue, a qué hora, qué le hace guardar o compartir un video.'),
      s('Cómo habla', 'Palabras y expresiones literales que usa (de comentarios, reseñas, mensajes). Muy útil para hooks y búsquedas.'),
      s('Perfiles secundarios', 'Otros públicos relevantes (quien paga vs. quien usa, clientes de empresa…) con 2–3 líneas cada uno.'),
    ],
  },
  {
    type: 'dolores', title: 'Puntos de dolor, deseos y objeciones', tier: 'esencial', cadence: 'Trimestral; añade lo que salga en comentarios y ventas',
    purpose: 'Materia prima de las ideas: los problemas reales del cliente, lo que desea y lo que le frena a comprar.',
    tasks: ['ideas', 'guion', 'hooks', 'copies', 'evaluacion', 'investigacion'],
    sections: [
      s('Dolores principales', 'Un dolor por línea, con las palabras del cliente. Indica si es funcional, emocional o económico y qué tan urgente es.', (b) => b.painPoints),
      s('Consecuencias de no resolverlo', 'Qué le pasa al cliente si sigue igual. Ayuda a dar tensión al guion.'),
      s('Deseos y resultado soñado', 'Qué quiere sentir o lograr. El "después" que la marca puede ofrecer de forma realista.'),
      s('Objeciones y miedos', 'Por qué no compra: precio, confianza, tiempo, "no es para mí", malas experiencias previas…'),
      s('Preguntas frecuentes reales', 'Preguntas literales de clientes (DMs, comentarios, mostrador, buscador). Cada una puede ser un video.'),
      s('Mitos y errores comunes', 'Creencias equivocadas del público que la marca puede corregir con autoridad.'),
    ],
  },
  {
    type: 'discurso', title: 'Discurso comercial', tier: 'esencial', cadence: 'Trimestral o con cada cambio de oferta',
    purpose: 'Cómo argumenta la marca para vender sin parecer un anuncio: mensajes clave, pruebas y respuesta a objeciones.',
    tasks: ['ideas', 'guion', 'hooks', 'copies', 'evaluacion'],
    sections: [
      s('Promesa principal', 'La transformación que la marca promete, en una frase que el cliente entendería.'),
      s('Mensajes clave', '3–5 ideas que la marca repite siempre. Cada una con su prueba (dato, caso, demostración).'),
      s('Argumentario por producto', 'Para cada producto: problema que resuelve, por qué esta marca, prueba, y cómo se presenta en un video.'),
      s('Respuesta a objeciones', 'Objeción → respuesta honesta → prueba. Enlaza con el documento de dolores.'),
      s('Llamadas a la acción y siguiente paso', 'Qué se le pide al público según la etapa (seguir, guardar, escribir por DM, reservar, comprar) y la palabra clave o enlace a usar.'),
      s('Frases que sí y frases que no', 'Formulaciones aprobadas y otras que suenan a venta agresiva o prometen de más.'),
    ],
  },
  {
    type: 'foco', title: 'Foco comercial actual', tier: 'tactico', cadence: 'Mensual o en cada campaña',
    purpose: 'Qué hay que empujar ahora. Es el documento que más se modifica: lanzamientos, promociones y prioridades del periodo.',
    tasks: ['ideas', 'guion', 'hooks', 'copies', 'analisis'],
    sections: [
      s('Objetivo del periodo', 'Qué se quiere lograr este mes o campaña (ventas de X, reservas, seguidores, lista de espera…) y cómo se mide.', (b) => b.businessGoals),
      s('Productos o servicios a priorizar', 'Qué se empuja y por qué ahora.'),
      s('Promociones, lanzamientos y fechas', 'Fechas exactas, condiciones, plazas, códigos, stock. Lo que no esté aquí no se menciona.'),
      s('Estacionalidad y fechas clave', 'Temporadas, festivos y eventos del sector que conviene aprovechar.'),
      s('Lo que NO toca ahora', 'Productos agotados, servicios en pausa o mensajes que se dejan de usar.'),
    ],
  },
  {
    type: 'voz', title: 'Voz, tono y estilo', tier: 'recomendado', cadence: 'Semestral',
    purpose: 'Cómo suena la marca. Amplía los campos de la pestaña Comunicación con ejemplos y matices.',
    tasks: ['guion', 'hooks', 'copies', 'evaluacion'],
    sections: [
      s('Cómo sonamos', 'Rasgos de la voz con un ejemplo de frase para cada uno ("cercana: como un amigo que sabe del tema").'),
      s('Tono según la situación', 'Cómo cambia el tono al educar, vender, responder críticas, contar algo personal o hablar de temas delicados.'),
      s('Vocabulario propio', 'Palabras de la marca, cómo se llama a los clientes y a los productos, muletillas o expresiones características.'),
      s('Lo que evitamos', 'Palabras, tecnicismos, anglicismos, emojis o recursos que no encajan.'),
      s('Ejemplos de referencia', 'Fragmentos de guiones o captions aprobados que representen bien la voz (y uno que no, explicando por qué).'),
    ],
  },
  {
    type: 'editorial', title: 'Líneas editoriales y temas', tier: 'recomendado', cadence: 'Trimestral',
    purpose: 'De qué habla la marca y con qué enfoque. Complementa los pilares de la pestaña Pilares y estrategia.',
    tasks: ['ideas', 'guion', 'investigacion', 'analisis'],
    sections: [
      s('Territorios de contenido', 'Para cada pilar: qué temas incluye, el enfoque propio de la marca y su objetivo (alcance, confianza, conversión…).'),
      s('Temas que funcionan', 'Temas y formatos que ya han dado buen resultado (enlaza con Resultados).'),
      s('Temas a explorar', 'Ideas nuevas o formatos experimentales (el 20 %).'),
      s('Series y formatos recurrentes', 'Secciones fijas, personajes, frases de apertura o cierre propias.'),
      s('Enfoque por etapa del embudo', 'Qué tipo de contenido se usa para atraer, generar confianza y convertir.'),
    ],
  },
  {
    type: 'pruebas', title: 'Pruebas, casos y testimonios', tier: 'recomendado', cadence: 'Cada vez que haya un caso o dato nuevo',
    purpose: 'Evidencias verificadas que la IA puede usar para respaldar lo que dice. Solo hechos comprobados.',
    tasks: ['ideas', 'guion', 'copies', 'evaluacion'],
    sections: [
      s('Datos y cifras verificadas', 'Años, clientes atendidos, valoraciones, premios… con la fuente y la fecha.'),
      s('Casos de clientes', 'Situación inicial → qué se hizo → resultado. Indica si hay permiso para mencionarlo.'),
      s('Testimonios y reseñas', 'Frases literales de clientes con su origen (Google, DM, encuesta) y si se pueden citar.'),
      s('Certificaciones, formación y autoridad', 'Títulos, colegiaturas, colaboraciones, apariciones en medios.'),
      s('Demostraciones posibles', 'Pruebas que se pueden enseñar en video (antes/después, comparativas, procesos).'),
    ],
  },
  {
    type: 'competencia', title: 'Competencia y diferenciación', tier: 'recomendado', cadence: 'Semestral',
    purpose: 'Con quién compara el cliente a la marca y cómo destacar sin copiar ni atacar.',
    tasks: ['ideas', 'guion', 'investigacion', 'analisis'],
    sections: [
      s('Competidores directos e indirectos', 'Nombre, qué ofrecen, a qué precio, cómo comunican y qué contenido les funciona.'),
      s('Alternativas del cliente', 'Qué hace el cliente si no compra a nadie (hacerlo él mismo, no hacer nada, una opción más barata).'),
      s('Huecos y oportunidades', 'Temas o enfoques que la competencia no cubre o cubre mal.'),
      s('Cómo nos diferenciamos', 'Por qué elegir esta marca frente a cada alternativa, con pruebas.'),
      s('Qué no copiar', 'Formatos o mensajes de la competencia que no encajan con la marca.'),
    ],
  },
];

export const templateFor = (type) => DOC_TEMPLATES.find((t) => t.type === type) || null;

/** Markdown de una plantilla, rellenando con los datos de la ficha de la marca cuando existen. */
export function templateMarkdown(type, brand = {}) {
  const t = templateFor(type);
  if (!t) return '';
  const parts = [`# ${t.title}`, '', `<!-- ${t.purpose} -->`, ''];
  for (const sec of t.sections) {
    parts.push(`## ${sec.title}`, `<!-- ${sec.hint} -->`);
    const pre = sec.prefill?.(brand);
    if (pre && String(pre).trim()) parts.push(String(pre).trim());
    parts.push('');
  }
  return parts.join('\n');
}

// Id determinista por marca y tipo: si dos dispositivos crean los documentos base a la vez,
// generan el mismo registro (no duplicados).
export function baseDocId(brandId, type) {
  const key = String(brandId).split('-').slice(1).join('').toLowerCase().replace(/[^a-z0-9]/g, '') || 'x';
  return `DOC-${key}-${type}`;
}

export const docsFor = (brandId) => store.all('brandDocs', { brandId })
  .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.title).localeCompare(String(b.title)));

/** Crea los documentos base que falten (idempotente). */
export async function ensureBrandDocs(brandId) {
  const brand = store.get('brands', brandId) || {};
  const existing = store.all('brandDocs', { brandId });
  const deleted = store.all('brandDocs', { brandId, deleted: true });
  let created = 0;
  for (const [i, t] of DOC_TEMPLATES.entries()) {
    if (existing.some((d) => d.docType === t.type) || deleted.some((d) => d.docType === t.type)) continue;
    const id = baseDocId(brandId, t.type);
    if (store.getAny('brandDocs', id)) continue;
    await store.create('brandDocs', { id, brandId, docType: t.type, title: t.title, content: templateMarkdown(t.type, brand), active: true, order: i, tasks: null }, { silent: true });
    created++;
  }
  return created;
}

export async function createCustomDoc(brandId, { title = 'Documento nuevo', content = '' } = {}) {
  const max = Math.max(100, ...store.all('brandDocs', { brandId }).map((d) => Number(d.order) || 0));
  return store.create('brandDocs', { brandId, docType: 'custom', title, content: content || `# ${title}\n\n`, active: true, order: max + 1, tasks: null });
}

export const docTasks = (doc) => (Array.isArray(doc.tasks) ? doc.tasks : templateFor(doc.docType)?.tasks || ALL_TASKS);

// ---------- Limpieza y métricas ----------

/** Quita comentarios de plantilla y secciones vacías. Devuelve '' si el documento no tiene contenido real. */
export function cleanDoc(md) {
  const noComments = String(md || '').replace(/\r/g, '').replace(/[ \t]*<!--[\s\S]*?-->[ \t]*\n?/g, '');
  const lines = noComments.split('\n');
  // Una cabecera se conserva solo si debajo (hasta la siguiente cabecera de su nivel o superior) hay texto.
  const level = (l) => (/^(#{1,6})\s/.exec(l)?.[1].length || 0);
  const keep = lines.map((l, i) => {
    const lv = level(l);
    if (!lv) return true;
    for (let j = i + 1; j < lines.length; j++) {
      const lj = level(lines[j]);
      if (lj && lj <= lv) return false;
      if (!lj && lines[j].trim()) return true;
    }
    return false;
  });
  const out = lines.filter((_, i) => keep[i]).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return out.replace(/^#{1,6}\s.*$/gm, '').trim() ? out : '';
}

/** Porcentaje de secciones (##) con contenido. */
export function docCompleteness(md) {
  const text = String(md || '').replace(/<!--[\s\S]*?-->/g, '');
  const chunks = text.split(/^##\s.*$/m).slice(1);
  if (!chunks.length) return cleanDoc(md) ? 1 : 0;
  return chunks.filter((c) => c.replace(/^#{1,6}\s.*$/gm, '').trim()).length / chunks.length;
}

// ---------- Contexto para la IA ----------

export const DOC_LIMITS = { perDoc: 8000, total: 30000 };

/**
 * Documentos activos de la marca para una tarea, limpios y dentro del presupuesto de caracteres.
 * @returns {{ text: string, used: Array<{id,title,chars,truncated}>, skipped: Array<{id,title,reason}>, chars: number }}
 */
export function docsContext(brandId, task, { docs = null, limits = DOC_LIMITS } = {}) {
  const list = docs || docsFor(brandId);
  const used = []; const skipped = []; const blocks = [];
  let total = 0;
  for (const d of list) {
    if (d.deletedAt) continue;
    if (d.active === false) { skipped.push({ id: d.id, title: d.title, reason: 'desactivado' }); continue; }
    if (task && !docTasks(d).includes(task)) continue;
    let body = cleanDoc(d.content).replace(/^#\s.*\n*/, '').trim();
    if (!body) { skipped.push({ id: d.id, title: d.title, reason: 'vacío' }); continue; }
    let truncated = false;
    if (body.length > limits.perDoc) { body = `${body.slice(0, limits.perDoc)}\n[…documento recortado por longitud]`; truncated = true; }
    if (total + body.length > limits.total) {
      const room = limits.total - total;
      if (room < 400) { skipped.push({ id: d.id, title: d.title, reason: 'sin espacio en el contexto' }); continue; }
      body = `${body.slice(0, room)}\n[…documento recortado por longitud]`; truncated = true;
    }
    total += body.length;
    used.push({ id: d.id, type: d.docType, title: d.title, chars: body.length, truncated });
    blocks.push(`### ${d.title}\n${body}`);
  }
  return { text: blocks.join('\n\n'), used, skipped, chars: total };
}

/** Tipos de documento base con contenido (para no repetir en el prompt los campos de resumen de la ficha). */
export function filledTypes(brandId) {
  return new Set(docsFor(brandId).filter((d) => d.active !== false && cleanDoc(d.content)).map((d) => d.docType));
}
