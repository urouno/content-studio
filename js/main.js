import { initStore, store } from './core/store.js';
import { requestPersistence } from './core/db.js';
import { settings, applyTheme } from './core/settings.js';
import { on } from './core/events.js';
import { app, go } from './core/app.js';
import { icon, toast, delegate } from './core/ui.js';
import { esc, fmtRelative } from './core/utils.js';
import { startAutoSync, syncState, syncNow } from './services/sync.js';
import { isConfigured } from './services/api.js';
import { migrateLegacyStatuses } from './services/workflow.js';

import * as dashboard from './views/dashboard.js';
import * as ideas from './views/ideas.js';
import * as contents from './views/contents.js';
import * as content from './views/content.js';
import * as calendar from './views/calendar.js';
import * as results from './views/results.js';
import * as brands from './views/brands.js';
import * as method from './views/method.js';
import * as settingsView from './views/settings.js';

const NAV = [
  { path: '/', label: 'Inicio', icon: 'home', view: dashboard },
  { path: '/ideas', label: 'Ideas', icon: 'bulb', view: ideas },
  { path: '/contenidos', label: 'Contenidos', icon: 'film', view: contents },
  { path: '/calendario', label: 'Calendario', icon: 'calendar', view: calendar },
  { path: '/resultados', label: 'Resultados', icon: 'chart', view: results },
  { path: '/marcas', label: 'Marcas', icon: 'brand', view: brands },
  { path: '/metodo', label: 'Método', icon: 'book', view: method },
];
const ROUTES = [
  ...NAV,
  { path: '/contenido', view: content },
  { path: '/ajustes', view: settingsView },
];

let current = { cleanup: null, path: null };

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, query = ''] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean);
  const base = `/${parts[0] || ''}`;
  return { base: base === '/' ? '/' : base, params: parts.slice(1).map(decodeURIComponent), query: Object.fromEntries(new URLSearchParams(query)) };
}

async function route() {
  const { base, params, query } = parseHash();
  const r = ROUTES.find((x) => x.path === base) || NAV[0];
  try { current.cleanup?.(); } catch (e) { console.error(e); }
  const main = document.getElementById('main');
  main.innerHTML = '';
  renderNav(base);
  try {
    current = { cleanup: (await r.view.render(main, { params, query })) || null, path: base };
  } catch (e) {
    console.error(e);
    main.innerHTML = `<div class="notice danger">${icon('alert')}<div><b>Error al mostrar esta vista.</b><p>${esc(e.message)}</p></div></div>`;
  }
  if (current.path !== base) window.scrollTo(0, 0);
  main.focus({ preventScroll: true });
}

function renderNav(base) {
  const nav = document.getElementById('mainnav');
  const bId = app.brandId;
  const pendingIdeas = store.all('ideas', { brandId: bId }).filter((i) => i.status === 'idea').length;
  nav.innerHTML = NAV.map((n) => `<a href="#${n.path}" class="${n.path === base ? 'active' : ''}" ${n.path === base ? 'aria-current="page"' : ''}>${icon(n.icon)}<span>${n.label}</span>${n.path === '/ideas' && pendingIdeas ? `<em>${pendingIdeas}</em>` : ''}</a>`).join('');
  renderBrandSwitch();
}

function renderBrandSwitch() {
  const host = document.getElementById('brand-switch');
  const b = app.brand();
  host.innerHTML = `<button class="brand-btn" aria-haspopup="true" aria-expanded="false" title="Cambiar de marca">
    <span class="brand-dot" style="background:${esc(b?.color || 'conic-gradient(#6366f1,#f59e0b,#14b8a6,#6366f1)')}"></span>
    <span class="truncate">${esc(b?.name || 'Todas las marcas')}</span>${icon('down', 'ic-sm')}</button>`;
}

function openBrandMenu(btn) {
  const host = document.getElementById('brand-switch');
  if (host.querySelector('.menu')) { host.querySelector('.menu').remove(); btn.setAttribute('aria-expanded', 'false'); return; }
  const cur = app.brandId;
  const menu = document.createElement('div');
  menu.className = 'menu'; menu.setAttribute('role', 'menu');
  menu.innerHTML = `<button data-b="all" class="${cur === 'all' ? 'active' : ''}"><span class="brand-dot" style="background:conic-gradient(#6366f1,#f59e0b,#14b8a6,#6366f1)"></span>Todas las marcas</button><div class="sep"></div>
    ${app.activeBrands().map((x) => `<button data-b="${x.id}" class="${cur === x.id ? 'active' : ''}"><span class="brand-dot" style="background:${esc(x.color)}"></span><span class="truncate">${esc(x.name)}</span></button>`).join('') || '<p class="muted small" style="padding:6px 9px">Aún no hay marcas.</p>'}
    <div class="sep"></div><a href="#/marcas?new=1">${icon('plus')}Nueva marca</a>`;
  host.append(menu); btn.setAttribute('aria-expanded', 'true');
  menu.querySelector('button')?.focus();
  const close = (e) => { if (!host.contains(e.target)) { menu.remove(); btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('mousedown', close); } };
  document.addEventListener('mousedown', close);
  menu.addEventListener('click', (e) => {
    const t = e.target.closest('[data-b]');
    if (t) { app.setBrand(t.dataset.b); menu.remove(); route(); }
    if (e.target.closest('a')) menu.remove();
  });
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { menu.remove(); btn.focus(); } });
}

