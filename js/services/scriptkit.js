// Utilidades de guion: normalización, métricas de texto y evaluador local (heurístico, sin IA).
import { wordCount, estimateSeconds, tokens } from '../core/utils.js';
import { WRITTEN_PHRASES, STRUCTURES, RESOURCE_TYPES, GRAPHICS_PRESETS, byId } from './methodology.js';

export function emptyScript(idea = {}) {
  return normalizeScript({
    title: idea.title || '', objective: idea.objective || '', audience: idea.audience || '', problem: idea.problem || '',
    promise: '', knowledgeLevel: idea.knowledgeLevel ?? 1, structureId: idea.format || '', contentType: idea.contentType || '',
    productionType: idea.productionType || 'cabeza', graphics: 'equilibrado',
    hook: { patternId: '', narrado: '', visual: idea.pitch?.firstFrameVisual || '', textual: idea.pitch?.firstFrameText || '', auditivo: '', p4: { ...(idea.pitch?.p4 || {}) } }, hookAlternatives: [],
    sections: [
      { act: 'inicio', beat: 'Contexto + problema', function: 'problema', voice: '', onScreenText: '', visual: '', edit: '', peak: 0 },
      { act: 'nudo', beat: 'Desarrollo', function: 'explicacion', voice: '', onScreenText: '', visual: '', edit: '', peak: 1 },
      { act: 'desenlace', beat: 'Resolución', function: 'resultado', voice: '', onScreenText: '', visual: '', edit: '', peak: 2 },
    ],
    cta: { type: '', text: '', visual: '' }, verify: [], visualNotes: '', editingNotes: '',
  });
}

const RES = { type: '', what: '', anchor: '' };
export const normalizeResource = (r) => (r && typeof r === 'object' ? { ...RES, ...r } : { ...RES });

export function normalizeScript(s = {}) {
  const hook = { patternId: '', narrado: '', visual: '', textual: '', auditivo: '', ...(s.hook || {}) };
  hook.p4 = { promesa: '', prueba: '', plan: '', persona: '', ...(hook.p4 || {}) };
  return {
    title: s.title || '', objective: s.objective || '', audience: s.audience || '', problem: s.problem || '', promise: s.promise || '',
    knowledgeLevel: Number.isFinite(Number(s.knowledgeLevel)) ? Number(s.knowledgeLevel) : 1,
    structureId: s.structureId || '', contentType: s.contentType || '', hook,
    productionType: s.productionType || 'cabeza', graphics: s.graphics || 'equilibrado',
    hookAlternatives: (s.hookAlternatives || []).map((h) => ({ patternId: '', narrado: '', visual: '', textual: '', auditivo: '', ...h })),
    sections: (s.sections || []).map((x) => ({ act: 'nudo', beat: '', function: '', voice: '', onScreenText: '', visual: '', edit: '', peak: 0, ...x, peak: Number(x.peak) || 0, resource: normalizeResource(x.resource) })),
    cta: { type: '', text: '', visual: '', ...(s.cta || {}) },
    verify: (s.verify || []).map((v) => (typeof v === 'string' ? { claim: v, reason: '' } : v)),
    visualNotes: s.visualNotes || '', editingNotes: s.editingNotes || '',
  };
}

export function spokenText(s) {
  return [s.hook?.narrado, ...(s.sections || []).map((x) => x.voice), s.cta?.text].filter(Boolean).join(' ');
}
export function scriptStats(s, wpm = 160) {
  const words = wordCount(spokenText(s));
  return { words, seconds: estimateSeconds(words, wpm) };
}

