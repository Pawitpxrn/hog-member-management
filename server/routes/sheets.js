const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getSheetsConfig,
  setSheetsConfig,
  syncAllToGoogleSheet,
  GOOGLE_APPS_SCRIPT_CODE
} = require('../services/googleSheets');

router.get('/config', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const config = getSheetsConfig();
  return res.json({
    config,
    script_template: GOOGLE_APPS_SCRIPT_CODE
  });
});

router.post('/config', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { webhook_url } = req.body;
  const config = setSheetsConfig(webhook_url || '');
  return res.json({
    message: config.enabled ? 'บันทึก Webhook URL ของ Google Sheets เรียบร้อยแล้ว' : 'ปิดการใช้งาน Google Sheets Sync',
    config
  });
});

router.post('/sync-all', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  const config = getSheetsConfig();
  if (!config.enabled || !config.webhook_url) {
    return res.status(400).json({ message: 'กรุณาตั้งค่า Google Sheets Webhook URL ก่อนทำการซิงค์ข้อมูล' });
  }

  const result = await syncAllToGoogleSheet();
  if (result.success) {
    return res.json({ message: 'ซิงค์ข้อมูลทั้งหมดไปยัง Google Sheets สำเร็จเรียบร้อยแล้ว!' });
  } else {
    return res.status(400).json({
      message: result.reason || 'เกิดข้อผิดพลาดในการเชื่อมต่อกับ Google Sheets',
      details: result
    });
  }
});

module.exports = router;
