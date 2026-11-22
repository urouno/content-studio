import { store, conflicts } from '../core/store.js';
import { settings } from '../core/settings.js';
import { on } from '../core/events.js';
import { icon, tabs, toast, confirmDialog, withBusy, emptyState, modal } from '../core/ui.js';
import { esc, download, fmtDateTime, fmtRelative, fmtNum } from '../core/utils.js';
import { estimateStorage } from '../core/db.js';
import { TABLES } from '../core/schema.js';
import { call, isConfigured } from '../services/api.js';
import { syncNow, fullPull, syncState, resolveConflict } from '../services/sync.js';
import { listModels, usageToday, generate, AI_PROVIDERS, aiChain, modelFor, providerInfo } from '../services/ai.js';
import { loadDemo } from '../services/demo.js';
import * as F from '../services/folder.js';
import { syncAll } from '../services/production.js';
import { pageHeader } from './shared.js';

const TABS = [
  { id: 'conexion', label: 'Conexión y sync', icon: 'cloud' }, { id: 'ia', label: 'IA (proveedores)', icon: 'sparkle' }, { id: 'carpeta', label: 'Carpeta de reels', icon: 'film' },
  { id: 'datos', label: 'Datos y copias', icon: 'download' }, { id: 'papelera', label: 'Papelera', icon: 'trash' },
  { id: 'conflictos', label: 'Conflictos', icon: 'alert' }, { id: 'apariencia', label: 'Apariencia', icon: 'eye' },
];

export function render(main, { params }) {
  let tab = TABS.some((t) => t.id === params[0]) ? params[0] : 'conexion';
  const draw = async () => {
    const nConf = (await conflicts.all()).length;
    main.innerHTML = `${pageHeader({ title: 'Ajustes' })}${tabs(TABS.map((t) => ({ ...t, count: t.id === 'conflictos' ? nConf || null : t.id === 'papelera' ? store.trash().length || null : null })), tab)}<div class="settings-body"></div>`;
    main.querySelectorAll('[data-tab]').forEach((t) => t.addEventListener('click', () => { tab = t.dataset.tab; history.replaceState(null, '', `#/ajustes/${tab}`); draw(); }));
    const host = main.querySelector('.settings-body');
    await ({ conexion, ia, carpeta, datos, papelera, conflictos: conflictsTab, apariencia })[tab](host, draw);
  };
  draw();
  return on('sync', () => { if (tab === 'conexion') { const el = main.querySelector('[data-syncstate]'); if (el) el.innerHTML = syncInfo(); } });
}

const syncInfo = () => `<div class="stack small"><div class="row-between"><span>Estado</span><b>${esc(({ unconfigured: 'Sin configurar (solo local)', idle: 'Conectado', ok: 'Sincronizado', syncing: 'Sincronizando…', offline: 'Sin conexión', error: 'Error' })[syncState.status] || syncState.status)}</b></div><div class="row-between"><span>Última sincronización</span><b>${fmtRelative(syncState.lastSync)}</b></div><div class="row-between"><span>Cambios pendientes</span><b>${store.pendingCount()}</b></div><div class="row-between"><span>Conflictos</span><b>${syncState.conflicts || 0}</b></div>${syncState.lastError ? `<div class="notice danger">${icon('alert')}<div>${esc(syncState.lastError)}</div></div>` : ''}</div>`;

