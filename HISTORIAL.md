# HISTORIAL · Finanzas (presupuesto mensual)

> **Regla de uso:** leer este archivo ANTES de abrir el código. Al terminar cada cambio, agregar una entrada en "Registro de cambios" y corregir las secciones de arriba si algo cambió (archivos, datos, cálculos).

## 1. Qué es
Webapp estática en español para llevar el **presupuesto mensual personal** (ingresos, gastos por categoría, distribución del sueldo, tarjetas de crédito, resumen de fin de año y notas). Los montos están en pesos dominicanos (DOP); hay referencias a USD en tarjetas.
- Repo: `niko-londono/...` (rama `main`). Deploy: **GitHub Pages** vía `.github/workflows/deploy.yml` (sube la raíz completa del repo en cada push a `main`/`master`).
- Persistencia híbrida: `localStorage` + **Google Sheets** vía Google Apps Script (`gas_backend.gs`).
- Para abrir en local hace falta servidor (`npx serve .`), no `file://`.

> Nota: este archivo antes describía otro proyecto ("HAPI Portafolio", inversiones Apex/Bakkt). Esa información no corresponde a este repo y se eliminó.

## 2. Estado actual: la app es la versión React (MAESTRO)
Desde el 2026-10-18 `index.html` carga React 18 + Babel standalone desde unpkg (versiones fijas) y los archivos `MAESTRO.*`. La versión vanilla anterior quedó en `index.legacy.html` + `src/js/app.js` + `src/css/style.css` **solo como referencia**: no recibe arreglos ni el rediseño. Todo cambio nuevo va en `MAESTRO.*`.

## 3. Archivos
| Archivo | Rol | Cuándo tocarlo |
|---|---|---|
| `index.html` | Shell: `#root`, React/ReactDOM/Babel (unpkg, versiones fijas), Google Identity Services, `MAESTRO.css`, `MAESTRO.js`, `MAESTRO.bancos.js`, `MAESTRO.jsx`; aviso si se abre con `file://`. | Casi nunca. |
| `MAESTRO.js` | Motor `window.FinanzasMaestro`: datos por defecto, cálculos, formato, storage, mezcla con la nube, GAS, respaldos. Sin UI. | Datos, cálculos o sincronización. |
| `MAESTRO.bancos.js` | Motor `window.FinanzasBancos`: login de Google (GIS, solo lectura de Gmail), lectura de correos `BANCOS/*`, lectores por banco, categorías por comercio, almacén `card_movements_v1`, guardado protegido en la hoja. Sin UI. | Formato de correos nuevo, categorías, sync de movimientos. |
| `MAESTRO.jsx` | UI React: `FinancialBudgetDashboard` (estado, persistencia, sync, avisos), selector de mes, vistas y modales. | Interfaz y flujos. |
| `MAESTRO.css` | Estilos (tokens en `:root`, móvil primero, 640px tablet, 960px escritorio con sidebar). | Aspecto. |
| `DESIGN.md` | Decisiones visuales (paleta, tipografía, componentes). | Si cambia el sistema visual. |
| `gas_backend.gs` | Backend Google Apps Script: presupuesto (`doGet`/`doPost`, hoja **Presupuestos**) y movimientos (`doPost` con `action: txLoad/txSave`, hoja **Movimientos**, solo con token de Google del dueño). Se despliega aparte en Google, no en Pages. | Cambios en el formato de sync. |
| `index.legacy.html`, `src/js/app.js`, `src/css/style.css` | Versión vanilla anterior (referencia). `src/assets/favicon.png` sí se usa. | Candidatos a borrar. |
| `refactor.js`, `refactor.py`, `fix_order.js`, `diff.txt` | Scripts/artefactos de la migración a estado mensual de la versión vanilla. Ya aplicados. `diff.txt` está en UTF-16. | Candidatos a borrar; no ejecutar de nuevo. |
| `.claude/launch.json` | Servidor local para previsualizar (`npx serve` en el puerto 4317). | Si cambia el puerto. |
| `docs/presupuesto.png` | Captura de referencia del diseño original. | — |
| `.github/workflows/deploy.yml` | Deploy a GitHub Pages. | Si cambia el hosting. |
| `README.md` | Descripción corta y cómo correr/desplegar. | Si cambia el alcance. |
| `HISTORIAL.md` | Este archivo. | En cada cambio. |

