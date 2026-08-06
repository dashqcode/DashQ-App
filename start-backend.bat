@echo off
REM Conca PDF Manager - Backend Server Launcher with Auto-install

echo.
echo ========================================
echo  CONCA PDF Manager - Backend Server
echo  Con gestor de archivos en uploads/
echo ========================================
echo.

cd /d "%~dp0"

REM Crear carpeta uploads si no existe
if not exist "data\uploads" (
    mkdir data\uploads
    echo [+] Carpeta data\uploads\ creada
)

REM Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python no encontrado
    echo.
    echo Por favor instala Python desde: https://www.python.org/downloads/
    echo Asegúrate de marcar "Add Python to PATH"
    pause
    exit /b 1
)

echo [✓] Python detectado
echo.

REM Verificar si Flask está instalado, si no instalarlo
python -c "import flask, OpenSSL" >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Instalando Flask y certificados SSL pyOpenSSL...
    python -m pip install flask werkzeug pyOpenSSL --quiet
    echo [✓] Paquetes instalados (ignora los warnings amarillos si aparecen)
) else (
    echo [✓] Flask ya está instalado
)

echo.
echo [*] Iniciando servidor CONCA en http://localhost:5000
echo.
echo Acciones disponibles:
echo   - POST   http://localhost:5000/api/upload     (Subir PDF)
echo   - GET    http://localhost:5000/api/files      (Listar archivos)
echo   - GET    http://localhost:5000/uploads/...    (Descargar PDF)
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

REM Ejecutar servidor
python src\backend\server.py

pause
