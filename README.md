# Finanzas

Webapp estática para llevar el presupuesto mensual personal: ingresos, gastos por categoría (con subcategorías), distribución del sueldo, tarjetas de crédito, resumen de fin de año y notas. Los datos se guardan en el navegador (`localStorage`) y se sincronizan con Google Sheets mediante Google Apps Script.

> Antes de tocar el código, lee **[HISTORIAL.md](HISTORIAL.md)**: explica la estructura, el modelo de datos y las reglas de cálculo. Las decisiones visuales están en **[DESIGN.md](DESIGN.md)**.

## Estructura rápida
- `index.html`: carga React 18 + Babel (unpkg) y los archivos `MAESTRO.*`.
- `MAESTRO.js` (motor de datos y cálculos), `MAESTRO.jsx` (interfaz React), `MAESTRO.css` (estilos).
- `index.legacy.html`, `src/js/app.js`, `src/css/style.css`: versión vanilla anterior, solo como referencia.
- `gas_backend.gs`: backend de Google Apps Script (hoja "Presupuestos").
- `.github/workflows/deploy.yml`: deploy a GitHub Pages.

## Correr en local
No hay build ni dependencias. Se necesita un servidor estático (no sirve abrir con `file://`):

```bash
npx serve .
```

## Sincronización con Google Sheets
1. Crear una hoja de Google y copiar su ID.
2. Pegar `gas_backend.gs` en un proyecto de Apps Script y reemplazar `PON_TU_SHEET_ID_AQUI` por el ID.
3. Desplegar como aplicación web y pegar la URL en la configuración Cloud de la app (`gas_api_url`).

## Deploy
Cada push a `main` publica el repositorio en GitHub Pages con el workflow `Deploy to GitHub Pages`.
