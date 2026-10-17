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

### [2026-10-17]
- **Consolidación en Archivos Maestros y Migración a React 18**:
  - Para facilitar la modificación futura por modelos de IA con bajo consumo de tokens y máxima mantenibilidad, toda la aplicación se concentró en **3 archivos maestros**:
    1. **`MAESTRO.js`**: Motor de datos y lógica financiera. Contiene constantes por defecto (`DEFAULT_CATEGORIES`, `DEFAULT_APP_EXTRA`, `DEFAULT_NOTES`, `DEFAULT_SUMMARY_ROWS`), motor de cálculo (`computeMetrics`, `getChildrenSum`, `getVirtualCategories`, `computeDistribucionSuggested`, `computeAnnualDistribucionData`), persistencia en `localStorage` (`budget_by_month`) y sincronización bidireccional con Google Apps Script (GET/POST con fallback y resolución de conflictos por timestamp).
    2. **`MAESTRO.css`**: Hoja de estilos centralizada con tipografía *Outfit* e *Inter*, paleta fintech, glassmorphism, micro-animaciones, diseño 100% responsivo para móviles y escritorio, cards, tablas, toggles de estado y modales.
    3. **`MAESTRO.jsx`**: Aplicación completa desarrollada en React 18 nativo con Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`). Incluye:
       - **Selector Global de Mes**: navegación anterior/siguiente, "Hoy", dropdown con indicador de puntos (•) en meses con datos y clonación automática de plantilla.
       - **Pestaña Overview**: tarjetas KPI (Total Income, Total Expenses, Remaining Balance con colores semánticos), tabla jerárquica con categorías y subcategorías colapsables, inputs inline de presupuesto, columna "Difference" calculada y fila final "Sueldo Cuadre".
       - **Pestaña Summary**: tablas dinámicas clonables ("Year-End Summary 2025" y tablas adicionales), edición de categorías, montos y destinos, totales calculados y botón "+ Agregar otra tabla".
       - **Pestaña Distribución**: gráfico anual de barras apiladas interactivo (12 meses) con selector de visualización en `$ Monto` o `% Dist`, botón "Restablecer Mes" y 4 tarjetas de distribución (`QIK`, `GASTOS M p2`, `APAP`, `GASTOS M p1`) con filas de composición editables, cálculo de sugeridos y toggle de estado `PENDIENTE` / `DONE`.
       - **Pestaña Tarjetas**: tabla de control de pagos para tarjetas de crédito (`TC CONTIGO`, `TC JET BLUE`, `TC APAP`) con toggles independientes por moneda (`USD` y `DOP`).
       - **Pestaña Notes**: diario financiero con tarjetas de notas categorizadas (`STRATEGY`, `GOAL`, `REMINDER`, `IDEA`), notas fijadas (pinned), edición/eliminación modal y barra lateral de timeline con accesos rápidos que iluminan la tarjeta de distribución correspondiente.
       - **Pestaña Settings**: interfaz para configurar y probar la URL de Google Apps Script Web App, botón de sincronización manual, exportación de respaldo JSON y restauración de copias de seguridad.
       - **Modales**: Agregar Categoría, Configuración de Base de Datos Cloud y Agregar/Editar Nota.
  - **Punto de Entrada (`index.html`)**: Carga React 18, ReactDOM 18 y Babel Standalone desde CDNs estables, enlazando `MAESTRO.css`, `MAESTRO.js` y `MAESTRO.jsx` con pantalla de carga inicial y fallback informativo para ejecuciones locales bajo protocolo `file://`.
  - **Respaldo histórico**: Se preservó la versión original en `index.legacy.html` y la carpeta `src/`.
  - **Verificación**: Probado y validado en navegador en todos sus flujos de navegación sin errores de consola.

### Arquitectura de Datos
- **localStorage key**: `budget_by_month` → `{ "YYYY-MM": { categories: [...], extra: {...} } }`
- **Backend GAS**: El script actual del usuario es simple (celda A1 de Google Sheets). Lee/escribe JSON raw.
  - URL desplegada: `https://script.google.com/macros/s/AKfycbz.../exec`
  - GET → devuelve JSON de celda A1
  - POST → guarda `e.postData.contents` en celda A1
- **Formato en la nube**: `{ byMonth: {...}, categories: [...], extra: {...} }`
- **Retrocompatibilidad**: `loadFromGAS()` detecta formato viejo o nuevo y realiza merge inteligente con timestamp `lastSaved`.

