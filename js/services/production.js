// Del guion aprobado al video editado, a través de la carpeta «Reels con Claude» conectada (ver folder.js).
// Escribe el encargo de cada video y lee lo que entrega la skill para marcar «Grabado» y «Editado» solos.
import { store } from '../core/store.js';
import * as F from './folder.js';
import {
  buildProyecto, buildGuionMd, buildPropuestaMd, buildVocab, reelFolderName, takeName, takesOf, finalOf, spokenFromPlan,
  buildMarcaJson, mergeStyleGuide, stripGuideBlock, parseMarcaJson, editOf, marcaFileName, guideFileName,
} from './reels.js';
import { scriptFor, ensureScript, approvedVersion, brandConfig, productionState, setRecorded, setEdited } from './workflow.js';

const REELS = 'Reels'; const TAKES = 'Tomas'; const STYLE = 'Mi estilo';

/** Carpeta del reel de un contenido: la guardada o, si se renombró, la que tenga su id en proyecto.json. */
export async function findReel(ideaId) {
  const saved = scriptFor(ideaId)?.reelFolder;
  if (saved && (await F.exists(`${REELS}/${saved}/proyecto.json`))) return saved;
  for (const d of (await F.list(REELS)).filter((x) => x.kind === 'directory')) {
    const p = await F.readJSON(`${REELS}/${d.name}/proyecto.json`);
    if (p?.contenido === ideaId) { const s = scriptFor(ideaId); if (s && s.reelFolder !== d.name) await store.update('scripts', s.id, { reelFolder: d.name }, { silent: true }); return d.name; }
  }
  return null;
}

/** Lo que hay en la carpeta para este contenido. */
export async function reelStatus(ideaId) {
  const takes = takesOf(ideaId, await F.list(TAKES));
  const folder = await findReel(ideaId);
  if (!folder) return { folder: null, takes, final: null, portada: false, proyecto: null };
  const files = await F.list(`${REELS}/${folder}`);
  return {
    folder, takes, final: finalOf(files), portada: files.some((f) => f.name === 'portada.png'),
    proyecto: await F.readJSON(`${REELS}/${folder}/proyecto.json`),
  };
}

/** Crea (o pone al día) el encargo del video en la carpeta. Devuelve el nombre de la carpeta del reel. */
export async function sendToEdit(ideaId, opts, folderName) {
  const idea = store.get('ideas', ideaId);
  const ver = approvedVersion(ideaId);
  if (!ver) throw new Error('Aprueba el guion antes de enviarlo a edición.');
  const brand = store.get('brands', idea.brandId); const config = brandConfig(idea.brandId);
  const name = String(folderName || '').trim() || (await findReel(ideaId)) || reelFolderName(idea);
  const base = `${REELS}/${name}`;
  const takes = takesOf(ideaId, await F.list(TAKES));
  // Si el proyecto ya existía (la skill lo pudo cambiar), se conserva lo suyo y se actualiza lo nuestro.
  const prev = (await F.readJSON(`${base}/proyecto.json`)) || {};
  const proyecto = { ...prev, ...buildProyecto({ idea, brand, config, opts, take: prev.toma || takes[0]?.name || '' }) };
  await F.writeText(`${base}/proyecto.json`, JSON.stringify(proyecto, null, 1));
  await F.writeText(`${base}/trabajo/guion-aprobado.md`, buildGuionMd({ idea, brand, script: ver.data }));
  await F.writeText(`${base}/trabajo/propuesta-graficos.md`, buildPropuestaMd({ script: ver.data, opts }));
  await F.writeText(`${base}/trabajo/vocab.txt`, buildVocab({ idea, brand, config }));
  const s = await ensureScript(idea);
  await store.update('scripts', s.id, { reelFolder: name, editOpts: opts }, { summary: 'Enviado a edición' });
  return name;
}

/** Copia una toma a Tomas/ con el id del contenido delante. */
export async function addTake(ideaId, file, onProgress) {
  const n = takesOf(ideaId, await F.list(TAKES)).length + 1;
  const ext = (file.name.match(/\.([a-z0-9]+)$/i) || [])[1] || 'mov';
  const name = takeName(ideaId, n, ext);
  await F.copyFile(`${TAKES}/${name}`, file, onProgress);
  // Si ya hay encargo sin toma, se le pone esta.
  const folder = await findReel(ideaId);
  if (folder) { const p = await F.readJSON(`${REELS}/${folder}/proyecto.json`); if (p && !p.toma) await F.writeText(`${REELS}/${folder}/proyecto.json`, JSON.stringify({ ...p, toma: name }, null, 1)); }
  return name;
}