function renderSyncPill() {
  const el = document.getElementById('sync-pill');
  const pending = store.pendingCount();
  const s = syncState.status;
  const labels = {
    unconfigured: 'Solo local', offline: 'Sin conexión', syncing: 'Sincronizando…', error: 'Error de sync', ok: 'Sincronizado', idle: isConfigured() ? 'Conectado' : 'Solo local',
  };
  const cls = s === 'unconfigured' || (!isConfigured() && s !== 'offline') ? '' : s;
  el.className = `sync-pill ${cls}`;
  el.innerHTML = `<span class="dot"></span>${labels[s] || 'Local'}${pending && isConfigured() ? ` · ${pending}` : ''}${syncState.conflicts ? ` · ⚠ ${syncState.conflicts}` : ''}`;
  el.title = [
    isConfigured() ? `Última sincronización: ${fmtRelative(syncState.lastSync)}` : 'Los datos se guardan solo en este navegador. Configura Google Sheets en Ajustes.',
    pending ? `${pending} cambios pendientes de subir` : '',
    syncState.lastError ? `Error: ${syncState.lastError}` : '',
    syncState.conflicts ? `${syncState.conflicts} conflictos por resolver` : '',
  ].filter(Boolean).join('\n');
}

function updateOnline() {
  document.getElementById('offline-banner').hidden = navigator.onLine;
  renderSyncPill();
}

async function boot() {
  applyTheme();
  try { await initStore(); } catch (e) {
    document.getElementById('main').innerHTML = `<div class="notice danger">${icon('alert')}<div><b>No se pudo abrir la base de datos local.</b><p>${esc(e.message)}. Si estás en modo privado o abriste el archivo con file://, consulta el README (ejecución local).</p></div></div>`;
    return;
  }
  requestPersistence();
  // Estados antiguos (p. ej. "En edición") → equivalentes actuales. También tras recibir cambios remotos.
  await migrateLegacyStatuses().catch((e) => console.warn('Migración de estados', e));
  on('change', (p) => { if (p?.remote || p?.import) migrateLegacyStatuses().catch(() => {}); });
  delegate(document.getElementById('brand-switch'), 'click', '.brand-btn', (e, el) => openBrandMenu(el));
  document.getElementById('sync-pill').addEventListener('click', async () => {
    if (!isConfigured()) { go('/ajustes/conexion'); return; }
    if (syncState.conflicts) { go('/ajustes/conflictos'); return; }
    try { const r = await syncNow(); if (!r.skipped) toast(`Sincronizado: ${r.pushed} enviados, ${r.pulled} recibidos${r.conflicts ? `, ${r.conflicts} conflictos` : ''}`, r.conflicts ? 'info' : 'success'); } catch (e) { toast(e.message, 'error'); }
  });
  on('sync', renderSyncPill); on('outbox', renderSyncPill);
  on('toast', ({ msg, type }) => toast(msg, type));
  on('settings', () => applyTheme());
  window.addEventListener('online', updateOnline); window.addEventListener('offline', updateOnline);
  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', (e) => { if (document.querySelector('.save-ind.dirty, .save-ind.saving')) { e.preventDefault(); e.returnValue = ''; } });
  // Cambios remotos (sincronización): refresca la vista si el usuario no está escribiendo.
  on('change', (p) => { if (p?.remote || p?.import || p?.wipe) { const a = document.activeElement; if (!a || !/INPUT|TEXTAREA|SELECT/.test(a.tagName)) route(); } });

  if (location.protocol === 'file:') toast('Abierto como archivo local: el modo sin conexión y algunos módulos no funcionan. Usa un servidor local (ver README).', 'error', { timeout: 12000 });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) toast('Hay una nueva versión de la app.', 'info', { timeout: 0, action: { label: 'Actualizar', fn: () => { nw.postMessage('skipWaiting'); } } });
        });
      });
    }).catch((e) => console.warn('SW no registrado', e));
    // Recarga solo cuando una versión nueva reemplaza a otra (no en la primera instalación).
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
  }
  updateOnline();
  startAutoSync();
  await route();
}

boot();
