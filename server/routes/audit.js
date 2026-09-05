const express = require('express');
const router = express.Router();
const { dbData } = require('../db');
const { authenticateToken } = require('../middleware/auth');

// GET /api/audit-logs - Retrieve system audit trail (FR-010)
router.get('/', authenticateToken, (req, res) => {
  const logs = [...dbData.audit_logs];
  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return res.json({ logs: logs.slice(0, 100) });
});

module.exports = router;
