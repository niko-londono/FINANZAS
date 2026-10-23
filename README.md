# Finanzas

Webapp estática para llevar el presupuesto mensual personal: ingresos, gastos por categoría (con subcategorías), distribución del sueldo, tarjetas de crédito, resumen de fin de año y notas. Se entra con Google y los datos se guardan en Supabase (con una copia en el navegador, `localStorage`).

> Antes de tocar el código, lee **[HISTORIAL.md](HISTORIAL.md)**: explica la estructura, el modelo de datos y las reglas de cálculo. Las decisiones visuales están en **[DESIGN.md](DESIGN.md)**.

## Estructura rápida
- `index.html`: carga React 18 + Babel y `supabase-js` (unpkg) y los archivos `MAESTRO.*`.
- `MAESTRO.js` (motor de datos y cálculos), `MAESTRO.supabase.js` (cuenta y base de datos), `MAESTRO.bancos.js` (movimientos de tarjetas desde Gmail), `MAESTRO.jsx` (interfaz React), `MAESTRO.css` (estilos).
- `index.legacy.html`, `src/js/app.js`, `src/css/style.css`: versión vanilla anterior, solo como referencia.
- `.github/workflows/deploy.yml`: deploy a GitHub Pages.

## Correr en local
No hay build ni dependencias. Se necesita un servidor estático (no sirve abrir con `file://`):

```bash
npx serve -l 4317 .
```

El login con Google solo vuelve a `http://localhost:4317/` y a `https://niko-londono.github.io/FINANZAS/` (ver HISTORIAL.md §7).

## Supabase
Proyecto `finanzas`: tablas con RLS por usuario, funciones `load_budget`/`save_budget`/`load_movements`/`save_movements` y la función de borde `tasa` (tasa del dólar del Banco Central). El detalle está en HISTORIAL.md §7.

## Movimientos de tarjetas (Gmail)
1. En Google Cloud (proyecto del Client ID): habilitar la **API de Gmail**, agregar el alcance `gmail.readonly` en *Data Access* y tu cuenta como usuario de prueba en *Audience*.
2. En el cliente OAuth de Gmail, agregar los orígenes de JavaScript donde se abre la app (`https://niko-londono.github.io` y, para local, `http://localhost:<puerto>`).
3. En la app: Tarjetas → **Conectar Gmail**.

## Deploy
Cada push a `main` publica el repositorio en GitHub Pages con el workflow `Deploy to GitHub Pages`.
