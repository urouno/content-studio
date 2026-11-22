# Fase 7: mejorar las skills de reels desde Claude Code (en tu Mac)

Estas instrucciones son para pegarlas en **Claude Code abierto en tu Mac**, porque cambian las skills que viven ahí
(`~/.claude/skills/editar-reels-claude` y `~/.claude/skills/animar-reels-claude`). Content Studio ya está listo
(fases 1 a 6); aquí solo se toca el lado de las skills.

## Cómo usarlas

1. Abre Claude Code en la carpeta de skills:
   ```bash
   cd ~/.claude/skills && claude
   ```
   (o en la app de escritorio de Claude → Code, eligiendo esa carpeta).
2. Pega **primero el bloque 0** (copia de seguridad y contexto). Luego **un bloque cada vez**, en orden.
3. Al terminar cada bloque, Claude hace una prueba corta. Revisa el resultado antes de pasar al siguiente.
4. Cada bloque es independiente: si uno no te convence, pide «deshaz lo de este bloque» (para eso es el bloque 0).

| Bloque | Qué consigue | Prioridad |
|---|---|---|
| 0 | Copia de seguridad y contexto de Content Studio | Obligatorio |
| 1 | `editar-reels-claude` lee el encargo de Content Studio: sin repetir la entrevista | Alta |
| 2 | `animar-reels-claude` lee el encargo (video animado y escenas) | Alta |
| 3 | B-roll de bancos libres (Pexels, Pixabay, Wikimedia Commons) | Media |
| 4 | Mapas de cualquier país, no solo México | Media |
| 5 | Biblioteca de escenas por marca | Baja |
| 6 | Revisión de acabado de las animaciones | Baja |

---

## Bloque 0 · Copia de seguridad y contexto

```text
Vamos a mejorar mis skills editar-reels-claude y animar-reels-claude para que trabajen con Content Studio, mi app de
marcas, ideas y guiones. Antes de tocar nada:

1. Haz una copia de seguridad de las dos skills SIN sus entornos de Python (.venv, .venv-voz), node_modules ni modelos:
   ~/.claude/skills/_respaldo-AAAA-MM-DD/editar-reels-claude y …/animar-reels-claude. Si ya hay git en la carpeta, haz
   un commit en su lugar. Dime dónde quedó.
2. Lee SKILL.md, docs/PLAN-Y-CATALOGO.md y docs/DETALLES-PASADAS.md de editar-reels-claude, y SKILL.md y ESCENAS.md de
   animar-reels-claude. No leas PIPELINE-edicion-reels-IA.md ni ejemplo-toma9/.

Contexto (no lo cambies, es lo que Content Studio ya hace):
- La carpeta de trabajo es «~/Desktop/Claude Code/Videos Claude/Reels con Claude/» (Mi estilo/, Tomas/, Música/, Reels/).
- Content Studio escribe Mi estilo/marcas/<marca>.json con el mismo formato que la skill y conserva lo que ella
  afina; añade al final de Reels-de-estilo-<Marca>.md un bloque entre «<!-- content-studio:inicio … -->» y
  «<!-- content-studio:fin -->» que no hay que tocar.
- Al «Enviar a edición», crea Reels/AAAA-MM-DD · <tema>/ con:
    proyecto.json  → las claves de la entrevista (toma, marca, tipo, resolucion, revision, con_graficos, flotantes,
                     pantalla, detras, musica, red, editor) + "contenido": "CNT-…" + un bloque "content_studio" con
                     skill, escenas (ninguna | algunas | video), voz (si es animado) y las rutas de los archivos de abajo.
                     "tipo" vale «cabeza parlante», «voz en off + imagenes de producto» o «animacion» (los de la
                     skill). En «animacion» escribe también "voz" (grabada | clonada | generica) y "formato" (corto |
                     medio | largo | extendido) arriba del todo, como crear.py; nunca "voz_aprobada".
    trabajo/guion-aprobado.md     → el guion aprobado (gancho, tabla de secciones, CTA, datos a verificar).
    trabajo/propuesta-graficos.md → tabla «# · Lo que dice · Qué aparece · Tipo» con los tipos del catálogo de la skill
                                    (gancho, lista, contador, cierre…) o «escena · mapa», «escena · lista_iconos»…
    trabajo/vocab.txt             → nombres propios separados por comas, para transcribe.py --vocab.
- Copia la toma a Tomas/ con el id delante: «CNT-… toma1.mov».
- Detecta que el reel está hecho cuando aparece «FINAL - <tema>.mp4» en la raíz de la carpeta del reel, enseña
  portada.png y lee trabajo/plan.json → subtitulos[].frase para los copies. NO cambies esos nombres ni esas rutas.

Cuando termines, resume en 5 líneas qué hace hoy la entrevista (paso 1) de editar-reels-claude y qué valores escribe
en proyecto.json para «tipo», «musica», «resolucion» y «revision». Si alguno no coincide con lo que escribe Content
Studio, dímelo: lo ajustaremos en el bloque 1.
```

