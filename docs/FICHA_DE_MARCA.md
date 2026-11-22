# Ficha de marca: todos los campos y para qué sirven

Este documento repasa **todo lo que pide la ficha de una marca** (Marcas → *Ficha*), pestaña por pestaña, y explica brevemente **qué hace la app con cada dato**. Se ha revisado contra el código (`js/views/brands.js`, `js/views/brand-docs.js`, `js/services/branddocs.js`, `js/services/prompts.js`, `js/services/assistant.js`), no contra la documentación.

## Leyenda

| Marca | Significado |
|---|---|
| 🤖 **IA** | Se envía a la IA (Gemini) como contexto al generar contenido. |
| ⚙️ **App** | Lo usa la propia app para cálculos, avisos o valores por defecto (no la IA). |
| 👁️ **Solo vista** | Solo se muestra o se usa para organizar la interfaz. No influye en el contenido. |
| ❌ **Sin uso** | Se guarda (y se sincroniza con Google Sheets), pero **ninguna parte de la app lo usa**. |

## Cómo llega la ficha a la IA

- Todas las tareas de IA (ideas, enfoques, investigación, guiones, reescritura, evaluación, hooks, CTA, copies, análisis de resultados y redacción de documentos) reciben el **mismo bloque de contexto de la marca**: identidad general, comunicación, parte de la identidad visual, redes, pilares, hooks, CTA y referencias (`brandContext` en `js/services/prompts.js`).
- Lo único que cambia según la tarea son los **documentos**: cada documento indica en qué tareas se usa (ver la pestaña *Documentos*).
- Siempre se añaden, además, la metodología de la app y unas **reglas de veracidad** fijas (no inventar datos, precios, casos, etc.).
- También se añaden datos que no salen de la ficha: los hooks de los últimos 3 guiones aprobados y los "aprendizajes" calculados a partir de los resultados (si hay al menos 6 publicaciones medidas).

---

## 1. Identidad general

Tabla `Marcas` en Google Sheets.

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Nombre** (obligatorio) | Identifica la marca en toda la app y encabeza el contexto ("MARCA: …"). | 🤖 IA · 👁️ |
| **Sector o nicho** | Le dice a la IA en qué sector trabaja la marca. También se muestra en la tarjeta de la marca. | 🤖 IA · 👁️ |
| **Color en la app** | Color de la etiqueta y de la banda de la marca en las listas. | 👁️ Solo vista |
| **Estado** (Activa / Archivada) | Las marcas archivadas no aparecen en el selector de marca de trabajo. | 👁️ Solo vista |
| **Descripción** | Contexto general de la marca. Además rellena la sección *Historia y propósito* del documento **Identidad y posicionamiento** cuando se crea. | 🤖 IA |
| **Propuesta de valor** | Qué ofrece la marca y por qué elegirla. Rellena la sección *Posicionamiento* del documento **Identidad y posicionamiento** cuando se crea. | 🤖 IA |
| **Productos y servicios** | Lista de lo que vende la marca; la IA no debe mencionar nada más. Rellena *Catálogo* del documento **Productos, servicios y oferta**. | 🤖 IA (*ver nota*) |
| **Objetivos comerciales** | Qué quiere conseguir la marca. Rellena *Objetivo del periodo* del documento **Foco comercial actual**. | 🤖 IA (*ver nota*) |
| **Público objetivo** | A quién se habla. Rellena *Perfil principal* del documento **Buyer persona**. | 🤖 IA (*ver nota*) |
| **Problemas frecuentes de sus clientes** | Materia prima para ideas y hooks. Rellena *Dolores principales* del documento **Puntos de dolor, deseos y objeciones**. | 🤖 IA (*ver nota*) |

> **Nota: los cuatro campos de resumen.** *Productos y servicios*, *Objetivos comerciales*, *Público objetivo* y *Problemas frecuentes* **solo se envían a la IA si el documento equivalente no se envía en esa tarea** (porque está vacío, desactivado o no está marcado para esa tarea). Si el documento tiene contenido, la IA usa el documento y el campo de la ficha no se repite. Equivalencias:
>
> | Campo de la ficha | Documento que lo sustituye |
> |---|---|
> | Productos y servicios | Productos, servicios y oferta |
> | Objetivos comerciales | Foco comercial actual |
> | Público objetivo | Buyer persona |
> | Problemas frecuentes | Puntos de dolor, deseos y objeciones |
>
> El texto de la ficha solo se copia al documento **cuando se crea** el documento. Si después cambias el campo, el documento no se actualiza solo.

