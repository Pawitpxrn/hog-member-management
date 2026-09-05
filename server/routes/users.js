const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { dbData, saveDb } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { notifyAuditLog } = require('../services/googleSheets');

// GET /api/users - List all system users (Admin only)
router.get('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const users = (dbData.users || []).map(u => ({
    id: u.id,
    username: u.username,
    full_name: (u.full_name || '').replace(/HOG (Club\s*)?/gi, '').trim() || 'Administrator',
    role: u.role,
    created_at: u.created_at
  }));
  return res.json({ users });
});

// POST /api/users - Create new user (Admin only)
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { username, password, full_name, role } = req.body;

  if (!username || !username.trim()) {
    return res.status(400).json({ message: 'กรุณากรอก Username' });
  }

  if (!password || password.length < 4) {
    return res.status(400).json({ message: 'กรุณากรอก Password อย่างน้อย 4 ตัวอักษร' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const existingUser = (dbData.users || []).find(u => u.username.toLowerCase() === cleanUsername);

  if (existingUser) {
    return res.status(400).json({ message: `Username "${cleanUsername}" มีในระบบแล้ว` });
  }

  const userRole = role === 'admin' ? 'admin' : 'staff';
  const passwordHash = bcrypt.hashSync(password, 10);
  const cleanFullName = (full_name || '').replace(/HOG (Club\s*)?/gi, '').trim() || (userRole === 'admin' ? 'Administrator' : 'Officer');

  const newUser = {
    id: `usr-${Date.now()}`,
    username: cleanUsername,
    password_hash: passwordHash,
    full_name: cleanFullName,
    role: userRole,
    created_at: new Date().toISOString()
  };

  dbData.users.push(newUser);

  // Record Audit Log
  const logEntry = {
    id: `log-${Date.now()}`,
    username: req.user.username,
    action: 'CREATE_USER',
    target_id: newUser.id,
    details: `สร้างผู้ใช้งานใหม่: ${newUser.username} (บทบาท: ${userRole.toUpperCase()})`,
    created_at: new Date().toISOString()
  };
  dbData.audit_logs.unshift(logEntry);

  saveDb();
  notifyAuditLog(logEntry);

  return res.status(201).json({
    message: 'สร้างผู้ใช้งานสำเร็จ',
    user: {
      id: newUser.id,
      username: newUser.username,
      full_name: newUser.full_name,
      role: newUser.role,
      created_at: newUser.created_at
    }
  });
});

// PUT /api/users/:id - Update user / Reset password (Admin only)
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { password, full_name, role } = req.body;

  const userIndex = (dbData.users || []).findIndex(u => u.id === id);
  if (userIndex === -1) {
    return res.status(404).json({ message: 'ไม่พบผู้ใช้งานในระบบ' });
  }

  const user = dbData.users[userIndex];

  if (full_name !== undefined) {
    user.full_name = (full_name || '').replace(/HOG (Club\s*)?/gi, '').trim() || user.username;
  }

  if (role !== undefined) {
    user.role = role === 'admin' ? 'admin' : 'staff';
  }

  let resetMsg = '';
  if (password && password.trim()) {
    if (password.length < 4) {
      return res.status(400).json({ message: 'Password ใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
    }
    user.password_hash = bcrypt.hashSync(password.trim(), 10);
    resetMsg = ' (เปลี่ยนรหัสผ่านสำเร็จ)';
  }

  dbData.users[userIndex] = user;

  // Record Audit Log
  const logEntry = {
    id: `log-${Date.now()}`,
    username: req.user.username,
    action: 'UPDATE_USER',
    target_id: user.id,
    details: `อัปเดตข้อมูลผู้ใช้งาน: ${user.username}${resetMsg}`,
    created_at: new Date().toISOString()
  };
  dbData.audit_logs.unshift(logEntry);

  saveDb();
  notifyAuditLog(logEntry);

  return res.json({
    message: `อัปเดตข้อมูลผู้ใช้ ${user.username} สำเร็จ${resetMsg}`,
    user: {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      role: user.role,
      created_at: user.created_at
    }
  });
});

// DELETE /api/users/:id - Delete user (Admin only)
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;

  const targetUser = (dbData.users || []).find(u => u.id === id);
  if (!targetUser) {
    return res.status(404).json({ message: 'ไม่พบผู้ใช้งานในระบบ' });
  }

  if (targetUser.username.toLowerCase() === req.user.username.toLowerCase()) {
    return res.status(400).json({ message: 'ไม่สามารถลบบัญชีของตนเองที่กำลังใช้งานอยู่ได้' });
  }

  dbData.users = dbData.users.filter(u => u.id !== id);

  // Record Audit Log
  const logEntry = {
    id: `log-${Date.now()}`,
    username: req.user.username,
    action: 'DELETE_USER',
    target_id: id,
    details: `ลบผู้ใช้งาน: ${targetUser.username}`,
    created_at: new Date().toISOString()
  };
  dbData.audit_logs.unshift(logEntry);

  saveDb();
  notifyAuditLog(logEntry);

  return res.json({ message: `ลบผู้ใช้งาน ${targetUser.username} เรียบร้อยแล้ว` });
});

module.exports = router;
