const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbData, saveDb } = require('../db');
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'กรุณากรอก Username และ Password ให้ครบถ้วน' });
  }

  const user = dbData.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
  }

  // Create JWT Token
  const tokenPayload = {
    id: user.id,
    username: user.username,
    full_name: (user.full_name || '').replace(/HOG (Club\s*)?/gi, '').trim() || 'Administrator',
    role: user.role
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '8h' });

  // Record Audit Log (FR-010)
  dbData.audit_logs.unshift({
    id: `log-${Date.now()}`,
    username: user.username,
    action: 'LOGIN',
    target_id: user.id,
    details: `เข้าสู่ระบบสำเร็จในบทบาท ${user.role.toUpperCase()}`,
    created_at: new Date().toISOString()
  });
  saveDb();

  return res.json({
    message: 'เข้าสู่ระบบสำเร็จ',
    token,
    user: tokenPayload
  });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  const user = dbData.users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ message: 'ไม่พบผู้ใช้งาน' });
  }
  return res.json({
    user: {
      id: user.id,
      username: user.username,
      full_name: (user.full_name || '').replace(/HOG (Club\s*)?/gi, '').trim() || 'Administrator',
      role: user.role
    }
  });
});

module.exports = router;
