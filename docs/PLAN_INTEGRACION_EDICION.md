# Plan: integrar Content Studio con las skills de edición y animación de reels

> Estado: **propuesta para revisar antes de desarrollar** (versión 2). No se ha cambiado código.
> Fuentes: este repositorio, el repositorio de referencia **Sloth** y las guías (`.md`) de las skills
> **`editar-reels-claude`** y **`animar-reels-claude`**. De las skills se leyeron las guías, no los scripts.
> La versión 1 de este plan inventaba un formato de carpetas propio; esta versión lo sustituye por el que **ya usan tus
> skills**.

---

## 1. Resumen

**Lo más importante que salió de revisar tus skills:** ya funcionan como Sloth, e incluso mejor en edición. Tienen un
plan único por reel (`trabajo/plan.json`), los gráficos anclados a palabras de la voz, un catálogo de unos 20 gráficos,
escenas animadas (`trabajo/escenas.json`), un editor en vivo, revisión automática de zonas seguras y de cifras, reglas
para gastar pocos tokens y **marcas guardadas como datos** (`Mi estilo/marcas/<marca>.json`).

Por eso la integración **no necesita un formato nuevo**: Content Studio solo tiene que **escribir en las carpetas que
tus skills ya leen** y **leer lo que ellas entregan**.

| Content Studio aporta | Las skills ya hacen |
|---|---|
| La marca completa (voz, reglas, productos, nombres propios) | Cortar, subtitular, gráficos, cámara, sonido, máster, portada |
| La idea y el guion aprobado | Transcribir la toma real y anclar todo a sus palabras |
| Qué tipo de video es y cuántos gráficos lleva | La entrevista inicial (que así casi desaparece) |
| Una propuesta de gráficos y escenas por frase del guion | Convertirla en gráficos reales, revisarla y pedirte el OK |
| El seguimiento (grabado, editado, publicado, métricas) | Entregar `FINAL - <tema>.mp4` y `portada.png` |

**Lo que falta de verdad:** Higgsfield. **No aparece en ninguna de las dos skills.** Hoy generan con HyperFrames (2D),
three.js (3D ligero), tus fotos y mapas de México; Google Flow solo se usa, a mano, para el fondo de la portada.
Integrar Higgsfield es trabajo nuevo **en las skills** (sección 6).

---

## 2. Lo que hacen tus skills hoy

### 2.1 Carpetas

```
~/Desktop/Claude Code/Videos Claude/Reels con Claude/
  Mi estilo/
    marcas/<marca>.json             estilo de cada marca como datos (estado: definida · por confirmar · pendiente)
    Reglas-de-estilo-<Marca>.md     guía corta de la marca (opcional; la skill la lee)
    tipografias/  logos/  voz/      fuentes .woff2, logos oficiales, muestras de tu voz para clonarla
  Tomas/                            tus videos en crudo (compartidos por todos los reels)
  Música/                           opcional
  Reels/
    AAAA-MM-DD · <tema>/
      proyecto.json                 toma, marca, tipo, resolución, revisión, con_graficos, flotantes, pantalla,
                                    detras, musica, red, editor
      trabajo/plan.json             el plan único: estilo, subtítulos, tomas, gráficos, cámara, sonido, portada
      trabajo/escenas.json          escenas animadas (animar-reels-claude)
      trabajo/guion.txt             guion (solo en video animado completo)
      FINAL - <tema>.mp4            el entregable
      portada.png
```

### 2.2 Las dos skills y los tres tipos de video

| Tipo | Skill | Qué pasa |
|---|---|---|
| **Cabeza parlante** | `editar-reels-claude` | Corta silencios y tomas falsas, subtítulos, gráficos, cámara, texto detrás de la cabeza, música y efectos |
| **Producto con voz en off** | `editar-reels-claude` | Monta tus tomas de producto sobre la voz, frase por frase |
| **Video animado completo** | `animar-reels-claude` (modo B) | Desde un tema o guion: voz (grabada, clonada o genérica) y escenas animadas cada 3-5 s |
| *(cualquiera de los dos primeros)* + **escenas animadas** | `animar-reels-claude` (modo A) | B-roll animado insertado en un reel grabado |

### 2.3 Reglas que comparten con Content Studio

- **«Los gráficos ilustran lo que dice la voz»** y **«ninguna cifra que no se pronuncie»** (lo bloquea un script). Es la
  misma idea que las reglas de veracidad de los prompts de Content Studio. Las dos apps dicen lo mismo con distintas
  palabras, así que encajan.
- **Gastar pocos tokens:** no leer `plan.json` ni `words.json` enteros (`plan.py resumen`), un solo comando para revisar
  y exportar, una sola hoja de capturas por revisión. Es justo lo que recomendaba Sloth.
- **Zonas seguras:** 220 px arriba, 380 abajo y 140 a la derecha (Content Studio debería usar las mismas al preparar la
  grabación).

