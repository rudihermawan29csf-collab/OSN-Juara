/**
 * KODE GOOGLE APPS SCRIPT UNTUK CBT APP
 * 
 * CARA PENGGUNAAN:
 * 1. Buat Spreadsheet baru di Google Drive.
 * 2. Beri nama file: "CBT_Database_SMPN3"
 * 3. Buat sheet-sheet berikut (perhatikan besar kecil huruf):
 *    - Settings
 *    - Students
 *    - Packets
 *    - Questions
 *    - Exams
 *    - Results
 *    - Materials
 * 
 * 4. Buat header kolom di baris 1 untuk setiap sheet:
 *    - Settings: schoolName, loginTitle, academicYear, semester, adminPassword, teacherIpaPassword, teacherIpsPassword, teacherMtkPassword
 *    - Students: id, no, name, class, nis, nisn, osnSubjects
 *    - Packets: id, name, category, totalQuestions, questionTypes
 *    - Questions: id, packetId, number, type, text, stimulus, image, options, correctAnswerIndex, correctAnswerIndices, matchingPairs, category, discussion
 *    - Exams: id, title, category, packetId, scheduledStart, scheduledEnd, durationMinutes, classTarget, questions, isActive, allowRetry
 *    - Results: id, examId, examTitle, studentName, studentClass, score, answers, timestamp
 *    - Materials: id, category, title, type, content, embedCode, createdAt
 * 
 * 5. Klik Extensions > Apps Script.
 * 6. Copy-paste kode di bawah ini ke file Code.gs.
 * 7. Klik Deploy > New Deployment.
 * 8. Pilih type: "Web app".
 * 9. Description: "Versi 1".
 * 10. Execute as: "Me" (email anda).
 * 11. Who has access: "Anyone" (Siapa saja). PENTING!
 * 12. Klik Deploy.
 * 13. Salin "Web App URL" yang muncul.
 * 14. Paste URL tersebut di menu Pengaturan aplikasi CBT.
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
    var params = e.parameter;
    var postData = e.postData ? JSON.parse(e.postData.contents) : {};
    
    // Combine params and postData
    var action = params.action || postData.action;
    var collection = params.collection || postData.collection;
    var data = postData.data;
    var id = params.id || postData.id;

    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'getAll') {
      // Return ALL data for initial sync
      var result = {};
      var sheets = ['Settings', 'Students', 'Packets', 'Questions', 'Exams', 'Results', 'Materials'];
      
      sheets.forEach(function(sheetName) {
        var sheet = ss.getSheetByName(sheetName);
        if (sheet) {
          result[sheetName] = getSheetData(sheet);
        } else {
          result[sheetName] = [];
        }
      });
      
      return ContentService.createTextOutput(JSON.stringify(result))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Handle CRUD for specific collection
    var sheet = ss.getSheetByName(collection);
    if (!sheet) {
      return errorResponse("Sheet not found: " + collection);
    }

    if (action === 'create') {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var row = [];
      headers.forEach(function(header) {
        var val = data[header];
        // Convert arrays/objects to JSON string
        if (typeof val === 'object' && val !== null) {
          row.push(JSON.stringify(val));
        } else {
          row.push(val === undefined ? '' : val);
        }
      });
      sheet.appendRow(row);
      return successResponse("Created");
    }

    if (action === 'update') {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var idIndex = headers.indexOf('id');
      
      if (idIndex === -1) return errorResponse("ID column not found");

      // Find row by ID (skip header)
      for (var i = 1; i < values.length; i++) {
        if (values[i][idIndex] == id) {
          var row = [];
          headers.forEach(function(header) {
            var val = data[header];
            if (typeof val === 'object' && val !== null) {
              row.push(JSON.stringify(val));
            } else {
              row.push(val === undefined ? values[i][headers.indexOf(header)] : val);
            }
          });
          sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
          return successResponse("Updated");
        }
      }
      return errorResponse("ID not found");
    }

    if (action === 'delete') {
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      var dataRange = sheet.getDataRange();
      var values = dataRange.getValues();
      var idIndex = headers.indexOf('id');

      if (idIndex === -1) return errorResponse("ID column not found");

      for (var i = 1; i < values.length; i++) {
        if (values[i][idIndex] == id) {
          sheet.deleteRow(i + 1);
          return successResponse("Deleted");
        }
      }
      return errorResponse("ID not found");
    }

    return errorResponse("Invalid action");

  } catch (e) {
    return errorResponse(e.toString());
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(sheet) {
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var result = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      // Try to parse JSON strings back to objects if they look like JSON
      if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
        try {
          obj[headers[j]] = JSON.parse(val);
        } catch (e) {
          obj[headers[j]] = val;
        }
      } else {
        obj[headers[j]] = val;
      }
    }
    result.push(obj);
  }
  return result;
}

function successResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({status: 'success', message: msg}))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse(msg) {
  return ContentService.createTextOutput(JSON.stringify({status: 'error', message: msg}))
    .setMimeType(ContentService.MimeType.JSON);
}