## 4. Vistas
Escritorio (≥ 960px): sidebar con las 6 vistas y estado de la nube abajo. Celular: barra inferior con 5 vistas; **Ajustes** y el estado de la nube están en la barra superior. La vista activa se refleja en el hash (`#overview`, `#tarjetas`…). El selector de mes está siempre en la barra superior (anterior / lista / siguiente / "Hoy" si no es el mes actual).
- **Presupuesto** (`overview`): franja de balance (Disponible/Excedido, Ingresos, Presupuestado) con barra de composición del gasto respecto al ingreso; libro de categorías en árbol (colapsables, columna "Por asignar" = la antigua *Difference*; en celular aparece bajo la categoría padre) y fila "Cuadre del sueldo"; modal "Nueva categoría".
  - **Gastos M · tarjetas** (`GastosMeter`, entre el balance y las categorías): lo gastado en el mes del selector con todas las tarjetas/cuentas (mismo número que "Gastado" en Tarjetas → Mes → Todas: salidas no declinadas) contra el monto de la categoría `gastos-m` como límite. Los USD se pasan a pesos con la tasa de venta del dólar (ver 7d); si no hay tasa, se listan aparte. Muestra gastado, límite, "Te queda"/"Excedido", barra apilada por tarjeta, % usado, la tasa usada y, en el mes actual, una marca de ritmo parejo (límite × día / días del mes). Lee el historial de `card_movements_v1` al abrir la vista.
- **Resumen** (`summary`): tablas editables (concepto, monto, destino) con total; se pueden agregar/quitar filas y tablas.
- **Distribución** (`distribucion`): gráfico anual (monto o % del ingreso, mes actual resaltado); tarjetas de transferencia (`qik`, `gastos-m-p2`, `apap`, `gastos-m-p1`) con filas categoría/subcategoría/monto, monto sugerido, estado Pendiente/Hecho; zona "Restablecer mes".
- **Tarjetas** (`tarjetas`):
  - **Movimientos** (Gmail): botón "Conectar Gmail" / "Actualizar desde Gmail"; periodo Mes (el del selector superior) o 12 meses; fichas por tarjeta/cuenta con su gasto; resumen Gastado vs. Pagos y entradas; barras por categoría (clic = filtrar); lista por día con categoría editable en los consumos (la corrección se recuerda por comercio); "Desconectar Gmail" y "Borrar historial local".
  - **Movimientos manuales** (botón **Agregar**, siempre visible, también sin Gmail): para lo que no llega por correo (transferencias desde la app del banco, efectivo…). Tipo (transferencia enviada, pago o compra, retiro/efectivo, dinero recibido, pago a la tarjeta), descripción, monto, moneda, fecha, cuenta (una tarjeta/cuenta conocida u "Otra cuenta / efectivo") y categoría (automática o elegida). Llevan la etiqueta "Manual"; tocar el nombre abre el formulario para editar o eliminar. Las salidas suman en "Gastado" y en el gráfico Gastos M como cualquier otro movimiento.
  - **Mis tarjetas** (arriba): una tarjeta dibujada en SVG por cada crédito (APAP Visa Gold dorada con panal, JetBlue azul con trama de puntos, Contigo crema con chevrones; aproximaciones, no réplicas). Dentro: fecha límite del pago y cuántos días faltan, día de corte y de vencimiento, próximo corte con su cuenta regresiva, últimos 4 dígitos (salen del historial de Gmail, no del código) y el estado del pago por moneda (Pagado, Pendiente, Vencido, Sin consumos, Por confirmar). Debajo: lo consumido al corte, lo consumido desde el último corte, pagos recibidos y "Ver movimientos" (filtra el historial por esa tarjeta y lo despliega).
  - El historial de movimientos tiene un botón **Ver detalle / Ocultar detalle** (categorías y lista); fichas y totales quedan siempre visibles. La preferencia se recuerda (`mov_detail_open` en localStorage).
