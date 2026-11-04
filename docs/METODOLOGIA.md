# Metodología de contenido — Content Studio

Este documento contiene la **Fase 1 (investigación)** y la **Fase 2 (ingeniería inversa del material de referencia)**. Sus conclusiones están codificadas en `js/services/methodology.js`, que es la base de conocimiento que la IA recibe en cada solicitud y que el evaluador local usa para revisar guiones.

## Niveles de evidencia

Cada recomendación lleva una etiqueta:

| Etiqueta | Significado |
|---|---|
| **[P]** Plataforma | Declarado por la propia plataforma (documentación oficial, responsables de producto). Es lo más fiable, pero las plataformas cambian sus sistemas sin aviso. |
| **[I]** Investigación | Respaldado por estudios de comunicación, psicología cognitiva o aprendizaje multimedia. Se basa en principios generales, no en estudios específicos de TikTok o Reels. |
| **[O]** Observado | Práctica repetida por creadores y agencias con resultados, sin estudio controlado. Funciona a menudo, pero puede depender del contexto. |
| **[H]** Hipótesis | Idea razonable que **debe probarse** con los datos de cada marca. |
| **[A]** Agencia | Principio dicho **explícitamente** en el material de referencia. |
| **[A*]** Inferido | Patrón que **yo detecté** al analizar los guiones de la agencia. La agencia no lo enuncia. |

> Límites de esta investigación. Las plataformas no publican cómo ponderan cada señal. Las cifras de terceros, como "los envíos pesan de 3 a 5 veces más que los Me gusta", **no están verificadas** y la app no las usa como reglas. Antes de aplicar cualquier conclusión a una marca concreta hay que contrastarla con sus propios datos (módulo Resultados).

---

# PARTE 1 · INVESTIGACIÓN

## 1. Estrategia de contenido

### 1.1 Construir una estrategia desde cero

1. **Objetivo de negocio → objetivo de contenido.** Primero se define qué necesita la marca: ventas recurrentes, clientes limitados, posicionamiento o reclutamiento. Luego se traduce en objetivos de contenido medibles: alcance cualificado, confianza, comunidad o conversión. [O][A]
2. **Audiencia.** Se describe por situación y problema, no por demografía: "quien acaba de terminar su ortodoncia y no sabe limpiar el retenedor". La app guarda la audiencia en tres niveles: público general, público interesado y público con intención de compra. [O]
3. **Problemas, necesidades e intereses.** Se recopilan de cuatro fuentes:
   - preguntas reales de clientes;
   - comentarios;
   - búsquedas dentro de la plataforma, filtrando por Me gusta y fecha (método de la agencia [A]);
   - errores frecuentes del sector.
   
   Cada problema se registra con su **palabra clave**, es decir, las palabras exactas que usa el público. [A*]
4. **Pilares de contenido.** Son de 3 a 5 territorios temáticos donde se cruzan lo que la marca sabe y lo que a la audiencia le importa. Cada pilar tiene un objetivo dominante. [O]
5. **Series y formatos.** Un formato es una estructura repetible que ya demostró funcionar: "Si te pasa X, tu Y está mal", "Hemos cogido 5…", "¿Esto o esto?". Una serie es un formato con continuidad: "Día 1 buscando familia a…". Los formatos permiten mantener la constancia sin empezar cada vez desde cero. [A]
6. **Tipos de contenido según el objetivo.** Ver 1.2.
7. **Embudo.** Ver 1.3.
8. **Frecuencia.** La agencia recomienda de 4 a 12 videos al mes, y de 4 a 8 como "ritmo ideal para crecer". Prefiere menos piezas mejor trabajadas, producidas **por rondas**. [A] Las plataformas premian la constancia, pero no publican una frecuencia óptima. [H] La app permite definir la frecuencia por marca y plataforma, y mide si se cumple.
9. **Planificación editorial.** La agencia usa la **regla 80/20**: 80 % de contenido "seguro", parecido a lo que ya funcionó, y 20 % de contenido experimental o promocional. [A] También clasifica cada pieza por dificultad de grabación (fácil, media o difícil) y combina las tres. [A]
10. **Reutilización entre plataformas.** La agencia publica **el mismo video en TikTok e Instagram** y considera que hacer piezas distintas duplica el trabajo sin mejorar resultados. [A] Adaptar caption, título y portada a cada plataforma sí está justificado, porque cada una indexa texto de forma distinta. [P][O]

### 1.2 Tres tipos de video según su función (síntesis agencia + investigación)

