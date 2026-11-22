# Cómo usar Content Studio

## Navegación

- **Barra superior**: selector de marca (*Todas las marcas* o una concreta) · Inicio · Ideas · Contenidos · Calendario · Resultados · Marcas · Método · indicador de sincronización · Ajustes.
- La marca seleccionada **filtra toda la app**. La IA siempre usa la marca del contenido con el que trabajas.

## Flujo recomendado (por rondas)

La agencia de referencia recomienda trabajar **por rondas**: preparar unos 8 videos, grabarlos el mismo día, publicar, medir y mejorar.

1. **Configura la marca** (Marcas → Ficha):
   - **identidad**: resumen de la marca, propuesta de valor y productos;
   - **documentos**: buyer persona, puntos de dolor, discurso comercial, oferta, reglas, foco comercial y el resto de documentos de referencia en Markdown. Son el contexto fijo de la IA (ver [DOCUMENTOS_DE_MARCA.md](DOCUMENTOS_DE_MARCA.md));
   - **comunicación**: tono y palabras a evitar;
   - **visual**: colores, tipografías y subtítulos;
   - **redes**: duración y frecuencia;
   - **pilares** y meta mensual;
   - **hooks y CTA** aprobados.
2. **Llena el banco de ideas** (Ideas):
   - manual o con **Generar ideas con IA**, que propone un 80 % de formatos seguros y un 20 % experimentales;
   - revisa los avisos de **ideas parecidas** y usa *Proponer enfoques distintos*;
   - **aprueba** las que tengan propósito claro.
3. **Estrategia del contenido** (abre la idea → *Estrategia*):
   - completa problema, palabra clave, objetivo y nivel de conocimiento;
   - usa **Investigar** para reunir preguntas frecuentes, mitos y datos con fuentes, y añade lo útil a *Referencias*.
4. **Guion** (pestaña *Guion*):
   - **Generar versiones**: elige plataforma, duración, estructura, nivel y número de versiones;
   - edita cada parte: hook en 4 capas, secciones con su función y su pico de interés (0–3), CTA y afirmaciones a verificar;
   - con **Reescribir con IA** cambias solo una sección, el hook, la duración, el lenguaje, la estructura o la plataforma; cada acción crea una versión nueva;
   - **Comparar** muestra dos versiones lado a lado;
   - **Evaluación**: la revisión automática es instantánea y la **evaluación con IA**, opcional. No son predicciones de viralidad;
   - responde el **filtro antes de aprobar** (pestaña Estrategia) y pulsa **Aprobar versión**, que la bloquea y pasa el contenido a *Por grabar*.
5. **Grabado**: graba con el teléfono y marca la casilla **Grabado** en la cabecera del contenido. Pasa a *Grabado · por editar*.
6. **Editado**: edita el video con Claude y marca la casilla **Editado**. Pasa a *Editado* (o a *Calendarizado* si ya tenía fecha). Desmarcar cualquiera de las dos casillas devuelve el contenido a la etapa anterior.
7. **Copies**: genera caption, título, descripción, CTA, hashtags y portada por plataforma, en dos variantes. Edítalos, apruébalos y cópialos.
8. **Publicación**:
   - programa una fecha por plataforma, también desde el Calendario arrastrando desde "Sin fecha";
   - publica a mano en la red;
   - pulsa **Marcar publicado** y añade la URL.
9. **Resultados**:
   - registra mediciones a los 2, 7 y 30 días;
   - en **Resultados** compara por estructura, patrón de hook, pilar, duración, CTA y otras dimensiones, con medianas y n;
   - usa **Proponer mejoras con IA** para obtener hipótesis y próximas ideas.

## Consejos

- **La estrategia precede al contenido**: una idea sin objetivo ni problema del espectador no debería aprobarse.
- El documento **Productos, servicios y oferta** es lo único que la IA puede afirmar sobre lo que vende la marca. Lo que no esté ahí debe marcarse para verificar.
- Actualiza el **Foco comercial actual** cada mes: es lo que hace que las ideas y los guiones empujen lo que toca vender ahora.
- Guarda los hooks que funcionan con *Guardar hook en la biblioteca*: la IA los usa como referencia de estilo y evita repetirlos.
- En Resultados, un grupo con **"n bajo"** es una pista, no una conclusión. Pruébalo cambiando una sola variable.
- Haz **Exportar JSON** de vez en cuando, aunque uses Google Sheets.

## Atajos

- `Enter` sobre una tarjeta del tablero la abre.
- `Esc` cierra ventanas.
- Doble clic en un día del calendario programa un contenido en esa fecha.


## Edición con la skill de reels (Claude Code)

Content Studio prepara el trabajo de las skills `editar-reels-claude` y `animar-reels-claude`, que corren en tu
computadora con Claude Code. Plan completo en [PLAN_INTEGRACION_EDICION.md](PLAN_INTEGRACION_EDICION.md).

1. **Conecta la carpeta** «Reels con Claude» en *Ajustes → Carpeta de reels* (Chrome, Edge o Brave con
   `brave://flags/#file-system-access-api` activado). El navegador vuelve a pedir permiso en cada sesión.
2. **Marca → Estilo de edición**: *Traer de Mi estilo/* la primera vez; después, *Guardar en Mi estilo/* cuando cambies
   algo. Se conserva lo que la skill afinó (medidas, notas, «Aprendido en los reels»).
3. **Contenido → Edición** (con el guion aprobado): elige las opciones del video y pulsa *Enviar a edición*. Crea
   `Reels/<fecha · tema>/` con `proyecto.json`, `trabajo/guion-aprobado.md`, `trabajo/propuesta-graficos.md` y
   `trabajo/vocab.txt`.
4. **Añadir toma** copia tu grabación a `Tomas/` con el id del contenido delante: el contenido pasa a *Grabado*.
5. **Copiar mensaje para Claude Code** y pégalo en Claude Code abierto en «Reels con Claude».
6. Cuando la skill deje `FINAL - ….mp4`, la app lo encuentra (al abrir el contenido, con *Comprobar* o en *Ajustes →
   Carpeta de reels → Comprobar todos*): pasa a *Editado*, enseña el video y los copies usan lo que se dijo de verdad.

Sin carpeta conectada (por ejemplo, en el celular), *Descargar el encargo* baja los cuatro archivos para ponerlos a mano.

## Modo grabación

Con el guion aprobado, **Guion → Modo grabación** (o *Edición → Modo grabación*) abre `#/grabar/<id>`:

- **Segundo a segundo:** el guion en tramos, con su segundo según las palabras por minuto de la marca (*Pilares y
  estrategia*), lo que se dice, el texto en pantalla, lo que se ve y su recurso visual.
- **Primer cuadro:** un encuadre 9:16 con las zonas que tapa la interfaz de la red (220 px arriba, 380 abajo y 140 a la
  derecha, las de la skill), la franja de la cara y la de los subtítulos (la del archivo de la marca, si la tiene).
- **Gancho:** con sus 4 P y las variantes del primer cuadro para grabarlas también.
- **Qué preparar:** las tomas y objetos que pide el guion, los datos por comprobar y lo básico para grabar bien. Las
  casillas se recuerdan en ese dispositivo.
- **Teleprompter** (`#/grabar/<id>/teleprompter`): a pantalla completa, a la velocidad de la marca. Tocar el texto o la
  barra espaciadora lo pausa; − y + cambian la velocidad, A− y A+ la letra; ⇋ lo pone en espejo para teleprompters con
  cristal; la pantalla no se apaga mientras corre. Ábrelo en otro dispositivo (tableta, computadora) si grabas con el
  celular.