**Campo sin uso de la tabla `Marcas`:** `logoAssetId` (logotipo principal). Está en el modelo de datos pero no aparece en la ficha y nada lo lee ni lo escribe. ❌

---

## 2. Documentos

Tabla `DocumentosMarca`. Son el contexto más importante para la IA: cada marca recibe el mismo juego de **11 documentos base en Markdown** y puede añadir documentos propios. La guía detallada está en [DOCUMENTOS_DE_MARCA.md](DOCUMENTOS_DE_MARCA.md).

### 2.1 Opciones de cada documento

| Opción | Para qué sirve | Uso |
|---|---|---|
| **Contenido (Markdown)** | Texto del documento. Se envía a la IA sin los comentarios `<!-- -->` de la plantilla ni las secciones vacías. Máximo 45.000 caracteres por documento (límite de una celda de Sheets). | 🤖 IA |
| **Usar como contexto para la IA** | Si se desmarca, el documento no se envía en ninguna tarea. | ⚙️ App |
| **Se usa al generar** (tareas) | Elige en qué tareas se envía: Ideas, Guiones, Hooks y CTA, Copies, Evaluación, Investigación, Análisis de resultados. | ⚙️ App |
| **Título** (solo documentos propios) | Encabeza el documento dentro del contexto. | 🤖 IA |
| **Orden** | Prioridad dentro del presupuesto de contexto: si se supera, se recortan primero los últimos. Los documentos base siguen el orden de la tabla de abajo; los propios van al final. No se puede editar desde la interfaz. | ⚙️ App |
| **Completar / Redactar con IA** | Genera un borrador a partir de la ficha y del resto de documentos. Se revisa antes de reemplazar. | 🤖 IA |
| **Importar / Exportar .md, Copiar, Historial, Plantilla** | Herramientas de edición: importar un archivo, descargarlo, ver y restaurar versiones anteriores, volver a la plantilla vacía. | 👁️ |

**Límites de contexto:** cada documento se recorta a 8.000 caracteres y el total de documentos a 30.000 por tarea. El botón *Ver lo que recibe la IA* muestra exactamente qué se envía en cada tarea.

**Prioridad si se contradicen:** *Reglas, límites y temas sensibles* → *Productos, servicios y oferta* → resto.

### 2.2 Los 11 documentos base

"Tareas" son las tareas marcadas por defecto (se pueden cambiar en cada marca).

