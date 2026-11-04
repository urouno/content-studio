# Pruebas

## Automáticas

```bash
npm test
```

Ejecuta 23 pruebas con `node --test` (Node 20 o superior):

- **`tests/unit.test.js`**: similitud de ideas, conteo de palabras y duración, normalización del guion, evaluador local (hook largo, promesa, CTA, palabras prohibidas, picos decrecientes), métricas derivadas, aislamiento multimarca del prompt, lectura de JSON de la IA y coincidencia del esquema entre frontend y Apps Script.
- **`tests/apps-script.test.js`**: ejecuta el `Code.gs` real sobre un **simulador en memoria** de SpreadsheetApp, PropertiesService, LockService y UrlFetchApp. Cubre autenticación, creación de hojas, alta, actualización y descarga con tipos, **conflictos de concurrencia**, validaciones, rol de solo lectura, eliminación lógica, paginación entre tablas, proxy de Gemini (clave en cabecera, modelos permitidos, límite diario, filtrado de herramientas) y celdas demasiado grandes.

> El simulador valida la lógica, **no sustituye** una prueba contra Google real. Sigue los casos M-S1…M-S4 tras desplegar.

## Casos de prueba manuales

Marca cada caso como ✅ o ❌ al probar. Preparación: `npm start`, abrir <http://localhost:4747> y pulsar **Cargar demostración**.

### Flujo completo
| ID | Pasos | Resultado esperado |
|---|---|---|
| F1 | Ideas → Nueva idea. Escribe "Si te pasa esto tu café está quemado" | Aparece el aviso de **idea parecida** a una existente |
| F2 | Crea la idea → Aprobar | El estado pasa a "Idea aprobada" y el contador de Ideas baja |
| F3 | Abre la idea → Guion → Escribir manualmente | Se crea la v1 y el estado pasa a "Guion en desarrollo" |
| F4 | Escribe un hook de 20 palabras | La revisión automática muestra "difícil de decir en ~3 s" |
| F5 | Escribe en Promesa y espera 1 s | El indicador superior muestra "Guardado"; al recargar, el texto sigue ahí |
| F6 | Duplicar → cambia una sección → Comparar | La sección cambiada aparece resaltada |
| F7 | Aprobar versión → Aprobar y bloquear | Versión bloqueada; aparecen las fichas de Producción y Edición; estado "Pendiente de grabación" |
| F8 | Producción → marca tomas y checklist | El progreso se actualiza y se guarda |
| F9 | Marcar como grabado → Edición | Estado "En edición"; la guía muestra los colores y tipografías de la marca |
| F10 | Marcar video listo → Publicación → Programar | Estado "Calendarizado"; aparece en el Calendario |
| F11 | Calendario → arrastra el evento a otro día | Cambia la fecha; "Deshacer" la devuelve |
| F12 | Publicación → Marcar publicado | Estado "Publicado" |
| F13 | Resultados → Registrar medición | Estado "Analizado"; se ven tasas calculadas; aparece en Resultados con su patrón |
| F14 | Retrocede el estado con el botón "←" | Cambia el estado y **no** se pierden el guion ni las fichas |

### Multimarca
| ID | Pasos | Resultado esperado |
|---|---|---|
| B1 | Cambia a la marca "Clínica Arcada" en el selector | Ideas, tablero, calendario y resultados muestran solo esa marca |
| B2 | Genera un guion para una idea de Arcada (con IA configurada) | El prompt solo contiene datos de Arcada (prueba automática "aislamiento multimarca") |
| B3 | Marcas → Duplicar | Se copian la identidad, la configuración, las plataformas, los pilares, los hooks y los CTA, pero no los contenidos |
| B4 | Detectar duplicados con "Todas las marcas" | Nunca empareja ideas de marcas distintas |

