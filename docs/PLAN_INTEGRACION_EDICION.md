# Plan: integrar Content Studio con la skill de edición de Reels

> Estado: **propuesta para revisar antes de desarrollar.** No se ha cambiado código.
> Fuentes analizadas: este repositorio (Content Studio) y el repositorio de referencia **Sloth** (`Sloth-main.zip`).
> **Falta por revisar: tu skill de edición de Reels.** No venía en el zip (el zip trae solo Sloth y sus skills). Todo lo
> que dice este plan sobre tu skill parte de lo que contaste: una carpeta de crudos, una de referencias/estilo y una de
> entrega. El paso 0 del plan es revisarla y ajustar los nombres de carpetas y archivos.

---

## 1. Resumen

**Recomendación:** que **Content Studio sea el cerebro** (marca, ideas, guion, grabación, seguimiento, métricas) y que
**la skill sea las manos** (editar). Las dos se comunican **por archivos en una carpeta**, no por una API. Es lo mismo
que hace Sloth, y es lo único que funciona bien entre una app web y Claude Code, que corre en tu computadora.

Un solo formato de carpeta sirve para los dos modos que planteas:

| | **Modo integrado** | **Modo paralelo** |
|---|---|---|
| Qué hace la app | Marca, idea, guion aprobado y **encargo de edición** por video | Solo marca, ideas y guion; tú decides el resto |
| Qué recibe la skill | Kit de marca + encargo (guion, intención de cada parte, plataforma, duración) + crudos | Kit de marca + crudos (+ transcripción o guion si los pones) |
| Cómo se lanza | Botón «Editar con Claude», que copia el mensaje; más adelante, automático | Tú le hablas a Claude Code como hoy |
| Cómo vuelve el estado | La app ve que apareció el video editado y marca «Editado» (o lo marcas tú) | Marcas «Grabado» / «Editado» / «Publicado» a mano |

La pieza común es el **kit de marca para edición**: un `MARCA.md` corto y un `estilo.json` que la app genera desde la
ficha. Ahí entran los campos de *Identidad visual* que hoy no usa la IA de guiones (posición de textos, transiciones,
música, efectos, intro, outro, recursos gráficos): no sirven para escribir el guion, pero son justo lo que necesita la
edición.

---

## 2. Qué aprendí de Sloth (y qué conviene copiar)

Sloth es una app de escritorio (Electron + Node) que corre Claude Code con el Agent SDK y hace videos con Remotion.
Cada estilo de video es una **skill** con una **card**. Lo que importa para nosotros no es su tecnología, sino cinco
patrones.

### 2.1 Patrones que sí conviene copiar

| Patrón de Sloth | Cómo funciona allí | Cómo lo usaríamos |
|---|---|---|
| **El estado se lee de los archivos** | Cada card tiene `etapas` con un `listo`: un patrón de archivo (`out/final.mp4`, `portada.png`). Si el archivo existe, la etapa está hecha. El estudio no le pregunta nada al agente: mira la carpeta. | «Grabado» = hay archivos en `crudo/`; «Editado» = existe `editado/final.mp4`. La app lo detecta sola. |
| **El encargo va en líneas fijas** | El mensaje al agente lleva líneas estándar: `Carpeta:`, `Formato: vertical`, `Voz:`, `Idea: <canal>/<idea>`, `Serie:`. La skill las lee sin ambigüedad. | Un `encargo.md` con líneas fijas (`Marca:`, `Contenido: CNT-…`, `Plataforma:`, `Formato:`, `Duración:`…) más el guion. |
| **De la idea al video sin reescribir** | «Hacer con…» en Ideas escribe el borrador del mensaje con título, gancho, primer cuadro, CTA, evidencia y `Idea: …`. Cada hilo queda ligado a su idea. | El botón «Editar con Claude» arma el mensaje desde el contenido `CNT-…`; el id viaja y vuelve en `estado.json`. |
| **El agente decide poco; un script hace el resto** | El agente solo escribe `momentos.json` (qué se ve en cada palabra) y corre `hacer.py`, que transcribe, baja material, edita, renderiza, revisa y pone la portada. El video explicativo pasó de 16 min y $2,70 a 3,7 min y $0,49. | Es la palanca más grande para ahorrar tokens en tu skill (sección 5). |
| **«Preparar para grabar»** | La skill de ideas escribe un `esquema-<id>.md`: primer cuadro, 3 variantes de gancho, guion palabra por palabra medido contra la duración, tabla segundo a segundo (lo que se dice, el texto en pantalla, lo que se ve), CTA, descripción y hashtags, y qué preparar antes de grabar. | Un **modo grabación** en Content Studio (sección 6). Ya tenemos casi todos esos datos en el guion. |

