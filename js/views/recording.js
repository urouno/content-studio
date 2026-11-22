// Modo grabación (lo que Sloth llama «Preparar para grabar»): todo lo que hace falta delante al grabar un guion aprobado.
//   Plan: el primer cuadro con las zonas seguras de la skill de edición, variantes del gancho, el guion segundo a segundo
//         y la lista de lo que hay que preparar.
//   Teleprompter: a pantalla completa (sirve en el celular), a la velocidad de habla de la marca.
import { store } from '../core/store.js';
import { icon, toast, emptyState } from '../core/ui.js';
import { esc, wordCount } from '../core/utils.js';
import { approvedVersion, scriptFor, brandConfig } from '../services/workflow.js';
import { normalizeScript } from '../services/scriptkit.js';
import { PLATFORMS, PRODUCTION_TYPES, HOOK_4P, RESOURCE_TYPES, byId } from '../services/methodology.js';
import { editOf, SAFE_ZONE } from '../services/reels.js';
import { pageHeader } from './shared.js';

const LS = 'cs.prep.'; // casillas de «Qué preparar» (solo en este dispositivo)
const readChecks = (id) => { try { return JSON.parse(localStorage.getItem(LS + id)) || {}; } catch { return {}; } };
const writeChecks = (id, v) => { try { localStorage.setItem(LS + id, JSON.stringify(v)); } catch { /* */ } };
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/** El guion en tramos con su segundo de inicio y fin, según las palabras por minuto de la marca. */
export function timeline(script, wpm = 160) {
  const s = normalizeScript(script);
  const per = 60 / (wpm || 160);
  const rows = []; let t = 0;
  const push = (kind, label, voice, screen, visual, resource) => { const d = Math.max(1, Math.round(wordCount(voice) * per)); rows.push({ kind, label, voice, screen, visual, resource, from: t, to: t + d }); t += d; };
  if (s.hook.narrado) push('hook', 'Gancho', s.hook.narrado, s.hook.textual, s.hook.visual, null);
  s.sections.forEach((x, i) => push('section', x.beat || `Parte ${i + 1}`, x.voice, x.onScreenText, x.visual, x.resource?.type ? x.resource : null));
  if (s.cta.text) push('cta', 'CTA', s.cta.text, '', s.cta.visual, null);
  return { rows, total: t };
}

/** Qué preparar antes de grabar: lo que pide el guion y lo básico según el tipo de producción. */
export function prepList(script, production = 'cabeza') {
  const s = normalizeScript(script);
  const items = [];
  if (s.hook.visual) items.push({ id: 'primer-cuadro', text: `Primer cuadro: ${s.hook.visual}`, group: 'Del guion' });
  s.sections.forEach((x, i) => {
    if (x.visual) items.push({ id: `toma-${i}`, text: `Toma de la parte ${i + 1}: ${x.visual}`, group: 'Del guion' });
    if (x.resource?.type === 'broll') items.push({ id: `broll-${i}`, text: `Toma de apoyo: ${x.resource.what || x.visual}`, group: 'Del guion' });
    if (x.resource?.type === 'escena-foto') items.push({ id: `foto-${i}`, text: `Foto para la escena: ${x.resource.what}`, group: 'Del guion' });
  });
  if (s.cta.visual) items.push({ id: 'cta', text: `Para el cierre: ${s.cta.visual}`, group: 'Del guion' });
  (s.verify || []).filter((v) => v.claim).forEach((v, i) => items.push({ id: `verif-${i}`, text: `Comprobar antes de grabar: ${v.claim}`, group: 'Del guion' }));
  const basic = {
    cabeza: ['Celular en vertical, a la altura de los ojos', 'Luz de frente (una ventana o un aro), nunca detrás', 'Micrófono cerca o lugar sin eco', 'Pantalla limpia: sin notificaciones (modo avión)', 'Deja 1 s de silencio al empezar y al terminar cada toma', 'Graba el guion entero 2 o 3 veces: la skill corta lo que sobra'],
    producto: ['Celular en vertical, con el producto limpio y bien iluminado', 'Una toma por frase del guion (ver la tabla)', 'Cada toma de 3 a 6 s, con un movimiento suave', 'La voz en off, aparte y en un lugar sin eco'],
    animado: ['Graba la voz en un lugar sin eco (o elige voz clonada al editar)', 'Ten a mano las fotos o capturas que pide el guion'],
  }[production] || [];
  basic.forEach((t, i) => items.push({ id: `base-${i}`, text: t, group: 'Para grabar bien' }));
  return items;
}

