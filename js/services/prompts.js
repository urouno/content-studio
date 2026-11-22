// Constructores de prompts (funciones puras; reciben el contexto ya filtrado por marca).
import { methodologyBrief, methodologyShort, KNOWLEDGE_LEVELS, STRUCTURES, HOOK_PATTERNS, CTA_TYPES, CTA_FOR_OBJECTIVE, PLATFORMS, EVAL_CRITERIA, PRODUCTION_TYPES, GRAPHICS_PRESETS, HOOK_4P, resourcesFor, byId } from './methodology.js';

const TRUTH_RULES = `REGLAS DE VERACIDAD (obligatorias):
- No inventes datos técnicos, cifras, especificaciones, precios, resultados de clientes, estudios ni beneficios de productos.
- Usa solo la información de la marca, de sus documentos de referencia y de la idea. Si una afirmación necesita comprobación, inclúyela en "verify" con el motivo.
- Los DOCUMENTOS DE REFERENCIA son contexto fijo y fuente de verdad: respeta sus temas, identidad, voz, discurso comercial y foco actual. Si se contradicen, prevalece "Reglas, límites y temas sensibles" y después "Productos, servicios y oferta".
- Nunca menciones productos, precios, promociones ni casos que no aparezcan en la marca o en sus documentos.
- Si falta información para una afirmación, escribe un marcador entre corchetes, p. ej. [DATO A CONFIRMAR: tiempo de curación].
- Distingue recomendaciones de hechos. No prometas viralidad ni resultados garantizados.`;

