---
name: content-studio-claude
description: Atiende los pedidos de Content Studio (ideas, guiones, reescrituras, evaluaciones, hooks, CTA, copies, investigación, documentos de marca y análisis) que la app deja en «Content Studio/pedidos/» dentro de la carpeta «Reels con Claude», y deja cada respuesta en «Content Studio/respuestas/» con el formato exacto que la app espera. Úsala cuando el usuario diga «atiende los pedidos de Content Studio», «hay un pedido de Content Studio» o similar.
---

# Pedidos de Content Studio

Content Studio (la app de marcas, ideas y guiones) deja aquí tareas de IA para que las hagas tú con el plan de Claude
del usuario. Cada pedido ya trae TODO el contexto (la marca, sus documentos, la metodología, la idea y lo que hay que
devolver): **no leas nada más** y no preguntes nada; responde y sigue.

**Rutas.** `{R}` = la carpeta «Reels con Claude» (donde trabajas; si no estás en ella, búscala:
`~/Desktop/Claude Code/Videos Claude/Reels con Claude`). Pedidos: `{R}/Content Studio/pedidos/*.json`. Respuestas:
`{R}/Content Studio/respuestas/<id>.json`.

## Pasos

1. **Lista los pedidos** pendientes (los que aún no tienen respuesta):
   ```bash
   cd "{R}/Content Studio" && mkdir -p respuestas && for f in pedidos/*.json; do [ -e "$f" ] || continue; [ -e "respuestas/$(basename "$f")" ] || echo "$f"; done
   ```
   Si no hay ninguno, dilo en una frase y termina. Listo cuando tienes la lista.
2. **Por cada pedido, del más antiguo al más nuevo:** léelo **una vez** con Read. Trae:
   - `system`: quién eres para esta tarea, la metodología, las **reglas de veracidad** y el contexto de la marca.
     Cúmplelo como si fuera tu instrucción de sistema.
   - `prompt`: la tarea concreta y, al final, el formato exacto que hay que devolver.
   - `salida`: `json` o `texto`. `busqueda_web`: si es `true`, investiga con WebSearch/WebFetch y cita las fuentes.
   - `max_palabras`: tope orientativo de la respuesta.
   Listo cuando sabes qué devolver.
3. **Escribe la respuesta** con Write en `respuestas/<id>.json` (el mismo nombre que el pedido):
   - Si `salida` es `json`: `{"id": "<id>", "json": <el objeto que pide el prompt, con sus claves exactas>}`.
   - Si `salida` es `texto`: `{"id": "<id>", "texto": "<la respuesta en Markdown>", "fuentes": [{"titulo": "…", "url": "…"}]}`
     (`fuentes` solo si investigaste).
   - Si no puedes hacerlo: `{"id": "<id>", "error": "<por qué, en una frase>"}`.
   Comprueba que es JSON válido:
   ```bash
   python3 -c "import json,sys; json.load(open(sys.argv[1]))" "{R}/Content Studio/respuestas/<id>.json" && echo ok
   ```
   Listo cuando dice `ok`. La app la recoge sola en unos segundos y borra el pedido.
4. **Al terminar**, dile al usuario en una línea por pedido qué hiciste (tarea y título), nada más.

## Reglas

- **Sigue el formato del prompt al pie de la letra**: las mismas claves, los mismos valores permitidos (ids de estructura,
  de patrón de hook, de recurso visual, de objetivo…). La app lee la respuesta sin que nadie la revise antes.
- **Veracidad:** no inventes datos, cifras, precios, casos ni testimonios. Si falta algo, márcalo como dice el pedido
  (`[DATO A CONFIRMAR: …]`, en `verify`, etc.).
- **Recursos visuales:** respeta los topes y las reglas que trae el prompt (ninguna cifra en pantalla que no se
  pronuncie; el anclaje con palabras exactas de la voz).
- No toques ningún otro archivo ni carpeta. No borres pedidos: lo hace la app.
- Gasta pocos tokens: un pedido, una lectura, una escritura. Sin resúmenes largos en el chat.

## Si el usuario quiere que te quedes atento

Con `/loop 1m usa la skill content-studio-claude` revisas los pedidos cada minuto mientras trabaja en la app.
