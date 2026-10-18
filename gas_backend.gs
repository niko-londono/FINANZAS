/**
 * Backend de Finanzas en Google Apps Script.
 * Implementar como aplicación web: "Ejecutar como: yo" y "Quién tiene acceso: cualquier usuario".
 *
 * - Presupuesto (hojas "Presupuestos" y "Compartido"): doGet / doPost sin acción.
 * - Movimientos de tarjetas (hoja "Movimientos"): doPost con action "txLoad" o "txSave".
 *   Solo responde si la petición trae un token de Google del dueño de esta hoja,
 *   emitido para el Client ID de la app (la URL del script es pública).
 */

var SHEET_ID = 'PON_TU_SHEET_ID_AQUI'; // <--- CAMBIAR
var GOOGLE_CLIENT_ID = '536695694569-19dads7fe5t6vfpr55l0t7gl7b9ihdaq.apps.googleusercontent.com';
var TX_SHEET = 'Movimientos';

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action) return handleMovimientos_(data);
    return savePresupuesto_(data);
  } catch (error) {
    return jsonOut_({ status: 'error', ok: false, error: error.toString() });
  }
}

// --- PRESUPUESTO ---
// Hoja "Presupuestos": una fila por mes. La columna A se guarda como texto: si no, Sheets
// convierte "2026-10" en fecha y la app deja de reconocer los meses al leerlos.
// Hoja "Compartido": datos que no dependen del mes (notas y pagos marcados a mano).
// En ambas gana la versión con "lastSaved" más reciente, así un dispositivo desactualizado
// no pisa lo que otro guardó.
var BUDGET_SHEET = 'Presupuestos';
var BUDGET_HEADER = ['Mes (YYYY-MM)', 'Categorias JSON', 'Extra JSON', 'Ultima Actualizacion'];
var SHARED_SHEET = 'Compartido';

function monthKey_(value, tz) {
  if (value instanceof Date) return Utilities.formatDate(value, tz, 'yyyy-MM');
  return String(value || '').trim();
}

function lastSavedOf_(extra) {
  return (extra && Number(extra.lastSaved)) || 0;
}

// { "YYYY-MM": { categories, extra, updated } }; si un mes se repite gana el más reciente
function readBudgetRows_(sheet, tz) {
  var months = {};
  if (!sheet) return months;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var key = monthKey_(values[i][0], tz);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    try {
      var month = { categories: JSON.parse(values[i][1] || '[]'), extra: JSON.parse(values[i][2] || '{}'), updated: values[i][3] };
      if (!months[key] || lastSavedOf_(month.extra) >= lastSavedOf_(months[key].extra)) months[key] = month;
    } catch (err) {
      // Ignorar filas con JSON dañado
    }
  }
  return months;
}

function readShared_(ss) {
  var sheet = ss.getSheetByName(SHARED_SHEET);
  if (!sheet) return null;
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (values[i][0] === 'shared') {
      try { return JSON.parse(values[i][1] || 'null'); } catch (err) { return null; }
    }
  }
  return null;
}

