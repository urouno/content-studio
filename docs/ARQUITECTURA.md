# Arquitectura

## Visión general

```
┌──────────────────────── Navegador (escritorio) ────────────────────────┐
│  Vistas (js/views)  ──►  Servicios (js/services)  ──►  Núcleo (js/core) │
│   Dashboard, Ideas,       workflow  (reglas del flujo)    store (caché + │
│   Contenidos, Contenido,  assistant (tareas de IA)        historial +    │
│   Calendario, Resultados, prompts + branddocs (contexto)  outbox)        │
│   Marcas, Método, Ajustes analytics, scriptkit, sync      db (IndexedDB) │
│                                    │                                     │
│          Service Worker (sw.js): caché del app shell → funciona offline  │
└────────────────────────────────────┼─────────────────────────────────────┘
                                     │ HTTPS POST (text/plain, token)
                         ┌───────────▼────────────┐
                         │ Google Apps Script      │
                         │  doPost → auth → acción │── UrlFetch ──► Gemini API
                         │  sync · setup · ai.*    │   (API Key en Script Properties)
                         └───────────┬────────────┘
                                     │ SpreadsheetApp (LockService)
                         ┌───────────▼────────────┐
                         │ Google Sheets (17 hojas)│
                         └────────────────────────┘
```

## Módulos

| Módulo | Archivo | Responsabilidad |
|---|---|---|
| Dashboard | `views/dashboard.js` | Indicadores, alertas de retraso o riesgo, flujo por etapas, cumplimiento del calendario, próximas fechas |
| Marcas | `views/brands.js`, `views/brand-docs.js` | Crear, duplicar y archivar marcas. Ficha de identidad general, **documentos de referencia (Markdown)**, comunicación, visual, redes, pilares, hooks/CTA y referencias |
| Banco de ideas | `views/ideas.js` | Registro, filtros, ideas generadas con IA y detección de duplicados |
| Contenidos (tablero) | `views/contents.js` | Kanban de todo el flujo con arrastrar y soltar, y vista de lista |
| Contenido | `views/content*.js` | Espacio de trabajo por contenido con pestañas: Estrategia, Guion, Copies, Publicación, Resultados e Historial. En la cabecera, casillas **Grabado** y **Editado** |
| Calendario | `views/calendar.js` | Vistas de mes, semana, día, lista y tablero. Arrastrar y soltar, conflictos y semanas por debajo del objetivo |
| Resultados | `views/results.js` | Métricas derivadas, patrones por dimensión, mejores contenidos por objetivo y propuestas de IA |
| Método | `views/method.js` | Biblioteca de metodología (la misma que recibe la IA) |
| Ajustes | `views/settings.js` | Conexión y sync, IA, copias de seguridad, papelera, conflictos y tema |

## Flujo y estados

Un **contenido** es una idea con id `CNT-…`. Todas las fichas cuelgan de ese id: guion, versiones, copies, calendario, publicaciones y resultados. Así nunca hay que volver a escribir la idea en cada módulo.

```
idea → aprobada → guion → guion_aprobado → por_grabar → grabado → listo (editado) → calendarizado → publicado → analizado
                                                                                  (descartada en cualquier punto)
```

Transiciones automáticas (`services/workflow.js`):

| Acción | Efecto |
|---|---|
| Crear la primera versión de guion | → `guion` |
| Aprobar una versión | Se bloquea y pasa a `guion_aprobado` y luego a `por_grabar` |
| Casilla **Grabado** | → `grabado` (desmarcarla vuelve a `por_grabar`) |
| Casilla **Editado** | → `listo` (o `calendarizado` si ya tiene fecha). Desmarcarla vuelve a `grabado` |
| Programar con el video editado | → `calendarizado` |
| Marcar como publicado | Crea la publicación y pasa a `publicado` |
| Registrar resultados | → `analizado` |

Las transiciones automáticas **solo avanzan**. El usuario puede retroceder o elegir cualquier estado a mano, y **no se pierde nada**: el guion, los copies y el calendario se conservan y cada cambio de estado queda en `statusHistory`.

## Datos locales

- **IndexedDB** (`content-studio`): un almacén por tabla, más `outbox` (operaciones pendientes), `meta` (cursor de sincronización) y `conflicts`.
- **Caché en memoria** (`core/store.js`): las vistas leen de forma síncrona y las escrituras son **atómicas**. Registro, operación pendiente e historial se guardan en una sola transacción; si falla, la caché no cambia.
- **Historial**: cada cambio guarda una copia del estado anterior. Las ediciones seguidas del autoguardado se agrupan en ventanas de 2 minutos. Cualquier entrada se puede restaurar.
- **Papelera**: borrar es lógico (`deletedAt`) y se puede restaurar. El borrado definitivo existe solo localmente y solo desde la papelera.
- **Ajustes**: `localStorage` (no contiene la clave de Gemini).
- `navigator.storage.persist()` pide al navegador que no borre los datos cuando falta espacio.

## Sincronización

Usa **control optimista de concurrencia** con un número de versión por registro.

1. Cada edición local incrementa `version` y crea o actualiza una operación en `outbox` con `baseVersion`, la última versión que conoce el servidor. Si se edita varias veces sin sincronizar, se envía una sola operación con el estado final.
2. `syncNow()` envía lotes de 100 operaciones. El servidor, protegido con `LockService`:
   - si `versión en el servidor > baseVersion`, devuelve un **conflicto** con la versión del servidor;
   - si no, escribe la fila y marca `syncedAt` con la hora del servidor;
   - valida tabla, id, `brandId`, fechas, estados, campos obligatorios y tamaño de celda, y rechaza la operación concreta sin romper el lote.
