const SHEET_ID = "1am5BQh6oesQXoJgdeTpiDTIEuzf8UdfWotPXSoqOLiU";

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const ss = SpreadsheetApp.openById(SHEET_ID);

    if (action === "getUsers") {
      const sheet = ss.getSheetByName("Users");
      const rows = sheet.getDataRange().getValues();
      let headerIdx = rows.findIndex(r => r.some(c => String(c).toLowerCase() === "username"));
      if (headerIdx === -1) headerIdx = 0;
      const headers = rows[headerIdx];
      const users = rows.slice(headerIdx + 1).filter(r => r[0]).map(r => {
        const obj = {};
        headers.forEach((h, i) => obj[h] = r[i]);
        return obj;
      });
      return json({ users });
    }

    if (action === "getClients") {
      const sheet = ss.getSheetByName("לקוחות");
      const rows = sheet.getDataRange().getValues();
      let headerIdx = rows.findIndex(r => String(r[0]).includes("שם_לקוח") || String(r[0]).includes("שם לקוח"));
      if (headerIdx === -1) headerIdx = 2;
      const clients = rows.slice(headerIdx + 1).filter(r => r[0]).map(r => ({
        name: String(r[0]), phone: String(r[1]), address: String(r[2])
      }));
      return json({ clients });
    }

    if (action === "getTasks") {
      const sheet = ss.getSheetByName("משימות");
      const rows = sheet.getDataRange().getValues();
      let headerIdx = rows.findIndex(r => String(r[0]).toUpperCase() === "ID");
      if (headerIdx === -1) headerIdx = 2;
      const tasks = rows.slice(headerIdx + 1).filter(r => r[0]).map(r => ({
        id: r[0], date: r[1], client: r[2],
        operators: r[3] ? String(r[3]).split(",").map(x => x.trim()) : [],
        status: r[4],
        changeLog: r[5] ? JSON.parse(String(r[5])) : []
      }));
      return json({ tasks });
    }

    if (action === "saveTasks") {
      const sheet = ss.getSheetByName("משימות");
      const rows = sheet.getDataRange().getValues();
      let headerIdx = rows.findIndex(r => String(r[0]).toUpperCase() === "ID");
      if (headerIdx === -1) headerIdx = 2;
      const dataStart = headerIdx + 2;
      const last = sheet.getLastRow();
      if (last >= dataStart) sheet.deleteRows(dataStart, last - dataStart + 1);
      data.tasks.forEach(t => {
        sheet.appendRow([t.id, t.date, t.client, t.operators.join(","), t.status, JSON.stringify(t.changeLog)]);
      });
      return json({ success: true });
    }

    if (action === "saveReport") {
      const sheet = ss.getSheetByName("דוחות");
      const r = data.report;
      sheet.appendRow([r.reportDate, r.operator, r.client, r.chlorine, r.ph, r.salt,
        r.waterLevel, r.clarity, r.fat, r.flow, r.elModel, r.elSerial,
        r.elDate, r.elNext, r.supplyLabel, r.poolStatus, r.customStatusText,
        r.restrictedUntil, r.notes]);
      return json({ success: true });
    }

    if (action === "saveSupplyDB") {
      const sheet = ss.getSheetByName("ציוד_לקוחות");
      const last = sheet.getLastRow();
      if (last > 3) sheet.deleteRows(4, last - 3);
      data.rows.forEach(r => sheet.appendRow(r));
      return json({ success: true });
    }

    if (action === "getSupplyDB") {
      const sheet = ss.getSheetByName("ציוד_לקוחות");
      const rows = sheet.getDataRange().getValues();
      const db = {};
      rows.slice(3).filter(r => r[0]).forEach(r => {
        db[String(r[0])] = {
          acid: r[1] === "כן", phUp: r[2] === "כן",
          saltPkg: r[3] === "כן", saltBags: parseInt(r[4]) || 1,
          updatedAt: String(r[5])
        };
      });
      return json({ supplyDB: db });
    }

    return json({ error: "unknown action" });

  } catch(err) {
    return json({ error: err.message });
  }
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function testUsers() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName("Users");
  const rows = sheet.getDataRange().getValues();
  Logger.log("Total rows: " + rows.length);
  rows.forEach((r, i) => Logger.log("Row " + i + ": " + JSON.stringify(r)));
}
