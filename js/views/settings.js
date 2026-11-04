import { store, conflicts } from '../core/store.js';
import { settings } from '../core/settings.js';
import { on } from '../core/events.js';
import { icon, tabs, toast, confirmDialog, withBusy, emptyState, modal } from '../core/ui.js';
import { esc, download, fmtDateTime, fmtRelative, fmtNum } from '../core/utils.js';
import { estimateStorage } from '../core/db.js';
import { TABLES } from '../core/schema.js';
import { call, isConfigured } from '../services/api.js';
import { syncNow, fullPull, syncState, resolveConflict } from '../services/sync.js';
import { listModels, usageToday, generate, providerName } from '../services/ai.js';
import { loadDemo } from '../services/demo.js';
import { pageHeader } from './shared.js';

const TABS = [
  { id: 'conexion', label: 'Conexión y sync', icon: 'cloud' }, { id: 'ia', label: 'IA (Gemini / Claude)', icon: 'sparkle' },
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
    await ({ conexion, ia, datos, papelera, conflictos: conflictsTab, apariencia })[tab](host, draw);
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
    try { const r = await call('ping'); out.innerHTML = `<div class="notice ok">${icon('check')}<div><b>Conectado como ${esc(r.user?.name || 'usuario')} (${esc(r.user?.role || '')}).</b><p>Hoja: ${esc(r.spreadsheet || '')} · Gemini: ${r.gemini ? 'clave configurada' : 'sin clave'} · Claude: ${r.claude ? 'clave configurada' : 'sin clave'} · versión ${esc(r.version || '')}</p></div></div>`; } catch (err) { out.innerHTML = `<div class="notice danger">${icon('alert')}<div><b>No se pudo conectar.</b><p>${esc(err.message)}</p></div></div>`; }
  }, 'Probando…');
  host.querySelector('[data-sync]').onclick = (e) => withBusy(e.currentTarget, async () => { try { const r = await syncNow(); toast(`Enviados ${r.pushed}, recibidos ${r.pulled}${r.conflicts ? `, ${r.conflicts} conflictos` : ''}`, 'success'); } catch (err) { toast(err.message, 'error'); } }, 'Sincronizando…');
  host.querySelector('[data-pull]').onclick = async (e) => { if (!(await confirmDialog({ title: 'Descarga completa', message: 'Se descargarán todos los registros de Sheets. Los cambios locales pendientes se envían primero y no se sobrescriben.', confirm: 'Descargar' }))) return; withBusy(e.target.closest('button'), async () => { try { const r = await fullPull(); toast(`Recibidos ${r.pulled} registros`, 'success'); } catch (err) { toast(err.message, 'error'); } }, 'Descargando…'); };
  host.querySelector('[data-setup]').onclick = (e) => withBusy(e.currentTarget, async () => { try { const r = await call('setup'); toast(`Hojas verificadas: ${r.created?.length || 0} creadas, ${r.checked?.length || 0} existentes`, 'success'); } catch (err) { toast(err.message, 'error'); } }, 'Verificando…');
}

