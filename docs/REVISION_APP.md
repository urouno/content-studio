# Revisión de Content Studio 2.0 (solo la app)

Plan para comprobar, en una sesión aparte, que la app hace todo lo de las fases 1 a 6 del
[plan de integración](PLAN_INTEGRACION_EDICION.md). Las skills de tu Mac (fase 7) no entran aquí.

---

## 0. Antes de revisar: que estés usando la versión nueva

**Por qué no veías los cambios:** todo lo nuevo está en la rama `claude/pensive-maxwell-5ixags`, pero GitHub Pages
publica la app desde la rama `main`, que seguía en la 1.4.1. Lo único que ya funcionaba era lo que vive en Apps Script
(la IA con varios proveedores), porque ese archivo lo copiaste a mano.

| # | Paso | Cómo comprobarlo |
|---|---|---|
| 0.1 | **Llevar los cambios a `main`** (fusionar la rama con un pull request en GitHub). Pages publica solo en 1-2 minutos. | En GitHub, la rama `main` tiene el commit «Revisión de la app…» o posterior. |
| 0.2 | **Recargar sin caché**: abre la app y pulsa Ctrl+Shift+R (en Mac: Cmd+Shift+R). Si sigue igual, cierra la pestaña y vuelve a abrirla; la app funciona sin conexión y guarda una copia. | **Ajustes** dice debajo del título: **«Content Studio 2.0.0»**. Si no lo dice, sigues en la versión vieja. |
| 0.3 | **Apps Script al día**: copia `apps-script/Code.gs` de `main`, guarda e implementa una **nueva versión** del Web App. | Ajustes → Conexión → Probar: dice «versión 1.8.0» y la lista de proveedores de IA con clave. |
| 0.4 | En el celular, lo mismo que en 0.2. | Ajustes → «Content Studio 2.0.0». |

---

## 1. Dónde está cada cosa nueva

| Qué | Dónde | Cuándo aparece |
|---|---|---|
| Proveedores de IA en orden y prueba de todos | **Ajustes → IA (proveedores)** | Siempre |
| Claude Code con tu plan (pedidos) | **Ajustes → IA**, tarjeta «Claude Code (tu plan de Claude)», abajo | Siempre; funciona con la carpeta conectada |
| Conectar la carpeta «Reels con Claude» | **Ajustes → Carpeta de reels** | Siempre (en Brave, con el flag activado) |
| Estilo de la marca para la skill | **Marcas → (marca) → Estilo de edición** | Siempre |
| Tipo de producción y empaque de la idea | **Contenido → Estrategia**: campo «Tipo de producción» y sección plegable «Empaque: primer cuadro y gancho» | Siempre |
| Recursos visuales por sección, 4 P, cantidad de gráficos | **Contenido → Guion** | Cuando hay guion |
| **Modo grabación y teleprompter** | **Contenido → Guion → botón «Modo grabación»** (arriba, junto a «Desbloquear») y **Contenido → Edición** | **Solo con el guion aprobado** (botón «Aprobar versión») |
| **Mandar a editar con Claude Code** | **Contenido → pestaña «Edición»** (entre Guion y Copies) | Con el guion aprobado. La app **no abre Claude Code por sí sola**: prepara el encargo y te da el mensaje para pegarlo |
| Créditos de B-roll en los copies | **Contenido → Copies** (aviso arriba) | Cuando el reel editado usó material con licencia de atribución |

---

## 2. Recorrido de revisión

Marca cada casilla al comprobarla. Si algo no coincide con «Debe pasar», apunta el número y qué viste (sección 5).

### A. IA (Ajustes → IA)
- [ ] **A1** · Se ven los proveedores en orden (Groq, Gemini, OpenRouter, Cerebras; DeepSeek y Claude desmarcados), cada uno con «clave configurada» o «sin clave».
- [ ] **A2** · «Probar cada proveedor» muestra una tabla con cada uno, su modelo y su tiempo (o el error).
- [ ] **A3** · Subir un proveedor con la flecha y «Guardar» cambia el orden.

### B. Carpeta (Ajustes → Carpeta de reels) — en Brave con `brave://flags/#file-system-access-api` en *Enabled*
- [ ] **B1** · «Conectar carpeta» → eliges «Reels con Claude» → aparecen «Mi estilo/, Mi estilo/marcas/, Tomas/, Reels/: sí».
- [ ] **B2** · Al volver otro día pide «Dar permiso» (normal: el navegador lo pide en cada sesión).

### C. Marca (Marcas → Afinazone → Estilo de edición)
- [ ] **C1** · Escribe `afinazone` en «Nombre del archivo» y pulsa **«Traer de Mi estilo/»**: se rellenan colores, fuentes, subtítulos, tarjetas…; el estado sale «definida».
- [ ] **C2** · «Ver los dos archivos» enseña el `.json` y la guía; la guía empieza con **tu** texto y termina con el bloque «Desde Content Studio».
- [ ] **C3** · Cambia algo pequeño y **«Guardar en Mi estilo/»**: en el Finder, `Mi estilo/marcas/afinazone.json` conserva tus medidas (`tam`, `y`…) y tus notas.

### D. Ideas (Ideas → Generar ideas con IA)
- [ ] **D1** · Cada propuesta dice «más segura / intermedia / más arriesgada», el **texto del primer cuadro** en un recuadro, «Por qué» y «Riesgo» (en naranja).
- [ ] **D2** · Si la marca tiene resultados medidos, alguna dice «Variante de «…»».
- [ ] **D3** · Al añadirla, en **Contenido → Estrategia** están «Tipo de producción» y la sección «Empaque» rellenos.

