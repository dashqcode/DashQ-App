# 🎯 CONCA - Gestor Inteligente de PDFs

**Sistema completamente funcional para gestionar, analizar e interactuar con archivos PDF usando IA local.**

---

## ✨ Características Principales

### 📄 Gestión de Documentos
- **Carga de PDFs**: Arrastra y suelta o usa el botón de subida
- **Categorización automática**: Facturas, Contratos, Reportes, Manuales
- **Almacenamiento local**: IndexedDB para máxima privacidad (0 datos en la nube)
- **Búsqueda global**: Encuentra documentos por nombre, contenido o etiquetas

### 🤖 Asistente IA Local
- **Chat con RAG semántico**: Haz preguntas sobre tus PDFs
- **Extracción de información**: Importes, fechas, cláusulas clave
- **Análisis de contenido**: Resúmenes, conceptos, estructura
- **Referencia de páginas**: Links interactivos a páginas específicas

### 🔧 Herramientas PDF
- **Compresión**: Reduce tamaño de archivos
- **Encriptación**: Protege PDFs con contraseña AES-256
- **Exportación**: Convierte páginas a imágenes PNG (ZIP)
- **Extracción de Texto**: OCR y copiar contenido

### 📊 Dashboard Inteligente
- Estadísticas de documentos
- Gráficos de tendencias (últimos 7 días)
- Distribución por categorías
- Medidor de almacenamiento local

---

## 🚀 Cómo Usar

### Inicio de Sesión
> El acceso inicial se gestiona desde la sección de configuración del sistema. Si no existe un usuario registrado, crea uno nuevo desde la administración de usuarios y usa esa credencial para entrar.

### Cargar un PDF
1. Haz clic en "Subir PDF" (botón azul en la barra superior)
2. O arrastra un archivo PDF directamente a la ventana
3. El sistema detecta automáticamente la categoría

### Buscar en tus Documentos
- Usa **Ctrl + K** para abrir la búsqueda global
- Filtra por categoría, tamaño o fecha de carga
- Vista en cuadrícula o lista

### Interactuar con un PDF
1. Selecciona un documento en el Explorador
2. Úsalo en el "Visor & Chat IA"
3. Haz preguntas sobre el contenido
4. Usa chips sugeridos o escribe preguntas libres

### Herramientas PDF
Ve a la pestaña "Herramientas PDF" para:
- Extraer texto OCR completo
- Comprimir documento
- Encriptar con contraseña
- Exportar páginas como imágenes

---

## 🏗️ Arquitectura Técnica

### Tecnologías Utilizadas
- **Frontend**: HTML5, CSS3, JavaScript Vanilla
- **PDF Processing**: PDF.js (Mozilla)
- **Gráficos**: ApexCharts
- **Iconos**: Lucide Icons
- **BD Local**: IndexedDB (250 MB)
- **Fuentes**: Plus Jakarta Sans (Google Fonts)

### Flujo de Datos
```
Archivo PDF
    ↓
[PDF.js] → Extrae texto + genera thumbnails
    ↓
[IndexedDB] → Almacena documento + metadata
    ↓
[UI] → Renderiza en Dashboard/Explorador
    ↓
[Chat] → RAG Local busca en contenido extraído
```

---

## 📦 Estructura de Carpetas

```
FILE/
├── index.html          # Interfaz principal
├── app.js             # Lógica de aplicación completa
├── style.css          # Estilos Neon Dark
├── conca.apy          # Configuración del sistema
└── README.md          # Este archivo
```

---

## 🔐 Privacidad & Seguridad

✅ **100% Local** - Todos los PDFs se procesan en tu navegador
✅ **Sin servidores** - No se envían datos a internet
✅ **Encriptación** - Opción de proteger PDFs con contraseña
✅ **Control total** - Puedes limpiar la base de datos cuando quieras

---

## 📋 Funciones Disponibles

| Función | Descripción |
|---------|-------------|
| **Carga múltiple** | Sube varios PDFs a la vez |
| **Thumbnails** | Preview automático de primera página |
| **Búsqueda en texto** | Encuentra palabras clave en contenido |
| **Favoritos** | Marca documentos importantes con ⭐ |
| **Editar metadata** | Cambiar título, categoría, tags |
| **Eliminar documentos** | Borra permanentemente de IndexedDB |
| **Zoom en visor** | Ampliación 50% - 300% |
| **Navegación páginas** | Ir a página específica |
| **Dark Mode Toggle** | Invierte colores del PDF |
| **Sugerencias IA** | Prompts contextuales por categoría |
| **Sesión persistente** | Recuerda login hasta cerrar sesión |

---

## 🎨 Tema Visual

**Paleta Neon Dark:**
- Fondo Principal: `#0f0f0f`
- Acentos Primarios: `#5c53ff` (Púrpura Indigo)
- Acentos Secundarios: `#3b82f6` (Azul), `#10b981` (Verde)
- Texto: `#dddddd` (Gris Claro)

---

## ⚙️ Configuración (conca.apy)

El archivo `conca.apy` contiene:
```json
{
  "name": "Conca PDF Manager",
  "version": "1.0.0",
  "max_storage_mb": 250,
  "db_name": "ConcaPDFManager",
  "theme": "dark-neon",
  "language": "es"
}
```

---

## 🆘 Solución de Problemas

### El PDF no carga
- Asegúrate de que no esté protegido con contraseña de lectura
- Verifica que el navegador soporte JavaScript y IndexedDB
- Intenta con otro navegador (Chrome, Firefox, Edge, Safari)

### La IA no responde
- Selecciona un documento primero
- Espera a que se cargue completamente el PDF
- Hazle una pregunta clara y concisa

### Almacenamiento lleno
- Ve a "Herramientas PDF" → "Restablecer almacenamiento"
- Esto elimina todos los PDFs cargados (se restablecen los mocks)

### Rendimiento lento
- Compress documentos grandes
- Elimina PDFs que ya no necesites
- Limpia el caché del navegador

---

## 🎓 Ejemplos de Consultas IA

### Para Facturas:
- "¿Cuál es el total a pagar?"
- "Dame todos los conceptos facturados"
- "¿Hay impuestos (IVA)?"

### Para Contratos:
- "¿Cuáles son las fechas clave?"
- "¿Quiénes son las partes que firman?"
- "¿Qué cláusulas de rescisión hay?"

### Para Reportes:
- "Hazme un resumen ejecutivo"
- "¿Cuáles son los principales hallazgos?"
- "Extrae los datos y porcentajes"

---

## 📝 Notas Importantes

1. **Primera vez**: El sistema viene pre-cargado con 3 documentos de ejemplo
2. **Sin internet**: Funciona 100% offline una vez cargado
3. **Persistencia**: Los cambios se guardan automáticamente
4. **Borrado**: Los PDFs eliminados se borran permanentemente

---

## 🔄 Actualizaciones Futuras

- [ ] Soporte para OCR en imágenes (Tesseract.js)
- [ ] Multi-idioma (EN, FR, DE, PT)
- [ ] Exportación a Word/Excel
- [ ] Anotaciones y marcadores en PDFs
- [ ] Colaboración en tiempo real (WebSocket)
- [ ] Integración con APIs de IA remota

---

## 👨‍💻 Desarrollador

**Conca Digital** | PDF Manager v1.0.0  
Licencia: MIT  
Año: 2026

---

**¡Disfruta gestionando tus PDFs de forma inteligente y privada! 🚀**