### 2.4 Lo que esto cambia frente a la versión 1 del plan

- Fuera `_marca/`, `MARCA.md`, `estilo.json`, `encargo.md` y `recursos.json` inventados: se usan `marcas/<marca>.json`,
  `Reglas-de-estilo-<Marca>.md`, `proyecto.json`, `plan.json` y `escenas.json`.
- **Ahorrar tokens con la transcripción ya está resuelto**: la skill transcribe en local con Whisper (no gasta tokens) y
  no lee los archivos largos. Lo que más ahorra ahora es que **la entrevista inicial y la propuesta de gráficos lleguen
  hechas** desde Content Studio.

---

## 3. La integración, pieza por pieza

### 3.1 Marca: Content Studio ↔ `Mi estilo/marcas/<marca>.json`

La ficha de marca de Content Studio genera (y lee) el archivo de la marca de la skill, y su guía corta.

| En la skill (`marcas/<marca>.json`) | Sale de Content Studio |
|---|---|
| `nombre`, `estado` | Nombre de la marca; `definida` cuando la pestaña «Estilo de edición» está completa |
| `colores` (`texto`, `acento`, `sobre_acento`, `oscuro`, `detras`) | Paleta, con un **rol** asignado a cada color (hoy los colores solo tienen nombre) |
| `fuentes` (familia, peso, archivo `.woff2`) | Tipografías + el archivo de cada una en *Recursos* |
| `subtitulos.animacion`, `mayusculas`, `contorno`… | Nuevos campos con las opciones reales de la skill (`alterna`, `karaoke`, `resaltado`…) |
| `tarjetas.estilo` | Nuevo campo: `blanca`, `cristal`, `cristal_oscuro`, `oscura` |
| `graficos_permitidos` | Nuevo campo: casillas con el catálogo de gráficos |
| `zoom.movimientos` | Nuevo campo: casillas con los movimientos de cámara (`[]` = ninguno) |
| `sonido.efectos` | Nuevo campo: hasta 3 tipos de efecto (`whoosh`, `pop`, `impact`…) |
| `correcciones` | **Nombres propios y productos** de la ficha (p. ej. `{"Kafe Rico": "KafeRico"}`): Whisper deja de escribirlos mal |
| `notas` | Reglas de *Reglas, límites y temas sensibles* que afectan a lo que sale en pantalla |
| `Reglas-de-estilo-<Marca>.md` | Se genera desde la pestaña «Estilo de edición» y la de comunicación, en el formato de `guia-de-estilo-ejemplo.md` (tono, lienzo, tipografía, color, subtítulos, motion graphics, ritmo, sonido, logos, prohibido) |

**Ida y vuelta.** El editor en vivo de la skill tiene «Guardar como estilo de la marca», que reescribe
`marcas/<marca>.json`. Para no pisar esos ajustes, Content Studio **lee el archivo antes de escribirlo** y conserva lo
que se ajustó en el editor (tamaños, posiciones). La regla propuesta es que cada lado mande en lo suyo:

- **Manda Content Studio:** identidad, reglas, colores con su rol, fuentes, correcciones, gráficos permitidos.
- **Manda la skill:** medidas finas (`tam`, `y`, `alto`, márgenes) que se afinan mirando el video.

Con esto, los campos de *Identidad visual* que hoy «no sirven para nada» (sección 9 de
[FICHA_DE_MARCA.md](FICHA_DE_MARCA.md)) pasan a ser los que alimentan la edición. Los de texto libre se cambian por las
opciones reales de la skill: así no se inventan valores que la skill no entiende.

### 3.2 Contenido: Content Studio → `Reels/<fecha · tema>/`

Al pulsar **«Enviar a edición»** en un contenido con guion aprobado, Content Studio crea la carpeta del reel con:

1. **`proyecto.json` ya rellenado** (marca, tipo, red, con_graficos, flotantes, pantalla, música, editor) y un campo
   nuevo, `contenido: "CNT-0042"`. Así la entrevista de la skill se reduce a confirmar la toma.
2. **`trabajo/guion-aprobado.md`**: el guion con sus secciones (voz, texto en pantalla, visual, edición, pico), la CTA y
   los datos marcados `[VERIFICAR]`.
3. **`trabajo/propuesta-graficos.md`**: la tabla *Lo que dice · Qué aparece · Tipo* (como `plan-graficos.md` del
   ejemplo), con los **tipos reales del catálogo** (`lista`, `contador`, `comparativa`, `pasos`, `gancho`, `cierre`…) y
   las escenas de `animar-reels-claude` (`mapa`, `cifra`, `mecanismo`, `pieza3d`…). Es una **propuesta**: la skill la
   ancla a las palabras reales de la toma con `plan.py`, la revisa y te enseña su tabla para el OK, como hoy.