| Tipo | Función | Ejemplo de estructura | Riesgo si se abusa |
|---|---|---|---|
| **Venta / conversión** | Presentar producto o servicio como solución | Problema → solución concreta → prueba → CTA directo | "Pareces un pesado", se quema la audiencia y la imagen de quien sale a cámara [A] |
| **Familiaridad / autoridad** | Que confíen en ti: dudas resueltas, proceso, detrás de cámaras | Pregunta frecuente → respuesta clara → dato inesperado → CTA suave | Muchas visitas, poca conversión [A] |
| **Memorable / emocional** | Que te recuerden: historia, reto, causa | Situación con conflicto → progreso → resolución emocional | Muy costoso de producir, poca frecuencia [A] |

Hay que **combinar los tres**. [A] Además, todo video debe cumplir tres requisitos a la vez: que se entienda **a qué te dedicas**, que sea **entretenido** y que sea **profesional**. Si falta uno, el video no genera negocio: el "dentista bailando" es entretenido pero no profesional, y la "tesis doctoral" es profesional pero no entretenida. [A]

### 1.3 Embudo de contenido

| Etapa | Objetivo | Señales que importan | Tipos dominantes |
|---|---|---|---|
| **Descubrimiento (TOFU)** | Alcance cualificado | Retención inicial, visualización media, envíos/compartidos, seguidores nuevos | Dudas masivas, mitos, comparativas, experimentos, reacciones |
| **Consideración (MOFU)** | Confianza y autoridad | Guardados, comentarios con preguntas, visitas al perfil | Tutoriales, "todo lo que debes saber", proceso, casos |
| **Decisión (BOFU)** | Conversión | Clics, DMs, consultas, palabra clave comentada, ventas | Producto como solución, antes/después explicado, ofertas |
| **Comunidad / fidelización** | Relación | Comentarios con conversación, respuestas, recurrencia | Series, detrás de cámaras, historias del equipo |

### 1.4 Estrategias por resultado

- **Alcance:** temas genéricos con mucho interés, del tipo "cuanto más genérico, mejor" [A]; gancho que se entiende sin contexto; video autónomo.
- **Interacción:** preguntas abiertas que el espectador puede responder desde su experiencia; opiniones contrastables; comparativas.
- **Retención:** estructura con picos de atención crecientes; preguntas que se responden en la frase siguiente; cortar todo lo que no aporta.
- **Confianza:** precisión, demostración ("lo ponemos a prueba, no solo lo decimos" [A]) y explicaciones del por qué.
- **Comunidad:** series, continuidad, respuesta a comentarios con video, segunda parte pedida por la audiencia [A*].
- **Conversión:** problema concreto → solución de la marca → CTA específico y fácil ("Comenta X y te envío…" [A]).

**Debate alcance vs. nicho.** La agencia defiende que la visibilidad es necesaria para vender, porque de cada vista solo una fracción termina el video, es local y tiene capacidad e intención de compra. [A] Esto es razonable para negocios locales. La app no optimiza solo para alcance: mide **alcance cualificado** con seguidores, consultas y conversiones por cada 1 000 vistas, y lo compara con las vistas brutas. [H]

---

## 2. Psicología de la atención y la retención

### 2.1 Por qué alguien decide ver, continuar o abandonar

En el feed vertical, cada video compite contra el siguiente, que está a un gesto de distancia. El espectador decide en dos o tres segundos con una pregunta implícita: *"¿esto es para mí y vale la pena?"*. [O] Después re-decide continuamente: **cada momento debe ganarse el siguiente**. [O]

Principios con respaldo:

| Principio | Qué dice | Aplicación |
|---|---|---|
| **Brecha de información** (Loewenstein, 1994) [I] | La curiosidad aparece cuando percibimos un hueco entre lo que sabemos y lo que queremos saber, y crece cuando el hueco es pequeño y concreto | Abrir una pregunta **específica** al inicio y cerrarla al final, no antes |
| **Relevancia personal / autoreferencia** [I] | Procesamos mejor la información que nos atañe | Hooks en segunda persona con situación reconocible: "Si te pasa esto…" |
| **Efecto Zeigarnik / tensión no resuelta** [I] (evidencia mixta) | Lo inconcluso se recuerda y empuja a buscar el cierre | Anunciar la estructura ("tres errores", "el tercero es el peor") |
| **Violación de expectativas** [I] | Lo inesperado captura atención automática | Desmentir mitos, datos contraintuitivos, giro visual |
| **Carga cognitiva** (Sweller; Mayer, aprendizaje multimedia) [I] | La memoria de trabajo es limitada; voz + imagen coherente supera a texto redundante | Una idea por video, frases cortas, texto en pantalla que **refuerza**, no duplica todo |
| **Narrativa / transporte** (Green & Brock) [I] | Las historias reducen la resistencia y aumentan la atención sostenida | Conflicto → progreso → resolución |
| **Recompensa variable** [I] | Lo impredecible sostiene la atención | Picos de interés distribuidos y crecientes |
| **Fluidez de procesamiento** [I] | Lo fácil de procesar parece más verdadero y agradable | Palabras comunes, orden cronológico, ritmo claro |

