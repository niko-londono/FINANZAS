function doPost(e) {
  var sheetId = 'PON_TU_SHEET_ID_AQUI'; // <--- CAMBIAR
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Presupuestos");
  
  if (!sheet) {
    sheet = ss.insertSheet("Presupuestos");
    sheet.appendRow(["Mes (YYYY-MM)", "Categorias JSON", "Extra JSON", "Ultima Actualizacion"]);
  }
  
  try {
    var data = JSON.parse(e.postData.contents);
    var byMonth = data.byMonth; // Expected structure: { "YYYY-MM": { categories: [...], extra: {...} } }
    
    if (byMonth) {
      // Loop over each month received and update/insert
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
          // Update existing row
          var row = monthRowMap[monthKey];
          sheet.getRange(row, 2, 1, 3).setValues([[catJson, extraJson, timestamp]]);
        } else {
          // Insert new row
          sheet.appendRow([monthKey, catJson, extraJson, timestamp]);
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": error.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var sheetId = 'PON_TU_SHEET_ID_AQUI'; // <--- CAMBIAR
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Presupuestos");
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({"byMonth": {}}))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  var existingData = sheet.getDataRange().getValues();
  var byMonth = {};
  
  // Skip header
  for (var i = 1; i < existingData.length; i++) {
    var row = existingData[i];
    var monthKey = row[0];
    var catJson = row[1];
    var extraJson = row[2];
    
    if (monthKey) {
      try {
        byMonth[monthKey] = {
          categories: JSON.parse(catJson || '[]'),
          extra: JSON.parse(extraJson || '{}')
        };
      } catch(err) {
        // Ignore parsing errors for individual rows
      }
    }
  }
  
  return ContentService.createTextOutput(JSON.stringify({ "byMonth": byMonth }))
    .setMimeType(ContentService.MimeType.JSON);
}
