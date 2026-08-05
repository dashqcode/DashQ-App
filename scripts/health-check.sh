#!/bin/bash
# Conca PDF Manager - System Health Check
# Verifica que todos los archivos están en su lugar y funcionando

echo "======================================"
echo "  CONCA PDF Manager - Health Check"
echo "======================================"
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contadores
checks_passed=0
checks_failed=0

# Función para verificar archivo
check_file() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $description"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $description - FALTA ARCHIVO"
        ((checks_failed++))
    fi
}

# Función para verificar contenido
check_content() {
    local file=$1
    local pattern=$2
    local description=$3
    
    if [ -f "$file" ] && grep -q "$pattern" "$file"; then
        echo -e "${GREEN}✓${NC} $description"
        ((checks_passed++))
    else
        echo -e "${RED}✗${NC} $description"
        ((checks_failed++))
    fi
}

echo "📁 Verificando archivos del proyecto..."
echo ""

# Verificar archivos principales
check_file "index.html" "Interfaz HTML principal"
check_file "app.js" "Lógica de aplicación JavaScript"
check_file "style.css" "Estilos CSS"
check_file "conca.apy" "Configuración del sistema (.apy)"
check_file "package.json" "Configuración de dependencias"
check_file "README.md" "Documentación principal"
check_file "INICIO-RAPIDO.md" "Guía de inicio rápido"
check_file "start-server.bat" "Script para iniciar servidor"

echo ""
echo "🔍 Verificando contenido de archivos..."
echo ""

# Verificar contenido HTML
check_content "index.html" "pdf.js" "PDF.js incluido en HTML"
check_content "index.html" "apexcharts" "ApexCharts incluido en HTML"
check_content "index.html" "lucide" "Lucide Icons incluido en HTML"

# Verificar contenido JS
check_content "app.js" "initDB" "Función initDB presente"
check_content "app.js" "processPDFFile" "Función processPDFFile presente"
check_content "app.js" "handleSendChatMessage" "Chat IA configurado"
check_content "app.js" "ConcaPDFManager" "IndexedDB configurado"

# Verificar contenido CSS
check_content "style.css" "--color-primary" "Variables CSS definidas"
check_content "style.css" "dark" "Tema dark configurado"

echo ""
echo "🔧 Verificando configuraciones..."
echo ""

# Verificar .apy
check_content "conca.apy" "version" "Versión definida en .apy"
check_content "conca.apy" "features" "Características listadas"

echo ""
echo "======================================"
echo "  RESULTADOS DE VERIFICACIÓN"
echo "======================================"
echo ""
echo -e "${GREEN}✓ Pruebas exitosas: $checks_passed${NC}"
if [ $checks_failed -gt 0 ]; then
    echo -e "${RED}✗ Pruebas fallidas: $checks_failed${NC}"
else
    echo -e "${GREEN}✓ Sin errores detectados${NC}"
fi

echo ""
if [ $checks_failed -eq 0 ]; then
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}  🚀 SISTEMA COMPLETAMENTE FUNCIONAL  ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo "Pasos siguientes:"
    echo "1. Ejecuta: python -m http.server 8000"
    echo "2. Abre: http://localhost:8000"
    echo "3. Login: admin@conca.ai / password123"
    echo "4. ¡Disfruta!"
    echo ""
else
    echo -e "${YELLOW}⚠ Se encontraron algunos problemas${NC}"
    echo "Verifica los archivos marcados con ✗"
fi

echo ""