- **Notas** (`notes`): fijadas y demás (ordenadas por fecha), tipos Estrategia/Meta/Recordatorio/Idea (valores guardados en inglés: STRATEGY, GOAL, REMINDER, IDEA); panel con accesos a las transferencias del mes.
- **Ajustes** (`settings`): URL de Apps Script, "Sincronizar ahora", descargar/restaurar respaldo JSON.
- Los mensajes van en avisos (toasts) abajo; solo las acciones destructivas usan `window.confirm`.

## 5. Modelo de datos
Todo vive en un objeto **`byMonth`**: `{ "YYYY-MM": { categories: [...], extra: {...} } }`.
- `categories[]`: `{ id, name, budgeted, parentId (null = raíz), canDelete }`. Defaults: `sueldo`, `carro` (hijos `carro-seguro`, `carro-prest-mant`), `viajes`, `gastos-m`, `casa-inversion`.
- `extra`: `{ summaryTables[], distribucion{ <tarjeta>: { pendingDone, rows[{catId, subId, amount}] } }, tarjetas{ <id>: { usdDone, dopDone } }, notes[], lastSaved (timestamp ms) }`. Los campos `tarjetas` y `notes` del mes ya no se usan (quedan como respaldo); ver datos compartidos.
- **Datos compartidos** (no dependen del mes, `localStorage` `finanzas_shared` y hoja **Compartido**): `{ notes[], cardPayments{ <tarjeta>: { <mes del vencimiento>: { DOP, USD } } }, lastSaved }`. Si aún no existen se derivan de los meses (`deriveSharedFromMonths`: notas del mes guardado más tarde y todas las marcas de pago) con `lastSaved 0` para que la nube tenga prioridad.
- **Mes nuevo** (`createMonthFrom`): se clona el mes anterior más cercano, se reinician los estados Pendiente (`tarjetas.*.usdDone/dopDone`, `distribucion.*.pendingDone`) y se marca `lastSaved: 0`; si no hay anterior, se usan los defaults (también con `lastSaved: 0`).
- **`lastSaved: 0`** significa "plantilla sin editar": cualquier versión de ese mes en la nube gana. Toda edición pone `Date.now()`; "Restablecer mes" también, para que la nube no deshaga el reset.
- **localStorage:** `budget_by_month` (principal), `gas_api_url`, `collapsed_categories`. Migra desde las claves antiguas `budget_categories` y `app_extra_data` (guarda respaldo `*_backup_v1`).

## 6. Reglas de cálculo
- **Ingresos** (`totalIncome`) = suma de hijos de `sueldo` si tiene hijos; si no, `sueldo.budgeted`.
- **Presupuestado** (`totalExpenses`) = suma de `budgeted` de las categorías raíz distintas de `sueldo`.
- **Disponible / Excedido** (`remainingBalance`) = Ingresos − Presupuestado (también es la fila "Cuadre del sueldo").
- **Por asignar** (virtual *Difference*) por cada categoría con hijos = `budgeted` del padre − suma de hijos (id `<padre>-difference`).
- **Composición** (vista Presupuesto): cada categoría raíz de gasto como % del ingreso; la barra se escala a max(ingreso, gasto).
- Montos negativos se muestran `-$1,234.00` (`formatMoney`).
- **Sugerido en Distribución:** sin subcategoría o `__todas__` → presupuesto de la categoría; `*-difference` → diferencia del padre; otra → presupuesto de la subcategoría.
- Totales de tarjeta de distribución y de tabla de resumen = suma de `amount`.
- Gráfico anual: por mes del año, ingreso, gasto y segmentos por categoría raíz (>0); la escala en modo monto es el máximo entre ingresos y gastos del año; meses futuros marcados `isFuture`.