export function scriptToText(s, { brandName = '' } = {}) {
  const st = byId(STRUCTURES, s.structureId);
  const lines = [
    `# ${s.title}${brandName ? ` — ${brandName}` : ''}`,
    `Objetivo: ${s.objective} · Estructura: ${st?.name || s.structureId} · Nivel: ${s.knowledgeLevel}`,
    `Problema: ${s.problem}`, `Promesa: ${s.promise}`, '',
    `HOOK — Narrado: ${s.hook.narrado}`, `  Visual: ${s.hook.visual}`, `  Texto: ${s.hook.textual}`, `  Audio: ${s.hook.auditivo}`, '',
    ...s.sections.flatMap((x, i) => [`[${i + 1}] ${x.act.toUpperCase()} · ${x.beat}`, `  VOZ: ${x.voice}`, x.onScreenText && `  TEXTO: ${x.onScreenText}`, x.visual && `  VISUAL: ${x.visual}`, x.edit && `  EDICIÓN: ${x.edit}`,
      x.resource?.type && `  RECURSO: ${byId(RESOURCE_TYPES, x.resource.type)?.name || x.resource.type} — ${x.resource.what}${x.resource.anchor ? ` (entra en «${x.resource.anchor}»)` : ''}`].filter(Boolean)),
    '', `CTA (${s.cta.type}): ${s.cta.text}`,
    s.verify.length ? `\n⚠ VERIFICAR:\n${s.verify.map((v) => `- ${v.claim} (${v.reason})`).join('\n')}` : '',
  ];
  return lines.join('\n');
}

const sentenceSplit = (t) => String(t || '').split(/(?<=[.!?¿¡…])\s+/).map((x) => x.trim()).filter(Boolean);