### 2.2 Qué hace que un gancho funcione

Un gancho **no es una frase llamativa**: es una **promesa** que el resto del video debe cumplir. Sus características:

1. **Inmediatez:** se entiende en menos de 3 segundos ("¿qué puedes prometer?, ahora dilo en 3 segundos" [A]). Aproximadamente 7–9 palabras habladas. [O]
2. **Especificidad:** "Si te pasa esto, tu café está quemado" funciona mejor que "Tips de café". Lo concreto es creíble y visualizable. [O][A]
3. **Relevancia:** habla del problema del espectador, no de la marca. "Nos centramos en los problemas de la audiencia, no en lo que queremos decir nosotros". [A]
4. **Brecha:** abre una pregunta que el espectador quiere ver cerrada.
5. **Contexto suficiente:** a veces ir "directo al grano" pierde. El caso de los retenedores muestra que dar contexto de a quién va dirigido mejoró la retención: "no todo es ir tan rápido". [A]
6. **Coherencia visual:** lo que se ve confirma lo que se dice. El "gancho visual" muestra el resultado, el problema o el objeto. [A]
7. **Honestidad:** si el gancho promete más de lo que el video entrega, genera abandono y desconfianza. [O] **Regla de la app:** cada guion declara su *promesa* y el evaluador verifica que el desarrollo la cumpla.

### 2.3 Desarrollo que mantiene el interés

- **Tres actos**: inicio (contexto + problema), nudo (información ordenada con picos de atención), desenlace (conclusión o CTA). [A]
- **Picos de atención crecientes**: identificar las frases "interesantes" (mitos desmentidos, datos, giros) y ordenarlas de menor a mayor intensidad hacia el final. [A]
- **Cada frase es un componente con un objetivo** (característica, resultado, dato, emoción, transición). Si no tiene objetivo, sobra. [A]
- **Pregunta → respuesta inmediata**: si el espectador se hace una pregunta, la siguiente frase la responde. [A]
- **Mover lo mejor al inicio**: si lo más interesante ocurre en el segundo 40, se adelanta o se anticipa. [A]
- **Cambios de ritmo** cada pocos segundos: cambio de plano, de dato, de tono o de gráfico. [O]
- **Bucles abiertos** encadenados: cerrar una pregunta abriendo la siguiente ("pero esto no sirve si no…"). [A*] (aparece en el guion "Este es el video que me enseñó a hacer guiones").

### 2.4 Cierres satisfactorios

- El cierre **resuelve la promesa** del gancho (problema planteado en los primeros 5 s y resuelto al final [A]).
- Termina **pronto** tras la resolución: la cola sin valor erosiona la retención final. [O]
- El CTA se conecta con lo visto (ver §6).
- Opcional: **loop** — la última frase enlaza con la primera para favorecer la re-reproducción. [O][H]

---

## 3. Hooks: sistema de cuatro capas

El gancho efectivo suele **combinar capas** que dicen lo mismo por canales distintos. [O][I — coherencia multimedia]

| Capa | Qué es | Cuándo usarla | Ejemplos de patrón |
|---|---|---|---|
| **Narrado** | Primera frase hablada | Siempre que haya voz | Pregunta, "Si te pasa X…", "Hemos cogido…", "Esto es X y esto es Y" |
| **Visual** | Primer plano / acción | Siempre; imprescindible en contenido sin voz o con producto | Resultado final primero, problema visible ("¿cómo tienes el coche así?"), objeto inesperado, comparación lado a lado, acción en movimiento |
| **Textual** | Texto en pantalla 0–3 s | Mucha gente ve sin sonido; refuerza la promesa | Promesa resumida, pregunta, número ("3 errores…"), palabra clave buscable |
| **Auditivo** | Sonido inicial | Cortes de ritmo, revelaciones, ASMR de producto | Sonido del objeto (crujido, golpe), silencio + golpe, efecto en la revelación |

### Catálogo de patrones de hook (abstraídos; no copias literales)

Patrones explícitos de la agencia [A] (normalizados a plantillas):

