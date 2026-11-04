#!/bin/bash
# Doble clic para abrir Content Studio en tu navegador (macOS).
# Deja esta ventana abierta mientras usas la app. Ciérrala para apagarla.
cd "$(dirname "$0")"
PORT=4747
URL="http://localhost:$PORT"

# ¿Ya está encendido Content Studio en ese puerto?
if lsof -nP -iTCP:$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  if curl -s -m 2 "$URL/manifest.webmanifest" | grep -q "Content Studio"; then
    echo "Content Studio ya estaba encendido. Abriendo $URL …"
    open "$URL"
    exit 0
  fi
  osascript -e "display dialog \"Otro programa está usando el puerto $PORT. Ciérralo y vuelve a abrir este archivo.\" buttons {\"Entendido\"}" >/dev/null 2>&1
  echo "El puerto $PORT está ocupado por otro programa."
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1 || ! python3 -c "import http.server" >/dev/null 2>&1; then
  osascript -e 'display dialog "Falta Python 3. macOS te ofrecerá instalar las «herramientas de línea de comandos»: acepta, espera a que termine y vuelve a abrir este archivo." buttons {"Entendido"}' >/dev/null 2>&1
  xcode-select --install 2>/dev/null
  exit 1
fi

clear
echo "=============================================="
echo "   CONTENT STUDIO está encendido"
echo "   Dirección: $URL"
echo ""
echo "   • No cierres esta ventana mientras trabajas."
echo "   • Para apagarlo: cierra esta ventana."
echo "=============================================="
( sleep 1.5 && open "$URL" ) &
exec python3 -m http.server $PORT --bind 127.0.0.1 2>/dev/null