function conexion(host) {
  host.innerHTML = `<div class="split"><section class="card"><div class="card-h"><h3>Google Sheets vía Apps Script</h3></div><div class="card-b stack">
    <ol class="small conn-steps">
      <li>Pega la <b>URL de la aplicación web</b> que te dio Apps Script al pulsar <i>Implementar</i> (empieza por <code>https://script.google.com/macros/s/</code> y termina en <code>/exec</code>).</li>
      <li>Pega el <b>token</b> que apareció en el <i>Registro de ejecución</i> al ejecutar <code>instalar</code>.</li>
      <li>Pulsa <b>Guardar</b>, después <b>Probar conexión</b> y, si sale en verde, <b>Sincronizar ahora</b>.</li>
    </ol>
    <p class="xs muted">El token identifica a esta persona; no es la clave de Gemini, que se queda guardada en Apps Script. Guía completa: <code>GUIA-DE-INSTALACION.html</code>.</p>
    <label class="field"><span>URL del Web App (termina en /exec)</span><input class="input mono" data-url value="${esc(settings.get('syncUrl'))}" placeholder="https://script.google.com/macros/s/…/exec"></label>
    <label class="field"><span>Token de acceso</span><input class="input mono" type="password" data-token value="${esc(settings.get('token'))}" autocomplete="off"></label>
    <label class="check"><input type="checkbox" data-auto ${settings.get('autoSync') ? 'checked' : ''}>Sincronizar automáticamente (al editar, cada 2 min y al recuperar la conexión)</label>
    <div class="row"><button class="btn btn-primary" data-save>${icon('check')}Guardar</button><button class="btn" data-test>${icon('refresh')}Probar conexión</button><button class="btn" data-sync ${isConfigured() ? '' : 'disabled'}>${icon('cloud')}Sincronizar ahora</button><button class="btn" data-pull ${isConfigured() ? '' : 'disabled'}>${icon('download')}Descarga completa</button><button class="btn" data-setup ${isConfigured() ? '' : 'disabled'}>${icon('layers')}Crear/verificar hojas</button></div>
    <div data-out></div></div></section>
    <aside class="stack-lg"><section class="card"><div class="card-h"><h3>Sincronización</h3></div><div class="card-b" data-syncstate>${syncInfo()}</div></section>
    <section class="card"><div class="card-b small stack"><b>Cómo funciona</b><p class="muted" style="margin:0">Todo se guarda primero en este navegador (IndexedDB). Los cambios se ponen en cola y se envían a Google Sheets cuando hay conexión. Si otra persona modificó el mismo registro, se marca un <b>conflicto</b> para que decidas qué versión conservar. Nada se borra físicamente en Sheets: se usa eliminación lógica.</p></div></section></aside></div>`;
  const out = host.querySelector('[data-out]');
  const persist = () => settings.set({ syncUrl: host.querySelector('[data-url]').value.trim(), token: host.querySelector('[data-token]').value.trim(), autoSync: host.querySelector('[data-auto]').checked });
  host.querySelector('[data-save]').onclick = () => {
    const url = host.querySelector('[data-url]').value.trim();
    if (url && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url)) { toast('La URL debe ser https://script.google.com/macros/s/…/exec', 'error'); return; }
    persist(); toast('Conexión guardada', 'success'); conexion(host);
  };
  host.querySelector('[data-test]').onclick = (e) => withBusy(e.currentTarget, async () => {
    persist();
    try { const r = await call('ping'); out.innerHTML = `<div class="notice ok">${icon('check')}<div><b>Conectado como ${esc(r.user?.name || 'usuario')} (${esc(r.user?.role || '')}).</b><p>Hoja: ${esc(r.spreadsheet || '')} · IA: ${r.providers ? (Object.entries(r.providers).filter(([, v]) => v).map(([k]) => esc(providerInfo(k).name)).join(', ') || 'sin claves') : `Gemini ${r.gemini ? 'sí' : 'no'}`} · versión ${esc(r.version || '')}</p></div></div>`; } catch (err) { out.innerHTML = `<div class="notice danger">${icon('alert')}<div><b>No se pudo conectar.</b><p>${esc(err.message)}</p></div></div>`; }
  }, 'Probando…');
  host.querySelector('[data-sync]').onclick = (e) => withBusy(e.currentTarget, async () => { try { const r = await syncNow(); toast(`Enviados ${r.pushed}, recibidos ${r.pulled}${r.conflicts ? `, ${r.conflicts} conflictos` : ''}`, 'success'); } catch (err) { toast(err.message, 'error'); } }, 'Sincronizando…');
  host.querySelector('[data-pull]').onclick = async (e) => { if (!(await confirmDialog({ title: 'Descarga completa', message: 'Se descargarán todos los registros de Sheets. Los cambios locales pendientes se envían primero y no se sobrescriben.', confirm: 'Descargar' }))) return; withBusy(e.target.closest('button'), async () => { try { const r = await fullPull(); toast(`Recibidos ${r.pulled} registros`, 'success'); } catch (err) { toast(err.message, 'error'); } }, 'Descargando…'); };
  host.querySelector('[data-setup]').onclick = (e) => withBusy(e.currentTarget, async () => { try { const r = await call('setup'); toast(`Hojas verificadas: ${r.created?.length || 0} creadas, ${r.checked?.length || 0} existentes`, 'success'); } catch (err) { toast(err.message, 'error'); } }, 'Verificando…');
}

