// Modelo de datos. Cada tabla local (IndexedDB) corresponde 1:1 con una hoja de Google Sheets.
// Mantener sincronizado con apps-script/Code.gs (TABLES) y docs/GOOGLE_SHEETS.md.

export const BASE_COLUMNS = ['id', 'brandId', 'createdAt', 'updatedAt', 'deletedAt', 'version', 'updatedBy'];

export const TABLES = {
  brands: { sheet: 'Marcas', prefix: 'MRC', cols: ['name', 'description', 'sector', 'valueProp', 'products', 'businessGoals', 'audience', 'painPoints', 'color', 'status', 'logoAssetId'] },
  brandConfigs: { sheet: 'ConfigMarca', prefix: 'CFG', cols: ['voice', 'visual', 'strategy'], json: ['voice', 'visual', 'strategy'] },
  platforms: { sheet: 'Plataformas', prefix: 'PLT', cols: ['platform', 'goal', 'formats', 'durationTarget', 'frequencyPerWeek', 'ctas', 'active'], json: ['formats', 'ctas'] },
  pillars: { sheet: 'Pilares', prefix: 'PIL', cols: ['name', 'description', 'objective', 'share'] },
  ideas: { sheet: 'Ideas', prefix: 'CNT', cols: ['title', 'topic', 'pillarId', 'audience', 'problem', 'keyword', 'objective', 'funnel', 'contentType', 'platforms', 'format', 'priority', 'status', 'difficulty', 'experimental', 'knowledgeLevel', 'owner', 'targetDate', 'references', 'notes', 'source', 'statusHistory'], json: ['platforms', 'statusHistory'] },
  scripts: { sheet: 'Guiones', prefix: 'GUI', cols: ['ideaId', 'currentVersionId', 'approvedVersionId', 'locked', 'publishFilter'], json: ['publishFilter'] },
  scriptVersions: { sheet: 'VersionesGuion', prefix: 'VER', cols: ['scriptId', 'ideaId', 'versionNo', 'label', 'origin', 'data', 'evaluation'], json: ['data', 'evaluation'] },
  copies: { sheet: 'Copies', prefix: 'CPY', cols: ['ideaId', 'platform', 'title', 'caption', 'description', 'ctaText', 'hashtags', 'coverText', 'variant', 'status'], json: ['hashtags'] },
  calendar: { sheet: 'Calendario', prefix: 'CAL', cols: ['ideaId', 'platform', 'date', 'time', 'owner', 'status', 'notes'] },
  publications: { sheet: 'Publicaciones', prefix: 'PUB', cols: ['ideaId', 'calendarId', 'platform', 'publishedAt', 'url', 'notes'] },
  results: { sheet: 'Resultados', prefix: 'RES', cols: ['publicationId', 'ideaId', 'platform', 'measuredAt', 'daysSincePublish', 'metrics', 'notes'], json: ['metrics'] },
  references: { sheet: 'Referencias', prefix: 'REF', cols: ['ideaId', 'kind', 'title', 'url', 'metrics', 'notes'] },
  hooks: { sheet: 'Hooks', prefix: 'HOK', cols: ['layer', 'patternId', 'text', 'objective', 'status', 'notes', 'sourceIdeaId'] },
  ctas: { sheet: 'CTA', prefix: 'CTA', cols: ['type', 'text', 'objective', 'status', 'notes'] },
  brandDocs: { sheet: 'DocumentosMarca', prefix: 'DOC', cols: ['docType', 'title', 'content', 'active', 'order', 'tasks'], json: ['tasks'] },
  assets: { sheet: 'Recursos', prefix: 'AST', cols: ['kind', 'name', 'url', 'notes', 'dataUrl'], localOnly: ['dataUrl'] },
  history: { sheet: 'Historial', prefix: 'HIS', cols: ['table', 'recordId', 'action', 'before', 'summary'], json: ['before'], appendOnly: true },
};

export const PIPELINE = [
  { id: 'idea', name: 'Idea registrada', group: 'ideas', color: '#94a3b8' },
  { id: 'aprobada', name: 'Idea aprobada', group: 'ideas', color: '#64748b' },
  { id: 'guion', name: 'Guion en desarrollo', group: 'guion', color: '#a78bfa' },
  { id: 'guion_aprobado', name: 'Guion aprobado', group: 'guion', color: '#7c3aed' },
  // Grabación (con el teléfono) y edición (con Claude) solo se registran como hechas o no.
  { id: 'por_grabar', name: 'Por grabar', group: 'grabar', color: '#f59e0b' },
  { id: 'grabado', name: 'Grabado · por editar', group: 'editar', color: '#d97706' },
  { id: 'listo', name: 'Editado', group: 'editado', color: '#0284c7' },
  { id: 'calendarizado', name: 'Calendarizado', group: 'publicacion', color: '#14b8a6' },
  { id: 'publicado', name: 'Publicado', group: 'publicacion', color: '#16a34a' },
  { id: 'analizado', name: 'Analizado', group: 'analisis', color: '#15803d' },
];
export const DISCARDED = { id: 'descartada', name: 'Descartada', color: '#ef4444' };
export const ALL_STATUSES = [...PIPELINE, DISCARDED];
export const statusIndex = (s) => PIPELINE.findIndex((p) => p.id === s);
export const statusInfo = (s) => ALL_STATUSES.find((p) => p.id === s) || PIPELINE[0];
// Estados antiguos que ya no existen y su equivalente actual.
export const LEGACY_STATUS = { edicion: 'grabado' };

