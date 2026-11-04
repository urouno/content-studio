// Biblioteca de metodología compartida (la misma que recibe la IA).
import { icon, tabs } from '../core/ui.js';
import { esc } from '../core/utils.js';
import * as M from '../services/methodology.js';
import { pageHeader } from './shared.js';

const TABS = [
  { id: 'principios', label: 'Principios' }, { id: 'estructuras', label: 'Estructuras' }, { id: 'hooks', label: 'Hooks' },
  { id: 'cta', label: 'CTA' }, { id: 'niveles', label: 'Niveles y tipos' }, { id: 'edicion', label: 'Edición' }, { id: 'metricas', label: 'Métricas por objetivo' },
];

export function render(main, { params }) {
  let tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'principios';
  const draw = () => {
    main.innerHTML = `${pageHeader({ title: 'Método', sub: 'Base de conocimiento compartida por todas las marcas. Documentación completa con fuentes y niveles de evidencia en <code>docs/METODOLOGIA.md</code>.' })}
      ${tabs(TABS, tab)}<div class="method">${body(tab)}</div>`;
    main.querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; history.replaceState(null, '', `#/metodo/${tab}`); draw(); }));
  };
  draw();
}

function body(tab) {
  const legend = `<p class="xs muted">${Object.entries(M.EVIDENCE_LEGEND).map(([k, v]) => `<span class="ev">${k}</span> ${v}`).join(' · ')}</p>`;
  switch (tab) {
    case 'principios': return `<div class="grid g-2"><section class="card"><div class="card-h"><h3>Principios del sistema</h3></div><div class="card-b"><ol class="stack small">${M.PRINCIPLES.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></div></section>
      <section class="card"><div class="card-h"><h3>Reglas de guion</h3></div><div class="card-b"><ul class="stack small">${M.SCRIPT_RULES.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></section>
      <section class="card"><div class="card-h"><h3>Filtro antes de aprobar</h3></div><div class="card-b"><ul class="small">${M.PUBLISH_FILTER.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></div></section>
      <section class="card"><div class="card-h"><h3>El método en 10 pasos</h3></div><div class="card-b"><ol class="small">${['Propósito: objetivo, embudo, tipo y pilar', 'Problema del espectador con sus palabras', 'Validar interés con referencias', 'Promesa en una frase', 'Estructura según el objetivo', 'Hook en 4 capas', 'Desarrollo en 3 actos con picos crecientes', 'Cierre que resuelve + un CTA', 'Revisión con el evaluador', 'Aprender de los resultados (80/20)'].map((x) => `<li>${x}</li>`).join('')}</ol></div></section></div>`;
    case 'estructuras': return `<div class="grid g-3">${M.STRUCTURES.map((s) => `<section class="card"><div class="card-h"><h3>${esc(s.name)}</h3></div><div class="card-b small"><p class="muted">${esc(s.when)}</p><ol>${s.beats.map((b) => `<li>${esc(b)}</li>`).join('')}</ol><div class="row">${s.goal.map((g) => `<span class="tag">${esc(M.byId(M.OBJECTIVES, g)?.name || g)}</span>`).join('')}</div></div></section>`).join('')}</div>`;
    case 'hooks': return `<div class="grid g-2" style="margin-bottom:16px">${M.HOOK_LAYERS.map((l) => `<div class="card card-b"><b>${esc(l.name)}</b><p class="small muted" style="margin:0">${esc(l.desc)}</p></div>`).join('')}</div>
      <section class="card"><div class="card-h"><h3>Patrones de hook</h3><span class="xs muted">Plantillas abstraídas; no son copias literales</span></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Patrón</th><th>Plantilla</th><th>Uso</th></tr></thead><tbody>${M.HOOK_PATTERNS.map((h) => `<tr><td><b>${esc(h.name)}</b></td><td class="mono small">${esc(h.template)}</td><td class="small">${esc(h.use)}</td></tr>`).join('')}</tbody></table></div>
      <div class="card-f small"><b>Un hook funciona cuando:</b> se entiende en ≤ 3 s, es específico, nombra el problema con las palabras del público, abre una pregunta que el video cierra y su promesa se cumple. Las 4 capas dicen lo mismo por canales distintos.</div></section>`;
    case 'cta': return `<section class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>Objetivo</th><th>Mecanismo</th><th>Ejemplos de patrón</th></tr></thead><tbody>${M.CTA_TYPES.map((c) => `<tr><td><b>${esc(c.name)}</b></td><td class="small">${esc(c.mechanism)}</td><td class="small">${c.examples.map(esc).join('<br>')}</td></tr>`).join('')}</tbody></table></div>
      <div class="card-f small">Un solo CTA principal, conectado con lo que se acaba de ver, adecuado a la etapa del embudo y colocado tras resolver la promesa.</div></section>`;
    case 'niveles': return `<div class="grid g-2"><section class="card"><div class="card-h"><h3>Niveles de conocimiento</h3></div><div class="table-wrap"><table class="tbl"><tbody>${M.KNOWLEDGE_LEVELS.map((l) => `<tr><td><b>${l.id} · ${esc(l.name)}</b><div class="xs muted">${esc(l.desc)}</div></td><td class="small">${esc(l.rules)}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="card"><div class="card-h"><h3>Tipos de contenido</h3></div><div class="card-b stack small">${M.CONTENT_TYPES.map((t) => `<div><b>${esc(t.name)}</b> — ${esc(t.desc)}</div>`).join('')}<p class="xs muted">Todo video debe dejar claro a qué te dedicas, ser entretenido y ser profesional a la vez.</p></div></section></div>`;
    case 'edicion': return `<section class="card"><div class="card-b stack small">${M.EDITING_GUIDELINES.map((g) => `<div><span class="ev">${g.level}</span> ${esc(g.tip)}</div>`).join('')}${legend}</div></section>`;
    case 'metricas': return `<section class="card"><div class="table-wrap"><table class="tbl"><thead><tr><th>Objetivo</th><th>Métricas primarias</th><th>Métricas de control</th></tr></thead><tbody>${M.OBJECTIVES.map((o) => `<tr><td><b>${esc(o.name)}</b></td><td class="small mono">${o.primary.join(', ')}</td><td class="small mono">${o.control.join(', ')}</td></tr>`).join('')}</tbody></table></div>
      <div class="card-f small">${icon('info', 'ic-sm')} Las tasas se calculan por alcance; conversiones por 1 000 vistas. Se usan medianas y se muestra n. Las asociaciones no implican causalidad.</div></section>`;
    default: return '';
  }
}
