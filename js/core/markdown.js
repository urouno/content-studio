// Markdown → HTML seguro (sin dependencias). Escapa todo antes de dar formato.
// Admite: cabeceras, párrafos, listas (con viñetas, numeradas y de tareas), citas, separadores,
// tablas simples, código, negrita, cursiva, enlaces http(s) y comentarios <!-- --> como notas de ayuda.
import { esc } from './utils.js';

function inline(t) {
  return t
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<i>$2</i>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\[(COMPLETAR|VERIFICAR|DATO A CONFIRMAR)([^\]]*)\]/g, '<mark>[$1$2]</mark>');
}

export function mdToHtml(src, { hints = true } = {}) {
  // Los comentarios se convierten en marcadores antes de escapar para mostrarlos como ayuda.
  const notes = [];
  let text = String(src || '').replace(/\r/g, '').replace(/<!--([\s\S]*?)-->/g, (_, c) => { notes.push(c.trim()); return `\u0000${notes.length - 1}\u0000`; });
  text = esc(text);
  const lines = text.split('\n');
  const out = []; let list = null; let para = []; let i = 0;
  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join('<br>'))}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  while (i < lines.length) {
    const l = lines[i];
    const note = /^\s*\u0000(\d+)\u0000\s*$/.exec(l);
    if (note) { flushPara(); closeList(); if (hints) out.push(`<p class="md-hint">${esc(notes[Number(note[1])])}</p>`); i++; continue; }
    const line = l.replace(/\u0000(\d+)\u0000/g, '');
    if (/^```/.test(line)) {
      flushPara(); closeList();
      const buf = []; i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      out.push(`<pre>${buf.join('\n')}</pre>`); i++; continue;
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) { flushPara(); closeList(); const lv = Math.min(6, h[1].length + 1); out.push(`<h${lv}>${inline(h[2])}</h${lv}>`); i++; continue; }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); closeList(); out.push('<hr>'); i++; continue; }
    if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      flushPara(); closeList();
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()));
      const head = cells(line); i += 2; const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]));
      out.push(`<div class="table-wrap"><table class="tbl"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const q = /^\s*&gt;\s?(.*)$/.exec(line);
    if (q) { flushPara(); closeList(); out.push(`<blockquote>${inline(q[1])}</blockquote>`); i++; continue; }
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line); const ol = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      flushPara();
      const tag = ul ? 'ul' : 'ol';
      if (list !== tag) { closeList(); out.push(`<${tag}>`); list = tag; }
      let item = (ul || ol)[1];
      const task = /^\[( |x|X)\]\s+(.*)$/.exec(item);
      if (task) item = `${task[1].trim() ? '☑' : '☐'} ${task[2]}`;
      out.push(`<li>${inline(item)}</li>`); i++; continue;
    }
    if (!line.trim()) { flushPara(); closeList(); i++; continue; }
    closeList(); para.push(line); i++;
  }
  flushPara(); closeList();
  return out.join('\n');
}
