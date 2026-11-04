# Configuración de Google Sheets, Apps Script y Gemini

Tiempo estimado: 15–20 minutos. Necesitas una cuenta de Google.

---

## 1. Google Sheets + Apps Script

### 1.1 Crear la hoja y el script
1. Crea una hoja nueva en <https://sheets.new> y llámala, por ejemplo, **Content Studio — Base de datos**.
2. Abre **Extensiones → Apps Script**. Así el script queda vinculado a la hoja.
3. Borra el contenido de `Code.gs` y pega el de [`apps-script/Code.gs`](../apps-script/Code.gs).
4. Abre **Configuración del proyecto** (rueda dentada), activa **Mostrar el archivo de manifiesto "appsscript.json" en el editor**, vuelve al editor y reemplaza el contenido de `appsscript.json` por el de [`apps-script/appsscript.json`](../apps-script/appsscript.json). Si quieres, ajusta `timeZone`.
5. Guarda (⌘S o Ctrl+S).

### 1.2 Crear las hojas y el primer token
1. En la lista de funciones, junto a **Ejecutar**, elige **`instalar`** (es la primera) y pulsa **Ejecutar**.
2. Acepta los permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a … (no seguro) → Permitir*. El aviso aparece porque el script es tuyo y no está verificado por Google.
3. En el **Registro de ejecución** aparecerá `INSTALACIÓN COMPLETADA` con **TU TOKEN**. Cópialo.
4. Tokens adicionales para el equipo: ejecuta `createToken('Ana', 'editor')` o `createToken('Cliente', 'viewer')`. Para revocar uno: `revokeToken('<token>')`.

### 1.3 Desplegar como aplicación web
1. Pulsa **Implementar → Nueva implementación → Tipo: Aplicación web**.
2. En **Ejecutar como** elige *Yo*; en **Quién tiene acceso**, *Cualquier usuario*.
   > "Cualquier usuario" hace la URL accesible, pero **sin un token válido no devuelve ningún dato**. La seguridad la dan los tokens.
3. Pulsa **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
4. **Cada vez que cambies `Code.gs`**: *Implementar → Gestionar implementaciones → editar → Versión: Nueva versión*. La URL no cambia.

### 1.4 Conectar la app
1. En Content Studio, abre **Ajustes → Conexión y sync**.
2. Pega la URL `/exec` y el token, y pulsa **Guardar → Probar conexión**.
3. Pulsa **Crear/verificar hojas** y luego **Sincronizar ahora**.
4. En otro dispositivo, usa la misma URL y el mismo token (u otro token) y pulsa **Descarga completa**.

### Solución de problemas

| Síntoma | Causa probable |
|---|---|
| "No se pudo contactar con Apps Script" | La URL no termina en `/exec`, o el acceso no es "Cualquier usuario" |
| "Respuesta no válida del servidor" | Pegaste la URL de prueba (`/dev`) o falta publicar una nueva versión |
| "Token no autorizado" | Token mal copiado o revocado |
| "Falta la hoja …" | Pulsa *Crear/verificar hojas* |
| "El servidor está ocupado" | Otra sincronización en curso; la app reintenta automáticamente |
| Cambios "rechazados por el servidor" | Un dato no supera la validación (el motivo aparece en Ajustes). El cambio sigue en la cola local y no se pierde |

---

## 2. Gemini (Google AI Studio)

### 2.1 Obtener la API Key
1. Entra en <https://aistudio.google.com> con tu cuenta de Google.
2. Abre **Get API key → Crear clave de API**. Se crea un proyecto de Google Cloud o puedes elegir uno existente.
3. Copia la clave. **No la pegues en el código ni la subas a GitHub.**

### 2.2 Guardarla en el servidor (recomendado)
1. En Apps Script, abre **Configuración del proyecto → Propiedades del script → Añadir propiedad**.
2. Añade `GEMINI_API_KEY` con tu clave como valor.
3. Si quieres, añade también:
   - `AI_DAILY_LIMIT`: solicitudes por token y día (por defecto 300);
   - `AI_MAX_TOKENS`: tope de tokens de salida (por defecto 16384).
4. Ejecuta `testGemini` en el editor para comprobar que funciona.
5. En la app: **Ajustes → IA → Modo seguro**, y pulsa **Probar IA**.

### 2.3 Elegir el modelo
- Por defecto se usa el alias **`gemini-flash-latest`**, que Google actualiza al último modelo Flash avisando con dos semanas de antelación.
- En **Ajustes → IA → Cargar modelos** verás los modelos que tu clave puede usar. Puedes fijar uno concreto, por ejemplo un Flash estable o un Flash-Lite para tareas rápidas.
- Google retira modelos con el tiempo (por ejemplo, ha anunciado la retirada de `gemini-2.5-flash`). Si aparece "Modelo no encontrado", elige otro de la lista.