### 2.2 Otros detalles útiles

- **Zonas seguras** en 1080×1920: no poner texto en los 220 px de arriba, los 480 de abajo, los 160 de la derecha ni
  los 80 de la izquierda (los tapa la interfaz de TikTok y Reels). Conviene ponerlo en el kit y en el modo grabación.
- **Portada = primer cuadro** en vertical; en horizontal, miniatura de 1280×720 aparte.
- **Vertical y horizontal se componen por separado**, nunca uno recortado del otro.
- **Las comprobaciones las hace un script, no una regla escrita** («lo que un script puede comprobar no se deja como
  regla en el SKILL.md»). Ahorra vueltas del agente.
- **Series** (formatos fijos que se repiten) y **banco de temas** para no repetir: ya tenemos algo parecido (detección de
  ideas similares y la sección *Series y formatos recurrentes* del documento editorial).
- **Costo medido por estilo** (modelo, esfuerzo, minutos y dólares) guardado en la card. Útil para decidir con qué
  modelo editar.

### 2.3 Lo que no conviene copiar

La app de escritorio, el cobro, la comunidad de estilos, la publicación automática en redes con el navegador y la
generación de videos desde cero con Remotion. Content Studio es una app web ligera sin servidor propio; meterle eso la
volvería otra app. La edición pesada se queda en tu skill.

---

## 3. Por qué la conexión es por carpeta

- **Content Studio corre en el navegador** (PWA, datos en IndexedDB y Google Sheets, IA por Apps Script). Un navegador
  **no puede lanzar Claude Code** ni ffmpeg.
- **La edición tiene que correr donde están los videos**: tu computadora, con Claude Code, la skill, ffmpeg y Higgsfield.
  Subir crudos de varios GB a la nube para editarlos allí es lento y caro. Claude Code en la web no es buena opción para
  esto.
- Lo que sí puede hacer el navegador (Chrome o Edge de escritorio) es **escribir y leer una carpeta local** que tú le
  autorices (File System Access API). Con eso basta para dejar el encargo y ver qué ya se editó.
  En Safari, Firefox o el celular no existe: ahí la app **descarga un .zip** con el encargo.
- **Brave** (el navegador que usas) trae esta función **apagada por defecto**. Se enciende una vez en
  `brave://flags/#file-system-access-api` → *Enabled* → reiniciar Brave. Si prefieres no tocarlo, todo funciona con
  descargas .zip; solo se pierde que la app marque sola «Grabado» y «Editado».

---

## 4. Arquitectura propuesta

### 4.1 Carpetas (el contrato entre la app y la skill)