## 7. Sincronización con Google Sheets
- Hoja **Presupuestos**, columnas: `Mes (YYYY-MM)`, `Categorias JSON`, `Extra JSON`, `Ultima Actualizacion`.
- La columna A se guarda como **texto**: Sheets convertía `2026-10` en fecha, el script la devolvía como `"Thu Oct 01 2026 …"` y la app descartaba todo lo leído (cada dispositivo escribía pero nunca leía). El script normaliza fechas a `yyyy-MM`, quita meses repetidos y reescribe la hoja; la app también normaliza esas claves (`normalizeMonthKey`).
- Hoja **Compartido**: fila `shared` con el JSON de los datos compartidos.
- `GET` devuelve `{ byMonth, shared }`; `POST` (texto plano, `mode: no-cors`) recibe `{ byMonth, categories, extra, shared }`. Por mes (y para `shared`) el script solo reemplaza si el `lastSaved` que llega es ≥ al guardado, así un dispositivo desactualizado no pisa a otro. Usa `LockService` para que dos guardados no se crucen.
- Carga desde la nube (inicio, "Sincronizar ahora", al cambiar la URL y al volver a la app si pasaron 15 s desde la última lectura, para el celular que la deja en segundo plano) con `mergeCloudByMonth`: por mes gana el de mayor `extra.lastSaved` (la nube si es ≥ local); respuestas sin meses válidos se ignoran. Guardado con espera de 500 ms; si la app pasa a segundo plano con un guardado pendiente se envía de inmediato (`keepalive`). Estados: `offline | syncing | connected | error`.
- Como el POST usa `no-cors`, un error del script no se detecta: "Sincronizado" solo garantiza que la petición salió.
- En el repo, `gas_backend.gs` tiene `SHEET_ID = 'PON_TU_SHEET_ID_AQUI'` a propósito: el ID real solo se escribe en el editor de Apps Script (el repo se publica entero en Pages). Al pegar una versión nueva del script, volver a poner el ID real.
- Para actualizar el script: pegar `gas_backend.gs` → poner el `SHEET_ID` → **Implementar → Administrar implementaciones → editar → Nueva versión** (ejecutar como yo, acceso: cualquier usuario). Editar la misma implementación mantiene la URL `/exec` que usa la app.
- La URL del script (`DEFAULT_GAS_URL`) está **hardcodeada** en el código y se puede sobrescribir desde Ajustes (`gas_api_url`). Guardarla vacía desactiva la nube (antes volvía a la URL por defecto).
- Respaldo manual: exportar/importar JSON (`finanzas_backup_YYYY-MM_<timestamp>.json`). Al importar se valida la forma (`isValidByMonth`) y cada mes recibe `lastSaved` nuevo para que la nube lo acepte.

## 7b. Movimientos desde Gmail (`MAESTRO.bancos.js`)
- **Login:** Google Identity Services, token de acceso con `gmail.readonly openid email`, Client ID en la constante `GOOGLE_CLIENT_ID` (público por diseño). El token vive solo en memoria (~1 h); no se guarda.
- **Búsqueda en Gmail:** etiquetas `bancos-apap` (asuntos *notificaciones*, *transferencia*), `bancos-popular` (*consumo*, *retiro*, *pagos al instante*, *transf recibida*), `bancos-paypal` (*pago*, *recibo*). Primera lectura: 3/6/12 meses o todo; luego, desde una semana antes de la última lectura. Correos ya leídos se saltan (`seen`). `BANCOS/QIK` solo trae certificados, no movimientos.
- **Lectores** (texto aplanado del HTML del correo):
  - APAP: consumo con tarjeta de crédito ("presenta una transacción"), pago a la tarjeta ("ha recibido un pago"), Transferencia ACH (salida) y Pago al Instante BCRD entrante (cuenta de ahorros). "ACH no procesada" se ignora.
  - Popular: "Notificación de Consumo" (crédito y débito, incluye declinadas), "Notificación de Retiro" (cajero), retiro con Código Cash, pagos al instante enviados y transferencias recibidas (estas tres van a "Cuenta Popular").
  - PayPal: no se suma (el cargo llega también por el banco como `PAYPAL *…`); se usa para ponerle el comercio real a ese cargo si coinciden tarjeta, moneda, monto (±3 %) y fecha (±5 días).