1. `[N] [elementos] + [característica] + [acción]` — curiosidad / lista.
2. **Pregunta frecuente** — "Si tengo X, ¿qué hago?" — autoridad.
3. `Hemos cogido [elementos] + [experimento]` — diseccionar un tema con prueba.
4. **Acción por premio** — "¿Me cambias X por Y?" — producto + comunidad.
5. **Mover el clímax al inicio** — empezar por el momento más interesante.
6. `Esto es X y esto es Y` — comparativa / prueba social.
7. `Si [situación] + [punto de dolor]` — solución de problema.
8. `Si haces esto…` — enseñar algo cotidiano.
9. `Si [acción], [no está mal: está fatal]` — corrección de error.
10. `Si estás pensando en [acción], esto es lo que deberías saber` — presentar servicio.
11. `¿Sabías que / por qué…?` — descubrimiento.
12. `¿Esto o esto?` — dilema rápido.
13. **Historia con antes** — "¿Te acuerdas del desastre de…?" — transformación.
14. **Reacción** — partir de algo entretenido para explicar algo técnico.
15. **Problema emocional del creador** — "Me encanta X, pero cada vez que… pienso: necesita un cambio".

Patrones añadidos por la investigación [O]:

16. **Mito vs. realidad** — "Todo el mundo cree X. Es al revés."
17. **Error común** — "El error que comete casi todo el mundo con X".
18. **Resultado primero** — mostrar el final y luego "así lo hicimos".
19. **Número concreto + plazo** — "Lo que aprendí después de 4 000 videos".
20. **Identidad** — "Si eres [perfil], esto te interesa".
21. **Contraste antes/después** — dos estados en pantalla.
22. **POV / situación** — escena reconocible del día a día del público.

### Sistema de generación y evaluación de hooks (implementado)

1. **Generar**: a partir del tema, problema, audiencia, plataforma y objetivo, la IA propone hooks de **patrones distintos** (no 5 variantes del mismo), cada uno con sus 4 capas.
2. **Evaluar** (checklist, no puntuación predictiva):
   - ¿Se entiende en ≤3 s / ≤12 palabras?
   - ¿Nombra el problema o situación del público con sus palabras?
   - ¿Es específico (objeto, número, situación concreta)?
   - ¿Abre una pregunta que el video cierra?
   - ¿El desarrollo **cumple** la promesa?
   - ¿La capa visual confirma lo narrado?
   - ¿Evita clickbait y afirmaciones no verificadas?
3. **Mejorar**: reescribir solo el hook manteniendo el resto.
4. **Aprender**: cada hook publicado se etiqueta con su patrón; Resultados compara patrones con datos de la marca (con tamaño de muestra).

---

## 4. Guiones conversacionales y comprensión

### Principios (con fuente)

- **"Si no lo entiende un niño de 11 años, simplifícalo."** [A] — coherente con la investigación de legibilidad y fluidez [I].
- **Lenguaje oral, no escrito**: "el primer paso es" en lugar de "vamos a proceder con". [A]
- **Orden cronológico / paso a paso** como estructura por defecto para explicar. [A]
- **Léelo en voz alta; si cuesta vocalizar, reescribe.** [A]
- **Si una frase se puede quitar y se entiende igual, sobra.** [A]
- **Añade datos o curiosidades para que no quede plano.** [A] — *con la condición de que sean verificables* (regla de la app).
- **Una idea principal por video** cuando el objetivo es claridad. [I — carga cognitiva]
- **Analogías con objetos cotidianos** (la esponja, el huevo, el café): lo concreto se recuerda mejor que lo abstracto. [I — efecto de concreción]
- **Términos técnicos**: si son necesarios, se nombran **una vez** y se explican con una comparación inmediatamente. [O]
- **Frases cortas** (≈8–15 palabras), sujeto + verbo + objeto, voz activa. [O]

### Niveles de conocimiento de la audiencia (configurables por marca y por idea)

| Nivel | Descripción | Reglas para la IA |
|---|---|---|
| **0 · Nuevo** | Nunca ha oído del tema | Cero tecnicismos; analogía obligatoria; una sola idea |
| **1 · Familiar** | Conoce el problema, no la solución | Tecnicismos mínimos explicados; ejemplo cotidiano |
| **2 · Interesado** | Ha investigado, compara opciones | Puede usar términos del sector explicados brevemente; datos concretos |
| **3 · Experto** | Profesional o aficionado avanzado | Vocabulario técnico permitido; profundidad; evitar obviedades |

**Precisión antes que simplicidad**: simplificar nunca debe cambiar el hecho. Cuando una simplificación pierde un matiz importante, el guion lo marca con `⚠ verificar`.

---

## 5. Contenido efectivo e interacciones

### 5.1 Qué favorece cada acción

