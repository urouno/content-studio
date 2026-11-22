# Plan de integración completa: Content Studio + Claude Code + skills de reels

> Estado: **propuesta para revisar antes de desarrollar** (versión 3). No se ha cambiado código.
> Fuentes: este repositorio, el repositorio de referencia **Sloth** (licencia MIT) y las guías de tus skills
> **`editar-reels-claude`** y **`animar-reels-claude`** (se leyeron las guías, no los scripts).

## 0. Qué cambia en esta versión

| Decisión tuya | Consecuencia en el plan |
|---|---|
| La ficha guarda **lo estable** de la marca (estilo, enfoque, discurso); la cantidad de gráficos y animaciones **varía por video** | La ficha exporta solo la identidad visual y verbal. Los topes y opciones de edición se eligen en cada contenido, con valores sugeridos. |
| **Solo herramientas gratuitas, más Claude** | Fuera Higgsfield por ahora. Las animaciones salen de lo que ya tienen las skills (HyperFrames, three.js, mapas, tus fotos) y se suma **B-roll de bancos libres**. El video generativo queda como fase pendiente. |
| La IA de Content Studio (Gemini) **es lenta o falla** | Fase nueva y primera: varios proveedores con respaldo automático y prompts más ligeros. Además, una **vía Claude** que usa tu plan de Claude (sin pagar API) para las tareas grandes, como hace Sloth. |

---

## 1. Visión general

```
┌──────────── Content Studio (navegador: Brave, celular) ────────────┐
│ Marca estable · Ideas · Guion · Modo grabación · Calendario ·      │
│ Copies · Resultados                                                │
│ IA rápida en la app: Gemini / Groq / OpenRouter / … con respaldo   │
└───────────────┬──────────────────────────────────▲─────────────────┘
   escribe      │  pedidos, marca, encargos          │  lee: respuestas, estado, FINAL.mp4
                ▼                                    │
┌──────────── Carpeta «Reels con Claude» (tu computadora) ───────────┐
│ Mi estilo/marcas/<marca>.json · Tomas/ · Reels/<fecha · tema>/     │
│ Content Studio/pedidos/ · Content Studio/respuestas/               │
└───────────────┬──────────────────────────────────▲─────────────────┘
                ▼                                    │
┌──────────── Claude Code (tu computadora, plan Pro) ────────────────┐
│ content-studio-claude (nueva): ideas y guiones grandes             │
│ editar-reels-claude: cortar, subtitular, gráficos, sonido          │
│ animar-reels-claude: escenas 2D/3D, mapas, video animado completo  │
└────────────────────────────────────────────────────────────────────┘
```

Cada parte hace lo que mejor sabe hacer:
- **Content Studio** es la memoria: marca, ideas, guiones, estados y métricas, en el celular y en la computadora.
- **Claude Code** es el trabajo pesado: guiones de calidad, edición y animación.
- **La carpeta** une las dos partes, igual que Sloth, que sabe en qué paso va cada video viendo qué archivos existen.

---

## 2. La IA de Content Studio: más rápida y sin bloqueos

### 2.1 Por qué hoy va lenta o falla

Revisado en `js/services/ai.js` y `apps-script/Code.gs`:

1. **Plan gratuito de Gemini:** límites por minuto y por día, y saturación (errores 429 y 503). Cuando falla, Apps
   Script prueba **otro modelo de Gemini, uno tras otro**: cada intento fallido suma espera.
2. **Doble salto:** navegador → Apps Script → Gemini → Apps Script → navegador, sin streaming. No ves nada hasta que
   termina todo.
3. **Prompts muy grandes:** en cada petición van la metodología, la ficha completa, hooks, CTA, referencias y hasta 30.000
   caracteres de documentos de marca (unos 8.000 tokens).
4. **Respuestas muy largas:** un guion pide hasta 12.000 tokens de salida (2 versiones con 3 hooks alternativos y todas
   las secciones).

### 2.2 Solución en tres partes

**a) Varios proveedores con respaldo automático** (la idea de Sloth, que trabaja con Claude, OpenCode gratis, DeepSeek,
OpenRouter y otros mediante adaptadores). Casi todos hablan el mismo «idioma» (el formato de OpenAI), así que un solo
adaptador sirve para varios:

| Proveedor | Coste | Para qué |
|---|---|---|
| **Gemini** (el actual) | Gratis con límites | Investigación con búsqueda de Google |
| **Groq** | Plan gratuito con límites | Respuestas muy rápidas (copies, hooks, reescrituras) |
| **OpenRouter**, modelos `:free` | Gratis con límite diario | Respaldo cuando los demás se saturan |
| **Cerebras** | Plan gratuito con límites | Otra opción rápida de respaldo |
| **DeepSeek** | **No es gratis**, pero cuesta céntimos | Opcional, si quieres algo muy estable por muy poco |

Los límites exactos de cada plan gratuito cambian a menudo: se confirman al implementarlo. En Ajustes eliges el orden.
Si uno devuelve 429 o 5xx, la app pasa **al siguiente proveedor** (no a otro modelo del mismo, que suele estar igual de
saturado) y te dice cuál respondió. Las claves siguen guardadas en Apps Script, como hoy.

**b) Prompts a dieta:**
- Cada tarea recibe solo lo que necesita. Los copies no necesitan la competencia; los hooks no necesitan el catálogo
  entero.
- Presupuesto de documentos por tarea: grande en guiones e ideas, pequeño en copies y hooks.
- Por defecto, **una versión** de guion. La segunda, solo si la pides.
- La metodología completa va solo en ideas y guiones. En el resto basta un resumen.

**c) La vía Claude para lo grande** (sección 3): usa tu plan de Claude, sin coste extra.

---

## 3. La vía Claude: ideas y guiones con tu plan de Claude

Es lo que más se parece a Sloth: el agente trabaja con **tu cuenta** de Claude Code, no con una API de pago.

1. En Content Studio pulsas, por ejemplo, **«Generar con Claude»** (en ideas, guion o documento de marca).
2. La app deja un **pedido** en `Content Studio/pedidos/<id>.json`: la tarea, el contenido y la marca. La marca ya está
   exportada en la carpeta (sección 5), así que no se repite en cada pedido.
3. En Claude Code, una skill nueva y pequeña, **`content-studio-claude`**, atiende los pedidos pendientes («atiende los
   pedidos de Content Studio»). Escribe la respuesta en `respuestas/<id>.json` con **el mismo formato JSON que ya
   esperan las pantallas de la app**.
4. La app ve la respuesta y la carga, como si viniera de Gemini.

**Ventajas:** mejor calidad, Claude puede buscar en la web para investigar y no hay límites de un plan gratuito de API.
**Contras:** requiere tener Claude Code abierto en tu computadora y comparte el límite de uso de tu plan con la edición.
Por eso **las dos vías conviven**: la rápida en la app (el celular, tareas cortas) y la de Claude para guiones e ideas
importantes.

---

## 4. Mejoras de método tomadas de Sloth (ideas y guiones)

La skill `ideas-vertical` de Sloth tiene un método muy concreto. Lo que se puede llevar a los prompts y a las fichas de
Content Studio, sin su motor de investigación (que rastrea TikTok e Instagram):

| De Sloth | En Content Studio |
|---|---|
| **El empaque es el primer cuadro y su texto en pantalla** | Cada idea tiene «Texto del primer cuadro» y «Qué se ve en el primer cuadro» (máx. 3 elementos, el resultado ya enseñado) |
| **Variantes del gancho** para probar | 2-3 textos alternativos del primer cuadro por idea (para probar uno por día o uno por red) |
| **Gancho de las 4 P en 3 s**: Promesa, Prueba (enseñar el resultado primero), Plan, Persona | El gancho se pide y se evalúa con las 4 P. El evaluador avisa si falta la prueba |
| **De lo más seguro a lo más arriesgado**; las seguras son **variantes de lo que ya funcionó, cambiando una sola cosa** | Las ideas usan los mejores contenidos de *Resultados* y las *Referencias* de la marca, y dicen qué conservan y qué cambian |
| **Riesgo dicho sin rodeos** y **por qué funcionaría** | Campos «Por qué» y «Riesgo» en cada idea |
| **Piso y techo** de vistas, realistas y marcados como estimación | Opcional, a partir de la mediana de la marca en *Resultados* |
| **CTA «Comenta X y te mando…»** cuando el objetivo es vender | Ya existe como tipo de CTA; se propone cuando el objetivo es conversión |
| **Guion palabra por palabra medido contra la duración** y **final que empalma con el principio** (TikTok repite el video) | El evaluador local añade la comprobación del empalme |

---

## 5. La marca: lo estable en la ficha, lo variable en cada video

### 5.1 Lo que guarda la ficha (estable)

Casi todo ya existe en Content Studio: identidad, documentos, comunicación, pilares, hooks y CTA. Para la edición se
añade una pestaña **«Estilo de edición»** solo con lo que define cómo se **ve y suena** la marca siempre:

| Campo | Va al archivo de la skill (`marcas/<marca>.json`) |
|---|---|
| Colores con rol (texto, acento, sobre acento, oscuro, detrás) | `colores` |
| Tipografías con su archivo | `fuentes` |
| Cómo se animan los subtítulos (alterna, karaoke, resaltado…) y si van en mayúsculas | `subtitulos` |
| Estilo de tarjetas (blanca, cristal, cristal oscuro, oscura) | `tarjetas.estilo` |
| Movimientos de cámara que acepta la marca | `zoom.movimientos` |
| Sus 3 efectos de sonido y su tipo de música | `sonido` |
| Lo que nunca sale en pantalla (emojis, menciones prohibidas…) | `notas` |
| Nombres propios y productos bien escritos | `correcciones` (Whisper deja de escribirlos mal) |
| Guía corta de estilo | `Reglas-de-estilo-<Marca>.md`, generada con la voz, el discurso y las reglas de Content Studio |

**Ida y vuelta.** Antes de escribir el archivo de la marca, Content Studio lo lee y conserva lo que afinaste en el
editor en vivo de la skill (tamaños, posiciones). Si una marca ya tiene archivo en la skill, la primera vez se
**importa**.

### 5.2 Lo que se elige en cada contenido (variable)

Al enviar un contenido a edición, una ficha corta con **valores sugeridos** según la duración y el tipo, que puedes
cambiar:

- **Tipo de producción:** cabeza parlante · producto con voz en off · animado completo.
- **Gráficos:** sin gráficos · pocos (3 + 1) · equilibrado (5 + 2) · muchos (8 + 3). Son los presets de la propia skill.
- **Escenas animadas:** ninguna · 2-3 · video animado completo.
- **Texto detrás de la cabeza:** sí o no (tarda más en procesarse).
- **Música:** la de la marca, otra o ninguna.
- **Editor en vivo antes de exportar:** sí o no.

---

## 6. Edición y animación con herramientas gratuitas

### 6.1 Lo que ya tienen tus skills (gratis)

Whisper local, corte de silencios, subtítulos animados, unos 20 gráficos (listas, contadores, comparativas, pasos,
chats, precios…), movimientos de cámara, texto detrás de la cabeza, escenas 2D y 3D ligero (HyperFrames y three.js),
mapas de México, fotos en capas, música y efectos por síntesis (SynthFlow), voz clonada local y Google Flow (gratis, a
mano) para la portada. Para los ejemplos que diste:

| Lo que pediste | Cómo se hace gratis |
|---|---|
| Lista de tres puntos | Gráfico `lista` o escena `lista_iconos`, un renglón al decir cada punto |
| Referencia a un lugar con zoom al mapa | Escena `mapa` (hoy solo México; ver 6.2) |
| Gancho visual fuerte | Palabra gigante detrás de la cabeza, golpe de cámara, transición y un clip de un banco libre. La cara derritiéndose queda para el video generativo (6.3) |

### 6.2 Mejoras propuestas en las skills (gratis)

1. **B-roll de bancos libres.** Sloth (estilo documental) busca clips y fotos reales en Mixkit, Wikimedia Commons,
   Archive.org y NASA, y deja un `FUENTES.md` con los derechos. Pexels y Pixabay tienen API gratuita. Es la alternativa
   gratuita a generar B-roll: un tipo de escena `clip` (de banco) con `busca: "cacao cayendo"`. El código de Sloth es MIT
   y se puede adaptar, conservando su aviso de licencia.
2. **Mapas del mundo.** El script `preparar_mapa.py` ya parte del archivo de países de Natural Earth: ampliarlo a todos
   los países (zoom a Ghana, a España…).
3. **Biblioteca de escenas de la marca.** Como la biblioteca de modelos 3D de Sloth: las escenas que te gustaron se
   guardan como plantilla de la marca y se reutilizan. Así cada video se parece más al anterior y gasta menos.
4. **Leer lo que prepara Content Studio:** `proyecto.json` con el id del contenido (la entrevista se reduce a confirmar
   la toma), la propuesta de gráficos por frase y los nombres propios para Whisper.
5. **Mejor acabado de las animaciones:** revisar la hoja de capturas contra la guía de estilo de la marca (máximo 3
   colores, una idea por escena, fondo oscuro) y añadir 2-3 animaciones de entrada y salida más.

### 6.3 Pendiente: video generativo