4. **`trabajo/vocab.txt`**: los nombres propios para `transcribe.py --vocab`.

**La toma.** Las tomas viven en `Tomas/`, compartidas. Para ligar una toma a su contenido, Content Studio la copia ahí con
el id en el nombre: `Tomas/CNT-0042 toma1.mov`. Con eso detecta solo que está **grabado**.

### 3.3 Lanzar la edición

| Nivel | Cómo |
|---|---|
| **1. Copiar mensaje** (primero) | Botón «Editar con Claude» en el contenido. Copia `Usa la skill editar-reels-claude con el reel «Reels/2026-11-23 · Café quemado»` (o `animar-reels-claude` si el tipo es animado). Lo pegas en Claude Code abierto en `Reels con Claude/`. |
| **2. Pendientes** | «Edita los reels pendientes»: la skill busca los `proyecto.json` con `contenido` y sin `FINAL - *.mp4`. |
| **3. Automático** (opcional, al final) | Un script local que vigila la carpeta y lanza Claude Code. No lo recomiendo al principio: tus skills piden tu OK en varios pasos (palabras clave, tabla de gráficos, muestra de voz), y eso no tiene sentido sin ti delante. |

### 3.4 Volver a Content Studio

Con la carpeta conectada, Content Studio detecta solo:

| Estado | Cómo lo detecta |
|---|---|
| **Grabado** | Existe `Tomas/CNT-0042*` |
| **Editado** | Existe `Reels/<…>/FINAL - *.mp4` en la carpeta del reel con `contenido: "CNT-0042"` |
| Vista previa | Reproduce el `FINAL` y enseña `portada.png` dentro del contenido |
| Copies | Usan los subtítulos reales (lo que se dijo de verdad) en lugar del guion, si están disponibles |

Publicado y métricas siguen a mano, como pediste.

### 3.5 Brave

La carpeta conectada usa la File System Access API, que **Brave trae apagada por defecto**. Se enciende una vez en
`brave://flags/#file-system-access-api` → *Enabled* → reiniciar Brave. Sin eso, todo funciona con descargas .zip que
descomprimes en `Reels/`, pero el estado no se detecta solo.

---

## 4. El guion, preparado para la edición

Para que la propuesta de gráficos sea buena, el generador de guiones de Content Studio cambia así:

- **Tipo de producción** en cada contenido: *Cabeza parlante*, *Producto con voz en off*, *Animado completo*. Decide la
  skill, si hay paso «Por grabar» (no lo hay en animado con voz clonada o genérica) y qué tipos de recurso se proponen.
- **Recursos por sección**, con el vocabulario de la skill: cada sección del guion propone 0-1 gráfico o escena, con su
  tipo, la frase que lo motiva y sus datos (los puntos de la lista, la cifra, el estado del mapa). La IA respeta los
  **topes** de la marca (flotantes 0-8, pantalla completa 0-3) y la regla de **no poner cifras que no se dicen**.
- **Ejemplos** de lo que pediste:
  - «tres razones» → `lista` (o `lista_iconos` animada), un renglón por razón, que entra al decirlo.
  - Un lugar de México → escena `mapa` con zoom al estado. **Hoy el mapa solo tiene México**: un país como Ghana
    necesita ampliar los datos del mapa (sección 6).
  - El gancho «por qué es bueno comer chocolate» → gancho visual con Higgsfield (sección 6).
- **Modo grabación** (lo que Sloth hace en «Preparar para grabar»): teleprompter a pantalla completa, tabla segundo a
  segundo, variantes de gancho, qué preparar antes de grabar y las zonas seguras de la skill. Solo para *Cabeza
  parlante* y *Producto con voz en off*.

---

## 5. Cambios en Content Studio

| # | Cambio | Dónde |
|---|---|---|
| 1 | Pestaña **«Estilo de edición»** con las opciones reales de la skill (roles de color, fuentes con archivo, animación de subtítulos, estilo de tarjetas, gráficos permitidos, movimientos de cámara, efectos de sonido, música) | `js/views/brands.js`, `js/core/schema.js` (`brandConfigs.visual`) |
| 2 | **Exportar e importar** `marcas/<marca>.json` y `Reglas-de-estilo-<Marca>.md` | Nuevo servicio `js/services/reels.js` |
| 3 | **Tipo de producción** y **recursos por sección** en el guion | `js/core/schema.js` (ideas), `js/services/prompts.js`, `js/views/content-script.js` |
| 4 | **Modo grabación** | `js/views/content-script.js` |
| 5 | **«Enviar a edición»** y **«Editar con Claude»** | `js/views/content.js` + `js/services/reels.js` |
| 6 | **Carpeta conectada** (Brave/Chrome): estado automático, vista previa, subtítulos reales para los copies | `js/services/reels.js`, `js/views/settings.js` |