---

## Bloque 1 · `editar-reels-claude` lee el encargo de Content Studio

```text
Cambia editar-reels-claude para que use el encargo de Content Studio cuando exista. Reglas:

1. Paso «1 · Entrevista» del SKILL.md: si la carpeta del reel ya tiene proyecto.json con la clave "contenido",
   NO hagas la entrevista. Di en una frase lo que trae (marca, tipo, gráficos, música, red, editor) y pregunta solo lo
   que falte (normalmente nada; si "toma" está vacía, la toma: busca en Tomas/ los archivos que empiezan por el id del
   contenido). "tipo" ya viene con tus valores («cabeza parlante», «voz en off + imagenes de producto»; «animacion» →
   pásalo a animar-reels-claude). Si "musica" falta, usa la de la marca (como hoy).
2. Pasada 1 (transcribir): si existe trabajo/vocab.txt, úsalo en --vocab. Antes de cortar, lee
   trabajo/guion-aprobado.md (una vez) para saber qué se quería decir y proponer qué tomas falsas quitar.
3. Pasada 4 (gráficos): si existe trabajo/propuesta-graficos.md, parte de ahí: ancla cada fila a las palabras reales
   (plan.py resumen --palabras), aplica las reglas de siempre (Regla 2: ninguna cifra que no se pronuncie; nada sobre la
   cara; zona segura; topes de proyecto.json) y enseña la tabla para aprobarla. Lo que no se pueda anclar, quítalo y
   dilo. Las filas «escena · …» son para animar-reels-claude (modo A).
4. Añade una orden «edita los reels pendientes»: busca en Reels/ las carpetas con proyecto.json que tengan
   "contenido" y no tengan «FINAL - *.mp4», enséñalas y edita la que elija el usuario.
5. Al exportar, el archivo final sigue llamándose «FINAL - <tema>.mp4» en la raíz de la carpeta del reel, con
   portada.png al lado (Content Studio los busca ahí).
6. Respeta la Regla 3 (pocos tokens): lee guion-aprobado.md y propuesta-graficos.md una sola vez cada uno, solo al
   llegar a su paso, y no leas plan.json entero.

Haz los cambios en SKILL.md (y en el script de la entrevista si hace falta, por ejemplo plan.py prefs/marcas, sin
romper el uso normal sin Content Studio). Después prueba con un reel de prueba: crea
Reels/2026-01-01 · prueba content studio/ con un proyecto.json de ejemplo como el que describe el bloque 0 (marca
personal, tipo «cabeza parlante», pocos gráficos, editor false) y una toma corta de Tomas/; recorre la skill hasta la
tabla de gráficos y para ahí. Dime qué preguntó y qué no.
```

---

## Bloque 2 · `animar-reels-claude` lee el encargo