export const PRIORITIES = [
  { id: 1, name: 'Alta' }, { id: 2, name: 'Media' }, { id: 3, name: 'Baja' },
];
export const DIFFICULTIES = [
  { id: 'facil', name: 'Fácil de grabar' }, { id: 'media', name: 'Media' }, { id: 'dificil', name: 'Difícil' },
];

// Métricas registrables. `platforms` limita dónde están disponibles (null = todas).
export const METRICS = [
  { id: 'views', name: 'Reproducciones', type: 'int' },
  { id: 'reach', name: 'Alcance (cuentas)', type: 'int' },
  { id: 'avgWatchSec', name: 'Tiempo medio de visualización (s)', type: 'float' },
  { id: 'durationSec', name: 'Duración del video (s)', type: 'float' },
  { id: 'avgPctViewed', name: '% medio visualizado', type: 'pct' },
  { id: 'completion', name: 'Tasa de finalización (%)', type: 'pct', platforms: ['tiktok', 'youtube'] },
  { id: 'retention3s', name: 'Retención a 3 s / Visto vs. deslizado (%)', type: 'pct' },
  { id: 'nonFollowerPct', name: '% alcance a no seguidores', type: 'pct', platforms: ['instagram', 'facebook', 'tiktok'] },
  { id: 'likes', name: 'Me gusta', type: 'int' },
  { id: 'comments', name: 'Comentarios', type: 'int' },
  { id: 'shares', name: 'Compartidos / envíos', type: 'int' },
  { id: 'saves', name: 'Guardados', type: 'int', platforms: ['tiktok', 'instagram', 'facebook'] },
  { id: 'follows', name: 'Nuevos seguidores', type: 'int' },
  { id: 'profileVisits', name: 'Visitas al perfil', type: 'int' },
  { id: 'clicks', name: 'Clics', type: 'int' },
  { id: 'inquiries', name: 'Consultas / DMs', type: 'int' },
  { id: 'conversions', name: 'Conversiones / ventas', type: 'int' },
];

export const DERIVED = [
  { id: 'avgPct', name: '% visto medio', fmt: 'pct', desc: 'Tiempo medio ÷ duración (o el valor registrado).' },
  { id: 'likeRate', name: 'Me gusta / alcance', fmt: 'pct' },
  { id: 'commentRate', name: 'Comentarios / alcance', fmt: 'pct' },
  { id: 'sendRate', name: 'Compartidos / alcance', fmt: 'pct' },
  { id: 'saveRate', name: 'Guardados / alcance', fmt: 'pct' },
  { id: 'followsPer1k', name: 'Seguidores / 1k vistas', fmt: 'num' },
  { id: 'clicksPer1k', name: 'Clics / 1k vistas', fmt: 'num' },
  { id: 'inquiriesPer1k', name: 'Consultas / 1k vistas', fmt: 'num' },
  { id: 'conversionsPer1k', name: 'Conversiones / 1k vistas', fmt: 'num' },
  { id: 'engagedViews', name: 'Vistas que llegan al final (estim.)', fmt: 'int', desc: 'Vistas × finalización (o × % visto) — aproximación.' },
];

export function defaultBrandConfig() {
  return {
    voice: {
      personality: '', tone: '', formality: 2, vocabulary: '', avoid: '', knowledgeLevel: 1,
      narrationStyle: '', approvedExamples: '', person: 'tú',
    },
    visual: {
      colors: [{ name: 'Principal', hex: '#4f46e5' }, { name: 'Acento', hex: '#f59e0b' }, { name: 'Texto', hex: '#111827' }],
      fonts: [{ role: 'Títulos', family: '' }, { role: 'Subtítulos', family: '' }],
      subtitleStyle: '', textPosition: 'Tercio central, fuera de zonas seguras', editingStyle: '', pace: '',
      graphics: '', music: '', sfx: '', transitions: 'Cortes simples', intro: '', outro: '', references: '',
    },
    strategy: { safeRatio: 80, wpm: 160, monthlyTarget: 8, notes: '' },
  };
}
