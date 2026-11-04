// Regenera la lista de archivos del Service Worker y su versión de caché.
// Ejecuta `npm run sw` antes de cada publicación para que los usuarios reciban los cambios.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const include = ['index.html', 'manifest.webmanifest', 'css', 'js', 'assets'];
const exts = /\.(html|css|js|svg|png|webmanifest|woff2?)$/;
const files = [];
const walk = (p) => { const s = statSync(p); if (s.isDirectory()) readdirSync(p).forEach((f) => walk(join(p, f))); else if (exts.test(p)) files.push('./' + relative(root, p)); };
include.forEach((f) => walk(join(root, f)));
files.sort();
const sw = join(root, 'sw.js');
let src = readFileSync(sw, 'utf8');
const version = `cs-v${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12)}`;
src = src.replace(/const CACHE_VERSION = '[^']+';/, `const CACHE_VERSION = '${version}';`);
src = src.replace(/const SHELL = \[[\s\S]*?\];/, `const SHELL = [\n  './',\n${files.map((f) => `  '${f}',`).join('\n')}\n];`);
writeFileSync(sw, src);
console.log(`sw.js actualizado: ${files.length} archivos, versión ${version}`);