| Acción | Motivo principal del espectador | Qué la favorece |
|---|---|---|
| **Ver completo** | La promesa sigue abierta y cada momento aporta | Brecha específica, ritmo, picos crecientes, duración ajustada |
| **Re-reproducir** | Algo fue rápido, sorprendente o en loop | Información densa visual, revelación, final que enlaza con el inicio [O] |
| **Me gusta** | Aprobación / disfrute | Calidad, identificación, emoción |
| **Comentar** | Tiene algo que aportar u opinar | Pregunta que se responde desde su experiencia, dilema, petición de segunda parte [A*] |
| **Compartir / enviar** | "Esto le sirve / le hará gracia a X" | Utilidad para un tercero, identificación grupal, humor; señal clave para alcance a no seguidores [P] |
| **Guardar** | "Lo necesitaré después" | Paso a paso, listas, referencias; el video útil puede viralizar por guardados aunque su retención sea media [A] |
| **Visitar perfil / seguir** | "Quiero más de esto" | Serie o formato reconocible, promesa de continuidad, identidad clara [O] |
| **Consulta / compra** | Problema urgente + confianza + facilidad | Profesionalidad, prueba, CTA concreto y fácil, oferta relevante [A] |

### 5.2 Señales declaradas por plataformas [P]

- **Instagram (Adam Mosseri, ene-2025):** las tres señales principales para Reels son **tiempo de visualización, Me gusta por alcance y envíos por alcance**; considera tanto el tiempo absoluto como el relativo. Los envíos se asocian especialmente con alcance a no seguidores.
- **TikTok:** el sistema de recomendación pondera interacciones del usuario (incluido tiempo de visualización y si termina el video), información del video (texto, subtítulos, sonidos) y ajustes de dispositivo/cuenta; **el número de seguidores no es un factor directo**. La distribución puede reactivarse semanas o meses después (observado también por la agencia [A]: curva de hasta 6 meses).
- **YouTube Shorts:** YouTube Studio muestra **"Visto vs. Deslizado"** (proporción que se queda en vez de deslizar) y diferencia vistas de **vistas comprometidas**; desde marzo de 2025 cambió el conteo de vistas de Shorts.
- **Hora de publicación:** la agencia sostiene que importa poco ("TikTok no entiende de horas, entiende de interés") [A]; en otro guion recomienda publicar desde mediodía para aprovechar horas de actividad. Conclusión de la app: **el contenido domina; la hora es una variable menor a probar** [H].

### 5.3 Vistas vs. objetivos de marca

Un video con muchas vistas puede no cumplir objetivos (dentista bailando). Un video con pocas vistas puede convertir si llega a la persona correcta, pero **un solo video de 10k raramente vende** [A]. La app evalúa cada pieza contra **su** objetivo:

| Objetivo | Métricas primarias | Métricas de control |
|---|---|---|
| Alcance | Vistas, alcance, % no seguidores, envíos/alcance | Retención media (evitar alcance vacío) |
| Retención | % visto medio, finalización, retención a 3 s | Duración (comparar duraciones similares) |
| Interacción | Comentarios/alcance, calidad de comentarios | Me gusta/alcance |
| Confianza | Guardados/alcance, visitas al perfil | Comentarios con preguntas |
| Comunidad | Seguidores nuevos/1k vistas, comentarios recurrentes | Envíos |
| Conversión | Consultas, clics, ventas por 1k vistas | Coste de producción |

### 5.4 Métricas calculadas (y cómo no engañarse)

- Todas las tasas se calculan **por alcance** (o por vistas si no hay alcance) y por **1 000 vistas** para conversiones.
- **% visto medio = tiempo medio / duración**. No comparar videos de duraciones muy distintas sin normalizar.
- Usar **medianas** y mostrar **n**; con n < 5 la app advierte "muestra insuficiente".
- Registrar la **fecha de medición** (días desde publicación): un video de 2 días no es comparable con uno de 60 [A].
- **Correlación ≠ causalidad**: si los videos con hook "pregunta" rinden mejor, puede deberse al tema, la plataforma o el momento. La app presenta patrones como **hipótesis a probar**, con la recomendación de un test (variar una sola variable).

---

## 6. Calls to action

### Principios

1. **Un solo CTA principal** por video. [O]
2. **Conectado con lo visto**: el CTA es la continuación lógica del contenido. "¿Cuál sería vuestra taza ideal?" tras enseñar a hacer una taza. [A]
3. **Específico y fácil**: palabra clave a comentar ("Comenta COBRE y te mando el enlace" [A]) supera a "contáctanos".
4. **Proporcional a la etapa del embudo**: no pedir compra en un video de descubrimiento puro.
5. **Recompensa por haber llegado**: "Si te has quedado hasta aquí, deberías seguirnos" [A] reconoce al espectador comprometido.
6. **Sin interrumpir la promesa**: el CTA va tras la resolución, o se insinúa sin cortar el ritmo.

### Tipología