```
Producción/                          ← carpeta que eliges una vez en Ajustes
  <marca>/
    _marca/                          ← KIT DE MARCA (la app lo regenera al cambiar la ficha)
      MARCA.md                       resumen para edición: voz, reglas, CTA, qué no decir (≈1.500 tokens máx.)
      estilo.json                    colores, fuentes, subtítulos, posición de textos, ritmo, transiciones,
                                     música, efectos, intro, outro, gráficos, zonas seguras
      recursos/                      logos, fuentes, intro/outro, música (los de «Recursos de la marca»)
      referencias/                   videos de estilo de la marca (los pones tú)
      estilo-aprendido.md            lo que la skill aprendió de las referencias (lo escribe la skill una vez)
    CNT-0042-cafe-quemado/           ← UNA CARPETA POR CONTENIDO (solo en modo integrado)
      encargo.md                     líneas fijas + guion aprobado + indicaciones de edición
      guion.json                     el guion estructurado (secciones, texto en pantalla, visual, edición, picos)
      crudo/                         ← tú subes las tomas
      referencias/                   opcional: referencias solo de este video
      editado/                       ← la skill entrega aquí
        final.mp4
        portada.png
        transcripcion.txt            lo que se dijo de verdad, con tiempos
        notas.md                     duración, qué cambió frente al guion, qué revisar
      estado.json                    lo escribe la skill: etapa actual, errores, modelo y costo
```

Los nombres `crudo/`, `referencias/` y `editado/` son provisionales: se cambian por los que ya usa tu skill.

### 4.2 Ejemplo de `encargo.md`

```markdown
Marca: Café de Barrio
Contenido: CNT-0042
Título: Si te sale así, tu café está quemado
Plataforma: instagram (también tiktok)
Formato: vertical
Duración objetivo: 40 s
Estructura: problema-solucion
Objetivo: confianza
Kit de marca: ../_marca/
Crudos: crudo/
Entrega: editado/

## Guion aprobado
| # | Parte | Voz (texto exacto) | Texto en pantalla | Visual / B-roll | Edición | Pico |
|---|---|---|---|---|---|---|
| 0 | Hook | Si tu café sale así, lo estás quemando | ¿CAFÉ QUEMADO? | Chorro oscuro en la taza | Zoom de golpe | 3 |
| 1 | … | … | … | … | … | … |

## CTA
Guárdalo para tu próximo café (guardados).

## Indicaciones de edición
- Subtítulos y ritmo: ver estilo.json.
- Verificar antes de publicar: [tiempo de extracción].
```

### 4.3 Flujo completo

```
Content Studio                                   Tu computadora (Claude Code + skill)
──────────────                                   ────────────────────────────────────
Ficha de marca ──► genera _marca/ (kit) ───────► la skill lo lee en cada video
Idea → Guion aprobado → «Por grabar»
Modo grabación (teleprompter, tabla s/s)
«Enviar a edición» ──► crea CNT-…/encargo.md
                        tú copias las tomas a crudo/
                        app detecta crudo/ ─► «Grabado»
«Editar con Claude» ──► copia el mensaje ──────► lo pegas en Claude Code (o lo toma el puente)
                                                 skill: transcribe → edita → entrega editado/
                        app detecta editado/final.mp4 ─► «Editado» (vista previa en la app)
Copies (con la transcripción real) → Calendario → Publicado (a mano) → Resultados (a mano)
```

### 4.4 Cómo se lanza la edición (de menos a más automático)

| Nivel | Cómo | Cuándo |
|---|---|---|
| **1. Copiar mensaje** | Botón «Editar con Claude»: copia `Edita el reel de la carpeta <ruta>` + las líneas del encargo. Lo pegas en Claude Code. | Desde la fase 2. Sin infraestructura. |
| **2. Bandeja** | Le dices a Claude Code «edita lo pendiente»: la skill busca carpetas con `encargo.md`, crudos y sin `editado/final.mp4`, y las hace una por una. | Con un cambio pequeño en la skill. |
| **3. Puente automático** | Un script local (`node tools/puente-edicion.js`) vigila `Producción/` y, cuando aparece una marca `LISTO_PARA_EDITAR`, lanza `claude -p` con la skill y escribe `estado.json`. | Opcional, al final. Gasta sin que lo mires: con tope de videos por día y solo en encargos que marcaste. |

Mi recomendación es quedarse en los niveles 1 y 2 hasta que el flujo esté probado. El 3 añade un proceso que hay que
dejar encendido y vigilar, para ahorrarte un copiar y pegar.

---