| # | Documento | Tipo | Para qué sirve | Secciones | Tareas por defecto |
|---|---|---|---|---|---|
| 1 | **Reglas, límites y temas sensibles** | Esencial | Lo que la marca nunca puede decir o hacer. Manda sobre todo lo demás. | Afirmaciones prohibidas · Temas vetados · Requisitos legales y del sector · Datos que siempre hay que verificar · Tratamiento de clientes y terceros | Todas |
| 2 | **Productos, servicios y oferta** | Esencial | Fuente de verdad de lo que se vende; evita que la IA invente productos o precios. | Catálogo · Beneficios por producto · Producto estrella y de entrada · Condiciones · Lo que NO ofrecemos | Todas menos Análisis |
| 3 | **Identidad y posicionamiento** | Esencial | Quién es la marca y qué lugar quiere ocupar. | Historia y propósito · Misión, visión y valores · Posicionamiento · Diferenciales · Personalidad de marca | Todas |
| 4 | **Buyer persona** | Esencial | A quién se habla, con hechos y con sus palabras. | Perfil principal · Situación y contexto · Objetivos y motivaciones · Cómo decide y compra · Consumo de contenido · Cómo habla · Perfiles secundarios | Todas |
| 5 | **Puntos de dolor, deseos y objeciones** | Esencial | Materia prima de ideas, hooks y guiones. | Dolores principales · Consecuencias de no resolverlo · Deseos y resultado soñado · Objeciones y miedos · Preguntas frecuentes reales · Mitos y errores comunes | Todas menos Análisis |
| 6 | **Discurso comercial** | Esencial | Cómo argumentar para vender sin parecer un anuncio. | Promesa principal · Mensajes clave · Argumentario por producto · Respuesta a objeciones · Llamadas a la acción y siguiente paso · Frases que sí y frases que no | Ideas, Guiones, Hooks y CTA, Copies, Evaluación |
| 7 | **Foco comercial actual** | Táctico | Qué hay que empujar este mes o campaña. | Objetivo del periodo · Productos o servicios a priorizar · Promociones, lanzamientos y fechas · Estacionalidad y fechas clave · Lo que NO toca ahora | Ideas, Guiones, Hooks y CTA, Copies, Análisis |
| 8 | **Voz, tono y estilo** | Recomendado | Cómo suena la marca; amplía la pestaña *Comunicación*. | Cómo sonamos · Tono según la situación · Vocabulario propio · Lo que evitamos · Ejemplos de referencia | Guiones, Hooks y CTA, Copies, Evaluación |
| 9 | **Líneas editoriales y temas** | Recomendado | De qué habla la marca y con qué enfoque; complementa los pilares. | Territorios de contenido · Temas que funcionan · Temas a explorar · Series y formatos recurrentes · Enfoque por etapa del embudo | Ideas, Guiones, Investigación, Análisis |
| 10 | **Pruebas, casos y testimonios** | Recomendado | Evidencias verificadas para respaldar lo que se dice. | Datos y cifras verificadas · Casos de clientes · Testimonios y reseñas · Certificaciones, formación y autoridad · Demostraciones posibles | Ideas, Guiones, Copies, Evaluación |
| 11 | **Competencia y diferenciación** | Recomendado | Con quién comparan a la marca y cómo destacar. | Competidores directos e indirectos · Alternativas del cliente · Huecos y oportunidades · Cómo nos diferenciamos · Qué no copiar | Ideas, Guiones, Investigación, Análisis |
| — | **Documentos propios** | Propio | Cualquier contexto extra (un lanzamiento, un protocolo…). | Libres | Todas |

La **redacción de documentos con IA** recibe todos los documentos activos de la marca (excepto el que se está redactando), sin filtrar por tarea.

---

## 3. Comunicación

Tabla `ConfigMarca`, columna `voice`.

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Personalidad** | Rasgos de la marca que la IA debe transmitir. | 🤖 IA |
| **Trato** (tú / usted / vosotros / ustedes) | Cómo se dirige la IA al espectador. Se envía siempre (por defecto "tú"). | 🤖 IA |
| **Tono de voz** | Cómo suena la marca. | 🤖 IA |
| **Formalidad (1–5)** | Nivel de formalidad. Se envía siempre (por defecto 2). | 🤖 IA |
| **Vocabulario recomendado** | Palabras que la IA debe preferir. | 🤖 IA |
| **Palabras y expresiones a evitar** | Se envían a la IA como "PROHIBIDO usar" y, además, el **evaluador automático** de guiones avisa si aparecen (separadas por comas). | 🤖 IA · ⚙️ App |
| **Nivel habitual de la audiencia** (0 Nuevo – 3 Experto) | Le dice a la IA cuánto sabe el público y qué reglas de lenguaje aplicar. También es el **valor por defecto** del nivel de conocimiento al generar un guion (si la idea no tiene uno). | 🤖 IA · ⚙️ App |
| **Estilo de narración** | A cámara, voz en off, entrevista… | 🤖 IA |
| **Ejemplos de guiones aprobados** | La IA imita el estilo (no el contenido). Se envían como máximo los primeros 2.500 caracteres. | 🤖 IA |

> Hay solapamiento con el documento **Voz, tono y estilo**. Los dos se envían; usa la pestaña para lo breve y el documento para matices y ejemplos.

---

## 4. Identidad visual

Tabla `ConfigMarca`, columna `visual`, y tabla `Recursos`.

> ⚠️ La tarjeta *Estilo audiovisual* dice "La IA lo tiene en cuenta en guiones y copies", pero **solo 3 de sus 10 campos se envían a la IA**. Los otros 7 no se usan en ninguna parte.

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Paleta de colores** (nombre + hex) | Se envía a la IA como lista de colores; también se muestran en la tarjeta de la marca. Ojo: si no la cambias, se envían los 3 colores de ejemplo por defecto. | 🤖 IA · 👁️ |
| **Tipografías** (uso + fuente) | Se envían a la IA las que tienen nombre de fuente; las vacías se omiten. | 🤖 IA |
| **Estilo de subtítulos** | Indicaciones de subtítulos para el guion. | 🤖 IA |
| **Estilo de edición** | Indicaciones de edición para el guion. | 🤖 IA |
| **Ritmo** | Cambios de plano, silencios… | 🤖 IA |
| **Posición de textos** | — | ❌ Sin uso |
| **Transiciones** | — | ❌ Sin uso |
| **Música** | — | ❌ Sin uso |
| **Efectos de sonido** | — | ❌ Sin uso |
| **Recursos gráficos y referencias** | — | ❌ Sin uso |
| **Intro** | — | ❌ Sin uso |
| **Outro** | — | ❌ Sin uso |

