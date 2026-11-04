// Base de conocimiento compartida entre marcas (ver docs/METODOLOGIA.md).
// Las identidades de marca NUNCA se guardan aquí: viven en cada workspace.

export const PRINCIPLES = [
  'La estrategia precede al contenido: cada pieza tiene objetivo, etapa del embudo y tipo.',
  'La claridad precede a la complejidad: si no lo entiende alguien de 11 años, simplifícalo sin perder precisión.',
  'La retención no depende solo del hook: el desarrollo debe cumplir la promesa inicial.',
  'Las interacciones deben ser relevantes para el objetivo, no reacciones vacías.',
  'La identidad de marca se mantiene en tono, vocabulario y estilo visual.',
  'No inventes datos, especificaciones, resultados ni beneficios. Marca lo que deba verificarse.',
  'Céntrate en el problema de la audiencia, no en lo que la marca quiere decir.',
];

export const SCRIPT_RULES = [
  'Lenguaje oral y cotidiano; frases cortas (8–15 palabras), voz activa.',
  'Si el espectador se hace una pregunta, la siguiente frase la responde.',
  'Si una frase se puede quitar y se entiende igual, sobra.',
  'Cada frase cumple una función: contexto, problema, dato, característica, resultado, emoción, transición o CTA.',
  'Tres actos: inicio (contexto + problema), nudo (información ordenada con picos de atención crecientes), desenlace (resolución + CTA).',
  'Coloca los momentos más interesantes de forma creciente; si lo mejor está al final, anticípalo en el inicio.',
  'Usa ejemplos con objetos o situaciones cotidianas y analogías fáciles de visualizar.',
  'Un término técnico solo si es necesario: nómbralo una vez y explícalo enseguida con una comparación.',
  'Orden cronológico o paso a paso cuando expliques un proceso.',
  'Debe sonar natural al decirlo en voz alta; evita trabalenguas y frases escritas ("proceder", "cabe destacar").',
  'Un solo CTA principal, conectado con lo que se acaba de ver.',
  'El video debe entenderse solo, aunque sea la primera vez que alguien ve a la marca.',
];

export const KNOWLEDGE_LEVELS = [
  { id: 0, name: 'Nuevo', desc: 'Nunca ha oído del tema', rules: 'Cero tecnicismos. Analogía obligatoria. Una sola idea.' },
  { id: 1, name: 'Familiar', desc: 'Conoce el problema, no la solución', rules: 'Tecnicismos mínimos y explicados. Ejemplo cotidiano.' },
  { id: 2, name: 'Interesado', desc: 'Ha investigado y compara opciones', rules: 'Términos del sector explicados brevemente. Datos concretos verificables.' },
  { id: 3, name: 'Experto', desc: 'Profesional o aficionado avanzado', rules: 'Vocabulario técnico permitido. Profundidad. Evitar obviedades.' },
];

export const CONTENT_TYPES = [
  { id: 'venta', name: 'Venta / conversión', desc: 'Producto o servicio como solución a un problema concreto.' },
  { id: 'familiaridad', name: 'Familiaridad / autoridad', desc: 'Dudas resueltas, procesos, detrás de cámaras: genera confianza.' },
  { id: 'memorable', name: 'Memorable / emocional', desc: 'Historias, retos, causas: que te recuerden.' },
];

export const FUNNEL = [
  { id: 'tofu', name: 'Descubrimiento', goal: 'alcance' },
  { id: 'mofu', name: 'Consideración', goal: 'confianza' },
  { id: 'bofu', name: 'Decisión', goal: 'conversion' },
  { id: 'loyal', name: 'Comunidad', goal: 'comunidad' },
];

export const OBJECTIVES = [
  { id: 'alcance', name: 'Alcance', primary: ['views', 'reach', 'sendRate'], control: ['avgPct'] },
  { id: 'retencion', name: 'Retención', primary: ['avgPct', 'completion', 'retention3s'], control: ['durationSec'] },
  { id: 'interaccion', name: 'Interacción', primary: ['commentRate'], control: ['likeRate'] },
  { id: 'confianza', name: 'Confianza', primary: ['saveRate', 'profileVisits'], control: ['commentRate'] },
  { id: 'comunidad', name: 'Comunidad', primary: ['followsPer1k', 'commentRate'], control: ['sendRate'] },
  { id: 'conversion', name: 'Conversión', primary: ['inquiriesPer1k', 'conversionsPer1k', 'clicksPer1k'], control: ['views'] },
];