function ia(host) {
  const mode = settings.get('aiMode'); const u = usageToday();
  let chain = aiChain();
  let configured = null; // proveedores con clave en Apps Script (se pregunta al servidor)
  const models = { ...(settings.get('aiModels') || {}) };
  AI_PROVIDERS.forEach((p) => { if (!models[p.id]) models[p.id] = modelFor(p.id); });

  const rowsHtml = () => {
    const order = [...chain, ...AI_PROVIDERS.map((p) => p.id).filter((id) => !chain.includes(id))];
    return order.map((id) => {
      const p = providerInfo(id); const on = chain.includes(id); const i = chain.indexOf(id);
      const st = configured == null ? '' : configured[id] ? `<span class="badge ok">${icon('check', 'ic-sm')}clave configurada</span>` : '<span class="badge">sin clave</span>';
      return `<div class="prov-row ${on ? '' : 'off'}" data-p="${id}">
        <div class="row-between" style="gap:8px;flex-wrap:wrap">
          <label class="check"><input type="checkbox" data-on ${on ? 'checked' : ''}><span><b>${on ? `${i + 1}. ` : ''}${esc(p.name)}</b>${p.paid ? ' <span class="badge warn">de pago</span>' : ' <span class="badge ok">gratis</span>'}${p.search ? ' <span class="badge">búsqueda web</span>' : ''} ${st}</span></label>
          <div class="row" style="gap:4px">${on ? `<button class="icon-btn sm" data-up title="Subir" ${i === 0 ? 'disabled' : ''}>${icon('down', 'ic-sm rot180')}</button>` : ''}</div>
        </div>
        <p class="xs muted" style="margin:4px 0">${esc(p.note)}</p>
        ${on ? `<div class="row" style="gap:6px"><input class="input input-sm mono" data-model value="${esc(models[id] || '')}" list="models-${id}" style="flex:1" aria-label="Modelo de ${esc(p.name)}"><button class="btn btn-sm" data-models>${icon('list', 'ic-sm')}Modelos</button><datalist id="models-${id}"></datalist></div>
          <small class="hint">${id === 'gemini' || id === 'claude' ? 'Modelo concreto.' : '<code>auto</code> = el mejor disponible en tu cuenta.'}</small>` : ''}
      </div>`;
    }).join('');
  };

  host.innerHTML = `<div class="split"><section class="card"><div class="card-h"><h3>Inteligencia artificial</h3></div><div class="card-b stack">
    <div class="field"><span>Modo de conexión</span>
      <label class="check"><input type="radio" name="mode" value="proxy" ${mode === 'proxy' ? 'checked' : ''}><span><b>Seguro (recomendado):</b> a través de Apps Script. Las claves se guardan en las propiedades del script y nunca llegan al navegador.</span></label>
      <label class="check"><input type="radio" name="mode" value="direct" ${mode === 'direct' ? 'checked' : ''}><span><b>Directo (solo pruebas locales, solo Gemini):</b> la clave se guarda en esta pestaña y se envía desde el navegador.</span></label>
      <label class="check"><input type="radio" name="mode" value="off" ${mode === 'off' ? 'checked' : ''}><span><b>Desactivada:</b> la app funciona sin IA.</span></label></div>
    <label class="field" ${mode === 'direct' ? '' : 'hidden'} data-keyf><span>API Key de Gemini (se borra al cerrar el navegador)</span><input class="input mono" type="password" data-key value="${esc(settings.getDirectKey())}" autocomplete="off"></label>
    <div class="field" data-chainf ${mode === 'proxy' ? '' : 'hidden'}><span>Proveedores, en orden</span>
      <small class="hint">Se prueba el primero; si falla (cuota, saturación, sin clave), responde el siguiente. Para investigar se usan primero los que tienen búsqueda web.</small>
      <div class="stack" data-rows style="gap:8px;margin-top:6px">${rowsHtml()}</div></div>
    <label class="field"><span>Límite local de solicitudes al día</span><input class="input" type="number" min="0" data-limit value="${settings.get('aiDailyLimit')}"><small class="hint">Protección adicional de cuota. 0 = sin límite local.</small></label>
    <div class="row"><button class="btn btn-primary" data-save>${icon('check')}Guardar</button><button class="btn btn-ai" data-test>${icon('sparkle')}Probar cada proveedor</button></div><div data-out></div>
  </div></section>
  <aside class="stack-lg"><section class="card"><div class="card-h"><h3>Uso hoy (este dispositivo)</h3></div><div class="card-b stack small"><div class="row-between"><span>Solicitudes</span><b>${u.requests}</b></div><div class="row-between"><span>Tokens</span><b>${fmtNum(u.tokens)}</b></div>
    ${Object.entries(u.byProvider || {}).map(([p, n]) => `<div class="row-between xs muted"><span>${esc(providerInfo(p).name)}</span><span>${n}</span></div>`).join('')}</div></section>
  <section class="card"><div class="card-b small stack"><b>Dónde va cada clave</b>
    <p class="xs muted" style="margin:0">En Apps Script → Configuración del proyecto → Propiedades del script. Nunca en la app ni en el repositorio.</p>
    ${AI_PROVIDERS.map((p) => `<div><code>${p.key}</code>: ${esc(p.where)}</div>`).join('')}
    <p class="xs muted" style="margin:0">Después de añadir una clave no hace falta volver a implementar el Web App.</p></div></section></aside></div>`;

  const rows = host.querySelector('[data-rows]');
  const redrawRows = () => { readModels(); rows.innerHTML = rowsHtml(); };
  const readModels = () => rows.querySelectorAll('[data-p]').forEach((r) => { const inp = r.querySelector('[data-model]'); if (inp) models[r.dataset.p] = inp.value.trim(); });
  rows.addEventListener('change', (e) => {
    const r = e.target.closest('[data-p]'); if (!r || e.target.dataset.on == null) return;
    const id = r.dataset.p;
    if (e.target.checked) chain = [...chain, id]; else if (chain.length > 1) chain = chain.filter((x) => x !== id); else { e.target.checked = true; toast('Deja al menos un proveedor activo.', 'error'); return; }
    redrawRows();
  });
  rows.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); const r = e.target.closest('[data-p]'); if (!b || !r) return;
    const id = r.dataset.p;
    if (b.dataset.up != null) { const i = chain.indexOf(id); if (i > 0) { chain = [...chain]; [chain[i - 1], chain[i]] = [chain[i], chain[i - 1]]; redrawRows(); } }
    if (b.dataset.models != null) withBusy(b, async () => {
      persist();
      try { const ms = await listModels(id); r.querySelector('datalist').innerHTML = (id === 'gemini' || id === 'claude' ? '' : '<option value="auto">auto</option>') + ms.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''); out.innerHTML = `<div class="notice ok">${icon('check')}<div><b>${esc(providerInfo(id).name)}: ${ms.length} modelos.</b><p class="xs">${ms.slice(0, 30).map((m) => esc(m.id)).join(', ')}</p></div></div>`; } catch (err) { out.innerHTML = `<div class="notice danger">${icon('alert')}<div>${esc(err.message)}</div></div>`; }
    }, '…');
  });
  const sync = () => { const m = host.querySelector('[name="mode"]:checked').value; host.querySelector('[data-keyf]').hidden = m !== 'direct'; host.querySelector('[data-chainf]').hidden = m !== 'proxy'; };
  host.querySelectorAll('[name="mode"]').forEach((r) => r.addEventListener('change', sync));
  const persist = () => {
    readModels();
    const m = host.querySelector('[name="mode"]:checked').value;
    settings.set({ aiMode: m, aiChain: chain, aiModels: { ...models }, aiDailyLimit: Number(host.querySelector('[data-limit]').value) || 0 });
    settings.setDirectKey(m === 'direct' ? host.querySelector('[data-key]').value.trim() : '');
  };
  const out = host.querySelector('[data-out]');
  host.querySelector('[data-save]').onclick = () => { persist(); toast('Ajustes de IA guardados', 'success'); };
  host.querySelector('[data-test]').onclick = (e) => withBusy(e.currentTarget, async () => {
    persist();
    const list = settings.get('aiMode') === 'direct' ? ['gemini'] : chain;
    out.innerHTML = '';
    const lines = [];
    for (const id of list) {
      const t0 = performance.now();
      try {
        const r = await generate({ prompt: 'Responde solo con JSON {"ok": true, "saludo": "<saludo breve en español>"}', json: true, temperature: 0, maxTokens: 300, only: id });
        lines.push(`<tr><td>${icon('check', 'ic-sm')} <b>${esc(providerInfo(id).name)}</b></td><td class="mono xs">${esc(r.model || '')}</td><td class="num">${((performance.now() - t0) / 1000).toFixed(1)} s</td><td class="small">${esc(r.json?.saludo || 'ok')}</td></tr>`);
      } catch (err) {
        lines.push(`<tr><td>${icon('x', 'ic-sm')} <b>${esc(providerInfo(id).name)}</b></td><td colspan="3" class="small" style="color:var(--danger)">${esc(err.message)}</td></tr>`);
      }
      out.innerHTML = `<div class="table-wrap"><table class="tbl"><thead><tr><th>Proveedor</th><th>Modelo</th><th class="num">Tiempo</th><th>Respuesta</th></tr></thead><tbody>${lines.join('')}</tbody></table></div>`;
    }
  }, 'Probando…');

  // Qué proveedores tienen clave en Apps Script.
  if (mode === 'proxy' && isConfigured()) call('ping').then((r) => { if (r.providers) { configured = r.providers; redrawRows(); } }).catch(() => {});
}