| Objetivo | Mecanismo | Patrones |
|---|---|---|
| **Comentarios** | Pregunta abierta desde la experiencia del espectador / dilema / petición de parte 2 | "¿Cuál ha sido la última duda de tu audiencia que has resuelto?" (patrón [A]) · "¿Esto o esto? Te leo" |
| **Guardados** | Utilidad futura | "Guárdalo para la próxima vez que…" [A] |
| **Compartidos** | Utilidad/identificación para un tercero | "Envíaselo a quien siempre…" |
| **Seguidores** | Continuidad / serie | "Síguenos para la parte 2" · "Si te ha gustado, síguenos" [A] |
| **Mensajes directos** | Palabra clave + recompensa | "Escríbeme X por DM y te paso…" |
| **Visitas al sitio** | Recurso concreto | "El enlace está en el perfil" [A] |
| **Solicitud de información** | Diagnóstico / análisis | "Si quieres que analicemos tu caso, déjanos un comentario" [A] |
| **Ventas** | Oferta clara + disponibilidad | "Enviamos a toda España" [A] |

---

## 7. Edición y consistencia audiovisual

| Recomendación | Nivel | Nota |
|---|---|---|
| Subtítulos incrustados legibles | [I][P] | Accesibilidad (WCAG: subtítulos para contenido con audio) y visualización sin sonido |
| Subtítulos **funcionales**, no "raros"; cortes simples; música baja | [A] | La agencia prioriza claridad sobre efectos |
| Contraste suficiente texto/fondo (≥4.5:1) | [I] | WCAG 2.x |
| Zonas seguras: evitar texto en los ~15 % inferior y superior y franja derecha (UI de la app) | [P][O] | Varía por plataforma |
| Encuadre vertical 9:16, sujeto en tercio superior, ojos ~1/3 | [O] | |
| Cambios de plano frecuentes cuando el contenido lo permite | [A][O] | "Más cambios de plano" fue parte de la mejora del caso clínica [A] |
| B-roll que **muestra** lo que se dice | [I — principio de coherencia de Mayer] | Evitar B-roll decorativo que distrae |
| Transiciones mínimas | [A] | "No pongas transiciones"; usar corte |
| Efectos sonoros en revelaciones y cambios | [O] | Con moderación |
| Calidad "ágil": móvil + luz + micrófono > producción excesiva | [A] | Video perfecto que nunca se publica = 0 |
| Cámara = profesional; móvil = cercano | [A] | Elegir según el objetivo |
| Identidad: tipografía, color, estilo de subtítulo, intro/outro constantes | [O] | Reconocimiento de marca |
| Velocidad ideal de cortes (p. ej. "cada 2–3 s") | [H] | No existe evidencia universal; depende del formato |

---

# PARTE 2 · INGENIERÍA INVERSA DEL MATERIAL DE REFERENCIA

**Material analizado:** un documento con 34 transcripciones de videos de una agencia de contenido para empresas (con algunas repeticiones: los videos 1 y 33 son prácticamente el mismo guion; 7 y 8 comparten introducción). El usuario mencionó "varios archivos"; **solo se recibió uno**. Si hay más, deben analizarse y actualizar esta sección.

**Limitaciones:** son transcripciones de voz sin imágenes, métricas verificables ni curvas de retención; muchas referencias visuales ("pasaran de esto a esto", "la tabla de retención") no son analizables. Las cifras de resultados que menciona la agencia son autodeclaradas y no se usan como evidencia.

## 2.1 Patrones repetidos

1. **Apertura en tres tiempos**: hook → presentación de autoridad ("Soy X y me dedico a…") → promesa ("Te explico / Te lo enseño"). Presente en ~70 % de los guiones. [A*]
2. **Diálogo pregunta-respuesta** con un "cliente" ("— Victoria, ¿cómo…? — Te lo enseño"). La pregunta inicial actúa como hook y como encuadre del problema. [A*]
3. **Comparación de dos casos** (video que no funcionó vs. referencia que sí) → diagnóstico de estructura → propuesta concreta. Formato "auditoría". [A*]
4. **Listas numeradas** (3 hooks, 3 ideas, 5 cosas) con estructura interna repetida: *nombre del patrón → ejemplo → cuándo usarlo*. [A*]
5. **Prueba con números concretos** ("de 3 % a 15 % de finalización"), como recompensa de información en el nudo. [A*]
6. **Cierre con pregunta al espectador o CTA de servicio**. [A*]
7. **Series reconocibles**: "Tres ganchos… parte 2", "Día 1 haciendo videos para…", "Cinco cosas que no recomendaría…". [A]

## 2.2 Construcción de hooks

- Tipos **explícitos**: 15 patrones listados en §3 (marcados [A]).
- **Inferido**: casi todos los hooks contienen al menos uno de: **número**, **segunda persona + situación**, **promesa de resultado**, **contraste**. [A*]
- **Inferido**: el hook usa **la palabra clave que usa el público** (retenedores vs. alineadores). [A — caso explícito] [A* — generalización]
- **Inferido**: muchos hooks son **promesas en forma de lista** ("Tres ganchos que son virales en cualquier nicho") que funcionan como bucle abierto contable. [A*]