function savePresupuesto_(data) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var tz = ss.getSpreadsheetTimeZone();
    var now = new Date();

    var byMonth = data.byMonth; // { "YYYY-MM": { categories: [...], extra: {...} } }
    if (byMonth) {
      var sheet = ss.getSheetByName(BUDGET_SHEET) || ss.insertSheet(BUDGET_SHEET);
      var months = readBudgetRows_(sheet, tz);
      Object.keys(byMonth).forEach(function (key) {
        if (!/^\d{4}-\d{2}$/.test(key)) return;
        var incoming = byMonth[key] || {};
        var current = months[key];
        if (current && lastSavedOf_(incoming.extra) < lastSavedOf_(current.extra)) return;
        months[key] = { categories: incoming.categories || [], extra: incoming.extra || {}, updated: now };
      });

      var rows = [BUDGET_HEADER];
      Object.keys(months).sort().forEach(function (key) {
        var m = months[key];
        rows.push([key, JSON.stringify(m.categories), JSON.stringify(m.extra), m.updated || now]);
      });
      sheet.clearContents();
      sheet.getRange(1, 1, sheet.getMaxRows(), 1).setNumberFormat('@');
      sheet.getRange(1, 1, rows.length, 4).setValues(rows);
    }

    if (data.shared && typeof data.shared === 'object') {
      var current = readShared_(ss);
      if (!current || (Number(data.shared.lastSaved) || 0) >= (Number(current.lastSaved) || 0)) {
        var sharedSheet = ss.getSheetByName(SHARED_SHEET) || ss.insertSheet(SHARED_SHEET);
        sharedSheet.clearContents();
        sharedSheet.getRange(1, 1, 2, 3).setValues([
          ['Clave', 'Datos JSON', 'Ultima Actualizacion'],
          ['shared', JSON.stringify(data.shared), now]
        ]);
      }
    }
    return jsonOut_({ status: 'success' });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'tasa') {
    try { return jsonOut_(tasaDolarBcrd_()); }
    catch (error) { return jsonOut_({ ok: false, error: error.toString() }); }
  }
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var months = readBudgetRows_(ss.getSheetByName(BUDGET_SHEET), ss.getSpreadsheetTimeZone());
  var byMonth = {};
  Object.keys(months).forEach(function (key) {
    byMonth[key] = { categories: months[key].categories, extra: months[key].extra };
  });
  return jsonOut_({ byMonth: byMonth, shared: readShared_(ss) });
}

// --- TASA DEL DÓLAR (Banco Central) ---
// El BCRD publica la tasa de referencia diaria en un Excel sin CORS, así que el navegador no
// puede leerlo: lo baja este script (GET ?action=tasa). Se toma la última fila de la hoja
// "Diaria" (Año, Mes, Día, Compra, Venta). Caché de 30 min: el BCRD la cambia una vez al día.
var BCRD_TASA_URL = 'https://cdn.bancentral.gov.do/documents/estadisticas/mercado-cambiario/documents/TASA_DOLAR_REFERENCIA_MC.xlsx';
var MESES_BCRD = { Ene: 1, Feb: 2, Mar: 3, Abr: 4, May: 5, Jun: 6, Jul: 7, Ago: 8, Sep: 9, Oct: 10, Nov: 11, Dic: 12 };

function tasaDolarBcrd_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('tasa_bcrd');
  if (cached) return JSON.parse(cached);

  var res = UrlFetchApp.fetch(BCRD_TASA_URL, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('El Banco Central respondió ' + res.getResponseCode());
  var files = Utilities.unzip(res.getBlob().setContentType('application/zip'));
  var sheetXml = '', stringsXml = '';
  files.forEach(function (f) {
    if (f.getName() === 'xl/worksheets/sheet1.xml') sheetXml = f.getDataAsString('UTF-8');
    if (f.getName() === 'xl/sharedStrings.xml') stringsXml = f.getDataAsString('UTF-8');
  });
  if (!sheetXml) throw new Error('No se encontró la hoja Diaria en el archivo del Banco Central.');

  var strings = [];
  stringsXml.replace(/<si>([\s\S]*?)<\/si>/g, function (_, si) {
    strings.push(si.replace(/<[^>]+>/g, ''));
    return '';
  });

  var rows = sheetXml.slice(-60000).match(/<row [^>]*>[\s\S]*?<\/row>/g) || [];
  for (var i = rows.length - 1; i >= 0; i--) {
    var cells = {};
    rows[i].replace(/<c r="([A-E])\d+"([^>]*)>(?:<f>[\s\S]*?<\/f>)?<v>([^<]*)<\/v><\/c>/g, function (_, col, attrs, v) {
      cells[col] = /t="s"/.test(attrs) ? strings[Number(v)] : v;
      return '';
    });
    var year = Number(cells.A), month = MESES_BCRD[cells.B], day = Number(cells.C);
    var compra = Number(cells.D), venta = Number(cells.E);
    if (year && month && day && compra > 0 && venta > 0) {
      var out = {
        ok: true,
        fuente: 'BCRD',
        fecha: year + '-' + ('0' + month).slice(-2) + '-' + ('0' + day).slice(-2),
        compra: compra,
        venta: venta,
        leido: new Date().toISOString()
      };
      cache.put('tasa_bcrd', JSON.stringify(out), 1800);
      return out;
    }
  }
  throw new Error('No se pudo leer la tasa en el archivo del Banco Central.');
}