- **Tarjetas:** id `<banco>-<últimos 4>` (`<banco>-cuenta` para cuentas); el nombre sale del correo. Los últimos 4 dígitos no se escriben en el código.
- **Tipos:** consumo, retiro, transferencia (salen) · pago, ingreso (entran). Las declinadas se muestran tachadas y no suman. No hay conversión de moneda: los totales se muestran por moneda.
- **Categorías:** palabras clave por comercio (`CATEGORIES`); retiros, transferencias, pagos e ingresos tienen categoría fija. Las correcciones del usuario se guardan en `rules` por `merchantKey` (dos primeras palabras del comercio).
- **Almacén** `card_movements_v1` en localStorage: `{ tx, paypal, seen, rules, cards, lastSync, updatedAt }`. En la hoja **Movimientos** va una fila por elemento (Tipo, Id, JSON) y los `seen` en bloques de 1.000. Al conectar: se baja la hoja, se une con lo local (`mergeStores`), se lee Gmail y se sube todo.
- **Manuales** (`saveManual`, `deleteManual`): van en `tx` con id `manual-…`, `source: 'manual'`, `editedAt` y `categoryOverride` (vacío = categoría automática). Sin tarjeta elegida usan la cuenta `manual` ("Otra cuenta / efectivo"). Borrar deja `{ id, source, deleted: true, editedAt }` para que la hoja no lo reviva; `getMovements` salta los borrados. En `mergeStores`, si un movimiento está en los dos lados gana el de `editedAt` mayor. Se suben a la hoja solo con Gmail conectado (el Apps Script exige el token); sin sesión quedan en el navegador hasta la próxima conexión. No hace falta cambiar `gas_backend.gs`.
- **Seguridad del Apps Script:** `txLoad`/`txSave` validan el token con `oauth2.googleapis.com/tokeninfo`: debe ser del Client ID de la app y del mismo correo que es dueño del script. Sin eso responde `ok: false`. El presupuesto (`doGet`) sigue siendo público.
- **Configuración en Google Cloud** (proyecto FINANZAS, hecha y verificada el 2026-10-18): API de Gmail habilitada; en *Data Access* el alcance `gmail.readonly`; en *Audience* tu cuenta como usuario de prueba (mientras la app esté en modo Testing); en el cliente OAuth, origen `https://niko-londono.github.io` (y `http://localhost:<puerto>` para probar en local).

## 7c. Ciclos de tarjetas (`CREDIT_CARDS` en `MAESTRO.jsx`, `cardCycle` en `MAESTRO.bancos.js`)
| Tarjeta | Corte | Vence | Estado del pago |
|---|---|---|---|
| APAP Visa Gold | 13 | 4 | Automático (correo "ha recibido un pago", por moneda) |
| JetBlue (Popular) | 10 | 4 | Manual: el Popular no envía correo al pagar |
| Contigo (Popular) | 28 | 23 | Manual |
- Si el día de pago es menor o igual que el de corte, el pago vence el mes siguiente al corte.
- **Qué estado se muestra:** en el mes actual, el del próximo pago desde hoy; en otro mes, el estado de cuenta que vence en ese mes.
- **Pagado:** hay un pago en esa moneda después del corte y hasta el siguiente corte. **Sin consumos:** el historial cubre todo el periodo del corte y no hubo consumos en esa moneda. **Vencido:** pasó la fecha límite sin pago (solo tarjetas con aviso automático). **Por confirmar:** tarjetas del Popular sin marca manual.
- Las marcas manuales se guardan en los datos compartidos: `cardPayments[<tarjeta>][<mes del vencimiento>] = { DOP, USD }` (antes en `extra.tarjetas` del mes, por eso se perdían al cambiar de mes). Si el automático ya dice Pagado o Sin consumos, la casilla queda bloqueada. Los campos antiguos `usdDone/dopDone` ya no se usan.
- El Popular solo manda a veces "Se aproxima tu fecha límite de pago" (`popularcontigo@bpd.com.do`, sin etiqueta); no sirve para saber si se pagó.