export function brandContext(ctx, { compact = false } = {}) {
  const { brand, config = {}, platforms = [], pillars = [], hooks = [], ctas = [], examples = [], learnings = [], docs = '', filled = new Set(), references = [] } = ctx;
  const v = config.voice || {}; const vis = config.visual || {};
  const lvl = byId(KNOWLEDGE_LEVELS, Number(v.knowledgeLevel)) || KNOWLEDGE_LEVELS[1];
  // En modo compacto (tareas cortas) se envían menos ejemplos y referencias.
  const n = compact ? { ex: 1200, refNotes: 600, hk: 6, hkAvoid: 5, ct: 6, ctAvoid: 4, refs: 5 } : { ex: 2500, refNotes: 1500, hk: 12, hkAvoid: 10, ct: 10, ctAvoid: 8, refs: 10 };
  const lines = [
    `MARCA: ${brand.name}`,
    brand.description && `Descripción: ${brand.description}`,
    brand.sector && `Sector: ${brand.sector}`,
    brand.valueProp && `Propuesta de valor: ${brand.valueProp}`,
    // Si el documento equivalente tiene contenido, el resumen de la ficha no se repite.
    brand.products && !filled.has('oferta') && `Productos/servicios (fuente de verdad, no añadas otros): ${brand.products}`,
    brand.businessGoals && !filled.has('foco') && `Objetivos comerciales: ${brand.businessGoals}`,
    brand.audience && !filled.has('buyer') && `Público objetivo: ${brand.audience}`,
    brand.painPoints && !filled.has('dolores') && `Problemas frecuentes de sus clientes: ${brand.painPoints}`,
    'IDENTIDAD COMUNICATIVA:',
    v.personality && `- Personalidad: ${v.personality}`,
    v.tone && `- Tono de voz: ${v.tone}`,
    `- Formalidad (1 muy informal – 5 muy formal): ${v.formality ?? 2}. Trato: ${v.person || 'tú'}`,
    v.vocabulary && `- Vocabulario recomendado: ${v.vocabulary}`,
    v.avoid && `- PROHIBIDO usar: ${v.avoid}`,
    `- Nivel de conocimiento habitual de la audiencia: ${lvl.name} (${lvl.rules})`,
    v.narrationStyle && `- Estilo de narración: ${v.narrationStyle}`,
    v.approvedExamples && `- Ejemplos de guiones aprobados (imita el estilo, no copies):\n${String(v.approvedExamples).slice(0, n.ex)}`,
    'IDENTIDAD VISUAL:',
    vis.colors?.length && `- Colores: ${vis.colors.map((c) => `${c.name} ${c.hex}`).join(', ')}`,
    vis.fonts?.length && `- Tipografías: ${vis.fonts.filter((f) => f.family).map((f) => `${f.role}: ${f.family}`).join(', ')}`,
    vis.subtitleStyle && `- Subtítulos: ${vis.subtitleStyle}`,
    vis.editingStyle && `- Estilo de edición: ${vis.editingStyle}`,
    vis.pace && `- Ritmo: ${vis.pace}`,
    platforms.length && 'REDES:',
    ...platforms.filter((p) => p.active !== false).map((p) => `- ${platformName(p.platform)}: objetivo ${p.goal || '—'}, duración ${p.durationTarget || '—'} s, ${p.frequencyPerWeek || '—'}/semana, formatos ${(p.formats || []).join(', ') || '—'}, CTA preferidos ${(p.ctas || []).join(', ') || '—'}`),
    pillars.length && `PILARES: ${pillars.map((p) => `${p.name}${p.objective ? ` (${p.objective})` : ''}`).join('; ')}`,
    hooks.filter((h) => h.status === 'aprobado').length && `HOOKS APROBADOS (referencia de estilo): ${hooks.filter((h) => h.status === 'aprobado').slice(0, n.hk).map((h) => `"${h.text}"`).join(' | ')}`,
    hooks.filter((h) => h.status === 'evitar').length && `HOOKS A EVITAR: ${hooks.filter((h) => h.status === 'evitar').slice(0, n.hkAvoid).map((h) => `"${h.text}"`).join(' | ')}`,
    ctas.filter((c) => c.status === 'aprobado').length && `CTA APROBADOS: ${ctas.filter((c) => c.status === 'aprobado').slice(0, n.ct).map((c) => `[${c.type}] "${c.text}"`).join(' | ')}`,
    ctas.filter((c) => c.status === 'evitar').length && `CTA A EVITAR: ${ctas.filter((c) => c.status === 'evitar').slice(0, n.ctAvoid).map((c) => `"${c.text}"`).join(' | ')}`,
    examples.length && `GUIONES APROBADOS DE ESTA MARCA (resumen): ${examples.map((e) => `"${e.hook}" → ${e.structure}`).join(' | ')}`,
    learnings.length && `APRENDIZAJES DE RESULTADOS (hipótesis, no reglas): ${learnings.join(' | ')}`,
    vis.references && `REFERENCIAS GENERALES DE LA MARCA: ${String(vis.references).slice(0, n.refNotes)}`,
    references.filter((r) => r.title || r.url).length && `REFERENCIAS GUARDADAS (inspiración de estilo, no copiar): ${references.filter((r) => r.title || r.url).slice(0, n.refs).map((r) => `[${r.kind}] ${r.title || r.url}${r.metrics ? ` (${r.metrics})` : ''}${r.notes ? ` — ${r.notes}` : ''}`).join(' | ')}`,
    docs && `\n=== DOCUMENTOS DE REFERENCIA DE ${String(brand.name).toUpperCase()} (contexto fijo: síguelos siempre) ===\n${docs}\n=== FIN DE LOS DOCUMENTOS ===`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function platformName(id) { return byId(PLATFORMS, id)?.name || id; }

export function systemPrompt(ctx, role = 'guionista', { compact = false } = {}) {
  return `Eres un ${role} experto en contenido orgánico para video vertical (TikTok, Reels, Shorts) que trabaja para UNA sola marca.
Escribe siempre en español, con el tono de la marca. Usa EXCLUSIVAMENTE el contexto de esta marca.

${compact ? methodologyShort() : methodologyBrief()}

${TRUTH_RULES}

${brandContext(ctx, { compact })}`;
}

const SCRIPT_SCHEMA = `{
 "title": "título interno corto",
 "objective": "alcance|retencion|interaccion|confianza|comunidad|conversion",
 "audience": "público concreto", "problem": "problema del espectador con sus palabras",
 "promise": "qué obtiene el espectador al terminar (una frase)",
 "knowledgeLevel": 0-3, "structureId": "id de estructura", "contentType": "venta|familiaridad|memorable",
 "hook": {"patternId": "id de patrón", "narrado": "≤ 12 palabras", "visual": "el primer cuadro: qué se ve en 0-3 s (máx. 3 elementos, el resultado ya enseñado)", "textual": "texto del primer cuadro ≤ 7 palabras", "auditivo": "sonido inicial o vacío", "p4": {"promesa": "qué gana quien lo ve", "prueba": "qué resultado real se enseña primero", "plan": "cómo, apenas un adelanto", "persona": "a quién le habla"}},
 "hookAlternatives": [ {"patternId": "", "narrado": "", "visual": "", "textual": "", "auditivo": ""} ],
 "sections": [ {"act": "inicio|nudo|desenlace", "beat": "nombre del paso de la estructura", "function": "contexto|problema|dato|explicacion|ejemplo|giro|resultado|transicion|cta", "voice": "texto hablado exacto", "onScreenText": "texto en pantalla", "visual": "plano / B-roll / acción", "edit": "indicación de edición", "peak": 0-3,
   "resource": {"type": "id del catálogo de recursos o vacío", "what": "qué aparece, con las palabras de la voz (los renglones de la lista, la cifra dicha, el lugar)", "anchor": "1-4 palabras EXACTAS de la voz de esta sección donde entra"} } ],
 "cta": {"type": "comentarios|guardados|compartidos|seguidores|dm|web|info|venta", "text": "texto hablado", "visual": "cómo se muestra"},
 "verify": [ {"claim": "afirmación", "reason": "por qué verificar"} ],
 "visualNotes": "indicaciones visuales generales", "editingNotes": "indicaciones de edición generales"
}`;

export function ideaSummary(idea, pillar) {
  return [
    `Título: ${idea.title}`, idea.topic && `Tema: ${idea.topic}`, pillar && `Pilar: ${pillar.name}`,
    idea.audience && `Público: ${idea.audience}`, idea.problem && `Problema del espectador: ${idea.problem}`,
    idea.keyword && `Palabra clave del público: ${idea.keyword}`, idea.objective && `Objetivo: ${idea.objective}`,
    idea.funnel && `Etapa del embudo: ${idea.funnel}`, idea.contentType && `Tipo: ${idea.contentType}`,
    idea.format && `Formato: ${idea.format}`, idea.references && `Referencias/conocimiento disponible: ${idea.references}`,
    idea.notes && `Notas: ${idea.notes}`,
    idea.productionType && `Tipo de producción: ${byId(PRODUCTION_TYPES, idea.productionType)?.name || idea.productionType}`,
    ...pitchLines(idea.pitch),
  ].filter(Boolean).join('\n');
}

/** El empaque de la idea (primer cuadro, gancho de las 4 P…), para que el guion lo respete. */
function pitchLines(p) {
  if (!p || typeof p !== 'object') return [];
  const p4 = p.p4 || {};
  return [
    p.firstFrameText && `Texto del primer cuadro: ${p.firstFrameText}`,
    p.firstFrameVisual && `Qué se ve en el primer cuadro: ${p.firstFrameVisual}`,
    p.variants && `Variantes del primer cuadro: ${String(p.variants).split('\n').filter(Boolean).join(' | ')}`,
    Object.values(p4).some(Boolean) && `Gancho 4 P: ${HOOK_4P.map((x) => p4[x.id] && `${x.name}: ${p4[x.id]}`).filter(Boolean).join(' · ')}`,
    p.basedOn && `Variante de lo que funcionó: ${p.basedOn}${p.keepChange ? ` (${p.keepChange})` : ''}`,
    p.risk && `Riesgo a cuidar: ${p.risk}`,
  ].filter(Boolean);
}

/** Reglas de los recursos visuales (las mismas que aplica la skill de edición al montar el video). */
export function resourcesBrief(production = 'cabeza', graphics = 'equilibrado') {
  const pt = byId(PRODUCTION_TYPES, production) || PRODUCTION_TYPES[0];
  const pr = byId(GRAPHICS_PRESETS, graphics) || GRAPHICS_PRESETS[2];
  const cat = resourcesFor(production).filter((r) => pr.id !== 'sin' || ['escena', 'camara', 'broll'].includes(r.kind));
  return `RECURSOS VISUALES (los monta después la skill de edición; usa solo estos ids):
${cat.map((r) => `- ${r.id} [${r.kind}]: ${r.when}`).join('\n')}
Reglas:
- Tipo de producción: ${pt.name}. ${pt.desc}
- ${pr.id === 'sin' ? 'Este video va SIN gráficos: solo escenas, B-roll o cámara si hacen falta.' : `Topes: como mucho ${pr.flotantes} recursos [flotante] y ${pr.pantalla} [pantalla] en todo el video.`}
- ${production === 'animado' ? 'Video animado: CADA sección lleva una escena (tipo escena-*), una cada 3-5 s, sin repetir el mismo tipo dos veces seguidas.' : 'Como mucho un recurso por sección y solo si una frase lo pide. Mejor pocos y fieles que muchos de relleno.'}
- Un recurso ILUSTRA lo que dice la voz en ese momento, con sus palabras. Nada de datos, adjetivos o comparaciones que la voz no dice.
- NINGUNA cifra en pantalla que no se pronuncie. Una lista solo si la voz enumera; un mapa solo si se nombra el lugar (hoy solo México y sus estados).
- "anchor" son palabras exactas de la voz de esa sección: ahí aparece el recurso.`;
}

export function scriptPrompt({ idea, pillar, platform, durationSec, structureId, knowledgeLevel, versions = 1, recentHooks = [], extra = '', production, graphics = 'equilibrado' }) {
  const st = structureId ? byId(STRUCTURES, structureId) : null;
  const lvl = byId(KNOWLEDGE_LEVELS, Number(knowledgeLevel)) || KNOWLEDGE_LEVELS[1];
  const ctaHint = (CTA_FOR_OBJECTIVE[idea.objective] || []).join(', ');
  return `Convierte esta idea en ${versions > 1 ? `${versions} versiones DISTINTAS de guion (cada una con estructura y patrón de hook diferentes)` : 'un guion'} para ${platformName(platform)}.

IDEA:
${ideaSummary(idea, pillar)}

PARÁMETROS:
- Duración objetivo: ${durationSec} s (≈ ${Math.round(durationSec * 2.6)} palabras habladas en total).
- Nivel de conocimiento: ${lvl.name} → ${lvl.rules}
- Estructura: ${st ? `${st.id} (${st.beats.join(' > ')})` : 'elige la más adecuada al objetivo del catálogo'}.
- CTA recomendado para el objetivo: ${ctaHint || 'el más natural para el contenido'}.
- Incluye 3 hooks alternativos con patrones distintos al principal.
- Gancho de las 4 P en los primeros 3 s (${HOOK_4P.map((p) => `${p.name}: ${p.desc}`).join(' · ')}). El primer cuadro (hook.visual + hook.textual) enseña el resultado, no lo promete.
- Marca con "peak" (1-3) los momentos de mayor interés; deben crecer hacia el final.
- Que la última frase empalme con el principio: TikTok y Reels repiten el video solos.

${resourcesBrief(production || idea.productionType || 'cabeza', graphics)}
${recentHooks.length ? `- NO repitas ni parafrasees estos hooks recientes de la marca: ${recentHooks.slice(0, 20).map((h) => `"${h}"`).join(' | ')}` : ''}
${extra ? `- Indicaciones del usuario: ${extra}` : ''}

Devuelve JSON: ${versions > 1 ? `{"versions": [ ${SCRIPT_SCHEMA} ]}` : SCRIPT_SCHEMA}`;
}

export function rewritePrompt({ script, mode, target, instruction, platform, durationSec, structureId, knowledgeLevel }) {
  const base = `GUION ACTUAL (JSON):\n${JSON.stringify(script)}\n\n`;
  const keep = 'Mantén intacto todo lo que no se pide cambiar. Devuelve el guion COMPLETO con el mismo esquema JSON.';
  switch (mode) {
    case 'section': return `${base}Reescribe SOLO la sección con índice ${target} (0 = primera). ${instruction ? `Indicación: ${instruction}.` : 'Hazla más clara, oral y con más interés.'} Asegura que encaje con la anterior y la siguiente. ${keep}`;
    case 'hook': return `${base}Mejora SOLO el hook principal (las 4 capas) y propone 3 nuevos hookAlternatives con patrones distintos. El hook debe cumplir: ≤12 palabras, específico, nombra el problema del público, abre una pregunta que el video cierra, y la promesa debe cumplirse con el desarrollo existente. ${instruction || ''} ${keep}`;
    case 'shorter': return `${base}Reduce la duración a ~${durationSec} s eliminando frases que no aportan (si una frase se puede quitar y se entiende igual, sobra). No elimines el hook, la resolución de la promesa ni el CTA. ${keep}`;
    case 'longer': return `${base}Amplía la duración a ~${durationSec} s añadiendo ejemplos cotidianos o pasos útiles, nunca relleno ni datos inventados. ${keep}`;
    case 'simplify': return `${base}Simplifica el lenguaje para nivel de conocimiento ${knowledgeLevel ?? 0}: palabras cotidianas, frases cortas, analogías concretas, sin perder precisión. Si una simplificación pierde un matiz importante, añádelo en "verify". ${keep}`;
    case 'structure': { const st = byId(STRUCTURES, structureId); return `${base}Reestructura el guion con la estructura "${st?.name}" (${st?.beats.join(' > ')}). Conserva la información y la promesa. Devuelve el guion completo con structureId="${structureId}".`; }
    case 'platform': return `${base}Adapta el guion a ${platformName(platform)} (duración ~${durationSec} s, convenciones y CTA adecuados a esa plataforma). ${keep}`;
    default: return `${base}${instruction}. ${keep}`;
  }
}

export function evaluatePrompt({ script, durationTarget, localFindings }) {
  return `Evalúa este guion como editor de contenido. NO des puntuaciones ni predicciones de viralidad o retención: da observaciones explicadas y mejoras concretas (reescrituras exactas).

GUION:\n${JSON.stringify(script)}
Duración objetivo: ${durationTarget} s.
Hallazgos automáticos ya detectados (no los repitas, compleméntalos): ${localFindings.map((f) => f.text).join(' | ') || 'ninguno'}

Criterios: ${EVAL_CRITERIA.map((c) => `${c.id} (${c.name})`).join(', ')}.

Devuelve JSON:
{"criteria": [{"id": "id del criterio", "status": "ok|mejorable|problema", "observation": "qué ves y por qué importa", "suggestion": "cambio concreto o reescritura"}],
 "dropOffRisks": [{"section": índice de sección o -1 para el hook, "reason": "", "fix": ""}],
 "unverifiedClaims": [{"claim": "", "reason": ""}],
 "summary": "2-3 frases con lo más importante a mejorar"}`;
}

export function ideasPrompt({ count, pillar, objective, platform, topic, existing = [], extra = '', winners = [] }) {
  return `Propón ${count} ideas de video DISTINTAS entre sí para la marca, ordenadas de la MÁS SEGURA a la MÁS ARRIESGADA.
${winners.length ? `LO QUE YA FUNCIONÓ EN ESTA MARCA (resultados medidos):\n${winners.map((w) => `- ${w}`).join('\n')}
Las ideas más seguras son VARIANTES de estas: conservan lo que funcionó y cambian UNA sola cosa (el tema, el gancho o la estructura). Dilo en "keepChange".` : 'Aún no hay resultados medidos: apóyate en las referencias de la marca y en problemas reales del público.'}
En el feed no hay título: el empaque es el PRIMER CUADRO (lo que se ve en 0-3 s) y su texto en pantalla.
${pillar ? `Pilar: ${pillar.name} — ${pillar.description || ''}` : 'Reparte entre los pilares de la marca.'}
${objective ? `Objetivo: ${objective}` : 'Combina objetivos: ~80 % formatos probados, ~20 % experimentales (marca "experimental": true).'}
${platform ? `Plataforma principal: ${platformName(platform)}` : ''}
${topic ? `Tema o punto de partida: ${topic}` : ''}
Parte de problemas reales del público (sus palabras), no de lo que la marca quiere decir.
Combina tipos venta / familiaridad / memorable.
${existing.length ? `NO repitas ni reformules estas ideas existentes: ${existing.slice(0, 40).map((t) => `"${t}"`).join(' | ')}` : ''}
${extra}
Gancho de las 4 P en 3 s: ${HOOK_4P.map((p) => `${p.name} (${p.desc})`).join('; ')}. La prueba tiene que ser algo que la marca de verdad tiene.
Tipo de producción: ${PRODUCTION_TYPES.map((p) => `${p.id} (${p.name})`).join(', ')}. Elige el que la idea necesite para enseñar lo que promete.
"riesgo" dice sin rodeos qué podría fallar. Si te da igual arruinar la idea, todavía no es la idea: pocas y buenas.
Devuelve JSON: {"ideas": [{"title": "título interno", "topic": "", "pillar": "nombre del pilar o vacío", "audience": "", "problem": "con las palabras del público", "keyword": "palabra que usaría el público", "objective": "alcance|retencion|interaccion|confianza|comunidad|conversion", "funnel": "tofu|mofu|bofu|loyal", "contentType": "venta|familiaridad|memorable", "format": "id de estructura sugerida", "productionType": "cabeza|producto|animado", "difficulty": "facil|media|dificil", "experimental": false,
 "firstFrameText": "texto del primer cuadro, ≤ 7 palabras", "firstFrameVisual": "qué se ve en el primer cuadro: máx. 3 elementos, el resultado ya enseñado",
 "variants": [{"text": "otra versión del texto del primer cuadro", "why": "por qué se quedaría este público"}],
 "p4": {"promesa": "", "prueba": "", "plan": "", "persona": ""},
 "basedOn": "título del contenido que funcionó en el que se basa, o vacío", "keepChange": "qué conserva de lo que funcionó y qué cambia",
 "why": "por qué debería funcionar (hipótesis)", "risk": "qué podría fallar", "cta": "si el objetivo es vender: Comenta X y te mando…; si no, vacío"}]}`;
}

export function anglesPrompt({ idea, similar }) {
  return `Esta idea es muy parecida a otras ya registradas. Propón 4 enfoques NUEVOS que la diferencien (otro problema, otra audiencia, otra estructura u otro patrón de hook).
IDEA: ${ideaSummary(idea)}
SIMILARES: ${similar.map((s) => `"${s.title}"`).join(' | ')}
Devuelve JSON: {"angles": [{"title": "", "problem": "", "format": "id de estructura", "hookIdea": "", "difference": "qué la hace distinta"}]}`;
}

export function researchPrompt({ topic, idea }) {
  return `Investiga el tema "${topic}" para preparar un video de la marca${idea ? ` (idea: ${idea.title})` : ''}.
Entrega en Markdown breve:
1. Preguntas frecuentes reales del público sobre el tema.
2. Mitos o errores comunes (indica la fuente si la tienes).
3. Datos verificables útiles, cada uno con su fuente. Si no tienes fuente, márcalo como "sin verificar".
4. Ángulos de video posibles con el patrón de hook sugerido.
5. Qué NO afirmar sin comprobar.`;
}

export function hooksPrompt({ idea, script, count = 6, layer }) {
  return `Genera ${count} hooks para este contenido con PATRONES DIFERENTES entre sí (${HOOK_PATTERNS.map((h) => h.id).join(', ')}).
${idea ? ideaSummary(idea) : ''}
${script ? `Promesa del guion: ${script.promise}\nDesarrollo resumido: ${(script.sections || []).map((s) => s.beat).join(' > ')}` : ''}
${layer ? `Enfócate en la capa ${layer}, pero incluye las otras.` : ''}
Cada hook debe poder cumplirse con el contenido. Para cada uno explica por qué funciona y qué riesgo tiene.
Devuelve JSON: {"hooks": [{"patternId": "", "narrado": "", "visual": "", "textual": "", "auditivo": "", "why": "", "risk": ""}]}`;
}

export function ctaPrompt({ idea, script, objective }) {
  const types = CTA_FOR_OBJECTIVE[objective] || CTA_TYPES.map((c) => c.id);
  return `Propón 5 CTA naturales para este video, conectados con lo que se acaba de ver, de tipos: ${types.join(', ')}.
${idea ? ideaSummary(idea) : ''}
${script ? `Cierre actual: ${script.sections?.at(-1)?.voice || ''}` : ''}
Devuelve JSON: {"ctas": [{"type": "", "text": "", "why": ""}]}`;
}

export function copiesPrompt({ script, idea, platforms, spoken = '', credits = '' }) {
  const pl = platforms.map((p) => { const m = byId(PLATFORMS, p); return `${p} (${m?.name}; caption máx ${m?.maxCaption} caracteres; ${m?.hashtags?.join('–')} hashtags${m?.titleMax ? `; título ≤ ${m.titleMax}` : ''})`; }).join(', ');
  return `Escribe los textos de publicación para este video ya producido. Deben relacionarse con lo que se ve y se dice, conservar la voz de la marca y NO repetir literalmente el guion.
GUION FINAL: ${JSON.stringify({ title: script.title, hook: script.hook, promise: script.promise, sections: (script.sections || []).map((s) => s.voice), cta: script.cta })}
${spoken ? `LO QUE SE DIJO DE VERDAD EN EL VIDEO EDITADO (manda sobre el guion si no coinciden): ${String(spoken).slice(0, 3000)}` : ''}
${credits ? `CRÉDITOS OBLIGATORIOS (licencias de material de terceros): termina cada caption con una línea «Créditos: ${credits}». No la omitas ni la cambies.` : ''}
${idea?.keyword ? `Palabra clave para SEO interno de la plataforma: ${idea.keyword}` : ''}
Plataformas: ${pl}
Para cada plataforma da 2 variantes. Primera línea del caption = gancho escrito (no copia del hook hablado). Hashtags relevantes y específicos, no genéricos tipo #viral.
Devuelve JSON: {"copies": [{"platform": "id", "variant": 1, "title": "", "caption": "", "description": "", "ctaText": "", "hashtags": ["#..."], "coverText": "texto de portada ≤ 6 palabras"}]}`;
}

export function brandDocPrompt({ title, purpose, template, current }) {
  return `Redacta el documento de referencia "${title}" de la marca, en Markdown y en español.
Propósito del documento: ${purpose}

PLANTILLA (mantén exactamente estas cabeceras; las indicaciones entre <!-- --> explican qué va en cada sección y NO deben aparecer en tu respuesta):
${template}

${current ? `CONTENIDO ACTUAL DEL DOCUMENTO (consérvalo, ordénalo y compleméntalo; no borres información verificada):\n${current}\n` : ''}
Reglas:
- Usa SOLO la información de la marca y de sus otros documentos. No inventes datos, precios, casos ni testimonios.
- Donde falte información escribe un marcador concreto, p. ej. [COMPLETAR: precio del curso] o [VERIFICAR: años de experiencia].
- Frases concretas y accionables, listas cuando ayuden. Usa las palabras del cliente cuando las conozcas.
- Devuelve solo el documento en Markdown, empezando por "# ${title}". Sin explicaciones antes ni después.`;
}

export function insightsPrompt({ table, brandName }) {
  return `Analiza estos resultados agregados de ${brandName}. Son datos observacionales: NO confundas correlación con causalidad, considera el tamaño de muestra (n) y posibles factores de confusión (tema, plataforma, fecha, duración).
DATOS (medianas por grupo):\n${table}
Devuelve JSON: {"observations": [{"pattern": "", "evidence": "", "confidence": "baja|media|alta", "confounders": ""}], "hypotheses": [{"hypothesis": "", "test": "cómo probarla variando una sola cosa"}], "nextIdeas": [{"title": "", "why": ""}], "caveats": ""}`;
}