async function datos(host, redraw) {
  const est = await estimateStorage();
  const counts = Object.keys(TABLES).map((t) => [t, store.all(t).length]);
  host.innerHTML = `<div class="grid g-2">
    <section class="card"><div class="card-h"><h3>Copia de seguridad</h3></div><div class="card-b stack">
      <p class="small muted">Exporta todos los datos locales (todas las marcas) en un archivo JSON. Recomendado antes de importar o borrar.</p>
      <div class="row"><button class="btn btn-primary" data-export>${icon('download')}Exportar JSON</button><label class="btn">${icon('upload')}Importar JSON<input type="file" accept="application/json,.json" hidden data-import></label></div>
      <label class="check"><input type="checkbox" data-replace>Al importar, reemplazar los datos locales (si no, se combinan)</label></div></section>
    <section class="card"><div class="card-h"><h3>Datos de demostración</h3></div><div class="card-b stack"><p class="small muted">Carga dos marcas ficticias con ideas, guiones, calendario y resultados para explorar la app.</p><button class="btn" data-demo>${icon('sparkle')}Cargar demostración</button></div></section>
    <section class="card"><div class="card-h"><h3>Almacenamiento local</h3></div><div class="card-b stack small">
      ${est ? `<div class="row-between"><span>Usado</span><b>${fmtNum(est.usage / 1048576, 1)} MB de ${fmtNum(est.quota / 1048576, 0)} MB</b></div>` : ''}
      ${counts.filter(([, n]) => n).map(([t, n]) => `<div class="row-between"><span>${esc(TABLES[t].sheet)}</span><b>${n}</b></div>`).join('')}</div></section>
    <section class="card"><div class="card-h"><h3 style="color:var(--danger)">Zona peligrosa</h3></div><div class="card-b stack"><p class="small muted">Borra todos los datos de ESTE navegador. Lo ya sincronizado permanece en Google Sheets y puede descargarse de nuevo.</p><button class="btn btn-danger" data-wipe>${icon('trash')}Borrar datos locales</button></div></section></div>`;
  host.querySelector('[data-export]').onclick = () => { download(`content-studio-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store.exportAll(), null, 1)); toast('Copia exportada', 'success'); };
  host.querySelector('[data-import]').onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const replace = host.querySelector('[data-replace]').checked;
      if (!(await confirmDialog({ title: 'Importar copia', message: `${replace ? 'Se REEMPLAZARÁN' : 'Se combinarán'} los datos locales con el archivo "${f.name}". Los registros importados se pondrán en cola para sincronizar.`, confirm: 'Importar', danger: replace }))) return;
      await store.importAll(data, { replace }); toast('Importación completada', 'success'); redraw();
    } catch (err) { toast(`No se pudo importar: ${err.message}`, 'error'); }
  };
  host.querySelector('[data-demo]').onclick = async (e) => withBusy(e.currentTarget, async () => { await loadDemo(); toast('Demostración cargada', 'success'); }, 'Cargando…');
  host.querySelector('[data-wipe]').onclick = async () => {
    if (!(await confirmDialog({ title: 'Borrar datos locales', message: `Se borrarán ${store.all('ideas').length} contenidos y ${store.all('brands').length} marcas de este navegador. ${store.pendingCount() ? `Hay ${store.pendingCount()} cambios SIN sincronizar que se perderán.` : ''}`, confirm: 'Borrar todo', danger: true, typeToConfirm: 'BORRAR' }))) return;
    await store.wipe(); toast('Datos locales borrados', 'success'); location.hash = '#/';
  };
}

function papelera(host, redraw) {
  const items = store.trash();
  const label = (t, r) => r.title || r.name || r.text || r.caption?.slice(0, 50) || r.date || r.id;
  host.innerHTML = `<div class="card">${items.length ? `<div class="table-wrap"><table class="tbl"><thead><tr><th>Elemento</th><th>Tipo</th><th>Eliminado</th><th></th></tr></thead><tbody>
    ${items.map(({ table, record }) => `<tr><td><b>${esc(label(table, record))}</b><div class="xs muted mono">${record.id}</div></td><td class="small">${esc(TABLES[table].sheet)}</td><td class="small">${fmtDateTime(record.deletedAt)}</td><td class="nowrap"><button class="btn btn-sm" data-restore="${table}|${record.id}">${icon('history', 'ic-sm')}Restaurar</button> <button class="btn btn-sm btn-ghost" data-purge="${table}|${record.id}" title="Solo en este dispositivo">Borrar definitivamente</button></td></tr>`).join('')}
    </tbody></table></div>` : emptyState('La papelera está vacía', 'Lo que elimines aparecerá aquí y podrás restaurarlo.', '', 'trash')}</div>`;
  host.addEventListener('click', async (e) => {
    const r = e.target.closest('[data-restore]'); const p = e.target.closest('[data-purge]');
    if (r) { const [t, id] = r.dataset.restore.split('|'); await store.restore(t, id); toast('Restaurado', 'success'); redraw(); }
    if (p) { const [t, id] = p.dataset.purge.split('|'); if (await confirmDialog({ title: 'Borrar definitivamente', message: 'Se eliminará de este dispositivo y no se podrá recuperar localmente. En Google Sheets permanece como eliminación lógica.', confirm: 'Borrar', danger: true })) { await store.purge(t, id); redraw(); } }
  });
}

async function conflictsTab(host, redraw) {
  const list = await conflicts.all();
  host.innerHTML = `<div class="card">${list.length ? `<div class="card-b stack">${list.map((c) => { const local = store.getAny(c.table, c.id); return `<div class="card card-b"><div class="row-between"><b>${esc(TABLES[c.table]?.sheet)} · ${esc(local?.title || local?.name || c.id)}</b><span class="xs muted">${fmtDateTime(c.detectedAt)}</span></div>
      <div class="grid g-2" style="margin:8px 0"><div><div class="xs muted">Este dispositivo (v${local?.version}) · ${fmtDateTime(local?.updatedAt)}</div><pre class="xs" style="max-height:180px;overflow:auto">${esc(JSON.stringify(local, null, 1))}</pre></div><div><div class="xs muted">Google Sheets (v${c.server?.version}) · ${fmtDateTime(c.server?.updatedAt)}</div><pre class="xs" style="max-height:180px;overflow:auto">${esc(JSON.stringify(c.server, null, 1))}</pre></div></div>
      <div class="row"><button class="btn btn-sm btn-primary" data-k="${esc(c.key)}" data-c="local">Conservar la de este dispositivo</button><button class="btn btn-sm" data-k="${esc(c.key)}" data-c="remote">Usar la de Google Sheets</button></div></div>`; }).join('')}</div>` : emptyState('Sin conflictos', 'Cuando dos personas editan el mismo registro a la vez, aparecerá aquí para que elijas.', '', 'check')}</div>`;
  host.addEventListener('click', async (e) => { const b = e.target.closest('[data-k]'); if (!b) return; await resolveConflict(b.dataset.k, b.dataset.c); toast('Conflicto resuelto', 'success'); if (b.dataset.c === 'local') syncNow().catch(() => {}); redraw(); });
}

function apariencia(host) {
  host.innerHTML = `<section class="card" style="max-width:520px"><div class="card-b stack">
    <label class="field"><span>Tema</span><select class="input" data-theme>${[['system', 'Según el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => `<option value="${v}" ${settings.get('theme') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>Tu nombre (para responsables)</span><input class="input" data-name value="${esc(settings.get('userName'))}"></label></div></section>`;
  host.querySelector('[data-theme]').onchange = (e) => settings.set({ theme: e.target.value });
  host.querySelector('[data-name]').onchange = (e) => settings.set({ userName: e.target.value });
}

export { modal };

// ---------- Carpeta de reels (skill editar-reels-claude) ----------
async function carpeta(host, redraw) {
  const fs = await F.folderState();
  const chk = fs.connected && fs.granted ? await F.checkStructure().catch(() => null) : null;
  const row = (ok, label) => `<div class="row-between"><span>${label}</span><b style="color:var(${ok ? '--ok' : '--warn'})">${ok ? 'sí' : 'no'}</b></div>`;
  host.innerHTML = `<div class="split"><section class="card"><div class="card-h"><h3>${icon('film')}Carpeta «Reels con Claude»</h3></div><div class="card-b stack">
    <p class="small">Es la carpeta de tu skill <code>editar-reels-claude</code> (normalmente <code>Escritorio/Claude Code/Videos Claude/Reels con Claude</code>). Conectada, la app:</p>
    <ul class="small" style="margin:0">
      <li>guarda el estilo de cada marca en <code>Mi estilo/marcas/</code> sin descargar archivos;</li>
      <li>crea el encargo de cada video en <code>Reels/</code> y copia la toma a <code>Tomas/</code>;</li>
      <li>marca sola «Grabado» y «Editado» al encontrar la toma y el <code>FINAL - ….mp4</code>, y te enseña el video.</li>
    </ul>
    ${!fs.supported ? `<div class="notice warn">${icon('alert')}<div><p><b>Este navegador no deja conectar carpetas.</b></p><ol class="small" style="margin:6px 0 0 18px;padding:0">
        <li>En Brave, abre una pestaña nueva y escribe <code>brave://flags/#file-system-access-api</code>.</li><li>Cambia <b>File System Access API</b> a <b>Enabled</b>.</li><li>Pulsa <b>Relaunch</b> (se reinicia Brave) y vuelve aquí.</li></ol>
        <p class="xs muted">También funciona en Chrome y Edge sin tocar nada. En el celular no está disponible: allí la app funciona igual, sin la carpeta.</p></div></div>`
      : !fs.connected ? `<button class="btn btn-primary" data-connect>${icon('link')}Conectar carpeta</button><p class="xs muted" style="margin:0">Elige la carpeta «Reels con Claude» (la que contiene Mi estilo, Tomas y Reels) y acepta «Ver y editar».</p>`
      : `<div class="row-between"><span>Carpeta</span><b>${esc(fs.name)}</b></div>
        ${fs.granted ? '' : `<div class="notice">${icon('lock')}<div><p>El navegador pide permiso en cada sesión.</p><button class="btn btn-sm btn-primary" data-grant style="margin-top:6px">${icon('check', 'ic-sm')}Dar permiso</button></div></div>`}
        ${chk ? `<div class="stack small">${row(chk.misEstilo, 'Mi estilo/')}${row(chk.marcas, 'Mi estilo/marcas/')}${row(chk.tomas, 'Tomas/')}${row(chk.reels, 'Reels/')}</div>
          ${chk.nested ? `<div class="notice warn">${icon('alert')}<div><p>Dentro hay otra carpeta «Reels con Claude»: conecta esa.</p></div></div>` : !chk.tomas && !chk.reels ? `<div class="notice warn">${icon('alert')}<div><p>No parece la carpeta de la skill (no tiene Tomas/ ni Reels/). Las que faltan se crearán al usarlas.</p></div></div>` : ''}` : ''}
        <div class="row"><button class="btn" data-connect>${icon('refresh', 'ic-sm')}Cambiar carpeta</button><button class="btn btn-ghost" data-disconnect>${icon('x', 'ic-sm')}Desconectar</button></div>`}
  </div></section>
  <aside class="stack-lg">${fs.connected && fs.granted ? `<section class="card"><div class="card-h"><h3>${icon('check')}Estados</h3></div><div class="card-b stack small">
    <p class="xs muted" style="margin:0">Revisa todos los contenidos con guion aprobado: los que tengan toma pasan a «Grabado» y los que tengan video final, a «Editado».</p>
    <button class="btn" data-sync>${icon('refresh', 'ic-sm')}Comprobar todos</button><div data-out class="small"></div></div></section>` : ''}</aside></div>`;
  host.querySelectorAll('[data-connect]').forEach((b) => b.addEventListener('click', async () => { try { await F.connectFolder(); toast('Carpeta conectada', 'success'); redraw(); } catch (e) { if (e.name !== 'AbortError') toast(e.message, 'error'); } }));
  host.querySelector('[data-grant]')?.addEventListener('click', async () => { await F.getRoot({ ask: true }); redraw(); });
  host.querySelector('[data-disconnect]')?.addEventListener('click', async () => { await F.disconnectFolder(); toast('Carpeta desconectada', 'success'); redraw(); });
  host.querySelector('[data-sync]')?.addEventListener('click', (e) => withBusy(e.currentTarget, async () => {
    const r = await syncAll();
    host.querySelector('[data-out]').innerHTML = r.length ? r.map((x) => `<div>${icon('check', 'ic-sm')} <a href="#/contenido/${x.idea.id}/edicion">${esc(x.idea.title)}</a> <span class="muted">→ ${esc(x.changed.join(', '))}</span></div>`).join('') : '<span class="muted">Sin cambios.</span>';
  }, 'Comprobando…'));
}
