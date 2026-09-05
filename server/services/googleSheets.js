const { dbData, saveDb } = require('../db');

if (!dbData.sheets_config) {
  dbData.sheets_config = {
    webhook_url: '',
    enabled: false,
    last_sync: null,
    sync_status: 'NOT_CONFIGURED'
  };
}

function getSheetsConfig() {
  return dbData.sheets_config || { webhook_url: '', enabled: false, last_sync: null, sync_status: 'NOT_CONFIGURED' };
}

function setSheetsConfig(url) {
  let cleanUrl = (url || '').trim();
  cleanUrl = cleanUrl.replace(/^["']|["']$/g, '');

  dbData.sheets_config = {
    webhook_url: cleanUrl,
    enabled: !!cleanUrl,
    last_sync: dbData.sheets_config?.last_sync || null,
    sync_status: cleanUrl ? 'CONFIGURED' : 'NOT_CONFIGURED'
  };
  saveDb();
  return dbData.sheets_config;
}

// Ultra-resilient Google Apps Script Sync sender
async function sendToGoogleSheet(payload) {
  const config = getSheetsConfig();
  if (!config.enabled || !config.webhook_url) {
    return { success: false, reason: 'กรุณากรอก Google Sheets Webhook URL ก่อนใช้งาน' };
  }

  let targetUrl = config.webhook_url.trim();

  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    return { success: false, reason: 'รูปแบบ URL ไม่ถูกต้อง ต้องขึ้นต้นด้วย https://script.google.com/...' };
  }

  const jsonString = JSON.stringify(payload);

  try {
    console.log('[GoogleSheets] Sending payload to:', targetUrl);
    
    // Method 1: Try POST with text/plain
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: jsonString,
      redirect: 'follow',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const resText = await response.text();

    if (resText.includes('Sign in - Google Accounts') || resText.includes('ServiceLogin') || resText.includes('accounts.google.com')) {
      dbData.sheets_config.sync_status = 'ERROR';
      saveDb();
      return {
        success: false,
        reason: '⚠️ ติดสิทธิ์การเข้าถึงของ Google: กรุณาไปที่ Apps Script ➔ กด "การทำให้ใช้งานได้" ➔ "จัดการการทำให้ใช้งานได้" ➔ กดไอคอนรูปดินสอ (แก้ไข) ➔ เปลี่ยน "ผู้มีสิทธิ์เข้าถึง (Who has access)" ให้เป็น "ทุกคน (Anyone)" แล้วกด Deploy ใหม่'
      };
    }

    let resJson = null;
    try {
      resJson = JSON.parse(resText);
    } catch (e) {
      // Ignore if HTML
    }

    if (response.ok && resJson && (resJson.status === 'success' || resJson.status === 'ok')) {
      dbData.sheets_config.last_sync = new Date().toISOString();
      dbData.sheets_config.sync_status = 'ONLINE';
      saveDb();
      return { success: true, message: resJson.message || 'ซิงค์สำเร็จ' };
    }

    // Method 2: GET Fallback with URL encoded payload
    console.log('[GoogleSheets] Method 1 non-ideal, trying GET fallback URL payload...');
    const encodedPayload = encodeURIComponent(jsonString);
    const getUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}payload=${encodedPayload}`;

    const getController = new AbortController();
    const getTimeoutId = setTimeout(() => getController.abort(), 15000);

    let getResponse = await fetch(getUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: getController.signal
    });

    clearTimeout(getTimeoutId);

    const getResText = await getResponse.text();

    if (getResText.includes('Sign in - Google Accounts') || getResText.includes('ServiceLogin')) {
      dbData.sheets_config.sync_status = 'ERROR';
      saveDb();
      return {
        success: false,
        reason: '⚠️ ติดสิทธิ์การเข้าถึงของ Google: กรุณาไปที่ Apps Script ➔ กด "การทำให้ใช้งานได้" ➔ "จัดการการทำให้ใช้งานได้" ➔ กดไอคอนรูปดินสอ (แก้ไข) ➔ เปลี่ยน "ผู้มีสิทธิ์เข้าถึง (Who has access)" ให้เป็น "ทุกคน (Anyone)" แล้วกด Deploy ใหม่'
      };
    }

    let getResJson = null;
    try {
      getResJson = JSON.parse(getResText);
    } catch (e) {
      // HTML or error
    }

    if (getResponse.ok && getResJson && (getResJson.status === 'success' || getResJson.status === 'ok')) {
      dbData.sheets_config.last_sync = new Date().toISOString();
      dbData.sheets_config.sync_status = 'ONLINE';
      saveDb();
      return { success: true, message: 'ซิงค์สำเร็จด้วย GET Fallback' };
    }

    dbData.sheets_config.sync_status = 'ERROR';
    saveDb();
    return {
      success: false,
      reason: `Google Apps Script ตอบกลับ HTTP ${response.status}: ${resText.substring(0, 150)}`
    };

  } catch (err) {
    console.error('Google Sheets Sync Error:', err);
    dbData.sheets_config.sync_status = 'ERROR';
    saveDb();
    return {
      success: false,
      reason: `ไม่สามารถเชื่อมต่อได้: ${err.message}`
    };
  }
}

function notifyMemberEvent(action, member) {
  sendToGoogleSheet({
    type: 'MEMBER_EVENT',
    action,
    data: member,
    timestamp: new Date().toISOString()
  });
}

function notifyAuditLog(log) {
  sendToGoogleSheet({
    type: 'AUDIT_LOG',
    data: log,
    timestamp: new Date().toISOString()
  });
}

function notifyCrmLogEvent(member, log) {
  sendToGoogleSheet({
    type: 'CRM_LOG_EVENT',
    data: {
      member_code: member.member_code,
      member_name: member.name,
      username: log.username,
      note: log.note,
      slip_url: log.slip_url || '',
      created_at: log.created_at
    },
    timestamp: new Date().toISOString()
  });
}

async function syncAllToGoogleSheet() {
  const crmLogs = [];
  (dbData.members || []).forEach(m => {
    (m.interaction_logs || []).forEach(log => {
      crmLogs.push({
        member_code: m.member_code,
        member_name: m.name,
        username: log.username,
        note: log.note,
        slip_url: log.slip_url || '',
        created_at: log.created_at
      });
    });
  });
  crmLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const payload = {
    type: 'FULL_SYNC',
    members: dbData.members,
    audit_logs: dbData.audit_logs,
    crm_logs: crmLogs,
    timestamp: new Date().toISOString()
  };
  return await sendToGoogleSheet(payload);
}

const GOOGLE_APPS_SCRIPT_CODE = `// =========================================================================
// GOOGLE APPS SCRIPT สำหรับระบบ HOG HARLEY MEMBER MANAGEMENT SYSTEM (โครงสร้างใหม่ 3 แท็บ)
// =========================================================================

function doPost(e) {
  return handleRequest(e);
}

function doGet(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = null;

    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter && e.parameter.payload) {
      payload = JSON.parse(decodeURIComponent(e.parameter.payload));
    }

    if (!payload) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบข้อมูล payload" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // แท็บ 1: "รายชื่อสมาชิก"
    var membersSheet = getOrCreateSheet(ss, "รายชื่อสมาชิก", [
      "รหัสสมาชิก", "ชื่อ-นามสกุล สมาชิก", "เบอร์โทรศัพท์", "Line ID", "แท็กประเภทสมาชิก", "วันที่ต่ออายุ", "วันหมดอายุ Chapter", "วันหมดอายุ HOG Int", "สถานะสมาชิก", "หมายเหตุ / รุ่นรถ", "รูปสมาชิก (Attachment)", "สลิปโอนเงินต่ออายุ", "อัปเดตล่าสุด"
    ]);
    
    // แท็บ 2: "ประวัติ CRM"
    var crmSheet = getOrCreateSheet(ss, "ประวัติ CRM", [
      "วัน-เวลา (Timestamp)", "รหัสสมาชิก", "ชื่อ-นามสกุล สมาชิก", "ผู้บันทึก", "ข้อความบันทึก / รายละเอียด", "รูปแนบ Attachment"
    ]);

    // แท็บ 3: "Audit Log"
    var auditSheet = getOrCreateSheet(ss, "Audit Log", [
      "วัน-เวลา (Timestamp)", "ผู้ใช้งาน", "ประเภทรายการ", "รหัสเป้าหมาย", "รายละเอียดธุรกรรม"
    ]);

    if (payload.type === "FULL_SYNC") {
      // 1. ซิงค์รายชื่อสมาชิก
      if (membersSheet.getLastRow() > 1) {
        membersSheet.getRange(2, 1, membersSheet.getLastRow() - 1, 13).clearContent();
      }
      if (payload.members && payload.members.length > 0) {
        var mRows = payload.members.map(function(m) {
          var tagsStr = Array.isArray(m.tags) ? m.tags.join(', ') : (m.tags || '');
          var chapterExp = m.chapter_expiry_date || m.hog_th_expiry_date || m.expiry_date || '';
          var statusText = m.status || 'Active';
          var imgUrl = formatHyperlink(m.profile_image_url, "🖼️ เปิดดูรูปสมาชิก");
          var slipUrl = formatHyperlink(m.last_slip_url || (m.interaction_logs && m.interaction_logs.length > 0 && m.interaction_logs[0].slip_url), "📎 เปิดดู Attachment");
          return [
            m.member_code || m.id,
            m.name,
            m.phone,
            m.line_id || '-',
            tagsStr,
            m.renewal_date,
            chapterExp,
            m.hog_int_expiry_date || '',
            statusText,
            m.notes || '',
            imgUrl,
            slipUrl,
            formatThaiDateTime(m.updated_at)
          ];
        });
        membersSheet.getRange(2, 1, mRows.length, 13).setValues(mRows);
      }

      // 2. ซิงค์ประวัติ CRM Logs
      if (crmSheet.getLastRow() > 1) {
        crmSheet.getRange(2, 1, crmSheet.getLastRow() - 1, 6).clearContent();
      }
      if (payload.crm_logs && payload.crm_logs.length > 0) {
        var cRows = payload.crm_logs.map(function(c) {
          return [
            formatThaiDateTime(c.created_at),
            c.member_code || '-',
            c.member_name || '-',
            c.username || '-',
            c.note || '',
            formatHyperlink(c.slip_url, "📎 เปิดดู Attachment")
          ];
        });
        crmSheet.getRange(2, 1, cRows.length, 6).setValues(cRows);
      }

      // 3. ซิงค์ Audit Logs
      if (auditSheet.getLastRow() > 1) {
        auditSheet.getRange(2, 1, auditSheet.getLastRow() - 1, 5).clearContent();
      }
      if (payload.audit_logs && payload.audit_logs.length > 0) {
        var aRows = payload.audit_logs.map(function(l) {
          return [
            formatThaiDateTime(l.created_at),
            l.username,
            translateAction(l.action),
            l.target_id,
            l.details
          ];
        });
        auditSheet.getRange(2, 1, aRows.length, 5).setValues(aRows);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "ซิงค์ข้อมูลเต็มรูปแบบสำเร็จทั้ง 3 แท็บ" }))
        .setMimeType(ContentService.MimeType.JSON);
    } 
    else if (payload.type === "AUDIT_LOG") {
      var l = payload.data;
      if (l) {
        auditSheet.appendRow([
          formatThaiDateTime(l.created_at || new Date().toISOString()),
          l.username || '-',
          translateAction(l.action),
          l.target_id || '-',
          l.details || ''
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (payload.type === "CRM_LOG_EVENT") {
      var c = payload.data;
      if (c) {
        crmSheet.appendRow([
          formatThaiDateTime(c.created_at || new Date().toISOString()),
          c.member_code || '-',
          c.member_name || '-',
          c.username || '-',
          c.note || '',
          formatHyperlink(c.slip_url, "📎 เปิดดู Attachment")
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    else if (payload.type === "MEMBER_EVENT") {
      var m = payload.data;
      if (m) {
        var tagsStr = Array.isArray(m.tags) ? m.tags.join(', ') : (m.tags || '');
        var chapterExp = m.chapter_expiry_date || m.hog_th_expiry_date || m.expiry_date || '';
        var statusText = m.status || 'Active';
        var imgUrl = formatHyperlink(m.profile_image_url, "🖼️ เปิดดูรูปสมาชิก");
        var slipUrl = formatHyperlink(m.last_slip_url || (m.interaction_logs && m.interaction_logs.length > 0 && m.interaction_logs[0].slip_url), "📎 เปิดดู Attachment");
        membersSheet.appendRow([
          m.member_code || m.id,
          m.name,
          m.phone,
          m.line_id || '-',
          tagsStr,
          m.renewal_date,
          chapterExp,
          m.hog_int_expiry_date || '',
          statusText,
          m.notes || '',
          imgUrl,
          slipUrl,
          formatThaiDateTime(m.updated_at || new Date().toISOString())
        ]);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function formatHyperlink(url, label) {
  if (!url || url === '' || url === '-') return '-';
  var fullUrl = url;
  if (fullUrl.indexOf('http://') !== 0 && fullUrl.indexOf('https://') !== 0) {
    fullUrl = 'http://192.168.1.108:5000' + (fullUrl.indexOf('/') === 0 ? '' : '/') + fullUrl;
  }
  return '=HYPERLINK("' + fullUrl + '", "' + label + '")';
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground("#FF6600").setFontColor("#FFFFFF").setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function translateAction(action) {
  switch (action) {
    case 'LOGIN': return 'เข้าสู่ระบบ (LOGIN)';
    case 'CREATE_MEMBER': return 'เพิ่มสมาชิกใหม่ (CREATE)';
    case 'UPDATE_MEMBER': return 'แก้ไขข้อมูลสมาชิก (UPDATE)';
    case 'DELETE_MEMBER': return 'ลบสมาชิก (DELETE)';
    default: return action;
  }
}

function formatThaiDateTime(isoStr) {
  if (!isoStr) return '-';
  try {
    var d = new Date(isoStr);
    return Utilities.formatDate(d, "GMT+7", "yyyy-MM-dd HH:mm:ss");
  } catch (e) {
    return isoStr;
  }
}`;

module.exports = {
  getSheetsConfig,
  setSheetsConfig,
  notifyMemberEvent,
  notifyAuditLog,
  notifyCrmLogEvent,
  syncAllToGoogleSheet,
  GOOGLE_APPS_SCRIPT_CODE
};