export function render(main, { params }) {
  const [id, mode] = params;
  const idea = store.get('ideas', id);
  const ver = idea && approvedVersion(id);
  if (!idea || !ver) {
    main.innerHTML = `<div class="card">${emptyState(idea ? 'El guion aún no está aprobado' : 'Contenido no encontrado', 'El modo grabación usa el guion aprobado.', idea ? `<a class="btn btn-primary" href="#/contenido/${id}/guion">Ir al guion</a>` : '<a class="btn" href="#/contenidos">Contenidos</a>', 'camera')}</div>`;
    return null;
  }
  const s = normalizeScript(ver.data);
  const cfg = brandConfig(idea.brandId);
  const wpm = cfg.strategy?.wpm || 160;
  const production = s.productionType || idea.productionType || 'cabeza';
  const plat = (idea.platforms || [])[0] || 'tiktok';
  const target = Number(store.find('platforms', (x) => x.brandId === idea.brandId && x.platform === plat)?.durationTarget) || byId(PLATFORMS, plat)?.defaultDuration || 45;
  const { rows, total } = timeline(s, wpm);
  if (mode === 'teleprompter') return teleprompter(main, idea, s, wpm);

  const sub = editOf(cfg).raw?.subtitulos || {};
  const subY = Number(sub.y) || 1300; const subH = Number(sub.alto) || 260;
  const variants = [...new Set([...(String(idea.pitch?.variants || '').split('\n')), ...s.hookAlternatives.map((h) => h.textual || h.narrado)].map((x) => String(x || '').trim()).filter(Boolean))];
  const checks = readChecks(id);
  const prep = prepList(s, production);
  const groups = [...new Set(prep.map((p) => p.group))];
  const pct = (v) => `${(v / 1920) * 100}%`;

  main.innerHTML = `${pageHeader({ title: idea.title, crumbs: `<a href="#/contenido/${id}/guion">${esc(idea.title)}</a>${icon('right', 'ic-sm')}<span>Modo grabación</span>`,
    sub: `${esc(byId(PRODUCTION_TYPES, production)?.name || '')} · ≈ ${mmss(total)} a ${wpm} palabras/min · objetivo ${target} s`,
    actions: production === 'animado' ? '' : `<a class="btn btn-primary" href="#/grabar/${id}/teleprompter">${icon('camera')}Abrir teleprompter</a>` })}
    ${Math.abs(total - target) / target > 0.25 ? `<div class="notice warn" style="margin-bottom:12px">${icon('alert')}<div><p>El guion dura ≈ ${total} s y el objetivo es ${target} s. Puedes ajustarlo en el guion antes de grabar.</p></div></div>` : ''}
    <div class="split rec-split">
      <div class="stack-lg">
        <section class="card"><div class="card-h"><h3>${icon('list')}Segundo a segundo</h3><span class="xs muted">Al ritmo de la marca (${wpm} palabras/min)</span></div>
          <div class="table-wrap"><table class="tbl rec-tbl"><thead><tr><th>Segundo</th><th>Lo que se dice</th><th>Texto en pantalla</th><th>Lo que se ve</th></tr></thead><tbody>
          ${rows.map((r) => `<tr class="${r.kind}"><td class="nowrap mono xs">${mmss(r.from)}–${mmss(r.to)}<div class="muted">${esc(r.label)}</div></td><td>${esc(r.voice)}</td><td class="small">${esc(r.screen || '')}</td>
            <td class="small">${esc(r.visual || '')}${r.resource ? `<div class="xs"><span class="tag">${esc(byId(RESOURCE_TYPES, r.resource.type)?.name || r.resource.type)}</span> ${esc(r.resource.what || '')}</div>` : ''}</td></tr>`).join('')}
          </tbody></table></div></section>
        <section class="card"><div class="card-h"><h3>${icon('check')}Qué preparar</h3><span class="xs muted">Se guarda en este dispositivo</span></div><div class="card-b stack">
          ${groups.map((g) => `<div class="divider-label">${esc(g)}</div>${prep.filter((p) => p.group === g).map((p) => `<label class="check"><input type="checkbox" data-prep="${esc(p.id)}" ${checks[p.id] ? 'checked' : ''}><span>${esc(p.text)}</span></label>`).join('')}`).join('')}
        </div></section>
      </div>
      <aside class="stack-lg">
        <section class="card"><div class="card-h"><h3>${icon('image')}Primer cuadro</h3></div><div class="card-b stack">
          <div class="frame916" aria-label="Encuadre vertical con zonas seguras">
            <div class="fz top" style="height:${pct(SAFE_ZONE.top)}"><span>interfaz</span></div>
            <div class="fz bottom" style="height:${pct(SAFE_ZONE.bottom)}"><span>interfaz</span></div>
            <div class="fz right" style="width:${(SAFE_ZONE.right / 1080) * 100}%;top:${pct(SAFE_ZONE.top)};bottom:${pct(SAFE_ZONE.bottom)}"></div>
            ${production === 'cabeza' ? `<div class="fz face" style="top:${pct(300)};height:${pct(700)}"><span>tu cara</span></div>` : ''}
            <div class="fz subs" style="top:${pct(subY)};height:${pct(subH)}"><span>subtítulos</span></div>
            ${s.hook.textual ? `<div class="ff-text">${esc(s.hook.textual)}</div>` : ''}
          </div>
          ${s.hook.visual ? `<p class="small" style="margin:0"><b>Se ve:</b> ${esc(s.hook.visual)}</p>` : ''}
          <p class="xs muted" style="margin:0">Nada importante en los ${SAFE_ZONE.top} px de arriba, ${SAFE_ZONE.bottom} de abajo ni ${SAFE_ZONE.right} de la derecha: los tapa la interfaz de la red.${production === 'cabeza' ? ' Deja libre la franja de la cara: los gráficos van debajo de la barbilla.' : ''}</p>
        </div></section>
        <section class="card"><div class="card-h"><h3>${icon('target')}Gancho</h3></div><div class="card-b stack small">
          <p style="margin:0"><b>«${esc(s.hook.narrado)}»</b></p>
          ${Object.values(s.hook.p4 || {}).some(Boolean) ? HOOK_4P.filter((p) => s.hook.p4[p.id]).map((p) => `<div><span class="muted">${esc(p.name)}:</span> ${esc(s.hook.p4[p.id])}</div>`).join('') : ''}
          ${variants.length ? `<div class="divider-label">Variantes para probar</div>${variants.map((v) => `<div>· ${esc(v)}</div>`).join('')}<p class="xs muted" style="margin:0">Graba también la primera frase con una o dos variantes: así puedes publicar otra versión o probar una en cada red.</p>` : ''}
        </div></section>
      </aside>
    </div>`;
  main.querySelectorAll('[data-prep]').forEach((cb) => cb.addEventListener('change', () => { const c = readChecks(id); c[cb.dataset.prep] = cb.checked; writeChecks(id, c); }));
  return null;
}