## 5. Ahorrar tokens en la skill

Tu intuición es correcta, con un matiz: **la transcripción no gasta tokens si la hace un script local** (Whisper o
WhisperX, como Sloth con `fuente.py`). Los tokens se gastan cuando **el agente lee** cosas largas, mira imágenes o da
vueltas. Por eso:

1. **Transcribir con un script, nunca «viendo» el video.** El script deja `words.json` con tiempos. El agente **no lo
   abre**: el script imprime un resumen compacto, una línea por frase con su segundo (`[0:03] si tu café sale así…`).
   Es lo que hace Sloth con `nuevo.py`.
2. **Darle el guion aprobado con la intención de cada parte.** Con el guion, la skill no tiene que adivinar qué es el
   hook, dónde va el pico ni qué texto va en pantalla. Solo alinea la toma real con el guion. Un script puede alinear
   (comparando palabras) y avisar de las frases que se saltaron o se improvisaron.
3. **Kit de marca corto, no los 11 documentos.** La edición no necesita el buyer persona ni la competencia. `MARCA.md`
   lleva solo lo que afecta al montaje (voz, reglas, palabras prohibidas en pantalla, CTA aprobados) y `estilo.json` lo
   visual. Objetivo: menos de 1.500 tokens.
4. **Aprender el estilo una sola vez.** La primera vez la skill analiza `_marca/referencias/` (hoja de cuadros, ritmo,
   tipo de subtítulos) y escribe `estilo-aprendido.md`. Los siguientes videos leen ese archivo, no los videos de
   referencia. Si tu skill ya guarda el estilo de la marca, basta con que lo guarde en esa ruta.
5. **El agente decide; un script ejecuta.** Lo más caro es que el agente escriba código de edición en cada video. Lo
   barato (el patrón de Sloth): el agente escribe un solo archivo de decisiones (qué se ve y qué efecto va en cada
   frase, tipo `momentos.json`) y un comando hace los cortes, subtítulos, zooms, música, render, revisión y portada. Un
   `--revisa` que diga todos los errores de una vez evita vueltas.
6. **Revisión con una sola imagen.** El agente mira una hoja de cuadros (`hoja.png`, un cuadro por segundo) en vez de
   muchos fotogramas sueltos.

Los puntos 1 a 4 dependen solo del contrato de carpetas. Los puntos 5 y 6 son cambios dentro de tu skill y se deciden
cuando la revise.

---

## 6. Cambios en Content Studio

### 6.1 Ficha de marca: nueva pestaña «Estilo de edición»

Mover y ampliar los campos audiovisuales de *Identidad visual*. Dejan de estar «sin uso»: alimentan el kit.

| Campo | Ya existe | Va a |
|---|---|---|
| Colores, tipografías | Sí | `estilo.json` (y guion, como hoy) |
| Estilo de subtítulos, edición, ritmo | Sí | `estilo.json` (y guion, como hoy) |
| Posición de textos, transiciones, música, efectos, intro, outro, recursos gráficos | Sí, sin uso | `estilo.json` |
| Zonas seguras por plataforma | No | `estilo.json` (con valores por defecto) |
| Logo y su posición, marca de agua | No (`logoAssetId` existe sin uso) | `estilo.json` + `recursos/` |
| Uso de B-roll / motion graphics / Higgsfield (sí, no, cuánto) | No | `estilo.json` |
| Duración máxima de cada plano, % de cara a cámara | No | `estilo.json` |
| Música de referencia (enlaces), volumen bajo la voz | No | `estilo.json` |
| Referencias de estilo de video | Parcial (pestaña Referencias) | `_marca/referencias/` (enlaces en `MARCA.md`) |

Los recursos subidos (logos, fuentes) se copian a `_marca/recursos/` al exportar; hoy solo viven en el dispositivo.

### 6.2 Exportar el kit de marca