3. En la misma llamada devuelve los **cambios remotos** con `syncedAt > cursor`, ordenados de forma global y paginados.
4. El cliente aplica los cambios remotos **salvo** los registros que tienen ediciones locales pendientes.
5. Los conflictos aparecen en *Ajustes → Conflictos*, donde se elige qué versión conservar: la de este dispositivo o la de Google Sheets.

La sincronización se dispara al editar (8 s después del último cambio), cada 2 minutos y al recuperar la conexión. El indicador de la barra superior muestra el estado, los cambios pendientes y los conflictos.

## Offline

- `sw.js` precarga todos los archivos de la app (HTML, CSS, JS e iconos) y sirve los recursos propios con *stale-while-revalidate*.
- Las peticiones a Apps Script y Gemini **nunca** se cachean.
- Sin conexión se puede consultar, crear, editar, planificar, mover en calendario y tablero, registrar resultados y exportar. **La IA y la sincronización necesitan Internet**, y la app lo indica con un aviso.
- Cuando hay una versión nueva desplegada, la app muestra "Actualizar". Ejecuta `npm run sw` antes de publicar para cambiar la versión de la caché.
- **`file://`**: los navegadores no permiten módulos ES ni Service Workers desde archivos locales. La app detecta este caso y avisa. Alternativa: `python3 -m http.server`, `npx serve` o GitHub Pages.

## IA

- `services/prompts.js` construye el prompt con:
  1. la metodología;
  2. las reglas de veracidad;
  3. **solo** el contexto de la marca del contenido: identidad, voz, visual, redes, pilares, hooks y CTA aprobados o a evitar, ejemplos aprobados y aprendizajes de sus propios resultados;
  4. la tarea.
- **Documentos de referencia** (`services/branddocs.js`): los Markdown de la marca activos y asignados a la tarea, sin las indicaciones de plantilla ni secciones vacías, con un límite de 8.000 caracteres por documento y 30.000 en total. Ver [DOCUMENTOS_DE_MARCA.md](DOCUMENTOS_DE_MARCA.md).
- **Para evitar repeticiones**, se envían los hooks recientes de la marca con la orden de no repetirlos, las ideas existentes al generar ideas nuevas y versiones con estructuras distintas.
- **Veracidad**: la IA debe marcar las afirmaciones que haya que verificar (campo `verify`) y no inventar datos. La lista "Productos y servicios" de la marca es la fuente de verdad.
- Las salidas son JSON (`responseMimeType: application/json`), se leen de forma tolerante y se normalizan.
- Cada reescritura **crea una versión nueva**: el usuario compara, edita y aprueba. Nada de lo que genera la IA se aplica sin revisión.
- La investigación usa Google Search como herramienta cuando el modelo o el nivel lo permiten. Si no, reintenta sin ella y avisa de que los datos no están verificados.

## Seguridad

| Riesgo | Medida |
|---|---|
| Exposición de la API Key | La clave vive en *Script Properties*; el navegador solo envía un token propio. El proxy solo admite modelos `gemini-*`, la herramienta `google_search` y limita los tokens de salida |
| Acceso no autorizado a los datos | El Web App exige un token de 24 caracteres o más, comparado con `ACCESS_TOKENS`, y añade un retardo ante fallos. Hay roles `admin`, `editor` y `viewer` (solo lectura) y los tokens se pueden revocar |
| Abuso de cuota de IA | Límite diario por token en el servidor (`AI_DAILY_LIMIT`), límite local configurable y reintentos con espera |
| Escritura de datos inválidos | Validación en el servidor por tabla, lista de tablas permitidas, formato de id y límite de tamaño de celda |
| Inyección de HTML | Todo texto se escapa con `esc()` antes de insertarse; el Markdown de la investigación se escapa antes de darle formato |
| Pérdida de datos | Escritura atómica, papelera, historial restaurable, eliminación lógica en Sheets, copia JSON y aviso al cerrar con cambios sin guardar |
| Token en el navegador | Se guarda en `localStorage` del dispositivo. En equipos compartidos, usa un perfil de navegador propio y revoca el token si se pierde el equipo |

**Limitaciones conocidas.** La autenticación por token es adecuada para equipos pequeños. Para muchos usuarios externos convendría OAuth con Google Identity y un backend dedicado. Los archivos subidos (logos e imágenes) se guardan **solo en el dispositivo**, porque Sheets no admite archivos; para compartirlos, usa enlaces de Drive.

## Decisiones técnicas

- **Sin framework ni proceso de compilación**: así el proyecto se puede alojar en GitHub Pages tal cual y es fácil de mantener. Los módulos ES separan responsabilidades.
- **Una hoja por tabla, con columnas JSON** para estructuras anidadas (secciones del guion, escenas): legible y sin límite de columnas.
- **Columnas en texto plano** (`setNumberFormat('@')`) para que Sheets no convierta fechas ni números. Los tipos se reconstruyen en el servidor (`num`, `bool`, `json`).
- **`Content-Type: text/plain`** en las llamadas a Apps Script, para evitar la petición preflight de CORS que Apps Script no admite.