```text
Cambia animar-reels-claude para que use el encargo de Content Studio:

1. Modo B (video completo): si el reel tiene proyecto.json con "contenido" y "tipo": «animacion», no hagas la
   entrevista. Usa "marca", "voz" (grabada | clonada | generica; si es «grabada», busca el audio en Tomas/ por el id
   del contenido) y "formato" de proyecto.json, como si los hubiera escrito crear.py nuevo. La muestra de voz sintética
   se sigue enseñando antes de aprobarla (voz_aprobada la pones tú). El guion es
   trabajo/guion-aprobado.md: pásalo a trabajo/guion.txt (solo la voz, en orden) en vez de escribir uno nuevo. Enséñalo
   igualmente para el OK.
2. Escenas: si existe trabajo/propuesta-graficos.md, sus filas «escena · <tipo>» son la propuesta de escenas.json
   (mapa, lista_iconos, cifra, comparar, mecanismo, objeto, pieza3d, foto). Ánclalas con desde_palabra a las palabras
   reales y enseña la tabla antes de renderizar. Aplica las reglas de siempre (ninguna cifra que no se diga, máximo 3
   colores de la marca, una idea por escena).
3. Modo A (b-roll en un reel grabado): lo mismo con las filas «escena · …» cuando editar-reels-claude te pase el reel.
4. El vídeo final sigue siendo «FINAL - <tema>.mp4» en la raíz de la carpeta del reel, con portada.png.

Prueba con un proyecto.json de ejemplo de tipo «animacion», voz «generica», formato «corto», y una propuesta con 3 escenas
(una «escena · mapa» de un estado de México, una «escena · lista_iconos» y una «escena · cifra»): llega hasta la tabla de
escenas y para. Dime qué preguntó y qué no.
```

---

## Bloque 3 · B-roll de bancos libres

```text
Añade a editar-reels-claude (compartido con animar-reels-claude) B-roll gratuito de bancos libres, para ilustrar lo que
se nombra y no se grabó. El método: buscar varias ideas a la vez, enseñar una sola hoja de candidatos, elegir por lo
que se ve (no por el título) y dejar FUENTES.md con los derechos de cada clip.

1. Script scripts/broll_banco.py:
   - Busca a la vez en Pexels (videos y fotos), Pixabay (videos) y Wikimedia Commons (fotos y videos) varias ideas en
     inglés de 2-3 palabras («dripping tap», «cocoa beans macro»). Devuelve 4-6 candidatos por idea.
   - Pexels y Pixabay necesitan una clave gratuita: léela de las variables PEXELS_API_KEY y PIXABAY_API_KEY o de
     ~/.config/reels-claude/claves.json. NUNCA la guardes dentro de la skill. Sin clave, usa solo Wikimedia y dilo.
   - Hace una hoja de contacto (trabajo/broll-candidatos.jpg) con un fotograma de cada candidato y su código.
   - Con --bajar <código> descarga a trabajo/broll-banco/ en vertical 1080×1920 (recorte centrado, sin HDR) y apunta
     autor, licencia y URL en FUENTES.md del reel.
2. En el plan, el clip se usa con el gráfico «marco» (dentro de una tarjeta) o como toma (tomas[] en reels de
   producto). Añádelo a docs/PLAN-Y-CATALOGO.md.
3. Reglas en SKILL.md: solo para lo que la voz nombra en ese momento (Regla 2); nunca gente al azar de frente salvo
   que la frase hable de personas; nada de logos ni marcas de terceros; máximo un clip cada 6-8 s; al exportar, recuerda
   al usuario revisar FUENTES.md.
4. Instala solo lo que haga falta en el .venv de la skill (requests ya suele estar) y dime qué instalaste.

Prueba: con el reel de prueba del bloque 1, busca «coffee pouring» y «moka pot stove», enséñame la hoja, baja uno y
ponlo como marco en una frase. Después explícame en 3 pasos cómo consigo las claves gratuitas de Pexels y Pixabay.
```

---

## Bloque 4 · Mapas de cualquier país

