# DESIGN · Finanzas

Herramienta de uso diario (modo *operar*), revisada sobre todo desde el celular a la luz del día. El diseño busca precisión y calma: neutros claros, un solo acento, cifras alineadas. Los tokens viven en `:root` de `MAESTRO.css`.

## Color
Estrategia contenida: neutros con tinte verde y un acento.

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#f3f5f2` | Fondo de la app |
| `--surface` / `--surface-2` / `--surface-3` | `#ffffff` / `#eef1ed` / `#e4e8e3` | Paneles, filas secundarias, hover |
| `--line` / `--line-strong` | `#dfe4dd` / `#c9d0c7` | Separadores, bordes de campos |
| `--ink` / `--ink-2` / `--ink-3` | `#16201b` / `#44504a` / `#66716b` | Texto principal, secundario, terciario |
| `--accent` | `#0f6b52` | Acción primaria, selección, foco. Nunca decorativo |
| `--pos` / `--neg` / `--warn` | `#12744a` / `#b3261e` / `#8a5300` | Disponible/Hecho, excedido/eliminar, pendiente |

Colores de categoría (`CATEGORY_COLORS` en `MAESTRO.js`, en orden de las categorías raíz): verde `#0f6b52` (Sueldo), azul `#2e6c9e`, ámbar `#c48528`, violeta `#7a5ca8`, teja `#be5648`, turquesa `#2a8f8c`, ciruela `#b05a82`, oliva `#768c34`. Se usan solo como punto, segmento de barra o leyenda; nunca como fondo de fila.

## Tipografía
- **Onest** (Google Fonts, 400–700) para todo; respaldo `system-ui`.
- Cifras siempre con `font-variant-numeric: tabular-nums` (`.money`, `.num`, `.amount-input`).
- Escala fija: 12 (etiquetas), 13 (secundario), 15 (base), 16 (títulos de sección), 19–22 (título de página), 34–40 (Disponible).
- Campos de texto a 16px en celular para evitar el zoom de iOS.

## Forma y profundidad
- Radios: 6px controles, 10px grupos, 14px paneles.
- Sombras suaves con tinte verde oscuro (`--shadow-sm`, `--shadow`, `--shadow-lg` para modales y avisos).
- Paneles con borde de 1px y sombra mínima; nada de tarjetas dentro de tarjetas.

## Estructura
- **Celular (< 640px):** barra superior pegajosa (título, estado de nube, Ajustes) con el selector de mes debajo; barra inferior con 5 vistas; modales como hoja inferior.
- **Tablet (≥ 640px):** selector de mes en la misma fila; columnas extra en tablas (Por asignar, Destino); grillas de 2 columnas.
- **Escritorio (≥ 960px):** sidebar de 232px con navegación y estado de nube; contenido hasta 1120px.

## Componentes
- **Botones:** `btn-primary` (acento, una por vista), `btn-secondary` (borde), `btn-ghost` (texto en acento); `.danger` para acciones destructivas. Altura mínima 40px (34px en `btn-sm`).
- **Edición en línea:** `inline-input` sin borde hasta hover o foco; Enter confirma los montos.
- **Estado Pendiente/Hecho:** `StatusToggle` (círculo punteado ámbar → círculo verde con check).
- **Avisos:** toast abajo (sobre la barra inferior en celular, a la derecha en escritorio), 4 s, con cerrar.
- **Movimiento:** 150–250 ms, `cubic-bezier(0.22, 1, 0.36, 1)`; solo para cambios de estado. Se desactiva con `prefers-reduced-motion`.