Botón **«Kit para edición»** en la ficha: descarga `MARCA.md` + `estilo.json` + recursos (o los escribe en `_marca/` si
hay carpeta conectada). **Sirve desde el primer día para el modo paralelo**: lo pones una vez en la carpeta de
referencias de tu skill.

### 6.3 Modo grabación (lo que Sloth hace en «Preparar para grabar»)

En la pestaña Guion de un contenido aprobado:

- **Teleprompter** a pantalla completa (sirve en el celular), con velocidad según las palabras por minuto de la marca.
- **Tabla segundo a segundo**: lo que se dice, el texto en pantalla y lo que se ve (ya está en el guion).
- **Primer cuadro y 3 variantes de gancho** (ya los genera la IA como `hookAlternatives`).
- **Lista de qué preparar** antes de grabar (objetos, lugar, ropa, tomas de recurso).
- Recordatorio de **zonas seguras** y formato.

### 6.4 Enviar a edición y seguimiento

- **«Enviar a edición»**: crea la carpeta `CNT-…` con `encargo.md` y `guion.json` (o descarga un .zip).
- **Carpeta conectada** (Ajustes → Producción, Chrome o Edge): la app revisa las carpetas al abrir el contenido o el
  tablero y marca **Grabado** cuando hay crudos y **Editado** cuando aparece `editado/final.mp4`. Puedes seguir
  marcándolo a mano, como hoy.
- **Vista previa** del video editado dentro del contenido y lectura de `notas.md`.
- **Copies con la transcripción real**: si existe `editado/transcripcion.txt`, la IA de copies la usa en lugar del guion
  (lo que se dijo de verdad puede ser distinto).
- **Publicado y métricas**: siguen a mano, como pediste.

---

## 7. Cambios en tu skill (a confirmar cuando la revise)

1. Leer `encargo.md` si existe (modo integrado); si no existe, trabajar como hoy (modo paralelo).
2. Leer siempre `_marca/MARCA.md`, `estilo.json` y `estilo-aprendido.md`; escribir `estilo-aprendido.md` si no está.
3. Transcribir con un script local y no abrir `words.json` (imprimir el resumen compacto).
4. Entregar siempre en `editado/` con nombres fijos: `final.mp4`, `portada.png`, `transcripcion.txt`, `notas.md`.
5. Escribir `estado.json` al avanzar (`transcrito`, `editando`, `revisión`, `listo`, `error`) con el id del contenido.
6. Opcional: modo «bandeja» (editar todo lo pendiente) y separar decisiones (un JSON) de ejecución (un comando).

---

## 8. Plan por fases

| Fase | Qué | Para qué modo | Tamaño |
|---|---|---|---|
| **0** | Revisar tu skill y fijar el contrato de carpetas y nombres (este documento, versión final). | Los dos | Pequeño |
| **1** | Pestaña «Estilo de edición» + exportar **kit de marca** (`MARCA.md`, `estilo.json`, recursos). | Paralelo ya; integrado después | Medio |
| **2** | «Enviar a edición» (encargo + guion, descarga .zip) y botón «Editar con Claude» (copiar mensaje). Ajustes en la skill para leer el encargo y entregar con nombres fijos. | Integrado | Medio |
| **3** | Modo grabación (teleprompter, tabla segundo a segundo, variantes de gancho, lista de preparación). | Los dos | Medio |
| **4** | Carpeta conectada: estado automático (Grabado / Editado), vista previa, copies con la transcripción real. | Integrado | Medio |
| **5** (opcional) | Puente automático local y modo bandeja en la skill. | Integrado | Medio |

Cada fase se puede usar sola. La 1 ya resuelve el modo paralelo; la 2 ya da el modo integrado con un copiar y pegar.

---

## 9. Decisiones tomadas

| Pregunta | Respuesta | Qué cambia |
|---|---|---|
| Navegador | Brave | Carpeta conectada con el flag de Brave encendido (sección 3); si no, descargas .zip. |
| Dónde corre Claude Code | En la misma computadora que los videos | Se confirma la conexión por carpeta local. |
| Uso de Higgsfield y motion graphics | En los dos tipos de producción (sección 10) | El guion pasa a incluir un **plan de recursos visuales**. |
| Skill `editar-reels-claude` | Sin localizar: no está en el zip ni en tus repositorios de GitHub | Ver sección 11. |

