// Constructores de prompts (funciones puras; reciben el contexto ya filtrado por marca).
import { methodologyBrief, KNOWLEDGE_LEVELS, STRUCTURES, HOOK_PATTERNS, CTA_TYPES, CTA_FOR_OBJECTIVE, PLATFORMS, EVAL_CRITERIA, byId } from './methodology.js';

const TRUTH_RULES = `REGLAS DE VERACIDAD (obligatorias):
- No inventes datos técnicos, cifras, especificaciones, precios, resultados de clientes, estudios ni beneficios de productos.
- Usa solo la información de la marca, de sus documentos de referencia y de la idea. Si una afirmación necesita comprobación, inclúyela en "verify" con el motivo.
- Los DOCUMENTOS DE REFERENCIA son contexto fijo y fuente de verdad: respeta sus temas, identidad, voz, discurso comercial y foco actual. Si se contradicen, prevalece "Reglas, límites y temas sensibles" y después "Productos, servicios y oferta".
- Nunca menciones productos, precios, promociones ni casos que no aparezcan en la marca o en sus documentos.
- Si falta información para una afirmación, escribe un marcador entre corchetes, p. ej. [DATO A CONFIRMAR: tiempo de curación].
- Distingue recomendaciones de hechos. No prometas viralidad ni resultados garantizados.`;

export function brandContext(ctx) {
  const { brand, config = {}, platforms = [], pillars = [], hooks = [], ctas = [], examples = [], learnings = [], docs = '', filled = new Set() } = ctx;
  const v = config.voice || {}; const vis = config.visual || {};
  const lvl = byId(KNOWLEDGE_LEVELS, Number(v.knowledgeLevel)) || KNOWLEDGE_LEVELS[1];
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
    v.approvedExamples && `- Ejemplos de guiones aprobados (imita el estilo, no copies):\n${String(v.approvedExamples).slice(0, 2500)}`,
    'IDENTIDAD VISUAL:',
    vis.colors?.length && `- Colores: ${vis.colors.map((c) => `${c.name} ${c.hex}`).join(', ')}`,
    vis.fonts?.length && `- Tipografías: ${vis.fonts.filter((f) => f.family).map((f) => `${f.role}: ${f.family}`).join(', ')}`,
    vis.subtitleStyle && `- Subtítulos: ${vis.subtitleStyle}`,
    vis.editingStyle && `- Estilo de edición: ${vis.editingStyle}`,
    vis.pace && `- Ritmo: ${vis.pace}`,
    platforms.length && 'REDES:',
    ...platforms.filter((p) => p.active !== false).map((p) => `- ${platformName(p.platform)}: objetivo ${p.goal || '—'}, duración ${p.durationTarget || '—'} s, ${p.frequencyPerWeek || '—'}/semana, formatos ${(p.formats || []).join(', ') || '—'}, CTA preferidos ${(p.ctas || []).join(', ') || '—'}`),
    pillars.length && `PILARES: ${pillars.map((p) => `${p.name}${p.objective ? ` (${p.objective})` : ''}`).join('; ')}`,
    hooks.filter((h) => h.status === 'aprobado').length && `HOOKS APROBADOS (referencia de estilo): ${hooks.filter((h) => h.status === 'aprobado').slice(0, 12).map((h) => `"${h.text}"`).join(' | ')}`,
    hooks.filter((h) => h.status === 'evitar').length && `HOOKS A EVITAR: ${hooks.filter((h) => h.status === 'evitar').slice(0, 10).map((h) => `"${h.text}"`).join(' | ')}`,
    ctas.filter((c) => c.status === 'aprobado').length && `CTA APROBADOS: ${ctas.filter((c) => c.status === 'aprobado').slice(0, 10).map((c) => `[${c.type}] "${c.text}"`).join(' | ')}`,
    ctas.filter((c) => c.status === 'evitar').length && `CTA A EVITAR: ${ctas.filter((c) => c.status === 'evitar').slice(0, 8).map((c) => `"${c.text}"`).join(' | ')}`,
    examples.length && `GUIONES APROBADOS DE ESTA MARCA (resumen): ${examples.map((e) => `"${e.hook}" → ${e.structure}`).join(' | ')}`,
    learnings.length && `APRENDIZAJES DE RESULTADOS (hipótesis, no reglas): ${learnings.join(' | ')}`,
    docs && `\n=== DOCUMENTOS DE REFERENCIA DE ${String(brand.name).toUpperCase()} (contexto fijo: síguelos siempre) ===\n${docs}\n=== FIN DE LOS DOCUMENTOS ===`,
  ];
  return lines.filter(Boolean).join('\n');
}

