# Estructura de Google Sheets

La hoja tiene **18 pestañas de datos** y una pestaña `_Meta`. Se crean solas con el botón **Ajustes → Conexión → Crear/verificar hojas** o con el menú **Content Studio → Crear / verificar hojas** dentro de la propia hoja. La definición oficial está en `js/core/schema.js` y en `apps-script/Code.gs` (`TABLES`). Una prueba automática comprueba que ambas coinciden.

## Columnas comunes (todas las hojas)

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | texto | Identificador único con formato `PREFIJO-<marca de tiempo base36>-<aleatorio>`, por ejemplo `CNT-mw1n6tg1-x2qts` |
| `brandId` | texto | Marca a la que pertenece el registro (aislamiento multimarca). En `Marcas` es igual a `id` |
| `createdAt` | ISO 8601 | Fecha de creación |
| `updatedAt` | ISO 8601 | Última modificación (según el cliente) |
| `deletedAt` | ISO 8601 o vacío | **Eliminación lógica**: si tiene fecha, el registro está en la papelera |
| `version` | entero | Versión para el control de concurrencia (+1 en cada edición) |
| `updatedBy` | texto | Dispositivo que hizo el último cambio |
| `syncedAt` | ISO 8601 | Fecha en que el **servidor** guardó la fila; es el cursor de la sincronización |

> **No edites a mano** `id`, `version` ni `syncedAt`. Para eliminar un registro desde la hoja, escribe una fecha ISO en `deletedAt` y aumenta `version` en 1.

## Hojas

| Hoja | Prefijo | Columnas propias | Relaciones |
|---|---|---|---|
| **Marcas** | MRC | name, description, sector, valueProp, products, businessGoals, audience, painPoints, color, status, logoAssetId | Raíz de cada espacio de trabajo |
| **ConfigMarca** | CFG | voice{}, visual{}, strategy{} (JSON) | brandId → Marcas (1:1) |
| **Plataformas** | PLT | platform, goal, formats[], durationTarget, frequencyPerWeek, ctas[], active | brandId → Marcas (1:N) |
| **Pilares** | PIL | name, description, objective, share | brandId → Marcas |
| **Ideas** (contenidos) | CNT | title, topic, pillarId, audience, problem, keyword, objective, funnel, contentType, platforms[], format, priority, status, difficulty, experimental, knowledgeLevel, owner, targetDate, references, notes, source, statusHistory[] | pillarId → Pilares. **El id de la idea es el identificador del contenido en todo el flujo** |
| **Guiones** | GUI | ideaId, currentVersionId, approvedVersionId, locked, publishFilter[] | ideaId → Ideas (1:1); \*VersionId → VersionesGuion |
| **VersionesGuion** | VER | scriptId, ideaId, versionNo, label, origin, data{} (guion completo), evaluation{} | scriptId → Guiones (1:N) |
| **Produccion** | PRD | ideaId, scriptVersionId, scenes[], props[], checklist[], crewNotes, observations, recordedAt | ideaId → Ideas (1:1) |
| **Edicion** | EDI | ideaId, scriptVersionId, guide{}, scenes[], checklist[], editor, observations, readyAt | ideaId → Ideas (1:1) |
| **Copies** | CPY | ideaId, platform, title, caption, description, ctaText, hashtags[], coverText, variant, status | ideaId → Ideas (1:N) |
| **Calendario** | CAL | ideaId, platform, date (AAAA-MM-DD), time, owner, status, notes | ideaId → Ideas (1:N, una por plataforma) |
| **Publicaciones** | PUB | ideaId, calendarId, platform, publishedAt, url, notes | calendarId → Calendario |
| **Resultados** | RES | publicationId, ideaId, platform, measuredAt, daysSincePublish, metrics{}, notes | publicationId → Publicaciones (1:N mediciones) |
| **Referencias** | REF | ideaId, kind, title, url, metrics, notes | brandId → Marcas; ideaId opcional |
| **Hooks** | HOK | layer, patternId, text, objective, status (aprobado/evitar), notes, sourceIdeaId | brandId → Marcas |
| **CTA** | CTA | type, text, objective, status, notes | brandId → Marcas |
| **Recursos** | AST | kind, name, url, notes | brandId → Marcas (los archivos subidos quedan solo en el dispositivo) |
| **Historial** | HIS | table, recordId, action, before{} (copia anterior), summary | recordId → cualquier tabla. Solo se añaden filas |

`{}` = objeto JSON · `[]` = lista JSON. Las columnas JSON se guardan como texto y la app las interpreta.

### Estructura de `VersionesGuion.data`

```json
{
  "title": "", "objective": "confianza", "audience": "", "problem": "", "promise": "",
  "knowledgeLevel": 1, "structureId": "problema-solucion", "contentType": "familiaridad",
  "hook": { "patternId": "si-dolor", "narrado": "", "visual": "", "textual": "", "auditivo": "" },
  "hookAlternatives": [ { "patternId": "", "narrado": "", "visual": "", "textual": "", "auditivo": "" } ],
  "sections": [ { "act": "inicio|nudo|desenlace", "beat": "", "function": "", "voice": "", "onScreenText": "", "visual": "", "edit": "", "peak": 0 } ],
  "cta": { "type": "guardados", "text": "", "visual": "" },
  "verify": [ { "claim": "", "reason": "" } ],
  "visualNotes": "", "editingNotes": ""
}
```

### Métricas en `Resultados.metrics`

`views, reach, avgWatchSec, durationSec, avgPctViewed, completion, retention3s, nonFollowerPct, likes, comments, shares, saves, follows, profileVisits, clicks, inquiries, conversions`

Cada plataforma muestra solo las métricas que ofrece. Los indicadores derivados (tasas por alcance, conversiones por 1 000 vistas, % visto) **no se guardan**: se calculan en la app.

## Validaciones del servidor

- Tabla incluida en la lista permitida; `id` con el prefijo correcto; `brandId` obligatorio.
- `version` entera ≥ 1; `createdAt` y `updatedAt` en formato ISO.
- Campos obligatorios por tabla (por ejemplo, `Ideas.title` y `Ideas.status`, o `Calendario.date` con formato AAAA-MM-DD).
- `Ideas.status` dentro de la lista de estados; la hoja además valida ese campo con una lista desplegable.
- Ninguna celda puede superar 49 000 caracteres (el límite de Sheets es 50 000).

## Buenas prácticas

- Usa la hoja como **base de datos**, no como interfaz: edita desde la app.
- Haz **copias** de la hoja con *Archivo → Hacer una copia* o el historial de versiones de Drive.
- Para análisis externos (Looker Studio, tablas dinámicas), filtra las filas con `deletedAt` vacío.