---

## 10. Dos tipos de producción y el plan de recursos visuales

Cada contenido tendrá un campo nuevo, **Tipo de producción**:

| Tipo | Qué es | Grabación | Qué hace la skill |
|---|---|---|---|
| **A cámara** | Hay tomas en crudo de una persona hablando. | Sí (modo grabación, teleprompter) | Corta, subtitula y **enriquece** la toma con recursos visuales. |
| **Desde cero** | No hay nada que editar. | No (como mucho, la voz en off) | **Genera** todo: tomas y B-roll con Higgsfield, tarjetas y animaciones con motion graphics. |
| **Mixto** | Toma a cámara con partes generadas (p. ej., un gancho generado y luego la persona). | Sí | Las dos cosas. |

En los tres casos, la decisión de **qué se ve en cada momento** se toma en Content Studio, al escribir el guion, y viaja
a la skill en un archivo: **`recursos.json`**. Es el `momentos.json` de Sloth llevado a tu caso. Así la IA de guiones
(Gemini, barata) hace el trabajo creativo de decidir, y Claude solo ejecuta, alinea con la toma real y revisa. Es la
mayor palanca de ahorro de tokens.

### 10.1 Tipos de recurso

| Recurso | Ejemplo | Herramienta | Cuándo lo propone la IA |
|---|---|---|---|
| **Tarjeta de texto** | Una cifra grande, una palabra clave | Motion graphics | Datos, cifras, palabras que importan |
| **Lista animada** | «Tres razones» → los tres puntos aparecen uno a uno | Motion graphics | El guion enumera (estructura *lista*, *paso a paso*) |
| **Mapa** | Se menciona un país → zoom al mapa | Motion graphics | Lugares, países, ciudades |
| **Comparativa / gráfico** | X vs. Y, antes y después, una barra que crece | Motion graphics | Estructura *comparativa*, datos verificados |
| **B-roll generado** | Granos de cacao cayendo a cámara lenta | Higgsfield | Lo que se nombra y no se puede grabar |
| **Gancho visual** | La cara de la persona se derrite como chocolate | Higgsfield (desde el primer cuadro de la toma real) | Los primeros 0–3 s, si el tema lo permite |
| **Animación / escena completa** | Toda la escena de un video desde cero | Higgsfield + motion graphics | Tipo de producción *desde cero* |
| **Cara** | La persona a cámara, sin nada encima | — | Opinión, cercanía, CTA |

### 10.2 Ejemplo de `recursos.json`

Cada recurso se ancla a una frase del guion (`palabra`, como en Sloth). La skill la busca en la transcripción real, así
que funciona aunque la toma no sea idéntica al guion.

```json
{
  "contenido": "CNT-0057",
  "tipo": "a-camara",
  "presupuesto": { "higgsfield": 3 },
  "recursos": [
    { "palabra": "por qué es bueno comer chocolate", "tipo": "gancho-visual", "herramienta": "higgsfield",
      "desde": "primer-cuadro", "prompt": "la cara de la persona se derrite lentamente como chocolate caliente, luz cálida, realista", "dura": 2.5 },
    { "palabra": "tres razones", "tipo": "lista", "herramienta": "motion",
      "items": ["Antioxidantes", "Mejora el ánimo", "Protege el corazón"] },
    { "palabra": "en Ghana", "tipo": "mapa", "herramienta": "motion", "lugar": "Ghana", "zoom": "pais" },
    { "palabra": "cacao puro", "tipo": "broll", "herramienta": "higgsfield",
      "prompt": "granos de cacao cayendo sobre una mesa de madera, cámara lenta, macro" },
    { "palabra": "70 por ciento", "tipo": "tarjeta", "herramienta": "motion", "texto": "70 %", "verificar": true },
    { "palabra": "guárdalo", "tipo": "cara" }
  ]
}
```