## 2.3 Estructuras narrativas detectadas

| Estructura | Secuencia | Guiones donde aparece | Objetivo típico |
|---|---|---|---|
| **Lista de patrones** | Promesa numérica → autoridad → ítem (nombre, ejemplo, uso) ×N → CTA | 3, 7, 8, 10, 11, 23 | Autoridad, guardados |
| **Auditoría comparativa** | Pregunta del cliente → caso malo → referencia buena → diagnóstico → propuesta → CTA servicio | 17, 24, 29, 32, 34 | Conversión de servicio, autoridad |
| **Caso antes/después con datos** | Resultado → problema inicial → cambios → métricas → lección | 24, 26, 30 | Prueba, confianza |
| **Errores / cosas que no haría** | Experiencia (número) → error ×N con alternativa → extra → CTA | 2, 14, 18 | Autoridad, comentarios |
| **Desmontar creencia** | Creencia común → evidencia → nueva regla | 13, 20, 31 | Alcance, comentarios |
| **Paso a paso** | Promesa → paso 1..N → advertencia → CTA guardar | 21, 19 | Guardados |
| **Explicación con números** | Afirmación → ejemplo cuantitativo progresivo → conclusión | 5, 6 | Autoridad |
| **Meta-guion (tres actos + picos)** | Historia personal → concepto → ejemplo → aplicación → CTA seguir | 1, 15, 33 | Seguidores |
| **Recopilación de casos** | "N videos virales este mes" → caso → por qué funcionó ×N | 9 | Prueba social |
| **Reflexión corta** | Frase contraintuitiva → explicación → pregunta | 12 | Comentarios |

## 2.4 Secuencia de presentación de información

- **Contexto → problema → resolución ordenada → conclusión/CTA** (explícito en "tres actos"). [A]
- En auditorías: **evidencia antes que conclusión** — muestran ambos videos antes de explicar. [A*]
- Datos presentados **en escalada** (10k → 400k → 1M) para crear picos crecientes. [A*]

## 2.5 Técnicas de curiosidad

- Bucles abiertos encadenados ("Pero esto no sirve si no…", "Pero ¿cómo se aplica?", "¿Y sabes lo mejor?"). [A*]
- Falsa recomendación desmentida ("súbelo un lunes a las 7… ¡Mentira!") como **violación de expectativa**. [A*]
- Preguntas retóricas que el espectador se hace y se responden en la frase siguiente. [A]

## 2.6 Ejemplos y analogías

- Siempre **objetos cotidianos y sectores concretos** (huevos, café, piercing, retenedores). [A*]
- "Explicado para niños de 5 años": aritmética simple y repetida. [A*]
- Ejemplos de **nichos distintos** para mostrar que el patrón es transferible ("referencias que no solo sean de lo nuestro"). [A]

## 2.7 Simplificación

- Regla del niño de 11 años; lenguaje oral; orden cronológico. [A]
- Definir siglas en el momento: "CPL (coste por cliente potencial)". [A*]

## 2.8 Transiciones

- "Número 1 / Número 2", "Primer paso / Segundo paso" como señalización. [A*]
- Preguntas puente: "Entonces, ¿qué deberías hacer?", "Pero ¿y el 20 %?". [A*]
- "Vamos a verlo / Te lo enseño" como transición a demostración. [A*]

## 2.9 Comentarios e interacción

- Pregunta final abierta y fácil de contestar ("¿habías visto alguno de estos?"). [A*]
- Invitación a pedir contenido ("Si quieres que hable de SEO en TikTok, coméntamelo") → genera ideas para siguientes videos. [A*]
- Palabra clave comentada para recibir recurso ("Comenta RESUELTA"). [A]
- Dejar algo sin resolver para pedir parte 2 (caso limpieza coche). [A]

## 2.10 Características de los CTA

- Breves (una frase), al final, ligados al tema. [A*]
- Alternan entre **comentar**, **seguir**, **guardar**, **enlace del perfil** y **contacto**, según el tipo de video: listas → pregunta; auditorías → contacto; tutoriales → guardar. [A*]
- Algunos cierres usan **identidad + prueba social** ("Somos X y conseguimos Y") como CTA implícito. [A*]

## 2.11 Principios de edición (explícitos o inferibles)

