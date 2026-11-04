# Content Studio

> **👉 Empieza aquí: abre `GUIA-DE-INSTALACION.html` con doble clic.** Es la guía paso a paso para instalarlo sin saber programar.

Centro de operaciones de contenido para redes sociales **multimarca**. Cubre todo el proceso en una sola herramienta:

**Investigación → Estrategia → Ideas → Guiones → Producción → Edición → Copies → Calendario → Publicación → Resultados → Optimización**

- **Offline-first.** Todo se guarda en el navegador (IndexedDB) y funciona sin conexión gracias a un Service Worker.
- **Google Sheets** como base de datos remota, mediante Google Apps Script. Incluye sincronización, control de versiones, conflictos y eliminación lógica.
- **IA con Gemini (Google AI Studio) o Claude (API de Anthropic)**, a elegir, a través de un proxy seguro en Apps Script. Las claves nunca llegan al navegador.
- **Metodología integrada.** Viene de una investigación de buenas prácticas y de la ingeniería inversa de 34 guiones de una agencia: estructuras, hooks en 4 capas, CTA y evaluador. Ver [docs/METODOLOGIA.md](docs/METODOLOGIA.md).
- **HTML + CSS + JavaScript sin dependencias.** Son módulos ES que no necesitan compilación.

> La publicación en TikTok, Instagram, Facebook y YouTube se hace **a mano**. La app gestiona el calendario, los materiales y el estado de cada publicación, pero no publica por ti.

---

## Inicio rápido (5 minutos, sin configurar nada)

1. Descarga o clona el proyecto.
2. Arranca un servidor local desde la carpeta del proyecto:
   En Mac, haz doble clic en **`Abrir Content Studio (Mac).command`**; en Windows, en **`Abrir Content Studio (Windows).bat`**. Si prefieres la terminal:
   ```bash
   python3 -m http.server 4747 --bind 127.0.0.1
   ```
3. Abre <http://localhost:4747>.
4. Pulsa **Cargar demostración** para explorar la app con dos marcas ficticias, o **Crear marca** para empezar con la tuya.

Sin configurar nada más, la app funciona entera en modo local, excepto la IA y la sincronización.

### ¿Por qué no basta con abrir `index.html` con doble clic?
Al abrir el archivo como `file://`, los navegadores **bloquean los módulos JavaScript y el Service Worker**, así que la app no arranca o no funciona sin conexión. Usa siempre un servidor local (`localhost` se considera un contexto seguro) o publícala en GitHub Pages (HTTPS).

---

## Configuración completa

| Paso | Qué consigues | Guía |
|---|---|---|
| 1. Google Sheets + Apps Script | Copia en la nube, varios dispositivos y personas | [docs/CONFIGURACION_API.md §1](docs/CONFIGURACION_API.md) |
| 2. Gemini (AI Studio) | Ideas, guiones, evaluación, copies e investigación con IA | [docs/CONFIGURACION_API.md §2](docs/CONFIGURACION_API.md) |
| 3. GitHub y GitHub Pages | Repositorio y app publicada con HTTPS | [docs/GITHUB.md](docs/GITHUB.md) |

## Documentación

- [docs/USO.md](docs/USO.md): cómo usar la app, del flujo de trabajo a cada módulo.
- [docs/METODOLOGIA.md](docs/METODOLOGIA.md): investigación, ingeniería inversa del material de referencia y metodología con niveles de evidencia.
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): módulos, flujo de datos, sincronización, seguridad y limitaciones.
- [docs/GOOGLE_SHEETS.md](docs/GOOGLE_SHEETS.md): estructura de hojas, identificadores y relaciones.
- [docs/CONFIGURACION_API.md](docs/CONFIGURACION_API.md): Apps Script, tokens, Gemini, costes y límites.
- [docs/GITHUB.md](docs/GITHUB.md): subir a GitHub y publicar en Pages.
- [docs/PRUEBAS.md](docs/PRUEBAS.md): pruebas automáticas y casos de prueba manuales.

## Estructura del proyecto

```
content-studio/
├── index.html               Estructura de la app e iconos SVG
├── manifest.webmanifest     App instalable (PWA)
├── sw.js                    Service Worker (caché offline)
├── css/                     tokens · base · layout · components · views
├── js/
│   ├── main.js              Arranque, router y barra superior
│   ├── core/                db (IndexedDB) · store (datos, historial, cola) · schema · ui · utils · settings · events · app
│   ├── services/            methodology · prompts · ai · assistant · sync · api · workflow · scriptkit · analytics · demo
│   └── views/               dashboard · ideas · contents · content (+script, production, publish) · calendar · results · brands · method · settings
├── apps-script/             Code.gs + appsscript.json (backend)
├── assets/icons/            Favicon e iconos PWA
├── examples/                Archivo de ejemplo para importar
├── tests/                   Pruebas automáticas (node --test)
├── tools/update-sw.js       Regenera la lista de archivos del Service Worker
└── docs/                    Documentación
```

## Comandos

```bash
npm start
```
Arranca el servidor local en el puerto 4747 (necesita Python 3).

```bash
npm test
```
Ejecuta las pruebas unitarias y las del backend con un simulador de Sheets (necesita Node 20 o superior).

```bash
npm run sw
```
Actualiza la caché offline antes de publicar una versión nueva.

## Seguridad en resumen

- El repositorio **no contiene claves, tokens ni secretos**.
- La API Key de Gemini se guarda en *Propiedades del script* de Apps Script.
- Cada persona usa un **token de acceso** propio, con rol admin, editor o lector, que se puede revocar.
- El modo "IA directa" existe solo para pruebas locales. La clave se guarda en `sessionStorage` y se borra al cerrar el navegador.

Más detalle en [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md#seguridad).

## Licencia

MIT. El material de referencia de la agencia **no** se incluye en el repositorio; solo se usa la metodología abstraída a partir de él.
