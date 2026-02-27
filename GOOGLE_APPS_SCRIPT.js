/**
 * GOOGLE APPS SCRIPT CODE FOR CBT APP
 *
 * INSTRUKSI UPDATE:
 * 1. Copy kode ini ke Apps Script editor.
 * 2. Simpan.
 * 3. Jalankan fungsi 'setup' sekali untuk menambahkan kolom baru ke Spreadsheet.
 * 4. Deploy ulang sebagai versi baru (New Version).
 */

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    var action = e.parameter.action;
    var collection = e.parameter.collection;
    var id = e.parameter.id;
    var data = null;

    if (e.postData && e.postData.contents) {
      var body = JSON.parse(e.postData.contents);
      if (body.action) action = body.action;
      if (body.collection) collection = body.collection;
      if (body.data) data = body.data;
      if (body.id) id = body.id;
    }

    var result = {};

    if (action === 'getAll') {
      result = getAllData();
    } else if (action === 'create') {
      result = createItem(collection, data);
    } else if (action === 'update') {
      result = updateItem(collection, id, data);
    } else if (action === 'delete') {
      result = deleteItem(collection, id);
    } else {
      result = { status: 'error', message: 'Invalid action' };
    }

    output.setContent(JSON.stringify(result));
    return output;

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// --- DATABASE OPERATIONS ---

function getAllData() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheets = ['Settings', 'Students', 'Packets', 'Questions', 'Exams', 'Results', 'Materials'];
  var allData = {};

  sheets.forEach(function(sheetName) {
    var sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];
        var rows = data.slice(1);

        allData[sheetName] = rows.map(function(row) {
          var obj = {};
          headers.forEach(function(header, index) {
            var value = row[index];
            // Try to parse JSON strings back to objects/arrays
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
               try {
                 obj[header] = JSON.parse(value);
               } catch (e) {
                 obj[header] = value;
               }
            } else {
               obj[header] = value;
            }
          });
          return obj;
        });
      } else {
        allData[sheetName] = [];
      }
    } else {
      allData[sheetName] = [];
    }
  });

  return allData;
}

function createItem(collection, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(collection);
  if (!sheet) return { status: 'error', message: 'Collection not found: ' + collection };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];

  headers.forEach(function(header) {
    var value = data[header];
    if (typeof value === 'object' && value !== null) {
      row.push(JSON.stringify(value));
    } else {
      row.push(value === undefined ? '' : value);
    }
  });

  sheet.appendRow(row);
  return { status: 'success', data: data };
}

function updateItem(collection, id, data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(collection);
  if (!sheet) return { status: 'error', message: 'Collection not found' };

  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  var headers = values[0];
  var idIndex = headers.indexOf('id');

  if (idIndex === -1) return { status: 'error', message: 'ID column not found' };

  // Find row by ID
  for (var i = 1; i < values.length; i++) {
    if (values[i][idIndex] == id) {
      var rowIndex = i + 1;

      // Update columns present in data
      for (var key in data) {
        var colIndex = headers.indexOf(key);
        if (colIndex !== -1) {
          var value = data[key];
          if (typeof value === 'object' && value !== null) {
            value = JSON.stringify(value);
          }
          sheet.getRange(rowIndex, colIndex + 1).setValue(value);
        }
      }
      return { status: 'success', message: 'Updated' };
    }
  }

  return { status: 'error', message: 'Item not found' };
}

function deleteItem(collection, id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(collection);
  if (!sheet) return { status: 'error', message: 'Collection not found' };

  var dataRange = sheet.getDataRange();
  var values = dataRange.getValues();
  var headers = values[0];
  var idIndex = headers.indexOf('id');

  if (idIndex === -1) return { status: 'error', message: 'ID column not found' };

  for (var i = 1; i < values.length; i++) {
    if (values[i][idIndex] == id) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Deleted' };
    }
  }

  return { status: 'error', message: 'Item not found' };
}

// --- SETUP FUNCTION ---
// Jalankan fungsi ini sekali untuk membuat/update struktur kolom
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error("Tidak dapat menemukan Spreadsheet aktif. Pastikan script dibuka melalui Ekstensi > Apps Script di dalam Google Sheet.");
  }

  // Definisi kolom terbaru
  var schemas = {
    'Settings': ['id', 'schoolName', 'loginTitle', 'academicYear', 'semester', 'adminPassword', 'teacherIpaPassword', 'teacherIpsPassword', 'teacherMtkPassword', 'teacherLiterasiPassword', 'teacherNumerasiPassword'],
    'Students': ['id', 'no', 'name', 'class', 'nis', 'nisn', 'osnSubjects', 'readMaterials', 'completedSchedules'],
    'Packets': ['id', 'name', 'category', 'totalQuestions', 'questionTypes'],
    'Questions': ['id', 'packetId', 'number', 'stimulus', 'text', 'image', 'type', 'options', 'correctAnswerIndex', 'correctAnswerIndices', 'matchingPairs', 'category', 'discussion'],
    'Exams': ['id', 'title', 'category', 'packetId', 'materialId', 'scheduledStart', 'scheduledEnd', 'durationMinutes', 'classTarget', 'questions', 'isActive', 'allowRetry', 'minScore', 'order'],
    'Results': ['id', 'examId', 'examTitle', 'studentId', 'studentName', 'studentClass', 'score', 'literasiScore', 'numerasiScore', 'answers', 'timestamp', 'violationCount', 'isDisqualified', 'category', 'title', 'type', 'content', 'embedCode', 'createdAt'],
    'Materials': ['id', 'title', 'category', 'type', 'content', 'createdAt', 'embedCode']
  };

  for (var sheetName in schemas) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    var desiredHeaders = schemas[sheetName];
    var lastCol = sheet.getLastColumn();
    var currentHeaders = [];

    if (lastCol > 0) {
       currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }

    // Cari header yang belum ada
    var missingHeaders = [];
    for (var i = 0; i < desiredHeaders.length; i++) {
      if (currentHeaders.indexOf(desiredHeaders[i]) === -1) {
        missingHeaders.push(desiredHeaders[i]);
      }
    }

    // Tambahkan missing headers sekaligus (Batch Operation) untuk menghindari error timeout
    if (missingHeaders.length > 0) {
      sheet.getRange(1, lastCol + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    }
  }
}
