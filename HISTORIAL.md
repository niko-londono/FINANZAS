# Historial de la Aplicación "Finanzas"

Este archivo mantiene un registro del contexto actual de la aplicación, su estado, arquitectura y un registro cronológico de todos los cambios y actualizaciones realizadas. Sirve como punto de referencia para mantener el contexto en nuevas sesiones.

## Contexto Actual de la App

**Finanzas** es una aplicación web diseñada para la gestión de finanzas personales. Proporciona herramientas para rastrear ingresos, gastos, presupuestos y metas financieras. 

### Arquitectura y Tecnologías
- **Core**: HTML, CSS Vanilla y JavaScript Vanilla.
- **Estructura del Proyecto**:
  - `index.html`: Punto de entrada de la aplicación.
  - `src/`: Carpeta de código fuente principal.
    - `assets/`: Recursos (imágenes, iconos, etc.).
    - `css/`: Hojas de estilo de la aplicación.
    - `js/`: Lógica de la aplicación en JavaScript.
    - `API.md`: Documentación relacionada con la API.
  - `docs/`: Documentación del proyecto.

---

## Historial de Cambios (Changelog)

### [2026-10-10]
- **Inicialización del Historial**: Se crea el archivo `HISTORIAL.md` para documentar el estado inicial y contexto de la aplicación, permitiendo una fácil reanudación del trabajo en futuras sesiones.
- **Refactorización a modelo Mensual**: Se modificó el núcleo de la aplicación (`app.js`, `index.html`, `style.css`) para que todos los datos (presupuestos, tarjetas, notas) estén separados de forma independiente por meses (YYYY-MM).
  - Se agregó un selector global de mes.
  - Se habilitó la clonación automática del mes anterior para nuevos meses.
  - Se implementó la vista gráfica anual en la pestaña "Distribución" con barras apiladas.
  - Se creó el script de backend `gas_backend.gs` preparado para almacenar objetos por mes en Google Sheets.
  - Se aseguró la retrocompatibilidad y migración automática de los datos guardados en el modelo global antiguo al mes actual.
- **FIX: Conexión a la nube (GAS) rota tras refactorización mensual**:
  - **Causa raíz**: El código de migración (`appExtra.summaryTables.find(...)`) se ejecutaba a nivel de módulo cuando `appExtra` aún era `{}` (vacío), causando un crash `TypeError: Cannot read properties of undefined (reading 'find')` que mataba **todo** el JavaScript antes de llegar a `init()` o `loadFromGAS()`. El ícono de nube quedaba gris porque nunca se ejecutaba `updateDbStatus()`.
  - **Fix 1**: Se movió el código de migración dentro de `ensureAppExtraDefaults()` donde `appExtra` ya tiene sus keys pobladas.
  - **Fix 2**: Se eliminó la llamada `saveByMonth()` a nivel de módulo que guardaba `{categories:[], extra:{}}` vacíos a la nube antes de cargar datos reales.
  - **Fix 3**: Se mejoró `loadFromGAS()` para hacer merge inteligente (con resolución por timestamp) en vez de reemplazar todo `byMonth` con datos de la nube.

### Arquitectura de Datos
- **localStorage key**: `budget_by_month` → `{ "YYYY-MM": { categories: [...], extra: {...} } }`
- **Backend GAS**: El script actual del usuario es simple (celda A1 de Google Sheets). Lee/escribe JSON raw.
  - URL desplegada: `https://script.google.com/macros/s/AKfycbz.../exec`
  - GET → devuelve JSON de celda A1
  - POST → guarda `e.postData.contents` en celda A1
- **Formato en la nube (actual/viejo)**: `{ categories: [...], extra: {...} }`
- **Formato nuevo (cuando se actualice GAS)**: `{ byMonth: {...}, categories: [...], extra: {...} }`
- **Retrocompatibilidad**: `loadFromGAS()` detecta formato viejo y lo convierte a `byMonth[currentMonth]`.