## 7d. Tasa del dólar (`fetchUsdRate` en `MAESTRO.js`, `tasaDolarBcrd_` en `gas_backend.gs`)
- Se consulta en **cada carga de la página** (y al cambiar la URL del script). Mientras llega, se usa la última guardada (`usd_rate` en localStorage).
- **Fuente principal: Banco Central.** El BCRD publica la tasa de referencia diaria en `TASA_DOLAR_REFERENCIA_MC.xlsx` (cdn.bancentral.gov.do), sin CORS, así que el navegador no lo puede leer: el Apps Script lo baja (`GET ?action=tasa`), lo descomprime, toma la última fila de la hoja "Diaria" (Año, Mes, Día, Compra, Venta) y responde `{ ok, fuente: 'BCRD', fecha, compra, venta }`. Caché de 30 min en el script (el BCRD la actualiza una vez por día hábil; fines de semana queda la del último día hábil).
- Se usa la **venta** (lo que cobra el banco al comprar dólares para pagar la tarjeta).
- **Respaldo:** si el script falla o es una versión sin `action=tasa`, se usa `open.er-api.com` (tasa de mercado, se indica la fuente en pantalla).

## 8. Pendientes y notas
- Borrar la versión vanilla (`index.legacy.html`, `src/js/app.js`, `src/css/style.css`) y los scripts `refactor.*`, `fix_order.js`, `diff.txt` cuando se confirme que la versión React cubre todo.
- Las notas se guardan por mes (se copian al mes siguiente); editar una nota no cambia las de otros meses.
- Mientras la app OAuth esté en modo Testing, solo los usuarios de prueba pueden entrar y Google muestra el aviso de "app no verificada". Usarla con otras cuentas exige la verificación de Google (alcance restringido `gmail.readonly`).
- Los lectores dependen del formato de los correos: si un banco cambia la plantilla, esos correos dejan de aparecer (se cuentan como no leídos en `syncFromGmail`).
- React/Babel cargan desde unpkg: sin internet la app no abre. Babel en el navegador tarda ~1 s en compilar; si molesta, precompilar `MAESTRO.jsx`.
- Seguridad: la URL del Apps Script está pública en el repo; cualquiera con ella puede leer/escribir la hoja. El 2026-10-17 se eliminó `src/API.md` (contenía un Client ID de Google) por información sensible; sigue en el historial de git.
- El deploy publica TODO el repo en Pages (incluidos scripts y `docs/`).
- Los datos de plantilla (notas de ejemplo, resumen "Year-End 2025") son datos personales de ejemplo dentro del código.