### E. Guion (Contenido → Guion)
- [ ] **E1** · «Generar con IA» pide **Tipo de producción** y **Cantidad de gráficos** (sugerida según la duración).
- [ ] **E2** · Cada sección tiene abajo **«Recurso visual»** (tipo, qué aparece y en qué frase entra) y arriba un contador «Recursos: 2/5 flotantes · 0/2 pantalla».
- [ ] **E3** · El gancho tiene una sección plegable «Las 4 P del gancho».
- [ ] **E4** · La revisión automática avisa si un recurso muestra una cifra que la voz no dice o si una frase enumera («tres razones») sin lista.
- [ ] **E5** · **Aprobar versión** → aparece el botón **«Modo grabación»** junto a «Desbloquear».

### F. Modo grabación (Guion aprobado → Modo grabación)
- [ ] **F1** · Tabla **segundo a segundo** (0:00–0:03 gancho…), duración total y objetivo.
- [ ] **F2** · **Primer cuadro**: encuadre vertical con zonas rojas (interfaz), la cara y la franja de subtítulos.
- [ ] **F3** · **Qué preparar**: casillas que se recuerdan al volver.
- [ ] **F4** · **Abrir teleprompter**: pantalla negra, letra grande; «Empezar» hace avanzar el texto; tocarlo lo pausa; − y + cambian la velocidad; A− y A+ la letra; ⇋ espejo; ✕ sale.
- [ ] **F5** · En el celular: el teleprompter ocupa toda la pantalla y no se apaga mientras corre.

### G. Edición y Claude Code (Contenido → Edición) — con la carpeta conectada
- [ ] **G1** · Opciones del video (tipo, gráficos, escenas, música, red, revisión, editor) y el nombre de la carpeta del reel.
- [ ] **G2** · **«Enviar a edición»** → en el Finder aparece `Reels/<fecha · tema>/` con `proyecto.json` y `trabajo/` (guion-aprobado.md, propuesta-graficos.md, vocab.txt).
- [ ] **G3** · **«Añadir toma»** → copia el video a `Tomas/CNT-… toma1.mov` y el contenido pasa a **Grabado** (casilla de arriba marcada).
- [ ] **G4** · **«Copiar mensaje para Claude Code»** → pégalo en Claude Code abierto en «Reels con Claude»: la skill no repite la entrevista.
- [ ] **G5** · Cuando la skill deja `FINAL - <tema>.mp4`: **«Comprobar»** → el contenido pasa a **Editado**, se ve el video y la portada.
- [ ] **G6** · **Ajustes → Carpeta de reels → «Comprobar todos»** hace lo mismo con todos los contenidos pendientes.

### H. Copies (Contenido → Copies)
- [ ] **H1** · Tras G5, «Generar copies» usa lo que se dijo de verdad (si cambió algo frente al guion, se nota).
- [ ] **H2** · Si el reel usó B-roll con licencia CC BY, sale el aviso «Créditos obligatorios» y los copies terminan con «Créditos: …».

### I. Claude Code con tu plan (Ajustes → IA → Claude Code)
- [ ] **I1** · Marca «Ideas»; genera ideas: sale el aviso «Pedido enviado a Claude Code…» y aparece un archivo en `Content Studio/pedidos/`.
- [ ] **I2** · En Claude Code: «Usa la skill content-studio-claude: atiende los pedidos de Content Studio» → las ideas aparecen en la app en segundos y el pedido se borra.
- [ ] **I3** · Desmarca «Ideas» después si prefieres la vía rápida.

### J. Biblioteca de escenas (con la carpeta conectada)
- [ ] **J1** · En un contenido de Afinazone de tipo «Video animado» o con escenas, «Generar versiones»: alguna sección propone «biblioteca: palabras-fugas-de-presion · …» cuando encaja.
- [ ] **J2** · Tras «Enviar a edición», `propuesta-graficos.md` la marca «(de la biblioteca: …)».

---

## 3. Estatus final esperado (cómo debe quedar el flujo)

```
Marca (Estilo de edición ↔ Mi estilo/marcas)                       una vez por marca
  → Idea con IA (empaque, segura→arriesgada)                       Ideas
  → Guion con IA (recursos por sección, 4 P, cantidad de gráficos) Contenido → Guion
  → Aprobar versión
  → Modo grabación + teleprompter → grabar                         Contenido → Guion → Modo grabación
  → Enviar a edición + Añadir toma               (Grabado ✔)      Contenido → Edición
  → Copiar mensaje → Claude Code edita con tu skill
  → Comprobar: FINAL.mp4 encontrado              (Editado ✔)      Contenido → Edición
  → Copies con lo que se dijo y los créditos                       Contenido → Copies
  → Calendario → Publicado → Resultados          (a mano, como antes)
```

---

## 4. Límites conocidos (no son fallos)

- La app **no lanza Claude Code**: prepara archivos y te da el mensaje; tú lo pegas.
- La **carpeta** solo funciona en el navegador de la computadora (Brave con el flag, Chrome o Edge). En el celular: todo lo demás sí, y «Descargar el encargo».
- El **permiso de la carpeta** se pide de nuevo en cada sesión del navegador.
- Las **casillas de «Qué preparar»** y el tamaño de letra del teleprompter se recuerdan solo en ese dispositivo.
- La escena **mapa** solo hace México y sus estados (decidiste no ampliarla).

---

## 5. Qué anotar si algo falla

Para cada fallo: el número (por ejemplo **G3**), qué hiciste, qué esperabas y qué pasó, y una captura. Si aparece un
mensaje de error, cópialo tal cual. Dilo también si la versión de Ajustes no era la 2.0.0: casi todo lo que «no
aparece» viene de ahí.
