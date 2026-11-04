// Datos de demostración: dos marcas ficticias con contenidos en todas las etapas.
import { store } from '../core/store.js';
import { toDateKey, addDays, nowISO } from '../core/utils.js';
import { createBrand, ensureBrandConfig, productionFromScript, editionFromScript, brandConfig } from './workflow.js';
import { normalizeScript } from './scriptkit.js';

const d = (n) => toDateKey(addDays(new Date(), n));
const hist = (...steps) => steps.map(([to, days]) => ({ from: '', to, at: addDays(new Date(), days).toISOString(), note: 'demo' }));

export async function loadDemo() {
  // ---------- Marca 1 ----------
  const cafe = await createBrand({
    name: 'Tostadores Lumbre (demo)', sector: 'Café de especialidad · tienda online y cafetería', color: '#b45309',
    description: 'Tostador artesanal que vende café en grano y molido, cursos de barista y una cafetería.',
    valueProp: 'Café fresco tostado cada semana y explicado sin pedantería.',
    products: 'Café en grano y molido (bolsas de 250 g y 1 kg). Tueste semanal. Cursos de barista de 3 horas. Cafetería física. Envíos nacionales en 24–48 h.',
    businessGoals: 'Aumentar ventas online recurrentes y llenar los cursos mensuales.',
    audience: 'Personas que toman café en casa con cafetera italiana, de goteo o espresso doméstico y quieren que sepa mejor.',
    painPoints: 'El café me sale amargo\nNo sé qué molienda usar\nLa cafetera italiana me quema el café\nNo sé cuánto dura el café abierto',
  });
  const c1 = await ensureBrandConfig(cafe.id);
  await store.update('brandConfigs', c1.id, {
    voice: { personality: 'Cercana, curiosa, con humor suave', tone: 'Como un amigo barista que te explica sin juzgar', formality: 2, person: 'tú', vocabulary: 'tueste, molienda, extracción (explicada), cafetera italiana', avoid: 'notas organolépticas, terroir, exquisito, el mejor café del mundo', knowledgeLevel: 1, narrationStyle: 'A cámara, en la barra, con manos en acción', approvedExamples: '' },
    visual: { colors: [{ name: 'Tostado', hex: '#7c2d12' }, { name: 'Crema', hex: '#fef3c7' }, { name: 'Acento', hex: '#f59e0b' }], fonts: [{ role: 'Títulos', family: 'Fraunces' }, { role: 'Subtítulos', family: 'Inter' }], subtitleStyle: 'Inter Bold blanco con sombra, palabra clave en ámbar, máx. 2 líneas', textPosition: 'Tercio central, fuera de zonas seguras', editingStyle: 'Cortes secos, planos detalle de la cafetera', pace: 'Cambio de plano cada 2–3 s', transitions: 'Cortes simples', music: 'Lo-fi muy baja', sfx: 'Sonido real de la cafetera en el hook', graphics: 'Flechas simples en ámbar', intro: '', outro: 'Logo 1 s', references: '' },
    strategy: { safeRatio: 80, wpm: 165, monthlyTarget: 8, notes: 'Estrategia de largo plazo: ventas todos los meses.' },
  }, { silent: true });
  const pc = {};
  for (const [name, obj, desc] of [['Errores al preparar café', 'confianza', 'Errores comunes en casa y cómo evitarlos'], ['Detrás del tueste', 'comunidad', 'Proceso, equipo y origen'], ['Producto y cursos', 'conversion', 'Cafés, kits y cursos como solución']]) {
    pc[name] = (await store.create('pillars', { brandId: cafe.id, name, objective: obj, description: desc, share: null }, { silent: true })).id;
  }
  for (const [platform, goal, dur, freq] of [['tiktok', 'alcance', 40, 2], ['instagram', 'confianza', 40, 2]]) {
    await store.create('platforms', { brandId: cafe.id, platform, goal, formats: ['problema-solucion', 'lista', 'experimento'], durationTarget: dur, frequencyPerWeek: freq, ctas: ['guardados', 'comentarios', 'venta'], active: true }, { silent: true });
  }
  await store.create('hooks', { brandId: cafe.id, layer: 'narrado', patternId: 'si-dolor', text: 'Si tu café sale así, lo estás quemando', objective: 'confianza', status: 'aprobado', notes: 'Visual: chorro oscuro saliendo de la italiana' }, { silent: true });
  await store.create('hooks', { brandId: cafe.id, layer: 'narrado', patternId: '', text: 'Hola chicos, hoy os traigo un café nuevo', objective: '', status: 'evitar', notes: 'Saludo sin promesa' }, { silent: true });
  await store.create('ctas', { brandId: cafe.id, type: 'guardados', text: 'Guárdalo para tu próximo café', objective: 'confianza', status: 'aprobado' }, { silent: true });
  await store.create('ctas', { brandId: cafe.id, type: 'venta', text: 'Comenta MOLIENDA y te paso la guía con el café adecuado para tu cafetera', objective: 'conversion', status: 'aprobado' }, { silent: true });

  const script1 = normalizeScript({
    title: 'Café quemado en la italiana', objective: 'confianza', audience: 'Quien usa cafetera italiana en casa', problem: 'El café me sale amargo y con sabor a quemado',
    promise: 'Sabrás por qué se quema y cómo evitarlo en tres pasos', knowledgeLevel: 1, structureId: 'problema-solucion', contentType: 'familiaridad',
    hook: { patternId: 'si-dolor', narrado: 'Si te sale así, tu café está quemado', visual: 'Primer plano del café oscuro y burbujeante saliendo de la italiana', textual: '¿Tu café sabe a quemado?', auditivo: 'Borboteo fuerte de la cafetera' },
    hookAlternatives: [{ patternId: 'error', narrado: 'El error que comete casi todo el mundo con la italiana', visual: 'Mano apretando el café con una cuchara', textual: 'Error nº1 con la italiana', auditivo: '' }],
    sections: [
      { act: 'inicio', beat: 'Problema reconocible', function: 'problema', voice: 'Ese borboteo que oyes al final no es buena señal. Significa que el agua ya está demasiado caliente.', onScreenText: 'El borboteo = demasiado calor', visual: 'Plano de la cafetera en el fuego', edit: 'Zoom suave al pico', peak: 1 },
      { act: 'nudo', beat: 'Error 1', function: 'explicacion', voice: 'Primer error: apretar el café con la cuchara. El agua no pasa bien y se queda más tiempo en contacto.', onScreenText: 'No lo aprietes', visual: 'Cuchara aplastando el café vs. café suelto', edit: 'Pantalla partida', peak: 1 },
      { act: 'nudo', beat: 'Error 2', function: 'explicacion', voice: 'Segundo: el fuego al máximo. Ponlo a fuego medio y deja la tapa abierta para ver cuándo empieza a salir.', onScreenText: 'Fuego medio', visual: 'Mando del fuego', edit: '', peak: 2 },
      { act: 'desenlace', beat: 'Solución', function: 'resultado', voice: 'Y el truco: en cuanto salga clarito, apártala y pasa la base por agua fría. Así cortas la extracción y no se quema.', onScreenText: 'Agua fría = stop', visual: 'Base de la cafetera bajo el grifo', edit: 'Efecto sonoro de agua', peak: 3 },
    ],
    cta: { type: 'guardados', text: 'Guárdalo para tu próximo café.', visual: 'Taza servida' }, verify: [], visualNotes: 'Grabar en cocina con luz de ventana', editingNotes: 'Subtítulos con palabra clave en ámbar',
  });
  // createdAt anterior a la primera transición para que el ciclo idea → publicación sea realista.
  const mk = async (brandId, data) => {
    const first = (data.statusHistory || [])[0]?.at;
    const createdAt = first ? addDays(new Date(first), -5).toISOString() : addDays(new Date(), -3).toISOString();
    return store.create('ideas', { statusHistory: [], knowledgeLevel: 1, priority: 2, source: 'manual', references: '', notes: '', createdAt, ...data, brandId }, { silent: true });
  };

  // Contenido publicado con resultados
  const i1 = await mk(cafe.id, { title: 'Si te sale así, tu café está quemado', topic: 'Cafetera italiana', pillarId: pc['Errores al preparar café'], audience: 'Usuarios de cafetera italiana', problem: 'El café sale amargo', keyword: 'café quemado', objective: 'confianza', funnel: 'mofu', contentType: 'familiaridad', format: 'problema-solucion', platforms: ['tiktok', 'instagram'], priority: 1, status: 'analizado', difficulty: 'facil', statusHistory: hist(['aprobada', -30], ['guion_aprobado', -27], ['publicado', -21]) });
  const s1 = await store.create('scripts', { brandId: cafe.id, ideaId: i1.id, currentVersionId: null, approvedVersionId: null, locked: true, publishFilter: [true, true, true, true, true] }, { silent: true });
  const v1 = await store.create('scriptVersions', { brandId: cafe.id, scriptId: s1.id, ideaId: i1.id, versionNo: 1, label: 'Manual', origin: 'manual', data: script1, evaluation: null }, { silent: true });
  await store.update('scripts', s1.id, { currentVersionId: v1.id, approvedVersionId: v1.id }, { silent: true });
  await store.create('productions', { brandId: cafe.id, ideaId: i1.id, scriptVersionId: v1.id, ...productionFromScript(script1), observations: 'Grabado en una toma', recordedAt: addDays(new Date(), -25).toISOString() }, { silent: true });
  await store.create('editions', { brandId: cafe.id, ideaId: i1.id, scriptVersionId: v1.id, ...editionFromScript(script1, brandConfig(cafe.id)), editor: 'Marta', observations: '', readyAt: addDays(new Date(), -22).toISOString() }, { silent: true });
  await store.create('copies', { brandId: cafe.id, ideaId: i1.id, platform: 'instagram', variant: 1, title: '', caption: '¿Tu café de italiana sabe a quemado? No es la cafetera: son estos dos gestos.\n\n1. No aprietes el café.\n2. Fuego medio y tapa abierta.\nY el truco final: agua fría en la base.', description: '', ctaText: 'Guárdalo para tu próximo café', hashtags: ['#cafeteraitaliana', '#cafeencasa', '#trucosdecafe'], coverText: 'Café quemado: 3 errores', status: 'aprobado' }, { silent: true });

  // Varios publicados con resultados para que haya patrones
  const samples = [
    ['Si te sale así, tu café está quemado', 'si-dolor', 'problema-solucion', 'Errores al preparar café', 'tiktok', 42, { views: 184000, reach: 171000, avgWatchSec: 19.8, durationSec: 42, completion: 21, retention3s: 71, likes: 9800, comments: 412, shares: 2300, saves: 5100, follows: 1450, profileVisits: 3900, inquiries: 38, conversions: 21 }],
    ['3 cafés que no deberías comprar en el súper', 'lista', 'lista', 'Errores al preparar café', 'tiktok', 48, { views: 96000, reach: 90000, avgWatchSec: 17.1, durationSec: 48, completion: 14, retention3s: 64, likes: 4100, comments: 690, shares: 900, saves: 2100, follows: 610, profileVisits: 1700, inquiries: 12, conversions: 6 }],
    ['Hemos cogido 4 cafés y los hemos catado a ciegas', 'experimento', 'experimento', 'Detrás del tueste', 'instagram', 55, { views: 61000, reach: 52000, avgWatchSec: 26.4, durationSec: 55, likes: 3300, comments: 280, shares: 610, saves: 700, follows: 390, profileVisits: 980, inquiries: 9, conversions: 3 }],
    ['Así tostamos 30 kilos un martes', 'pov', 'historia', 'Detrás del tueste', 'instagram', 38, { views: 14000, reach: 12500, avgWatchSec: 12.2, durationSec: 38, likes: 820, comments: 41, shares: 60, saves: 90, follows: 70, profileVisits: 300, inquiries: 2, conversions: 1 }],
    ['¿Molido o en grano? Lo que nadie te dice', 'sabias', 'pregunta-frecuente', 'Producto y cursos', 'tiktok', 35, { views: 45000, reach: 43000, avgWatchSec: 15.8, durationSec: 35, completion: 24, retention3s: 69, likes: 2100, comments: 350, shares: 400, saves: 1300, follows: 260, profileVisits: 800, inquiries: 25, conversions: 14 }],
    ['El error que comete casi todo el mundo con la molienda', 'error', 'problema-solucion', 'Errores al preparar café', 'instagram', 40, { views: 72000, reach: 66000, avgWatchSec: 18.0, durationSec: 40, likes: 3900, comments: 210, shares: 1500, saves: 3200, follows: 520, profileVisits: 1400, inquiries: 19, conversions: 9 }],
  ];
  let k = 0;
  for (const [title, hookP, struct, pillar, platform, dur, metrics] of samples) {
    k++;
    const idea = k === 1 ? i1 : await mk(cafe.id, { title, pillarId: pc[pillar], objective: struct === 'historia' ? 'comunidad' : 'confianza', contentType: struct === 'historia' ? 'memorable' : 'familiaridad', format: struct, platforms: [platform], status: 'analizado', statusHistory: hist(['publicado', -10 - k * 4]) });
    if (k > 1) {
      const sc = await store.create('scripts', { brandId: cafe.id, ideaId: idea.id, currentVersionId: null, approvedVersionId: null, locked: true, publishFilter: [] }, { silent: true });
      const data = normalizeScript({ ...script1, title, structureId: struct, hook: { ...script1.hook, patternId: hookP, narrado: title }, cta: { type: k % 2 ? 'guardados' : 'comentarios', text: k % 2 ? 'Guárdalo' : '¿Cuál usas tú? Te leo' } });
      const vv = await store.create('scriptVersions', { brandId: cafe.id, scriptId: sc.id, ideaId: idea.id, versionNo: 1, label: 'Demo', origin: 'manual', data, evaluation: null }, { silent: true });
      await store.update('scripts', sc.id, { currentVersionId: vv.id, approvedVersionId: vv.id }, { silent: true });
    }
    const pubDate = d(-10 - k * 4);
    const cal = await store.create('calendar', { brandId: cafe.id, ideaId: idea.id, platform, date: pubDate, time: '13:00', owner: 'Marta', status: 'publicado', notes: '' }, { silent: true });
    const pub = await store.create('publications', { brandId: cafe.id, ideaId: idea.id, calendarId: cal.id, platform, publishedAt: pubDate, url: '', notes: '' }, { silent: true });
    await store.create('results', { brandId: cafe.id, ideaId: idea.id, publicationId: pub.id, platform, measuredAt: d(-2), daysSincePublish: 8 + k * 4, metrics, notes: '' }, { silent: true });
  }

  // Contenidos en distintas etapas
  await mk(cafe.id, { title: 'Cuánto dura un café abierto (y cómo guardarlo)', pillarId: pc['Errores al preparar café'], problem: 'No sé cuánto dura el café una vez abierto', keyword: 'café abierto', objective: 'confianza', contentType: 'familiaridad', format: 'pregunta-frecuente', platforms: ['tiktok', 'instagram'], status: 'idea', priority: 1 });
  await mk(cafe.id, { title: '¿Me cambias tu café de cápsula por una bolsa recién tostada?', pillarId: pc['Producto y cursos'], problem: 'Creen que el café de cápsula es igual', objective: 'alcance', contentType: 'memorable', format: 'experimento', platforms: ['tiktok'], status: 'aprobada', experimental: true, difficulty: 'dificil' });
  const iG = await mk(cafe.id, { title: 'Molienda correcta para cada cafetera', pillarId: pc['Errores al preparar café'], problem: 'No sé qué molienda usar', keyword: 'molienda', objective: 'conversion', contentType: 'venta', format: 'lista', platforms: ['instagram', 'tiktok'], status: 'guion', owner: 'Marta' });
  const sG = await store.create('scripts', { brandId: cafe.id, ideaId: iG.id, currentVersionId: null, approvedVersionId: null, locked: false, publishFilter: [] }, { silent: true });
  const vG = await store.create('scriptVersions', { brandId: cafe.id, scriptId: sG.id, ideaId: iG.id, versionNo: 1, label: 'Borrador', origin: 'manual', data: normalizeScript({ ...script1, title: 'Molienda correcta para cada cafetera', structureId: 'lista', promise: '', hook: { patternId: 'lista', narrado: 'Hola a todos, en el día de hoy vamos a hablar de la molienda adecuada para cada tipo de cafetera que tengas en casa', visual: '', textual: '', auditivo: '' } }), evaluation: null }, { silent: true });
  await store.update('scripts', sG.id, { currentVersionId: vG.id }, { silent: true });
  const iR = await mk(cafe.id, { title: 'Curso de barista: lo que aprenderás en 3 horas', pillarId: pc['Producto y cursos'], objective: 'conversion', contentType: 'venta', format: 'todo-saber', platforms: ['instagram'], status: 'por_grabar', owner: 'Luis' });
  await store.create('calendar', { brandId: cafe.id, ideaId: iR.id, platform: 'instagram', date: d(2), time: '19:00', owner: 'Luis', status: 'programado', notes: '' }, { silent: true });
  const iE = await mk(cafe.id, { title: 'Tueste claro vs. oscuro: ¿cuál es más fuerte?', pillarId: pc['Detrás del tueste'], objective: 'interaccion', contentType: 'familiaridad', format: 'comparativa', platforms: ['tiktok'], status: 'edicion', owner: 'Marta' });
  await store.create('calendar', { brandId: cafe.id, ideaId: iE.id, platform: 'tiktok', date: d(5), time: '13:00', owner: 'Marta', status: 'programado', notes: '' }, { silent: true });
  const iL = await mk(cafe.id, { title: 'Hemos cogido café de hace 6 meses y uno de esta semana', pillarId: pc['Detrás del tueste'], objective: 'alcance', contentType: 'memorable', format: 'experimento', platforms: ['tiktok', 'instagram'], status: 'listo' });
  await store.create('calendar', { brandId: cafe.id, ideaId: iL.id, platform: 'tiktok', date: d(-1), time: '13:00', owner: 'Marta', status: 'programado', notes: '' }, { silent: true });

  // ---------- Marca 2 ----------
  const dent = await createBrand({
    name: 'Clínica Arcada (demo)', sector: 'Clínica dental · ortodoncia', color: '#0d9488',
    description: 'Clínica dental local especializada en ortodoncia invisible y odontología general.',
    valueProp: 'Explicamos cada tratamiento con claridad antes de empezar.',
    products: 'Ortodoncia invisible, brackets, limpiezas, blanqueamiento, implantes. Primera visita de valoración.',
    businessGoals: 'Conseguir primeras visitas de ortodoncia en la ciudad.', audience: 'Adultos de 25–45 años que dudan si ponerse ortodoncia.',
    painPoints: '¿Duele la ortodoncia?\n¿Cuánto dura el tratamiento?\nCómo limpiar los retenedores',
  });
  const c2 = await ensureBrandConfig(dent.id);
  await store.update('brandConfigs', c2.id, {
    voice: { personality: 'Profesional, tranquila, empática', tone: 'Claro y sin tecnicismos', formality: 3, person: 'tú', vocabulary: 'retenedor, alineador, valoración', avoid: 'dolor cero, garantizado, milagro, el mejor dentista', knowledgeLevel: 0, narrationStyle: 'Doctora a cámara en consulta; B-roll del tratamiento', approvedExamples: '' },
    visual: { colors: [{ name: 'Turquesa', hex: '#0d9488' }, { name: 'Blanco', hex: '#ffffff' }, { name: 'Grafito', hex: '#1f2937' }], fonts: [{ role: 'Títulos', family: 'Poppins' }, { role: 'Subtítulos', family: 'Poppins' }], subtitleStyle: 'Poppins SemiBold, fondo blanco redondeado', textPosition: 'Centro', editingStyle: 'Limpio, clínico', pace: 'Calmado', transitions: 'Cortes', music: 'Sin música o muy baja', sfx: '', graphics: 'Iconos lineales turquesa', intro: '', outro: '', references: '' },
    strategy: { safeRatio: 80, wpm: 150, monthlyTarget: 6, notes: '' },
  }, { silent: true });
  await store.create('platforms', { brandId: dent.id, platform: 'instagram', goal: 'conversion', formats: ['pregunta-frecuente', 'todo-saber'], durationTarget: 45, frequencyPerWeek: 1.5, ctas: ['info', 'dm'], active: true }, { silent: true });
  const pd = (await store.create('pillars', { brandId: dent.id, name: 'Dudas de ortodoncia', objective: 'confianza', description: '', share: null }, { silent: true })).id;
  await mk(dent.id, { title: 'Si acabas de terminar la ortodoncia, así se limpia el retenedor', pillarId: pd, problem: 'No sé limpiar el retenedor', keyword: 'retenedores', objective: 'confianza', contentType: 'familiaridad', format: 'paso-a-paso', platforms: ['instagram'], status: 'idea', knowledgeLevel: 0 });
  const iD = await mk(dent.id, { title: '¿Duele la ortodoncia invisible? Respuesta honesta', pillarId: pd, problem: 'Miedo al dolor', objective: 'conversion', contentType: 'venta', format: 'pregunta-frecuente', platforms: ['instagram'], status: 'aprobada', priority: 1, knowledgeLevel: 0 });
  await store.create('calendar', { brandId: dent.id, ideaId: iD.id, platform: 'instagram', date: d(3), time: '18:00', owner: '', status: 'programado', notes: '' }, { silent: true });
  return { at: nowISO() };
}
