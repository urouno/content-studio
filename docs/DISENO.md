# Diseño de Content Studio (v2.1 · "Studio Pulse")

Basado en las referencias de Stitch («Multi-brand social hub»). Resumen para mantenerlo coherente:

- **Tema:** oscuro por defecto (fondo `#0b1222`), con variante clara. Se cambia en **Ajustes → Apariencia**.
- **Letra:** Plus Jakarta Sans (Google Fonts). Sin conexión usa la letra del sistema.
- **Colores:** índigo `#6366f1` (acciones), coral `#f43f5e` (urgente), cian `#06b6d4` (fechas), esmeralda `#10b981` (publicado), ámbar `#f59e0b`, violeta `#8b5cf6`.
- **Color por fase** (`js/core/schema.js`): ideas gris, guion índigo, por grabar cian, por editar coral, editado ámbar, calendarizado violeta, publicado esmeralda.
- **Formas:** tarjetas 16 px, botones y campos 12 px, etiquetas y píldoras redondas.
- **Estructura:** barra lateral en escritorio (solo iconos entre 861 y 1100 px); en celular, menú inferior flotante con **Crear** al centro y **Más** para el resto.
- **Selector de marca:** fila de píldoras arriba con la inicial y el color de cada marca, y el número de piezas en curso.

Archivos: `css/tokens.css` (colores y medidas) y `css/pulse.css` (capa visual nueva, va al final y manda sobre las anteriores).