// --- MOVIMIENTOS DE TARJETAS (protegidos) ---
function verifyOwner_(token) {
  if (!token) throw new Error('Falta la sesión de Google.');
  var res = UrlFetchApp.fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(token), { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) throw new Error('La sesión de Google no es válida o venció.');
  var info = JSON.parse(res.getContentText());
  if (info.aud !== GOOGLE_CLIENT_ID && info.azp !== GOOGLE_CLIENT_ID) throw new Error('La sesión pertenece a otra aplicación.');
  var owner = String(Session.getEffectiveUser().getEmail() || '').toLowerCase();
  if (!info.email || String(info.email).toLowerCase() !== owner) throw new Error('Esta cuenta de Google no tiene acceso a los movimientos.');
}

function handleMovimientos_(data) {
  try {
    verifyOwner_(data.token);
    if (data.action === 'txLoad') return jsonOut_({ ok: true, store: readMovimientos_() });
    if (data.action === 'txSave') {
      writeMovimientos_(data.store || {});
      return jsonOut_({ ok: true });
    }
    return jsonOut_({ ok: false, error: 'Acción desconocida: ' + data.action });
  } catch (error) {
    return jsonOut_({ ok: false, error: error.message || String(error) });
  }
}

// Una fila por elemento para no superar el límite de 50.000 caracteres por celda:
// Tipo (tx | paypal | rules | cards | seen | meta), Id, Datos JSON
var TX_SECTIONS = ['tx', 'paypal', 'rules', 'cards'];

function writeMovimientos_(store) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TX_SHEET) || ss.insertSheet(TX_SHEET);
  var rows = [['Tipo', 'Id', 'Datos JSON']];

  TX_SECTIONS.forEach(function (section) {
    var items = store[section] || {};
    Object.keys(items).forEach(function (id) {
      rows.push([section, id, JSON.stringify(items[id])]);
    });
  });

  // Correos ya leídos, en bloques de 1.000 ids por fila
  var seen = Object.keys(store.seen || {});
  for (var i = 0; i < seen.length; i += 1000) {
    rows.push(['seen', String(i / 1000), seen.slice(i, i + 1000).join(',')]);
  }
  rows.push(['meta', 'store', JSON.stringify({ lastSync: store.lastSync || 0, updatedAt: store.updatedAt || 0, version: store.version || 1 })]);

  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
}

function readMovimientos_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName(TX_SHEET);
  var store = { version: 1, tx: {}, paypal: {}, rules: {}, cards: {}, seen: {}, lastSync: 0, updatedAt: 0 };
  if (!sheet) return store;

  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    var type = values[i][0], id = String(values[i][1]), raw = String(values[i][2] || '');
    try {
      if (type === 'seen') {
        raw.split(',').forEach(function (msgId) { if (msgId) store.seen[msgId] = 1; });
      } else if (type === 'meta') {
        var meta = JSON.parse(raw);
        store.lastSync = meta.lastSync || 0;
        store.updatedAt = meta.updatedAt || 0;
      } else if (TX_SECTIONS.indexOf(type) !== -1) {
        store[type][id] = JSON.parse(raw);
      }
    } catch (err) {
      // Ignorar filas dañadas
    }
  }
  return store;
}