### 2.4 Solicitudes y respuestas
- La app envía `systemInstruction` (metodología + marca) y `contents` (tarea), con `responseMimeType: application/json` y una temperatura configurable.
- La investigación usa la herramienta `google_search`. Si tu nivel o modelo no la admite, la app reintenta sin búsqueda y avisa de que los datos no están verificados.
- Errores que la app traduce:
  - **429**: límite por minuto o por día; la app reintenta con espera;
  - **400**: clave o solicitud inválida;
  - **403**: sin permiso;
  - **404**: modelo inexistente;
  - **5xx**: servicio no disponible; la app reintenta.
- Si la respuesta se corta (`MAX_TOKENS`), la app pide reducir versiones o duración.

### 2.5 Costes y límites
- El **nivel gratuito** tiene límites **por proyecto** de solicitudes por minuto (RPM), tokens por minuto (TPM) y solicitudes por día (RPD); el contador diario se reinicia a medianoche, hora del Pacífico. **Google no garantiza cifras fijas**: consulta las vigentes en AI Studio → *Rate limits*.
- **Privacidad:** en el nivel gratuito, Google puede usar los datos enviados para mejorar sus productos. No envíes información confidencial de clientes; en el nivel de pago esto no ocurre.
- Controles de la app:
  - límite diario en el servidor por token;
  - límite local por dispositivo;
  - contador de solicitudes y tokens en *Ajustes → IA*;
  - topes de tokens de salida.
- Si activas la facturación, define un **presupuesto con alertas** en Google Cloud.

### 2.6 Protección de la clave
| Modo | Dónde vive la clave | Uso |
|---|---|---|
| **Seguro (proxy)** | Propiedades del script en Apps Script | Uso normal y despliegues públicos (GitHub Pages) |
| Directo | `sessionStorage` de la pestaña (se borra al cerrar) | Solo pruebas en `localhost` sin Apps Script |
| Desactivado | — | La app funciona sin IA |

Si sospechas que una clave se ha filtrado, revócala en AI Studio y crea otra.

---

## 3. Claude (API de Anthropic) como alternativa a Gemini

> La suscripción **Claude Pro** (claude.ai) **no incluye acceso a la API**. La API se factura aparte, por uso, en la consola de desarrolladores.

1. Entra en <https://platform.claude.com>, añade crédito en **Billing** y crea una clave en **API Keys** (empieza por `sk-ant-`).
2. En Apps Script, añade en *Propiedades del script*: `ANTHROPIC_API_KEY` = tu clave. Si quieres, añade también `AI_EFFORT` = `low` | `medium` | `high` (por defecto `low`, que es más rápido).
3. Ejecuta `testClaude` en el editor para comprobarlo.
4. En la app: **Ajustes → IA → Proveedor: Claude**, elige el modelo y pulsa **Probar IA**.

| Modelo | ID | Precio aprox. (entrada / salida, por millón de tokens) |
|---|---|---|
| Claude Opus 5.5 (recomendado) | `claude-opus-5-5` | 4 $ / 20 $ |
| Claude Sonnet 5.5 | `claude-sonnet-5-5` | 2 $ / 10 $ |
| Claude Haiku 5.5 | `claude-haiku-5-5` | 0,10 $ / 0,50 $ |

Detalles técnicos:
- Apps Script llama a `POST https://api.anthropic.com/v1/messages` con las cabeceras `x-api-key` y `anthropic-version: 2026-10-21`. Como Apps Script no tiene SDK oficial de Anthropic, se usa la API REST directamente.
- En Opus 5.5 y Sonnet 5.5 se activa la recuperación automática ante rechazos de los filtros de seguridad (`fallbacks: "default"` con la cabecera `anthropic-beta: server-side-fallback-2026-07-01`).
- La investigación usa la herramienta de búsqueda web de Claude (`web_search_20260209`; en Haiku, `web_search_20250305`). Esa herramienta tiene un coste adicional por búsqueda.
- El servidor traduce la respuesta de Claude al mismo formato que la de Gemini, así que el resto de la app no cambia.
- Errores que la app traduce:
  - `529 overloaded_error`: Claude está saturado; la app reintenta;
  - `402 billing_error`: no hay crédito;
  - `401`: clave inválida;
  - `stop_reason: "refusal"`: la solicitud se rechazó por los filtros de seguridad.