**Recursos de la marca** (logos, imágenes, gráficos, fuentes, audio, plantillas; archivo ≤ 1,5 MB o enlace): biblioteca de consulta para el equipo. Los archivos subidos se quedan **solo en ese dispositivo** (no se sincronizan); los enlaces sí. Se copian al duplicar la marca. **No se envían a la IA** ni se usan en ningún otro sitio. 👁️ Solo vista

---

## 5. Redes sociales

Tabla `Plataformas`, una fila por red: TikTok, Instagram Reels, Facebook Reels, YouTube Shorts y LinkedIn.

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Usar esta plataforma** | Solo las plataformas activas se envían a la IA y cuentan para el calendario. | 🤖 IA · ⚙️ App |
| **Objetivo en la plataforma** (alcance, retención, interacción, confianza, comunidad, conversión) | Se envía a la IA en la línea de la plataforma. | 🤖 IA |
| **Duración objetivo (s)** | **Duración por defecto** al generar un guion para esa red, referencia del contador "≈ X s / objetivo Y s" y del aviso del evaluador si el guion se pasa o se queda corto. También se envía a la IA. | 🤖 IA · ⚙️ App |
| **Publicaciones por semana** | Suma de todas las redes activas = **meta semanal del calendario** (para detectar huecos). También se envía a la IA. | 🤖 IA · ⚙️ App |
| **Formatos de contenido** (estructuras) | Se envían a la IA como formatos preferidos. No filtran las estructuras disponibles en la app. | 🤖 IA |
| **CTA permitidos o recomendados** | Se envían a la IA como CTA preferidos. No filtran los tipos de CTA de la app. | 🤖 IA |

> La duración, los formatos y los CTA se envían como texto informativo de **todas** las redes activas, no solo de la red del guion. Los formatos y los CTA se envían con su identificador interno (p. ej. `problema-solucion`), no con su nombre.

---

## 6. Pilares y estrategia

### 6.1 Pilares de contenido (tabla `Pilares`)

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Pilar** (nombre) | Se envía a la IA en la lista de pilares; las ideas se clasifican por pilar; la IA asigna el pilar a las ideas que propone. | 🤖 IA · ⚙️ App |
| **Descripción** | Solo se envía a la IA al **generar ideas filtrando por ese pilar**. En el resto de tareas no se envía. | 🤖 IA (parcial) |
| **Objetivo** | Se envía a la IA junto al nombre del pilar. | 🤖 IA |
| **% meta** | Se compara con el % real de contenidos del pilar (columna *Real*, en rojo si se aleja más de 10 puntos). No se envía a la IA. | 👁️ Solo vista |

### 6.2 Parámetros (tabla `ConfigMarca`, columna `strategy`)

> ⚠️ **Ningún parámetro de estrategia se envía a la IA.**

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Meta de publicaciones al mes** | Meta mensual del **panel de inicio** (avance del mes por marca y total). | ⚙️ App |
| **% de contenido "seguro" (regla 80/20)** | Solo se usa en el recuadro *Equilibrio actual* para mostrar el % objetivo de experimentales. La generación de ideas usa siempre un 80/20 fijo, sin leer este valor. | 👁️ Solo vista |
| **Palabras por minuto al hablar** | Estima la duración del guion (contador de palabras/segundos y evaluador automático). El prompt de la IA no lo usa: calcula las palabras con un ritmo fijo de ≈156 palabras/minuto. | ⚙️ App |
| **Notas estratégicas** | El texto sugiere que se tiene en cuenta (temporadas, fechas clave…), pero no se envía a la IA ni se muestra en otro sitio. Para que la IA lo use, ponlo en **Foco comercial actual** o **Líneas editoriales y temas**. | ❌ Sin uso |