### Offline
| ID | Pasos | Resultado esperado |
|---|---|---|
| O1 | Abre la app, desactiva la red (DevTools → Network → Offline) y recarga | La app carga; aparece el aviso de "Sin conexión" |
| O2 | Sin conexión: crea una idea, edita un guion y mueve el calendario | Todo funciona; el indicador muestra cambios pendientes |
| O3 | Sin conexión: pulsa "Generar con IA" | Mensaje claro: la IA necesita Internet |
| O4 | Reactiva la red | Se sincroniza automáticamente (si está configurado) |
| O5 | Abre `index.html` con doble clic (`file://`) | La app no funciona bien y el README explica por qué; con servidor local sí funciona |

### Sincronización con Google real (tras desplegar)
| ID | Pasos | Resultado esperado |
|---|---|---|
| M-S1 | Ajustes → Probar conexión | "Conectado como …" y el nombre de la hoja |
| M-S2 | Sincronizar ahora | Las filas aparecen en las hojas con `syncedAt` |
| M-S3 | Edita el mismo contenido en dos navegadores sin sincronizar; sincroniza ambos | El segundo muestra un **conflicto**; al elegir una versión se resuelve |
| M-S4 | En un dispositivo nuevo: URL + token → Descarga completa | Aparecen todos los datos |

### Errores e integridad
| ID | Pasos | Resultado esperado |
|---|---|---|
| E1 | Elimina un contenido | Aparece "Deshacer" y el contenido queda en Ajustes → Papelera; se puede restaurar |
| E2 | Pestaña Historial → Restaurar una entrada | El registro vuelve al estado anterior y la restauración también queda en el historial |
| E3 | Ajustes → Exportar JSON → Borrar datos locales (escribe BORRAR) → Importar | Los datos vuelven |
| E4 | IA con una clave inválida (modo directo) | "La API Key no es válida" |
| E5 | Ajustes → URL de Apps Script que no termina en /exec | Se valida y se rechaza |
| E6 | Escribe `<img src=x onerror=alert(1)>` como título de una idea | Se muestra como texto, sin ejecutarse |

### Accesibilidad y diseño
| ID | Pasos | Resultado esperado |
|---|---|---|
| A1 | Navega con Tab por la barra superior y el tablero; pulsa Enter en una tarjeta | El foco es visible y la tarjeta se abre |
| A2 | Cambia el tema (Ajustes → Apariencia) | Claro y oscuro se ven correctamente |
| A3 | Ventana de unos 800 px de ancho | La navegación se compacta y los formularios pasan a una columna |

## Pruebas realizadas en el desarrollo

- Pruebas automáticas: 23 de 23 superadas.
- En el navegador (Chromium, `localhost`): carga de la demostración, panel, ideas, tablero, editor de guion con autoguardado y revisión automática, aprobación con creación de fichas, producción, marcar grabado, edición con guía de marca, calendario (mes y semana), resultados con patrones, ficha de marca (visual y redes), cadena de IA con respuesta de Gemini **simulada** (sin clave real) y carga desde la caché del Service Worker con el servidor detenido.
- Flujo completo idea → analizado con todas las transiciones automáticas, prueba XSS (E6), guardado de copies al cambiar de pestaña y diseño a 375 px en modo claro.
- Fallos encontrados y corregidos durante las pruebas:
  - guardado de una versión ya bloqueada al salir del editor;
  - guardado de copies sin identificador al salir de la pestaña;
  - recarga innecesaria al instalar el Service Worker por primera vez;
  - precarga offline que tomaba archivos antiguos de la caché HTTP;
  - desbordamiento horizontal en móvil;
  - ciclo medio negativo en la demostración;
  - paginación de la descarga que podía saltarse registros entre tablas;
  - bucle de reintentos con cambios rechazados.
- **No probado en este entorno**: despliegue real en Google Apps Script y llamadas reales a Gemini, porque requieren tu cuenta y tu clave. Ejecuta M-S1…M-S4 y "Probar IA" después de configurarlos.