function ia(host) {
  const mode = settings.get('aiMode'); const prov = settings.get('aiProvider') || 'gemini'; const u = usageToday();
  host.innerHTML = `<div class="split"><section class="card"><div class="card-h"><h3>Inteligencia artificial</h3></div><div class="card-b stack">
    <div class="field"><span>Proveedor</span>
      <label class="check"><input type="radio" name="prov" value="gemini" ${prov === 'gemini' ? 'checked' : ''}><span><b>Gemini (Google AI Studio)</b>: tiene nivel gratuito con límites diarios; puede saturarse en horas de mucho uso.</span></label>
      <label class="check"><input type="radio" name="prov" value="claude" ${prov === 'claude' ? 'checked' : ''}><span><b>Claude (API de Anthropic)</b>: de pago por uso, con crédito propio en platform.claude.com. <b>La suscripción Claude Pro no incluye la API.</b></span></label></div>
    <div class="field"><span>Modo de conexión</span>
      <label class="check"><input type="radio" name="mode" value="proxy" ${mode === 'proxy' ? 'checked' : ''}><span><b>Seguro (recomendado):</b> a través de Apps Script. La clave se guarda en las propiedades del script y nunca llega al navegador.</span></label>
      <label class="check"><input type="radio" name="mode" value="direct" ${mode === 'direct' ? 'checked' : ''}><span><b>Directo (solo pruebas locales, solo Gemini):</b> la clave se guarda en esta pestaña y se envía desde el navegador.</span></label>
      <label class="check"><input type="radio" name="mode" value="off" ${mode === 'off' ? 'checked' : ''}><span><b>Desactivada:</b> la app funciona sin IA.</span></label></div>
    <label class="field" ${mode === 'direct' ? '' : 'hidden'} data-keyf><span>API Key de Gemini (se borra al cerrar el navegador)</span><input class="input mono" type="password" data-key value="${esc(settings.getDirectKey())}" autocomplete="off"></label>
    <div class="form-grid">
      <label class="field" data-gem ${prov === 'gemini' ? '' : 'hidden'}><span>Modelo de Gemini</span><input class="input mono" data-model value="${esc(settings.get('model'))}" list="models"><small class="hint">Por defecto <code>gemini-flash-latest</code>. Si aparece "no disponible temporalmente", pulsa "Cargar modelos" y prueba otro (por ejemplo, uno Flash-Lite).</small></label>
      <label class="field" data-cla ${prov === 'claude' ? '' : 'hidden'}><span>Modelo de Claude</span>
        <select class="input" data-modelc>${[['claude-opus-5-5', 'Claude Opus 5.5: la mejor calidad (≈ 4 $ / 20 $ por millón de tokens)'], ['claude-sonnet-5-5', 'Claude Sonnet 5.5: más rápido y económico (≈ 2 $ / 10 $)'], ['claude-haiku-5-5', 'Claude Haiku 5.5: el más barato (≈ 0,10 $ / 0,50 $)']].map(([v, l]) => `<option value="${v}" ${settings.get('modelClaude') === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <small class="hint">Precio por millón de tokens de entrada / salida. Generar un guion completo suele costar unos céntimos.</small></label>
      <label class="field"><span>Límite local de solicitudes al día</span><input class="input" type="number" min="0" data-limit value="${settings.get('aiDailyLimit')}"><small class="hint">Protección adicional de cuota. 0 = sin límite local.</small></label>
    </div><datalist id="models"></datalist>
    <div class="row"><button class="btn btn-primary" data-save>${icon('check')}Guardar</button><button class="btn" data-models>${icon('list')}Cargar modelos</button><button class="btn btn-ai" data-test>${icon('sparkle')}Probar IA</button></div><div data-out></div>
  </div></section>
  <aside class="stack-lg"><section class="card"><div class="card-h"><h3>Uso hoy (este dispositivo)</h3></div><div class="card-b stack small"><div class="row-between"><span>Solicitudes</span><b>${u.requests}</b></div><div class="row-between"><span>Tokens</span><b>${fmtNum(u.tokens)}</b></div></div></section>
  <section class="card"><div class="card-b small stack"><b>Dónde va cada clave (en Apps Script → Configuración del proyecto → Propiedades del script)</b>
    <div><code>GEMINI_API_KEY</code>: clave de aistudio.google.com</div><div><code>ANTHROPIC_API_KEY</code>: clave de platform.claude.com</div>
    <p class="xs muted" style="margin:0">Puedes tener las dos y cambiar de proveedor cuando quieras.</p></div></section></aside></div>`;
  const sync = () => {
    const p = host.querySelector('[name="prov"]:checked').value; const m = host.querySelector('[name="mode"]:checked').value;
    host.querySelector('[data-gem]').hidden = p !== 'gemini'; host.querySelector('[data-cla]').hidden = p !== 'claude';
    host.querySelector('[data-keyf]').hidden = !(m === 'direct' && p === 'gemini');
  };
  host.querySelectorAll('[name="mode"], [name="prov"]').forEach((r) => r.addEventListener('change', sync));
  const persist = () => {
    const m = host.querySelector('[name="mode"]:checked').value; const p = host.querySelector('[name="prov"]:checked').value;
    settings.set({ aiMode: m, aiProvider: p, model: host.querySelector('[data-model]').value.trim() || 'gemini-flash-latest', modelClaude: host.querySelector('[data-modelc]').value, aiDailyLimit: Number(host.querySelector('[data-limit]').value) || 0 });
    settings.setDirectKey(m === 'direct' ? host.querySelector('[data-key]').value.trim() : '');
  };
  const out = host.querySelector('[data-out]');
  host.querySelector('[data-save]').onclick = () => { persist(); toast('Ajustes de IA guardados', 'success'); };
  host.querySelector('[data-models]').onclick = (e) => withBusy(e.currentTarget, async () => {
    persist();
    try { const ms = await listModels(); host.querySelector('#models').innerHTML = ms.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join(''); out.innerHTML = `<div class="notice ok">${icon('check')}<div><b>${ms.length} modelos disponibles.</b><p class="xs">${ms.slice(0, 40).map((m) => esc(m.id)).join(', ')}</p></div></div>`; } catch (err) { out.innerHTML = `<div class="notice danger">${icon('alert')}<div>${esc(err.message)}</div></div>`; }
  }, 'Cargando…');
  host.querySelector('[data-test]').onclick = (e) => withBusy(e.currentTarget, async () => {
    persist();
    try { const r = await generate({ prompt: 'Responde solo con JSON {"ok": true, "saludo": "<saludo breve en español>"}', json: true, temperature: 0, maxTokens: 300 }); out.innerHTML = `<div class="notice ok">${icon('check')}<div><b>${esc(providerName())} responde correctamente.</b><p>${esc(r.json?.saludo || '')} · ${r.usage?.totalTokenCount || 0} tokens</p></div></div>`; } catch (err) { out.innerHTML = `<div class="notice danger">${icon('alert')}<div>${esc(err.message)}</div></div>`; }
  }, 'Probando…');
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