// ---------- Teleprompter ----------
function teleprompter(main, idea, s, wpm) {
  const blocks = [
    s.hook.narrado && { label: 'Gancho', text: s.hook.narrado },
    ...s.sections.map((x, i) => x.voice && { label: x.beat || `Parte ${i + 1}`, text: x.voice }),
    s.cta.text && { label: 'Cierre', text: s.cta.text },
  ].filter(Boolean);
  const words = blocks.reduce((n, b) => n + wordCount(b.text), 0);
  const pref = (() => { try { return JSON.parse(localStorage.getItem('cs.prompter')) || {}; } catch { return {}; } })();
  const state = { size: pref.size || 44, speed: 1, mirror: !!pref.mirror, playing: false, y: 0, last: 0, raf: 0, lock: null };
  main.innerHTML = `<div class="prompter ${state.mirror ? 'mirror' : ''}" data-p tabindex="0">
    <div class="pr-scroll"><div class="pr-text" style="font-size:${state.size}px">
      <div class="pr-pad"></div>${blocks.map((b) => `<p><span class="pr-label">${esc(b.label)}</span>${esc(b.text)}</p>`).join('')}<div class="pr-pad"></div></div></div>
    <div class="pr-guide"></div>
    <div class="pr-bar">
      <a class="pr-btn" href="#/grabar/${idea.id}" title="Salir">${icon('x')}</a>
      <button class="pr-btn" data-restart title="Desde el principio">${icon('refresh')}</button>
      <button class="pr-btn main" data-play title="Empezar o pausar (barra espaciadora)">${icon('camera')}<span>Empezar</span></button>
      <span class="pr-group"><button class="pr-btn" data-slow title="Más lento">−</button><span data-speed>${wpm} p/min</span><button class="pr-btn" data-fast title="Más rápido">+</button></span>
      <span class="pr-group"><button class="pr-btn" data-small title="Letra más pequeña">A−</button><button class="pr-btn" data-big title="Letra más grande">A+</button></span>
      <button class="pr-btn" data-mirror title="Espejo (para pantallas con cristal)">⇋</button>
      <button class="pr-btn" data-full title="Pantalla completa">⤢</button>
    </div></div>`;
  const root = main.querySelector('[data-p]'); const sc = root.querySelector('.pr-scroll'); const tx = root.querySelector('.pr-text');
  const save = () => { try { localStorage.setItem('cs.prompter', JSON.stringify({ size: state.size, mirror: state.mirror })); } catch { /* */ } };
  // Velocidad: palabras por minuto de la marca → píxeles por segundo según lo que ocupa el texto.
  const pxPerSec = () => {
    const pads = [...tx.querySelectorAll('.pr-pad')].reduce((n, p) => n + p.offsetHeight, 0);
    const secs = (words / (wpm * state.speed)) * 60;
    return secs > 0 ? Math.max(5, (tx.scrollHeight - pads) / secs) : 30;
  };
  const tick = (ts) => {
    if (!state.playing) return;
    const dt = state.last ? (ts - state.last) / 1000 : 0; state.last = ts;
    sc.scrollTop += pxPerSec() * dt;
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2) { stop(); return; }
    state.raf = requestAnimationFrame(tick);
  };
  const playBtn = root.querySelector('[data-play] span');
  const start = async () => {
    state.playing = true; state.last = 0; playBtn.textContent = 'Pausa'; root.classList.add('playing');
    try { state.lock = await navigator.wakeLock?.request('screen'); } catch { /* sin bloqueo de pantalla */ }
    state.raf = requestAnimationFrame(tick);
  };
  const stop = () => { state.playing = false; cancelAnimationFrame(state.raf); playBtn.textContent = 'Seguir'; root.classList.remove('playing'); state.lock?.release?.().catch(() => {}); state.lock = null; };
  const toggle = () => (state.playing ? stop() : start());
  const speedLbl = root.querySelector('[data-speed]');
  const setSpeed = (k) => { state.speed = Math.min(2, Math.max(0.5, Math.round((state.speed + k) * 10) / 10)); speedLbl.textContent = `${Math.round(wpm * state.speed)} p/min`; };
  const setSize = (k) => { state.size = Math.min(96, Math.max(24, state.size + k)); tx.style.fontSize = `${state.size}px`; save(); };
  root.querySelector('[data-play]').onclick = toggle;
  root.querySelector('[data-restart]').onclick = () => { stop(); sc.scrollTop = 0; playBtn.textContent = 'Empezar'; };
  root.querySelector('[data-slow]').onclick = () => setSpeed(-0.1);
  root.querySelector('[data-fast]').onclick = () => setSpeed(0.1);
  root.querySelector('[data-small]').onclick = () => setSize(-4);
  root.querySelector('[data-big]').onclick = () => setSize(4);
  root.querySelector('[data-mirror]').onclick = () => { state.mirror = !state.mirror; root.classList.toggle('mirror', state.mirror); save(); };
  root.querySelector('[data-full]').onclick = () => (document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen?.().catch(() => toast('Este navegador no deja usar pantalla completa.', 'info')));
  sc.addEventListener('click', toggle); // tocar el texto pausa o sigue
  const onKey = (e) => {
    if (e.code === 'Space') { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSpeed(0.1); } else if (e.key === 'ArrowDown') { e.preventDefault(); setSpeed(-0.1); }
    else if (e.key === 'Escape' && !document.fullscreenElement) location.hash = `#/grabar/${idea.id}`;
  };
  document.addEventListener('keydown', onKey);
  document.body.classList.add('prompter-on');
  root.focus();
  return () => { stop(); document.removeEventListener('keydown', onKey); document.body.classList.remove('prompter-on'); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
}