export const STRUCTURES = [
  { id: 'problema-solucion', name: 'Problema → solución', goal: ['conversion', 'confianza'],
    beats: ['Hook con el problema o situación del espectador', 'Por qué pasa (causa simple)', 'Solución paso a paso', 'Resultado / prueba', 'CTA'],
    when: 'Resolver un punto de dolor concreto. Ideal para "Si te pasa X…".' },
  { id: 'lista', name: 'Lista numerada (Top N)', goal: ['confianza', 'alcance'],
    beats: ['Promesa numérica con punto de dolor', 'Ítem 1: qué es, por qué importa, qué hacer', 'Ítems siguientes en intensidad creciente', 'El más sorprendente al final', 'CTA guardar / comentar'],
    when: 'Varios consejos, errores o productos. Cada ítem explicado, no solo nombrado.' },
  { id: 'paso-a-paso', name: 'Paso a paso / tutorial', goal: ['confianza'],
    beats: ['Promesa del resultado', 'Muestra el resultado o el problema', 'Paso 1…N en orden cronológico', 'Error frecuente a evitar', 'CTA guardar'],
    when: 'Procesos. Mantener orden cronológico y lenguaje de "primer paso".' },
  { id: 'mito-realidad', name: 'Mito vs. realidad', goal: ['alcance', 'interaccion'],
    beats: ['Creencia común', 'Giro: por qué es incorrecta', 'Evidencia o ejemplo cotidiano', 'Nueva regla práctica', 'CTA comentar'],
    when: 'Corregir una creencia extendida. Requiere evidencia verificable.' },
  { id: 'experimento', name: 'Experimento / prueba', goal: ['alcance', 'confianza'],
    beats: ['"Hemos cogido…" + lo que se va a probar', 'Hipótesis o expectativa', 'Prueba visible', 'Revelación del resultado', 'Lección + CTA'],
    when: 'Demostrar en vez de afirmar. Muy visual.' },
  { id: 'comparativa', name: 'Comparativa (X vs. Y)', goal: ['alcance', 'interaccion'],
    beats: ['"Esto es X y esto es Y"', 'Criterio de comparación', 'Diferencias clave en orden', 'Veredicto o prueba social', 'CTA "¿cuál eliges?"'],
    when: 'Dilemas de compra, versiones de producto, "¿esto o esto?".' },
  { id: 'historia', name: 'Historia con transformación', goal: ['comunidad', 'confianza'],
    beats: ['Situación inicial con conflicto', 'Qué estaba en juego', 'Proceso / obstáculos', 'Resolución (resultado visible)', 'Lección + CTA'],
    when: 'Contenido memorable, casos de clientes, antes/después con contexto.' },
  { id: 'auditoria', name: 'Auditoría / caso comparado', goal: ['conversion', 'confianza'],
    beats: ['Pregunta del cliente/espectador', 'Lo que no funciona (evidencia)', 'Referencia que sí funciona', 'Diagnóstico de la diferencia', 'Propuesta concreta + CTA de servicio'],
    when: 'Vender un servicio demostrando criterio profesional.' },
  { id: 'pregunta-frecuente', name: 'Pregunta frecuente', goal: ['confianza', 'alcance'],
    beats: ['La pregunta exacta del público', 'Respuesta corta directa', 'Explicación con ejemplo', 'Matiz o error común', 'CTA comentar dudas'],
    when: 'Dudas masivas del sector. Cuanto más común la duda, más alcance.' },
  { id: 'todo-saber', name: 'Todo lo que debes saber antes de…', goal: ['confianza', 'conversion'],
    beats: ['"Si estás pensando en X…"', 'Dato poco conocido 1', 'Dato 2', 'Dato 3 (el más importante)', 'CTA consulta / guardar'],
    when: 'Presentar un servicio. Decir cosas que nadie dice; lo genérico no funciona.' },
  { id: 'resultado-primero', name: 'Resultado primero', goal: ['alcance', 'conversion'],
    beats: ['Mostrar el resultado final', '"Así lo hicimos"', 'Proceso resumido con picos', 'Detalle diferencial', 'CTA'],
    when: 'Cuando el momento más atractivo es el final: adelántalo.' },
  { id: 'reaccion', name: 'Reacción / entretenido → técnico', goal: ['alcance'],
    beats: ['Momento entretenido o llamativo', 'Puente: "¿sabes cómo funciona esto?"', 'Explicación técnica sencilla', 'Conexión con la marca', 'CTA'],
    when: 'Usar algo entretenido como excusa para explicar algo técnico.' },
];

export const HOOK_LAYERS = [
  { id: 'narrado', name: 'Narrado', desc: 'Primera frase hablada.' },
  { id: 'visual', name: 'Visual', desc: 'Lo que se ve en el primer plano: resultado, problema, objeto, acción.' },
  { id: 'textual', name: 'Textual', desc: 'Texto en pantalla en 0–3 s: promesa, pregunta o número.' },
  { id: 'auditivo', name: 'Auditivo', desc: 'Sonido inicial: objeto, efecto, silencio + golpe.' },
];

