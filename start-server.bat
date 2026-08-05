@echo off
title Conca Frontend Server (React)
echo ==============================================
echo  CONCA PDF Manager - React Frontend
echo  Sistema Inteligente de Gestion de PDFs
echo ==============================================
echo.

cd /d "%~dp0"
cd src\react-frontend

REM Verificar si Node.js está instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Node.js instalado en este sistema.
    echo Por favor, descarga e instala Node.js desde: https://nodejs.org/
    pause
    exit /b
)

REM Instalar dependencias automaticamente si no existen
if not exist "node_modules\" (
    echo [*] Detectada primera ejecucion o dependencias faltantes.
    echo [+] Instalando librerias de React automaticamente. Por favor espera...
    npm install
)

echo.
echo [OK] Todo listo. Iniciando el servidor Vite...
echo [*] Podras acceder desde otros dispositivos en tu red local (LAN).
echo.

REM Iniciar Vite exponiendo el servidor a la red local
npm run dev -- --host