## 9. Registro de cambios
- **2026-10-20 · Movimientos manuales.** En Tarjetas → Movimientos, botón **Agregar** para registrar transferencias, efectivo y otros gastos que no llegan por correo; se editan o eliminan tocando el nombre y cuentan en "Gastado" y en Gastos M. `MAESTRO.bancos.js` (`saveManual`, `deleteManual`, mezcla por `editedAt`), `MAESTRO.jsx` (`ManualTxModal`), `MAESTRO.css` (`.tx-edit`, `.tag-manual`).
- **2026-10-18 · Tasa del dólar del Banco Central.** La app consulta la tasa en cada carga (Apps Script `?action=tasa` lee el Excel del BCRD; respaldo open.er-api.com) y el gráfico Gastos M suma los dólares convertidos a pesos. **Requiere pegar el nuevo `gas_backend.gs` y publicar una versión nueva**; mientras tanto se usa el respaldo.
- **2026-10-18 · Gráfico Gastos M vs. tarjetas.** En Presupuesto, nuevo panel que compara lo gastado en el mes con las tarjetas (historial de Gmail) contra el límite de "Gastos M": cuánto queda, % usado, desglose por tarjeta y ritmo del mes. `MAESTRO.jsx` (`GastosMeter`) y `MAESTRO.css` (`.meter*`).
- **2026-10-18 · Sincronización entre dispositivos.** Las marcas de pago del Popular y el borrado de notas no pasaban del PC al celular: Google Sheets guardaba la columna Mes como fecha y la app descartaba los datos leídos. `gas_backend.gs` guarda el mes como texto, limpia filas repetidas, no deja que una versión más vieja pise a una nueva y agrega la hoja **Compartido**. Notas y marcas de pago pasan a ser datos compartidos (no por mes). La app relee la nube al volver a primer plano. **Requiere pegar el nuevo `gas_backend.gs` y publicar una versión nueva.**
- **2026-10-18 · Tarjetas visuales y estado de pago automático.** "Pagos de tarjetas" pasa a "Mis tarjetas": tarjetas en SVG con fecha límite, días al corte, corte/vencimiento y estado por moneda calculado desde Gmail (APAP automático; Popular manual porque no envía correo de pago). Lo consumido al corte y desde el último corte por tarjeta. Botón para desplegar u ocultar el detalle del historial. Nuevo `cardCycle` en `MAESTRO.bancos.js`.
- **2026-10-18 · Movimientos en producción.** Google Cloud configurado (API de Gmail habilitada, alcance `gmail.readonly`, usuario de prueba). Apps Script actualizado con el nuevo `gas_backend.gs` (versión 3 de la misma implementación, misma URL). Verificado: `doGet` responde y `txLoad` sin token devuelve `ok: false` ("Falta la sesión de Google"). Login con Gmail y lectura de movimientos probados por el usuario en la app publicada.
- **2026-10-18 · Movimientos de tarjetas desde Gmail.** Nuevo `MAESTRO.bancos.js` (login de Google, lectura de etiquetas `BANCOS/*`, lectores APAP/Popular/PayPal, categorías por comercio, almacén y sync protegido). Vista Tarjetas con historial por tarjeta, periodo mes/12 meses, gasto por categoría y categoría editable. `gas_backend.gs` reorganizado (`SHEET_ID` arriba) con acciones `txLoad`/`txSave` que verifican el token del dueño. `index.html` carga Google Identity Services y el módulo nuevo.
- **2026-10-18 · Versión React activada, bugs y rediseño.** `index.html` ahora carga React + `MAESTRO.*`; la versión vanilla pasó a `index.legacy.html`. Bugs corregidos en `MAESTRO.js/.jsx`: (1) meses nuevos o de plantilla tenían `lastSaved = Date.now()` y pisaban los datos de la nube en otro dispositivo → ahora `0`; (2) "Sincronizar ahora" descargaba y descartaba los datos → ahora los mezcla; (3) dejar la URL vacía no desactivaba la nube; (4) cambiar la URL no recargaba datos; (5) importar respaldos no validaba el archivo; (6) montos negativos salían como `$-1,234.00`; (7) el gráfico anual se desbordaba si los gastos superaban al ingreso; (8) "Restablecer mes" podía deshacerse al sincronizar; (9) no se podía volver a importar el mismo archivo. Rediseño completo (`MAESTRO.css` reescrito, `MAESTRO.jsx` con nuevo marcado): claro y sobrio, un acento verde, tipografía Onest con cifras tabulares, celular primero con barra inferior, sidebar en escritorio, franja de balance con composición del gasto, interfaz en español, avisos en lugar de `alert()`, modales como hoja inferior en celular, quitar filas en Resumen, accesibilidad (foco visible, `aria-*`, enlace para saltar al contenido). Nuevo `DESIGN.md`.
- **2026-10-17 · Documentación.** HISTORIAL.md reescrito para este proyecto (antes describía HAPI Portafolio); README ampliado; documentadas las dos implementaciones (vanilla en producción vs. React `MAESTRO.*` sin conectar). Sin cambios de código.
- **2026-10-17 · quitar información sensible.** Se eliminó `src/API.md`.
- **2026-10-17 · fix / fix visual / maestros.** Se agregan `MAESTRO.js/.jsx/.css` (migración a React 18 con `window.FinanzasMaestro`); ajustes visuales. `index.html` sigue cargando `app.js`.
- **2026-10-10 · mensualizado / fix bd 1-3.** Presupuesto por mes (`byMonth`), clonación del mes anterior, sincronización por mes con Google Sheets (`gas_backend.gs`), resolución de conflictos por `lastSaved`.
- **2026-06 · notas, colores, sueldo, update visual.** Pestaña Notes, paleta de categorías, categoría Sueldo, rediseño.
- **2026-06-06/10 · inicio, responsive, layout celular.** Primera versión del dashboard con sidebar, tabla en árbol y diseño responsive.