export const HOOK_PATTERNS = [
  { id: 'lista', name: 'N elementos + característica + acción', template: '[N] [elementos] que [característica] y que [acción]', use: 'Curiosidad, guardados' },
  { id: 'pregunta', name: 'Pregunta frecuente', template: 'Si tengo [situación], ¿qué hago?', use: 'Autoridad, dudas' },
  { id: 'experimento', name: 'Hemos cogido… + experimento', template: 'Hemos cogido [elementos] y vamos a [prueba]', use: 'Diseccionar un tema' },
  { id: 'premio', name: 'Acción por premio', template: '¿Me cambias [X] por [Y]?', use: 'Producto, comunidad' },
  { id: 'climax', name: 'Clímax al inicio', template: '[Momento más interesante del video]', use: 'Cuando lo mejor ocurre tarde' },
  { id: 'esto-y-esto', name: 'Esto es X y esto es Y', template: 'Esto es [X] y esto es [Y]. [Pregunta]', use: 'Comparativa, prueba social' },
  { id: 'si-dolor', name: 'Si [situación] + dolor', template: 'Si [situación], [consecuencia/dolor]', use: 'Resolver un problema' },
  { id: 'si-haces', name: 'Si haces esto…', template: 'Si [haces/has hecho] [acción]…', use: 'Enseñar algo cotidiano' },
  { id: 'esta-fatal', name: 'No está mal: está fatal', template: 'Si [acción], no está mal: está fatal', use: 'Corregir un error' },
  { id: 'debes-saber', name: 'Si estás pensando en…', template: 'Si estás pensando en [acción], esto es lo que deberías saber', use: 'Presentar servicio' },
  { id: 'sabias', name: '¿Sabías que / por qué…?', template: '¿Sabías que [dato sorprendente]?', use: 'Descubrimiento' },
  { id: 'dilema', name: '¿Esto o esto?', template: '¿[X] o [Y]?', use: 'Rápido de grabar, comentarios' },
  { id: 'antes', name: 'Historia con antes', template: '¿Te acuerdas de [estado inicial]?', use: 'Transformación' },
  { id: 'reaccion', name: 'Reacción', template: '[Algo entretenido]… ¿sabes cómo funciona?', use: 'Entretenido → técnico' },
  { id: 'problema-propio', name: 'Problema del creador', template: 'Me encanta [X], pero cada vez que [situación] pienso: [problema]', use: 'Proceso, diseño' },
  { id: 'mito', name: 'Mito vs. realidad', template: 'Todo el mundo cree que [X]. Es al revés.', use: 'Alcance, debate' },
  { id: 'error', name: 'Error común', template: 'El error que comete casi todo el mundo con [X]', use: 'Autoridad' },
  { id: 'resultado', name: 'Resultado primero', template: '[Resultado]. Así lo hicimos.', use: 'Transformaciones' },
  { id: 'experiencia', name: 'Número de experiencia', template: 'Lo que aprendí después de [N] [unidad]', use: 'Autoridad' },
  { id: 'identidad', name: 'Identidad', template: 'Si eres [perfil], esto te interesa', use: 'Segmentar' },
  { id: 'pov', name: 'Situación reconocible / POV', template: '[Escena cotidiana del público]', use: 'Identificación' },
];

export const CTA_TYPES = [
  { id: 'comentarios', name: 'Comentarios', mechanism: 'Pregunta abierta que se responde desde la experiencia, dilema o petición de parte 2.', examples: ['¿Cuál elegirías tú? Te leo.', '¿Quieres la parte 2? Dímelo en comentarios.'] },
  { id: 'guardados', name: 'Guardados', mechanism: 'Utilidad futura.', examples: ['Guárdalo para la próxima vez que…'] },
  { id: 'compartidos', name: 'Compartidos', mechanism: 'Utilidad o identificación para un tercero.', examples: ['Envíaselo a quien siempre…'] },
  { id: 'seguidores', name: 'Seguidores', mechanism: 'Continuidad / serie.', examples: ['Síguenos para la parte 2.', 'Si has llegado hasta aquí, deberías seguirnos.'] },
  { id: 'dm', name: 'Mensajes directos', mechanism: 'Palabra clave + recompensa.', examples: ['Escríbeme "GUÍA" por DM y te la paso.'] },
  { id: 'web', name: 'Visitas al sitio', mechanism: 'Recurso concreto.', examples: ['El enlace está en el perfil.'] },
  { id: 'info', name: 'Solicitud de información', mechanism: 'Diagnóstico o análisis personalizado.', examples: ['Si quieres que revisemos tu caso, déjanos un comentario.'] },
  { id: 'venta', name: 'Ventas', mechanism: 'Oferta clara + disponibilidad + facilidad.', examples: ['Comenta "QUIERO" y te mando el enlace directo.'] },
];