/** Evaluador local. Devuelve hallazgos con severidad. No predice rendimiento. */
export function localEvaluate(s, { durationTarget, avoid = '', keyword = '', wpm = 160 } = {}) {
  const f = [];
  const add = (criterion, severity, text, fix = '') => f.push({ criterion, severity, text, fix, source: 'local' });
  const hookWords = wordCount(s.hook.narrado);
  if (!s.hook.narrado) add('hook', 'problema', 'Falta el hook narrado.', 'Escribe una primera frase de ≤ 12 palabras que nombre el problema del espectador.');
  else if (hookWords > 14) add('hook', 'problema', `El hook narrado tiene ${hookWords} palabras: difícil de decir en ~3 s.`, 'Recórtalo a ≤ 12 palabras.');
  else if (hookWords > 11) add('hook', 'mejorable', `El hook narrado tiene ${hookWords} palabras.`, 'Intenta dejarlo en 7–10 palabras.');
  if (!s.hook.visual) add('hook', 'mejorable', 'Sin hook visual: ¿qué se ve en los primeros 3 s?', 'Muestra el resultado, el problema o el objeto.');
  if (!s.hook.textual) add('hook', 'mejorable', 'Sin texto en pantalla inicial (mucha gente ve sin sonido).');
  else if (wordCount(s.hook.textual) > 8) add('hook', 'mejorable', 'El texto en pantalla del hook es largo (> 8 palabras).');
  if (!s.promise) add('promesa', 'problema', 'No hay promesa definida.', 'Escribe en una frase qué obtiene el espectador al terminar.');

  // Relación hook ↔ contenido: palabras clave del hook deben reaparecer en el desarrollo.
  const hookTok = new Set(tokens(`${s.hook.narrado} ${s.promise}`));
  const bodyTok = new Set(tokens(s.sections.map((x) => x.voice).join(' ')));
  const overlap = [...hookTok].filter((t) => bodyTok.has(t));
  if (hookTok.size >= 2 && bodyTok.size && overlap.length === 0) add('hook-contenido', 'problema', 'El desarrollo no retoma ninguna palabra clave del hook/promesa: riesgo de promesa incumplida.');
  const strip = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (keyword && !strip(`${s.hook.narrado} ${s.sections[0]?.voice || ''}`).includes(strip(keyword))) {
    add('hook', 'mejorable', `La palabra clave del público ("${keyword}") no aparece en el hook ni en la primera sección.`);
  }

  // Lenguaje
  const allVoice = spokenText(s);
  const lower = allVoice.toLowerCase();
  const written = WRITTEN_PHRASES.filter((p) => lower.includes(p));
  if (written.length) add('lenguaje', 'mejorable', `Expresiones poco orales: ${written.join(', ')}.`, 'Cámbialas por lenguaje cotidiano ("el primer paso es…").');
  const avoidList = String(avoid).split(/[,\n]/).map((x) => x.trim().toLowerCase()).filter(Boolean);
  const avoided = avoidList.filter((p) => lower.includes(p));
  if (avoided.length) add('lenguaje', 'problema', `Usa palabras prohibidas por la marca: ${avoided.join(', ')}.`);
  const longS = sentenceSplit(allVoice).filter((x) => wordCount(x) > 22);
  if (longS.length) add('lenguaje', 'mejorable', `${longS.length} frase(s) de más de 22 palabras. Ej.: "${longS[0].slice(0, 90)}…"`, 'Divide en frases de 8–15 palabras.');

  // Densidad y desarrollo
  s.sections.forEach((x, i) => {
    const w = wordCount(x.voice);
    if (!w && x.function !== 'cta') add('desarrollo', 'mejorable', `La sección ${i + 1} (${x.beat || x.act}) no tiene texto hablado.`);
    if (w > 70) add('densidad', 'mejorable', `La sección ${i + 1} tiene ${w} palabras: mucha información sin cambio de ritmo.`, 'Divide la sección o añade un cambio de plano/dato visual.');
  });
  const acts = new Set(s.sections.map((x) => x.act));
  if (!acts.has('inicio') || !acts.has('desenlace')) add('coherencia', 'mejorable', 'La estructura no tiene inicio y desenlace claros.');

  // Picos de atención
  const peaks = s.sections.map((x) => x.peak || 0);
  if (peaks.length && Math.max(...peaks) === 0) add('abandono', 'mejorable', 'No hay picos de interés marcados.', 'Identifica 2–3 momentos (mito, dato, giro, revelación) y distribúyelos en intensidad creciente.');
  else if (peaks.length >= 3) {
    const third = Math.ceil(peaks.length / 3);
    const first = Math.max(...peaks.slice(0, third)); const last = Math.max(...peaks.slice(-third));
    if (first > last) add('abandono', 'mejorable', 'Los picos de interés decrecen: lo más interesante está al principio y el final se debilita.', 'Reordena para que el momento más fuerte llegue cerca del final, o anticípalo en el hook.');
  }
  const middle = s.sections.slice(1, -1);
  const flat = middle.filter((x) => !x.peak && wordCount(x.voice) > 35);
  flat.forEach((x) => add('abandono', 'mejorable', `Posible punto de abandono: "${x.beat || 'sección'}" es larga y sin pico de interés.`));

  // CTA
  if (!s.cta.text) add('cta', 'problema', 'Falta el CTA.');
  else if (wordCount(s.cta.text) > 25) add('cta', 'mejorable', 'El CTA es largo; uno corto y específico suele sentirse más natural.');

  // Duración
  const { seconds } = scriptStats(s, wpm);
  if (durationTarget) {
    const diff = (seconds - durationTarget) / durationTarget;
    if (diff > 0.25) add('duracion', 'mejorable', `Duración estimada ${seconds} s vs. objetivo ${durationTarget} s (+${Math.round(diff * 100)} %).`, 'Usa "Reducir duración".');
    if (diff < -0.35) add('duracion', 'mejorable', `Duración estimada ${seconds} s, por debajo del objetivo ${durationTarget} s.`);
  }

  // Empaque: el gancho de las 4 P (si se usó) necesita la prueba: enseñar el resultado primero.
  const p4 = s.hook.p4 || {};
  if ((p4.promesa || p4.plan || p4.persona) && !p4.prueba) add('empaque', 'mejorable', 'El gancho no tiene «prueba»: enseñar el resultado en los primeros 3 s retiene más que prometerlo.', 'Describe en el hook visual qué resultado real se ve primero.');

  // Recursos visuales (gráficos, escenas, cámara): las reglas de la skill de edición.
  const preset = byId(GRAPHICS_PRESETS, s.graphics) || GRAPHICS_PRESETS[2];
  const res = s.sections.map((x, i) => ({ i, x, r: x.resource || {}, t: byId(RESOURCE_TYPES, x.resource?.type) })).filter((o) => o.r.type);
  const nKind = (k) => res.filter((o) => o.t?.kind === k).length;
  if (preset.id === 'sin' && res.some((o) => o.t && ['flotante', 'pantalla'].includes(o.t.kind))) add('recursos', 'mejorable', 'El video está marcado «sin gráficos» pero hay gráficos propuestos.');
  else {
    if (nKind('flotante') > preset.flotantes) add('recursos', 'problema', `${nKind('flotante')} gráficos flotantes para un tope de ${preset.flotantes} (${preset.name}).`, 'Quita los que no ilustren una frase clave o sube el tope.');
    if (nKind('pantalla') > preset.pantalla) add('recursos', 'problema', `${nKind('pantalla')} gráficos a pantalla completa para un tope de ${preset.pantalla} (${preset.name}).`, 'Más de 1-2 a pantalla completa cansa y tapa el video.');
  }
  const norm = (t) => strip(t).replace(/[^a-z0-9ñ% ]/g, ' ').replace(/\s+/g, ' ').trim();
  res.forEach(({ i, x, r, t }) => {
    const voiceN = norm(x.voice);
    if (r.anchor && voiceN && !voiceN.includes(norm(r.anchor))) add('recursos', 'problema', `El recurso de la sección ${i + 1} entra en «${r.anchor}», pero esa frase no está en lo que se dice.`, 'Usa como anclaje palabras exactas de la voz de esa sección.');
    if (!r.anchor && t?.kind !== 'camara') add('recursos', 'mejorable', `El recurso de la sección ${i + 1} no dice en qué frase entra.`);
    // Ninguna cifra que no se pronuncie (regla de la skill: lo bloquea al editar).
    const nums = String(r.what || '').match(/\d+(?:[.,]\d+)?/g) || [];
    const missing = nums.filter((n) => !String(x.voice).includes(n) && !voiceN.includes(n));
    if (missing.length) add('recursos', 'problema', `El recurso de la sección ${i + 1} muestra ${missing.join(', ')}, pero la voz no lo dice.`, 'Un número solo aparece en pantalla si se pronuncia. Quítalo o dilo en la voz.');
  });
  // Una enumeración en la voz pide una lista.
  const ENUM = /\b(dos|tres|cuatro|cinco|seis|siete|[2-7])\s+(razones|pasos|errores|cosas|formas|claves|tips|consejos|motivos|señales|ideas|maneras|trucos|beneficios|mitos)\b/i;
  s.sections.forEach((x, i) => {
    if (ENUM.test(x.voice) && preset.id !== 'sin' && !['lista', 'pasos', 'escena-iconos'].includes(x.resource?.type)) add('recursos', 'mejorable', `La sección ${i + 1} enumera («${x.voice.match(ENUM)[0]}»): una lista en pantalla ayuda a seguirla.`, 'Añade un recurso «Lista», «Pasos» o «Escena: lista con íconos».');
  });
  if (s.productionType === 'animado') {
    const sinEscena = s.sections.filter((x) => byId(RESOURCE_TYPES, x.resource?.type)?.kind !== 'escena' && wordCount(x.voice) > 6).length;
    if (sinEscena) add('recursos', 'problema', `${sinEscena} sección(es) sin escena en un video animado: cada idea necesita su escena (una cada 3-5 s).`);
  } else if (preset.id !== 'sin') {
    let run = 0;
    s.sections.forEach((x) => { if (x.resource?.type) run = 0; else { run += wordCount(x.voice); if (run > 75) { add('recursos', 'mejorable', 'Hay un tramo de más de ~25 s sin ningún recurso visual.', 'Un cambio visual cada pocos segundos sostiene la atención: añade un gráfico, una escena o un movimiento de cámara.'); run = -1e9; } } });
  }
  if (s.productionType !== 'cabeza' && res.some((o) => o.r.type === 'detras')) add('recursos', 'problema', 'La «palabra detrás de la cabeza» solo funciona con cabeza parlante.');

  // Bucle: en TikTok el video se repite solo; un final que empalma con el principio se ve otra vez.
  const lastTok = new Set(tokens(`${s.sections.at(-1)?.voice || ''} ${s.cta.text}`));
  const hookOnly = [...new Set(tokens(s.hook.narrado))];
  if (hookOnly.length >= 2 && lastTok.size && !hookOnly.some((t) => lastTok.has(t))) add('bucle', 'mejorable', 'El final no retoma nada del principio.', 'Si la última frase conecta con el hook, el video se ve otra vez al repetirse (TikTok y Reels lo repiten solos).');

  // Afirmaciones con cifras sin marcar para verificar
  const numeric = sentenceSplit(allVoice).filter((x) => /\d|por ciento|%/.test(x));
  const verified = s.verify.map((v) => String(v.claim || '').toLowerCase()).join(' ');
  const unmarked = numeric.filter((x) => !verified.includes(x.slice(0, 25).toLowerCase()));
  if (unmarked.length) add('veracidad', 'mejorable', `${unmarked.length} frase(s) con cifras sin marcar para verificar.`, 'Confirma la fuente o añádelas a "Verificar".');

  return f;
}