El catálogo de gráficos y escenas se copia como **datos** (nombres de tipos y sus campos), no como código: los scripts
de la skill son de Viegas Estudio, con licencia de uso para tus videos y sin reventa, y este repositorio es público.

---

## 6. Cambios en las skills

### 6.1 Leer lo que prepara Content Studio (pequeños)

1. **Entrevista:** si `proyecto.json` trae `contenido`, dar por respondido lo que ya trae y preguntar solo la toma (si
   no hay `Tomas/<CNT>*`).
2. **Gráficos:** si existe `trabajo/propuesta-graficos.md`, partir de ahí para la tabla (anclar con `plan.py`, verificar,
   enseñar).
3. **Transcripción:** usar `trabajo/vocab.txt` en `--vocab`.
4. **Pendientes:** la orden «edita los reels pendientes».

### 6.2 Higgsfield (nuevo)

Hoy no existe en ninguna de las dos skills. Lo que harían falta:

| Pieza | Qué es | Cómo encaja en lo que ya hay |
|---|---|---|
| **B-roll generado** | Un clip de 2-5 s de lo que se nombra y no se grabó | Un tipo nuevo en `escenas.json` (p. ej. `clip_ia`, con `prompt`, `uso: marco \| pantalla`, `desde_palabra`). El gráfico `marco` ya sabe enseñar un clip (`src`) |
| **Gancho visual** | Transformar el primer cuadro de la toma (la cara que se derrite como chocolate) | Un `clip_ia` con `desde: primer_fotograma`, que **sustituye** los primeros 2-3 s del video base. La voz sigue siendo la grabada (Regla 1) |
| **Escenas de video animado** | Tomas generadas en el modo B | `clip_ia` con `uso: video`, mezclado con las escenas 2D |
| **Presupuesto** | Higgsfield gasta créditos | `limites.ia` en `proyecto.json` (p. ej. 3 clips por reel); el plan no guarda más |
| **Estilo de la marca** | Estética base y lo que no se genera | `marcas/<marca>.json → ia` (`estetica`, `prohibido`, texto base para cada prompt) |

**Cómo se llama a Higgsfield** está por decidir. Hay dos caminos:

- **Por su API, si tu cuenta la tiene:** la skill lo genera sola en segundo plano (lo más cómodo; necesita guardar la
  llave en tu computadora, fuera de la skill).
- **A mano, como Google Flow en la portada:** un script prepara el fotograma y el prompt (`trabajo/ia/<id>-prompt.txt`),
  Claude o tú lo generáis en el navegador con tu sesión, **pidiendo permiso antes de subir y de descargar**, y se guarda
  en `trabajo/ia/<id>.mp4`.

En los dos casos, el clip se genera **antes** de exportar, porque es lo que más tarda, y si falla el reel sale igual con
una escena 2D en su lugar.

### 6.3 Mapas fuera de México

El tipo `mapa` usa datos de Natural Earth reducidos a México (`datos/mexico.json`). El mismo script
(`preparar_mapa.py`) ya parte del archivo de países del mundo: ampliarlo a países (zoom a Ghana, a España…) es una
extensión natural.

---

## 7. Plan por fases

| Fase | Qué | Lado | Ya sirve para |
|---|---|---|---|
| **1** | Pestaña «Estilo de edición» + exportar/importar `marcas/<marca>.json` y `Reglas-de-estilo-<Marca>.md` | Content Studio | Que las skills editen con la marca de Content Studio (modo paralelo) |
| **2** | Tipo de producción + recursos por sección en el guion + «Enviar a edición» (descarga) + «Editar con Claude» | Content Studio + 6.1 en las skills | Modo integrado con copiar y pegar |
| **3** | Modo grabación | Content Studio | Grabar con el guion delante |
| **4** | Carpeta conectada: tomas con su id, estado automático, vista previa, subtítulos reales | Content Studio | Seguimiento sin marcar a mano |
| **5** | Higgsfield (`clip_ia`, gancho visual, presupuesto) | Skills | B-roll y ganchos generados |
| **6** | Mapas del mundo | Skill de animar | Lugares fuera de México |

Las fases 1 a 4 son de Content Studio y se pueden hacer desde aquí. Las 5 y 6 cambian tus skills, que viven en tu
computadora: se harían en una sesión de Claude Code abierta allí, o mandando aquí la carpeta de scripts.

---

## 8. Lo que queda por decidir

1. **Higgsfield: ¿tu cuenta tiene API?** Si no, va a mano como Google Flow.
2. **¿Qué marcas de Content Studio ya tienen su `marcas/<marca>.json` en la skill?** Para esas, la fase 1 empieza
   **importando** (la skill ya tiene su estilo afinado) y no exportando.
3. **¿Empezamos por la fase 1?** Es la que menos depende de lo demás y ya te sirve hoy.
