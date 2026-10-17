# HISTORIAL · HAPI Portafolio

> **Regla de uso:** leer este archivo ANTES de abrir el código. Al terminar cada cambio, agregar una entrada en "Registro de cambios" y corregir las secciones de arriba si algo cambió (archivos, datos, cálculos).

## 1. Qué es
Webapp estática en español con el resumen de inversiones de Nicolás, calculado desde los estados de cuenta mensuales de Apex/HAPI (jun 2025 – sep 2026). Dos pestañas: **Bolsa** y **Crypto** (BTC vía Bakkt).
- Repo: `niko-londono/HAPI` (rama `main`). Sitio: proyecto Vercel `portafolio-finanzas`.
- Sin build: React 18 + Babel standalone desde CDN (unpkg/cdnjs). Para abrir en local hace falta servidor (`npx serve .`), no `file://`.

## 2. Archivos
| Archivo | Rol | Cuándo tocarlo |
|---|---|---|
| `index.html` | Shell: fuentes, carga de React/Babel, `MAESTRO.css/js/jsx`, aviso si se abre con `file://`. | Casi nunca. |
| `MAESTRO.js` | Motor `window.HapiEngine`: datos, cálculos, formato, precios BTC, localStorage. Sin UI. | Datos nuevos o lógica de cálculo. |
| `MAESTRO.jsx` | UI en React: `Icons`, `niceTicks`, `axisLabel`, `InteractiveChart`, `App`. | Layout, componentes, gráfico. |
| `MAESTRO.css` | Estilos: tokens (dark/light), header, tabs, KPIs, gráfico, tablas, crypto, responsive. | Aspecto. |
| `HISTORIAL.md` | Este archivo. | En cada cambio. |
| `README.md` | Descripción corta del proyecto (opcional). | Si cambia el alcance. |

### MAESTRO.js (API de `HapiEngine`)
- **Datos:** `D` = `[mes, valor_cierre, depósitos, retiros_bakkt, dividendos_netos_y_cargos]` (16 filas). `T_RAW` = operaciones `YYMMDD,tipo,ticker,cantidad,monto` separadas por `;` (tipo `B` compra, `S` venta, `X` split). `PR` = precios al 30 sep 2026. `N` = nombres de activos. `X` = traspasos a Bakkt `[fecha, monto]`.
- **Formato:** `lab, f, sg, pc, cls, dt`.
- **Cálculo:** `computePortfolioData()` → `{T, R, P, pos, positionsRows, cashFdic, cashPct, totalClosingVal, N, PR, X}`; `getPeriodSummary(meses)` → totales del periodo; `computeCryptoRows(history, spot, overrides)`.
- **BTC:** `fetchBtcData()` (Yahoo `BTC-USD` 2 años, proxies `allorigins` y `corsproxy.io`), `loadBtcStorage/saveBtcStorage` (clave `btc` en localStorage).

### MAESTRO.jsx (estructura)
- `App`: estado `activeTab, period, theme (hapi_theme), posSearch, opsSearch, opsType`, más estado BTC. Períodos: 1M, 3M, 6M, YTD, 1A, 2025, 2026, ALL.
- Bolsa: barra de periodo → KPI (tarjeta principal + 4 mosaicos) → `InteractiveChart` → posiciones (buscador) → rendimiento mensual → operaciones (filtro tipo + buscador).
- Crypto: controles de precio → KPIs (`cards-grid flat`) → tabla de traspasos editable → nota metodológica.
- `InteractiveChart`: SVG al ancho real (ResizeObserver), 2 paneles (barras mensuales realizada/no realizada + línea y área del acumulado), franja de depósitos, rejilla con ticks "redondos", tooltip que cambia de lado.

### MAESTRO.css (mapa)
Tokens `:root` y `[data-theme='light']` (nombres usados por el JSX: `--gain, --loss, --amber, --sky, --orange, --text-*`, `--grid`, `--axis`) → base → header/tabs → periodo → KPI (`.hero`) → gráfico (`.bar-*`, `.line-cum`, `.chart-*`) → tablas (`.data-table`, primera columna fija) → filtros → crypto → responsive (900/640 px).

## 3. Reglas de cálculo
- Valor de cierre = *Total Equity Holdings* de cada estado. Fechas de operaciones = fecha de liquidación que aparece en el estado.
- Total del mes = valor cierre − valor anterior − (depósitos − retiros).
- Realizada = venta − costo promedio por activo (el split `X` suma acciones sin costo). No realizada = total − realizada − dividendos netos y cargos.
- % = monto ÷ capital promedio del periodo (promedio mensual de valor anterior + flujo/2).
- Traspasos "Journal to BAKKT" = retiros de la bolsa; el 03-jun-2026 volvieron $0.92 (depósito). Intereses de margen entran como cargo (ago 2026: −$2.00).
- BTC estimado = monto ÷ cierre diario BTC-USD del día del traspaso (editable por fila).

## 4. Cifras de control (ALL, a sep 2026)
Realizada ≈ +$486.91 · Rendimiento total ≈ +$1,300.24 · Aportes netos $7,067.56 · Valor al cierre $8,367.80 · Traspasos a Bakkt $1,074.73. Si cambian al tocar datos o fórmulas, revisar.

## 5. Cómo agregar un mes nuevo
1) Añadir fila en `D`. 2) Añadir sus operaciones en `T_RAW` (con la fecha del estado). 3) Actualizar `PR` con los precios de cierre. 4) Si hubo traspasos a Bakkt, añadir a `X` y restarlos en la columna de retiros de `D`. 5) Actualizar etiquetas de texto ("jun 2025 – sep 2026", "16 meses", "precios al …") en `MAESTRO.jsx`. 6) Registrar el cambio abajo.

## 6. Pendientes y notas
- Los datos viajan dentro del código: si el sitio es público, los montos son visibles. Revisar protección en Vercel.
- La compra real de BTC no consta en los estados; el BTC es una estimación.
- Yahoo/proxies CORS pueden fallar: existe precio manual.
- Posible mejora: gráfico de valor del portafolio crypto.

## 7. Registro de cambios
- **2026-10-17 · v4 · Rediseño de layout y gráfico.** CSS reescrito (tokens más sobrios, tabs subrayadas, periodos segmentados, tabla con primera columna fija, soporte claro/oscuro real). KPI: tarjeta principal "Rendimiento total" con depositado/retirado/valor al cierre + 4 mosaicos; se eliminó la leyenda duplicada. Posiciones con ticker+nombre y barra de peso; operaciones con insignias; se activaron los buscadores y el filtro por tipo que ya existían en el estado. Gráfico: 2 paneles, ejes con ticks redondos, rejilla visible en modo claro, ancho real sin escalado, etiquetas de mes sin solaparse, tooltip sin desbordes, franja de depósitos proporcional. Archivos tocados: `MAESTRO.css`, `MAESTRO.jsx`, `HISTORIAL.md`. Sin cambios en `MAESTRO.js` ni `index.html`.
- **v3 · Versión modular.** Separación en `index.html` + `MAESTRO.js/.jsx/.css` (React + Babel en el navegador).
- **v2 · Bolsa completa en Vercel.** Posiciones, rendimiento mensual y operaciones; realizada calculada en el navegador con costo promedio.
- **v1 · Primera versión.** Un solo HTML con resumen, gráfico mensual y pestaña Crypto básica (botón de precio con Yahoo).