export function platformName(id) { return byId(PLATFORMS, id)?.name || id; }

export function systemPrompt(ctx, role = 'guionista') {
  return `Eres un ${role} experto en contenido orgánico para video vertical (TikTok, Reels, Shorts) que trabaja para UNA sola marca.
Escribe siempre en español, con el tono de la marca. Usa EXCLUSIVAMENTE el contexto de esta marca.

${methodologyBrief()}

${TRUTH_RULES}

${brandContext(ctx)}`;
}

const SCRIPT_SCHEMA = `{
 "title": "título interno corto",
 "objective": "alcance|retencion|interaccion|confianza|comunidad|conversion",
 "audience": "público concreto", "problem": "problema del espectador con sus palabras",
 "promise": "qué obtiene el espectador al terminar (una frase)",
 "knowledgeLevel": 0-3, "structureId": "id de estructura", "contentType": "venta|familiaridad|memorable",
 "hook": {"patternId": "id de patrón", "narrado": "≤ 12 palabras", "visual": "qué se ve en 0-3 s", "textual": "texto en pantalla ≤ 7 palabras", "auditivo": "sonido inicial o vacío"},
 "hookAlternatives": [ {"patternId": "", "narrado": "", "visual": "", "textual": "", "auditivo": ""} ],
 "sections": [ {"act": "inicio|nudo|desenlace", "beat": "nombre del paso de la estructura", "function": "contexto|problema|dato|explicacion|ejemplo|giro|resultado|transicion|cta", "voice": "texto hablado exacto", "onScreenText": "texto en pantalla", "visual": "plano / B-roll / acción", "edit": "indicación de edición", "peak": 0-3 } ],
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
  ].filter(Boolean).join('\n');
}

export function scriptPrompt({ idea, pillar, platform, durationSec, structureId, knowledgeLevel, versions = 1, recentHooks = [], extra = '' }) {
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
- Marca con "peak" (1-3) los momentos de mayor interés; deben crecer hacia el final.
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

export function ideasPrompt({ count, pillar, objective, platform, topic, existing = [], extra = '' }) {
  return `Propón ${count} ideas de video DISTINTAS entre sí para la marca.
${pillar ? `Pilar: ${pillar.name} — ${pillar.description || ''}` : 'Reparte entre los pilares de la marca.'}
${objective ? `Objetivo: ${objective}` : 'Combina objetivos: ~80 % formatos probados, ~20 % experimentales (marca "experimental": true).'}
${platform ? `Plataforma principal: ${platformName(platform)}` : ''}
${topic ? `Tema o punto de partida: ${topic}` : ''}
Parte de problemas reales del público (sus palabras), no de lo que la marca quiere decir.
Combina tipos venta / familiaridad / memorable.
${existing.length ? `NO repitas ni reformules estas ideas existentes: ${existing.slice(0, 40).map((t) => `"${t}"`).join(' | ')}` : ''}
${extra}
Devuelve JSON: {"ideas": [{"title": "", "topic": "", "pillar": "nombre del pilar o vacío", "audience": "", "problem": "", "keyword": "palabra que usaría el público", "objective": "alcance|retencion|interaccion|confianza|comunidad|conversion", "funnel": "tofu|mofu|bofu|loyal", "contentType": "venta|familiaridad|memorable", "format": "id de estructura sugerida", "hookIdea": "", "difficulty": "facil|media|dificil", "experimental": false, "why": "por qué puede funcionar (hipótesis)"}]}`;
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

export function copiesPrompt({ script, idea, platforms }) {
  const pl = platforms.map((p) => { const m = byId(PLATFORMS, p); return `${p} (${m?.name}; caption máx ${m?.maxCaption} caracteres; ${m?.hashtags?.join('–')} hashtags${m?.titleMax ? `; título ≤ ${m.titleMax}` : ''})`; }).join(', ');
  return `Escribe los textos de publicación para este video ya producido. Deben relacionarse con lo que se ve y se dice, conservar la voz de la marca y NO repetir literalmente el guion.
GUION FINAL: ${JSON.stringify({ title: script.title, hook: script.hook, promise: script.promise, sections: (script.sections || []).map((s) => s.voice), cta: script.cta })}
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