export const CTA_FOR_OBJECTIVE = {
  alcance: ['compartidos', 'seguidores'],
  retencion: ['seguidores', 'comentarios'],
  interaccion: ['comentarios'],
  confianza: ['guardados', 'comentarios'],
  comunidad: ['seguidores', 'comentarios'],
  conversion: ['venta', 'dm', 'info', 'web'],
};

export const EVAL_CRITERIA = [
  { id: 'hook', name: 'Claridad del hook' },
  { id: 'promesa', name: 'Fuerza de la promesa inicial' },
  { id: 'coherencia', name: 'Coherencia narrativa' },
  { id: 'lenguaje', name: 'Sencillez del lenguaje' },
  { id: 'densidad', name: 'Densidad de información' },
  { id: 'desarrollo', name: 'Desarrollo de la idea' },
  { id: 'abandono', name: 'Potenciales puntos de abandono' },
  { id: 'hook-contenido', name: 'Relación hook ↔ contenido' },
  { id: 'cta', name: 'Naturalidad del CTA' },
  { id: 'duracion', name: 'Duración' },
];

export const PUBLISH_FILTER = [
  '¿Se entiende quién eres y qué haces aunque sea la primera vez que te ven?',
  '¿Le interesa a quien te conoce y también a quien no?',
  '¿Es mejor que lo que publica la competencia sobre lo mismo?',
  '¿Es entretenido, profesional y deja claro a qué te dedicas?',
  '¿Toda afirmación técnica está verificada o marcada para verificar?',
];

// Expresiones escritas/formales que suenan poco naturales en voz alta.
export const WRITTEN_PHRASES = [
  'cabe destacar', 'cabe mencionar', 'proceder', 'procedemos', 'en lo que respecta', 'asimismo', 'no obstante',
  'por consiguiente', 'en aras de', 'dicho lo cual', 'en este video te voy a enseñar', 'hola a todos', 'bienvenidos a',
  'sin más preámbulos', 'en el día de hoy', 'hoy vamos a hablar', 'mediante', 'llevar a cabo', 'a nivel de',
];

export const EDITING_GUIDELINES = [
  { tip: 'Subtítulos incrustados, legibles y funcionales; contraste ≥ 4.5:1.', level: 'I' },
  { tip: 'Respetar zonas seguras: evitar texto en el 15 % superior e inferior y la franja derecha.', level: 'P' },
  { tip: 'Cortes simples; transiciones solo si aportan significado.', level: 'A' },
  { tip: 'Música baja; la voz siempre por encima.', level: 'A' },
  { tip: 'Cambios de plano frecuentes cuando el contenido lo permite.', level: 'O' },
  { tip: 'B-roll que muestre lo que se dice, no decorativo.', level: 'I' },
  { tip: 'Efectos sonoros en revelaciones y cambios, con moderación.', level: 'O' },
  { tip: 'Ritmo exacto de cortes: probar según formato (hipótesis).', level: 'H' },
];

export const PLATFORMS = [
  { id: 'tiktok', name: 'TikTok', maxCaption: 4000, hashtags: [3, 5], defaultDuration: 45 },
  { id: 'instagram', name: 'Instagram Reels', maxCaption: 2200, hashtags: [3, 5], defaultDuration: 40 },
  { id: 'facebook', name: 'Facebook Reels', maxCaption: 2200, hashtags: [1, 3], defaultDuration: 40 },
  { id: 'youtube', name: 'YouTube Shorts', maxCaption: 5000, titleMax: 100, hashtags: [1, 3], defaultDuration: 45 },
  { id: 'linkedin', name: 'LinkedIn', maxCaption: 3000, hashtags: [1, 3], defaultDuration: 60 },
];

export const EVIDENCE_LEGEND = {
  P: 'Plataforma', I: 'Investigación', O: 'Observado', H: 'Hipótesis', A: 'Agencia (explícito)', 'A*': 'Inferido del material',
};

export const byId = (list, id) => list.find((x) => x.id === id);

// Bloque compacto que se inyecta en los prompts.
export function methodologyBrief() {
  return [
    'PRINCIPIOS:', ...PRINCIPLES.map((p) => '- ' + p),
    'REGLAS DE GUION:', ...SCRIPT_RULES.map((p) => '- ' + p),
    'TIPOS DE CONTENIDO: ' + CONTENT_TYPES.map((t) => `${t.id} (${t.desc})`).join('; '),
    'ESTRUCTURAS DISPONIBLES: ' + STRUCTURES.map((s) => `${s.id} = ${s.beats.join(' > ')}`).join(' | '),
    'PATRONES DE HOOK: ' + HOOK_PATTERNS.map((h) => `${h.id}: "${h.template}"`).join(' | '),
    'CAPAS DEL HOOK: narrado, visual, textual, auditivo. Deben decir lo mismo por canales distintos.',
    'CTA: un solo CTA principal, conectado con el contenido y adecuado al objetivo.',
  ].join('\n');
}