/**
 * Marca «Grabado» y «Editado» según la carpeta, y guarda lo que se dijo de verdad para los copies.
 * Solo avanza (nunca desmarca) y no toca contenidos ya publicados. Devuelve lo que cambió.
 */
export async function syncStatus(ideaId, st = null) {
  const status = st || (await reelStatus(ideaId));
  const idea = store.get('ideas', ideaId); if (!idea) return [];
  const ps = productionState(idea); const changed = [];
  if (!ps.locked && !ps.recorded && (status.takes.length || status.final)) { await setRecorded(ideaId, true); changed.push('grabado'); }
  if (!productionState(store.get('ideas', ideaId)).locked && !productionState(store.get('ideas', ideaId)).edited && status.final) { await setEdited(ideaId, true); changed.push('editado'); }
  if (status.final && status.folder) {
    const s = scriptFor(ideaId);
    const text = spokenFromPlan(await F.readJSON(`${REELS}/${status.folder}/trabajo/plan.json`));
    if (s && text && text !== s.finalText) { await store.update('scripts', s.id, { finalText: text }, { silent: true }); changed.push('texto'); }
  }
  return changed;
}

/** Revisa todos los contenidos aprobados pendientes de grabar o editar. */
export async function syncAll() {
  const ideas = store.all('ideas').filter((i) => ['guion_aprobado', 'por_grabar', 'grabado'].includes(i.status));
  const out = [];
  for (const i of ideas) { const c = await syncStatus(i.id).catch(() => []); if (c.length) out.push({ idea: i, changed: c }); }
  return out;
}

// ---------- La marca, directamente en Mi estilo/ ----------

/**
 * Escribe Mi estilo/marcas/<marca>.json y la guía. Antes lee lo que haya en el disco y lo usa como base,
 * para no pisar lo que la skill afinó (editor en vivo, «Aprendido en los reels»).
 */
export async function saveBrandToFolder(brandId) {
  const brand = store.get('brands', brandId); const cfg = brandConfig(brandId); let edit = editOf(cfg);
  const jsonPath = `${STYLE}/marcas/${marcaFileName(brand, cfg)}`;
  const disk = await F.readJSON(jsonPath);
  if (disk) edit = { ...edit, raw: disk };
  const guidePath = `${STYLE}/${guideFileName(brand, { visual: { edit } })}`;
  const diskGuide = await F.readText(guidePath);
  if (diskGuide != null) edit = { ...edit, guide: stripGuideBlock(diskGuide), guideLinked: true };
  const config = { ...cfg, visual: { ...cfg.visual, edit } };
  const json = buildMarcaJson({ brand, config });
  await F.writeText(jsonPath, JSON.stringify(json, null, 1));
  const writeGuide = diskGuide != null || edit.guide || edit.guideLinked || !disk;
  if (writeGuide) await F.writeText(guidePath, mergeStyleGuide(edit.guide, { brand, config, assets: store.all('assets', { brandId }) }));
  await saveEdit(brandId, { ...edit, raw: json });
  return { json: jsonPath, guide: writeGuide ? guidePath : null };
}

/** Trae de la carpeta el archivo de la marca y su guía. */
export async function importBrandFromFolder(brandId) {
  const brand = store.get('brands', brandId); const cfg = brandConfig(brandId);
  const file = marcaFileName(brand, cfg);
  const disk = await F.readJSON(`${STYLE}/marcas/${file}`);
  if (!disk) throw new Error(`No hay Mi estilo/marcas/${file}. Escribe el nombre del archivo de la skill en «Nombre del archivo».`);
  let edit = { ...editOf(cfg), ...parseMarcaJson(disk, { fileName: file }) };
  const g = await F.readText(`${STYLE}/${guideFileName(brand, { visual: { edit } })}`);
  if (g != null) edit = { ...edit, guide: stripGuideBlock(g), guideImportedAt: new Date().toISOString(), guideLinked: true };
  await saveEdit(brandId, edit);
  return { guide: g != null };
}

/** Archivos de marca que ya tiene la skill (para elegir el nombre). */
export async function skillBrandFiles() { return (await F.list(`${STYLE}/marcas`)).filter((f) => f.kind === 'file' && f.name.endsWith('.json')).map((f) => f.name.replace(/\.json$/, '')); }

function saveEdit(brandId, edit) {
  const c = store.find('brandConfigs', (x) => x.brandId === brandId);
  return store.update('brandConfigs', c.id, (r) => ({ ...r, visual: { ...brandConfig(brandId).visual, edit } }));
}