```text
Amplía la escena «mapa» de animar-reels-claude a todos los países, sin perder lo que ya hace con México:

1. scripts/preparar_mapa.py ya parte de ne_50m_admin_0_countries.geojson (Natural Earth, dominio público). Genera
   además datos/mundo.json con todos los países, simplificado para que pese poco (objetivo < 1,5 MB), con su nombre en
   español y en inglés y sus capitales como ciudades.
2. En escenas.json, «mapa» acepta: enfoca: "pais:<nombre>" (zoom desde el mundo hasta ese país), resalta: [países],
   pines en capitales o en ciudades añadidas, y rutas entre países («de España a México»). Si el nombre es un estado de
   México, sigue funcionando como hoy.
3. Los nombres se aceptan en español sin acentos o en inglés («Ghana», «España», «Espana», «Spain»). Un nombre
   desconocido se rechaza con sugerencias.
4. Actualiza ESCENAS.md (tabla de tipos y la nota de «mapa») y la línea de Content Studio no hace falta tocarla.

Prueba: una escena de 4 s que parte del mundo y hace zoom a Ghana, con un pin en Accra, y otra con una ruta de España a
México. Enséñame escenas-revision.jpg.
```

---

## Bloque 5 · Biblioteca de escenas por marca

```text
Añade a animar-reels-claude una biblioteca de escenas por marca, para no rehacer lo que ya quedó bien (antes de
hacer una escena se busca en la biblioteca; lo que se aprueba se guarda):

1. Carpeta Mi estilo/escenas/<marca>/ con un archivo por escena aprobada: <id>.json (la escena tal como va en
   escenas.json, sin tiempos) + <id>.jpg (miniatura) + una línea de para qué sirve y en qué reel salió.
2. Orden «guarda esta escena en la biblioteca»: tras aprobar un reel, guarda las escenas que el usuario elija.
3. Al proponer escenas (modo A o B), mira primero la biblioteca de esa marca y propone reutilizar las que encajen
   (cambiando solo el texto y los datos que diga la voz). Dilo en la tabla («de la biblioteca»).
4. Documenta todo en ESCENAS.md y en SKILL.md (paso de escenas), en pocas líneas.

Prueba: guarda dos escenas del reel de prueba del bloque 2 y propón un reel nuevo que reutilice una.
```

---

## Bloque 6 · Acabado de las animaciones

```text
Revisa el acabado de las escenas de animar-reels-claude con mis marcas (Mi estilo/marcas/*.json y sus guías):

1. Renderiza una escena de cada tipo (palabras, objeto, cifra, comparar, pasos, mecanismo, lista_iconos, fondo_vivo,
   mapa, pieza3d) con los colores y fuentes de dos marcas distintas, y haz una sola hoja con todas.
2. Mírala y dime, por tipo, qué se ve poco profesional o «infantil» (rebotes repetidos, demasiados colores, textos
   largos, poco contraste, movimiento sin intención) y qué cambiarías.
3. Propón (sin aplicar) 3 mejoras concretas de las plantillas y 2-3 animaciones de entrada y salida nuevas que encajen
   con el estilo cristal/rebote suave. Cuando yo elija, aplícalas en las plantillas, no en un reel concreto.
```

---

## Qué comprobar en Content Studio después

- **Bloques 1 y 2:** en un contenido con guion aprobado, *Edición → Enviar a edición → Copiar mensaje para Claude
  Code*, pégalo en Claude Code abierto en «Reels con Claude» y confirma que no repite la entrevista. Al exportar, *Edición
  → Comprobar* debe marcar «Editado» y enseñar el video.
- **Bloque 3:** las propuestas de recursos de tipo «Toma de apoyo (B-roll)» del guion ya llegan a la tabla de
  propuesta como «toma de apoyo (marco o toma)».
- **Bloque 4:** en el guion, el recurso «Escena: mapa con zoom» deja de estar limitado a México. Avísame y cambio el
  texto de ayuda de la app («Hoy solo México y sus estados»).