**Equilibrio actual** (recuadro lateral): resumen calculado de contenidos activos, % de experimentales y reparto por tipo (venta / familiaridad / memorable). 👁️ Solo vista

---

## 7. Hooks y CTA

### 7.1 Hooks (tabla `Hooks`)

Se crean a mano o al aprobar un guion (se guarda su hook).

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Texto** | Se envía a la IA: los aprobados como referencia de estilo (máx. 12), los marcados "Evitar" como ejemplos a no seguir (máx. 10). | 🤖 IA |
| **Estado** (Aprobado / Evitar) | Decide en qué lista se envía el hook. | 🤖 IA |
| **Capa** (narrado, visual, textual, auditivo) | Solo organiza la biblioteca; todos los hooks se envían como texto sin indicar la capa. | 👁️ Solo vista |
| **Patrón** | Solo organiza la biblioteca; no se envía a la IA ni se usa en el análisis de resultados (que toma el patrón del guion, no de esta tabla). | 👁️ Solo vista |
| Notas *(no editable, se rellena al guardar desde un guion)* | Se muestra bajo el texto. | 👁️ Solo vista |
| Objetivo, idea de origen *(no visibles)* | Se guardan al guardar desde un guion; nada los lee. | ❌ Sin uso |

> Aparte de esta biblioteca, la IA recibe automáticamente los hooks de los últimos guiones de la marca para **no repetirlos**.

### 7.2 CTA (tabla `CTA`)

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Texto** | Se envía a la IA: aprobados (máx. 10, con su tipo) y a evitar (máx. 8). | 🤖 IA |
| **Tipo** (comentarios, guardados, compartidos, seguidores, DM, web, info, venta) | Acompaña al texto de los CTA aprobados. | 🤖 IA |
| **Estado** (Aprobado / Evitar) | Decide en qué lista se envía. | 🤖 IA |
| Objetivo, notas *(no visibles)* | Existen en la tabla pero no se pueden editar y nada los lee. | ❌ Sin uso |

---

## 8. Referencias

| Campo | Para qué sirve | Uso |
|---|---|---|
| **Notas generales de referencia** | Cuentas, estilos o ideas que inspiran a la marca. Se envían a la IA (máx. 1.500 caracteres). | 🤖 IA |
| **Referencias de la marca** (tabla `Referencias`): **Tipo**, **Título**, **Enlace**, **Métricas observadas**, **Notas** | Se envían a la IA como inspiración de estilo (máx. 10, solo las que tienen título o enlace). Si no tienen título se envía el enlace; la IA **no abre** los enlaces, solo lee el texto. | 🤖 IA |

---

## 9. Resumen: campos que no sirven para nada (hoy)

| Pestaña | Campo | Qué hacer si se quiere que cuente |
|---|---|---|
| Identidad visual | Posición de textos | Escribirlo en *Estilo de subtítulos* o *Estilo de edición*. |
| Identidad visual | Transiciones | Escribirlo en *Estilo de edición*. |
| Identidad visual | Música | Escribirlo en *Estilo de edición* o en un documento propio. |
| Identidad visual | Efectos de sonido | Escribirlo en *Estilo de edición*. |
| Identidad visual | Recursos gráficos y referencias | Escribirlo en *Referencias → Notas generales*. |
| Identidad visual | Intro | Escribirlo en *Estilo de edición* o en *Líneas editoriales → Series y formatos recurrentes*. |
| Identidad visual | Outro | Igual que Intro. |
| Pilares y estrategia | Notas estratégicas | Pasarlo a **Foco comercial actual** o **Líneas editoriales y temas**. |
| (oculto) Marcas | `logoAssetId` | — |
| (oculto) Hooks | Objetivo, idea de origen | — |
| (oculto) CTA | Objetivo, notas | — |

**Campos que solo afectan a la interfaz o a cálculos, no al contenido generado:** Color en la app, Estado, Recursos de la marca, % meta de cada pilar, % de contenido seguro, Meta mensual, Palabras por minuto (afecta a la estimación de duración, no al texto que escribe la IA), Capa y Patrón de los hooks.

**Campos que la IA puede ignorar según el caso:** los cuatro resúmenes de *Identidad general* (se omiten si el documento equivalente se envía en esa tarea) y la descripción de los pilares (solo se envía al generar ideas de un pilar concreto).
