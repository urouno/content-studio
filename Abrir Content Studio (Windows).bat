@echo off
REM Doble clic para abrir Content Studio (Windows). Requiere Python 3 (python.org).
cd /d "%~dp0"
echo ==============================================
echo    CONTENT STUDIO esta encendido: http://localhost:4747
echo    No cierres esta ventana mientras trabajas.
echo ==============================================
start "" http://localhost:4747
python -m http.server 4747 --bind 127.0.0.1
if errorlevel 1 py -m http.server 4747 --bind 127.0.0.1
pause