- Explícitos: cortes simples, subtítulos funcionales, música baja, sin transiciones; más cambios de plano; planos "impecables" en nichos visuales; equipo básico (móvil, foco, micrófono). [A]
- Inferibles: superposición de plano (pregunta → respuesta experta en otro plano); mostrar en pantalla lo que se analiza (estadísticas, tablas). [A*]
- **Insuficiente información** sobre: tipografías, ritmo exacto, uso de color, música concreta, zonas seguras.

## 2.12 Relación objetivo ↔ estructura

| Objetivo | Estructura que usan | Evidencia |
|---|---|---|
| Vender servicio de la agencia | Auditoría comparativa con CTA de contacto | [A*] |
| Autoridad / guardados | Listas de patrones, paso a paso | [A*] + CTA "guárdate este video" [A] |
| Comentarios | Reflexión corta / lista + pregunta final | [A*] |
| Seguidores | Meta-guion + "si has llegado hasta aquí, síguenos" | [A] |

## 2.13 Lo que **no** se debe generalizar

- Las cifras de resultados de la agencia (autodeclaradas).
- "Cuanto más genérico, mejor" — válido para alcance; puede atraer audiencia no cualificada para negocios de nicho. [H]
- "La hora no importa" — contradicho parcialmente por la misma agencia (video 31). [H]
- "El mismo video para todas las redes" — razonable por eficiencia; conviene validar con datos de cada marca. [H]
- La apertura "Soy X y me dedico a…" funciona para marca personal con autoridad; para marcas sin rostro puede no aplicar. [H]

---

# PARTE 3 · METODOLOGÍA INTEGRADA (lo que la app aplica)

## El método en 10 pasos

1. **Propósito** — toda idea declara objetivo, etapa del embudo, tipo (venta/familiaridad/memorable) y pilar. *(Principio 1: la estrategia precede al contenido.)*
2. **Problema del espectador** — escrito con las palabras del público + palabra clave.
3. **Validación de interés** — referencias externas con resultados (búsqueda en plataforma) registradas en la idea. *(Opcional, recomendado.)*
4. **Promesa** — una frase: qué obtiene el espectador al terminar.
5. **Estructura** — elegida del catálogo según objetivo (la app sugiere, el usuario decide).
6. **Hook de 4 capas** — narrado, visual, textual, auditivo; varios patrones alternativos.
7. **Desarrollo** — tres actos, cada frase con función, picos crecientes, pregunta→respuesta.
8. **Cierre + CTA único** — resuelve la promesa; CTA del tipo adecuado al objetivo.
9. **Revisión** — evaluador (local + IA) con observaciones y mejoras, sin predicciones.
10. **Aprendizaje** — resultados etiquetados por estructura, patrón de hook, pilar, duración y tipo → hipótesis → próximas rondas (80 % seguro / 20 % experimento).

## Filtro de publicación (adaptado de la agencia [A])

Antes de aprobar un guion, la app pide confirmar:
- ¿Se entiende quién eres y qué haces aunque sea la primera vez que te ven?
- ¿Le interesa a quien te conoce y a quien no?
- ¿Es mejor que lo que publica la competencia sobre lo mismo?
- ¿Es entretenido, profesional y deja claro a qué te dedicas?
- ¿Toda afirmación técnica está verificada o marcada?

## Fuentes consultadas

- Instagram — declaraciones de Adam Mosseri sobre señales de Reels (ene-2025), recogidas por [Social Media Today](https://www.socialmediatoday.com/news/instagram-shares-algorithm-insights-2025/738034/) y [Dataslayer](https://dataslayer.ai/blog/instagram-algorithm-2025-complete-guide-for-marketers).
- TikTok — descripción del sistema de recomendación (interacciones, información del video, ajustes), resumida en [Boston.com](https://www.boston.com/news/commentary/2021/12/06/how-tiktok-reads-your-mind) y [Business Insider](https://businessinsider.nl/the-secret-factors-that-influence-your-tiktok-algorithm-and-for-you-page-were-just-revealed-the-app-is-tracking-how-long-you-watch-or-hover-over-videos/); estudio empírico [arXiv 2201.12271](https://arxiv.org/pdf/2201.12271).
- YouTube Shorts — métricas "Visto vs. deslizado" y vistas comprometidas: [vidIQ](https://vidiq.com/blog/post/youtube-shorts-algorithm/), [ContentStudio](https://contentstudio.io/blog/youtube-shorts-analytics-guide).
- Loewenstein, G. (1994). *The psychology of curiosity: A review and reinterpretation.* Psychological Bulletin.
- Mayer, R. E. *Multimedia Learning* (principios de coherencia, señalización, redundancia).
- Sweller, J. Teoría de la carga cognitiva.
- Green, M. & Brock, T. (2000). Transporte narrativo.
- W3C — WCAG 2.2 (subtítulos, contraste).
- Material de referencia: `Guiones_de_resuelta_estudio.docx` (34 transcripciones).
