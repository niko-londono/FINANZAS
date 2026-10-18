/**
 * Backend de Finanzas en Google Apps Script.
 * Implementar como aplicación web: "Ejecutar como: yo" y "Quién tiene acceso: cualquier usuario".
 *
 * - Presupuesto (hoja "Presupuestos"): doGet / doPost sin acción, como siempre.
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

// --- PRESUPUESTO (sin cambios de formato) ---
function savePresupuesto_(data) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Presupuestos');
  if (!sheet) {
    sheet = ss.insertSheet('Presupuestos');
    sheet.appendRow(['Mes (YYYY-MM)', 'Categorias JSON', 'Extra JSON', 'Ultima Actualizacion']);
  }

  var byMonth = data.byMonth; // { "YYYY-MM": { categories: [...], extra: {...} } }
  if (byMonth) {
    var existingData = sheet.getDataRange().getValues();
    var monthRowMap = {};
    for (var i = 1; i < existingData.length; i++) {
      monthRowMap[existingData[i][0]] = i + 1;
    }
    var timestamp = new Date();
    for (var monthKey in byMonth) {
      var monthData = byMonth[monthKey];
      var catJson = JSON.stringify(monthData.categories || []);
      var extraJson = JSON.stringify(monthData.extra || {});
      if (monthRowMap[monthKey]) {
        sheet.getRange(monthRowMap[monthKey], 2, 1, 3).setValues([[catJson, extraJson, timestamp]]);
      } else {
        sheet.appendRow([monthKey, catJson, extraJson, timestamp]);
      }
    }
  }
  return jsonOut_({ status: 'success' });
}

function doGet(e) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Presupuestos');
  if (!sheet) return jsonOut_({ byMonth: {} });

  var existingData = sheet.getDataRange().getValues();
  var byMonth = {};
  for (var i = 1; i < existingData.length; i++) {
    var row = existingData[i];
    if (row[0]) {
      try {
        byMonth[row[0]] = { categories: JSON.parse(row[1] || '[]'), extra: JSON.parse(row[2] || '{}') };
      } catch (err) {
        // Ignorar filas con JSON dañado
      }
    }
  }
  return jsonOut_({ byMonth: byMonth });
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