### 10.3 Reglas que conviene fijar (en la ficha de la marca)

- **Densidad:** un recurso cada X segundos y un % de tiempo con la cara visible (Sloth usa del 25 al 35 %).
- **Presupuesto de Higgsfield por video** (genera con créditos): la IA propone como mucho N recursos con Higgsfield y el
  resto con motion graphics, que no cuesta.
- **Estilo de motion graphics:** colores y fuentes de la marca, cómo entran las tarjetas, cómo se ven las listas y los
  mapas.
- **Estilo de Higgsfield:** estética base (realista, 3D, ilustración), lo que nunca debe generar (personas reales, logos
  de terceros) y un texto base que se añade a cada prompt.
- **Veracidad:** una tarjeta con una cifra hereda el `[VERIFICAR]` del guion y no se renderiza sin revisión.

### 10.4 Qué cambia en Content Studio

- **Guion:** cada sección suma su lista de recursos, con tipo, herramienta, anclaje y prompt. La IA los propone al
  generar el guion y se pueden editar, quitar o regenerar uno a uno, como hoy las secciones. El hook gana su **gancho
  visual** con prompt de Higgsfield cuando el tema lo permite.
- **Evaluador local:** avisa si hay demasiado tiempo sin recursos, si se supera el presupuesto de Higgsfield o si una
  lista del guion no tiene su recurso de lista.
- **Ficha de marca → Estilo de edición:** los campos de la sección 10.3.
- **Encargo:** añade `Tipo de producción:` y `recursos.json`.
- **Flujo:** en *Desde cero* no hay paso «Por grabar»: se pasa de guion aprobado a edición (o a «grabar voz en off», si
  la voz es tuya).

### 10.5 Qué cambia en la skill

Leer `recursos.json`, generar lo de Higgsfield **antes** de editar (va de fondo y es lo que más tarda), hacer lo de
motion graphics con plantillas fijas (una por tipo: tarjeta, lista, mapa, comparativa) y respetar el presupuesto. Si un
recurso no se puede hacer, lo dice en `notas.md` y sigue con el resto. Cuántas plantillas ya trae tu skill y cómo llama
a Higgsfield (MCP, API o navegador) lo veremos al revisarla.

### 10.6 Fases, ajustadas

La fase 2 añade el **Tipo de producción** y `recursos.json` en el guion. El resto del plan (sección 8) no cambia.

---

## 11. Lo que falta: tus skills

Son dos, en tu computadora: `~/.claude/skills/editar-reels-claude` y `~/.claude/skills/animar-reels-claude`. A falta de
revisarlas, la suposición es que `editar-reels-claude` cubre el tipo **A cámara** y `animar-reels-claude` el tipo
**Desde cero** (y las piezas generadas del **Mixto**). El encargo diría qué skill usar según el tipo de producción.

No la encuentro en este entorno: no estaba en el zip ni en tus repositorios de GitHub, y esta sesión corre en la nube,
sin acceso a tu computadora. Lo normal es que esté en:

- Mac: `~/.claude/skills/editar-reels-claude/`
- Windows: `C:\Users\<tú>\.claude\skills\editar-reels-claude\`

(o dentro de `.claude/skills/` de la carpeta del proyecto donde la usas). Para compartirla, cualquiera de estas
opciones:

1. **Comprímela en .zip y súbela al chat** (lo más rápido).
2. Súbela a un repositorio de GitHub tuyo y dime cuál.
3. Conecta tu computadora a esta sesión con Remote Control (app de escritorio de Claude → Ajustes → Claude Code →
   Remote Control) y comparte esa carpeta.

En GitHub hay varias skills públicas con nombres parecidos (por ejemplo, *editar-reels-con-claude*). Si la tuya salió de
una de ellas, dime de cuál y la reviso, pero la que cuenta es tu copia, porque puede tener cambios tuyos.