Queda **reservado** un tipo `clip_ia` (B-roll generado, gancho visual sobre el primer cuadro, escenas del video
animado), con su presupuesto por video. Cuando elijas herramienta (Higgsfield u otra), se conecta ahí sin rehacer el
resto.

---

## 7. Del guion al video publicado

1. **Guion aprobado** con su tipo de producción y su propuesta de gráficos y escenas por frase, usando los nombres reales
   del catálogo de la skill.
2. **Modo grabación** (cabeza parlante y producto): teleprompter, tabla segundo a segundo, variantes del gancho, qué
   preparar y las zonas seguras de la skill (220 px arriba, 380 abajo, 140 a la derecha).
3. **Enviar a edición:** crea `Reels/<fecha · tema>/` con `proyecto.json` ya rellenado, el guion y la propuesta.
   Copias la toma con «Añadir toma», que la guarda como `Tomas/CNT-0042 toma1.mov`.
4. **Editar con Claude:** copia el mensaje para Claude Code («Usa la skill editar-reels-claude con el reel …»), o «edita
   los reels pendientes».
5. **Estado automático:** «Grabado» cuando existe la toma; «Editado» cuando existe `FINAL - *.mp4`. Vista previa y
   portada dentro del contenido. Los copies usan lo que se dijo de verdad.
6. **Publicado y métricas:** a mano, como ahora.

En Brave, la carpeta conectada necesita encender `brave://flags/#file-system-access-api` una vez. Sin eso funciona con
descargas .zip, pero sin estado automático.

---

## 8. Fases

| # | Fase | Qué incluye | Dónde se hace | Qué te resuelve |
|---|---|---|---|---|
| **1** ✅ | **IA rápida y fiable** (hecha) | Adaptador de varios proveedores (Gemini, Groq, OpenRouter, Cerebras; DeepSeek opcional), respaldo automático entre proveedores, prompts a dieta, una versión de guion por defecto | Content Studio + Apps Script | Lo lento y los fallos de hoy |
| **2** ✅ | **Método de ideas y guiones** (hecha) | Primer cuadro y variantes, gancho de las 4 P, por qué y riesgo, variantes de lo que funcionó, empalme final; tipo de producción y propuesta de gráficos por frase | Content Studio | Mejores ideas y guiones listos para editar |
| **3** ✅ | **Marca estable para edición** (hecha) | Pestaña «Estilo de edición»; exportar e importar `marcas/<marca>.json` y `Reglas-de-estilo-<Marca>.md` | Content Studio | Que las skills editen con tu marca, ya en paralelo |
| **4** ✅ | **Carpeta conectada y envío a edición** (hecha) | Conectar `Reels con Claude/`, «Enviar a edición» con ajustes del video, «Añadir toma», «Editar con Claude», estado automático, vista previa | Content Studio | El modo integrado de punta a punta |
| **5** ✅ | **Modo grabación** (hecha) | Teleprompter, tabla segundo a segundo, variantes, qué preparar, zonas seguras | Content Studio | Grabar con todo delante |
| **6** | **Vía Claude** | Pedidos y respuestas en la carpeta; skill `content-studio-claude` | Content Studio + skill nueva | Ideas y guiones con Claude sin pagar API |
| **7** | **Skills: mejoras gratuitas** | Leer el `proyecto.json` de Content Studio, B-roll de bancos libres, mapas del mundo, biblioteca de escenas, acabado | Tus skills | Videos más ricos, gratis |
| **8** | *Pendiente:* video generativo | `clip_ia` con la herramienta que elijas | Tus skills | Ganchos y B-roll generados |

**Orden.** La 1 primero, porque es lo que hoy molesta y no depende de nada. La 3 ya sirve para editar en paralelo. Con
la 4 queda el modo integrado completo. La 6 necesita la carpeta de la 4.

**Dónde se programa cada fase.** Las fases 1 a 6 se hacen en este repositorio, desde aquí. La skill nueva de la fase 6
y los cambios de la 7 viven en tu computadora (`~/.claude/skills/`). Se hacen en una sesión de Claude Code abierta allí,
o se escriben aquí y los copias.

---

## 9. Lo que necesito para empezar la fase 1

1. **Crear cuentas gratuitas** en uno o dos proveedores (recomiendo **Groq** y **OpenRouter**) y guardar sus claves en
   Apps Script → Propiedades del script, como la de Gemini. Te dejo los pasos al implementarlo.
2. **DeepSeek:** ¿lo incluimos como opción de pago muy barata o solo gratuitos?
