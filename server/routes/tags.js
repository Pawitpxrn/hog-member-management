const express = require('express');
const router = express.Router();
const { dbData, saveDb } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

function recordAuditLog(username, action, targetId, details) {
  const logEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    username,
    action,
    target_id: targetId,
    details,
    created_at: new Date().toISOString()
  };
  dbData.audit_logs.unshift(logEntry);
}

// GET /api/tags - List all tag masters
router.get('/', authenticateToken, (req, res) => {
  res.json({ tags: dbData.tag_masters || [] });
});

// POST /api/tags - Create new tag master
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { name, expiry_type, color, description, expiry_rule_label } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อแท็ก' });
  }

  const tagName = name.trim();
  const exists = (dbData.tag_masters || []).some(t => t.name.toLowerCase() === tagName.toLowerCase());
  if (exists) {
    return res.status(400).json({ message: `ชื่อแท็ก "${tagName}" มีอยู่ในระบบแล้ว` });
  }

  const newTag = {
    id: `tag-${Date.now()}`,
    name: tagName,
    expiry_type: expiry_type === 'LIFETIME' ? 'LIFETIME' : 'EXPIRY_REQUIRED',
    expiry_rule_label: expiry_rule_label ? expiry_rule_label.trim() : '',
    color: color || '#ff6600',
    description: description ? description.trim() : ''
  };

  if (!Array.isArray(dbData.tag_masters)) {
    dbData.tag_masters = [];
  }

  dbData.tag_masters.push(newTag);

  recordAuditLog(
    req.user.username,
    'ADD_TAG_MASTER',
    newTag.id,
    `เพิ่มมาสเตอร์แท็กใหม่: "${newTag.name}" (${newTag.expiry_type === 'LIFETIME' ? 'Active ตลอดชีพ' : 'กำหนดวันหมดอายุ'})`
  );

  saveDb();

  res.status(201).json({
    message: 'เพิ่มแท็กใหม่สำเร็จ',
    tag: newTag,
    tags: dbData.tag_masters
  });
});

// PUT /api/tags/:id - Update tag master
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { name, expiry_type, color, description, expiry_rule_label } = req.body;

  const index = (dbData.tag_masters || []).findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'ไม่พบข้อมูลแท็กที่ต้องการแก้ไข' });
  }

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อแท็ก' });
  }

  const tagName = name.trim();
  const duplicate = dbData.tag_masters.find(t => t.id !== id && t.name.toLowerCase() === tagName.toLowerCase());
  if (duplicate) {
    return res.status(400).json({ message: `ชื่อแท็ก "${tagName}" ซ้ำกับแท็กอื่นในระบบ` });
  }

  const oldName = dbData.tag_masters[index].name;

  const updatedTag = {
    ...dbData.tag_masters[index],
    name: tagName,
    expiry_type: expiry_type === 'LIFETIME' ? 'LIFETIME' : 'EXPIRY_REQUIRED',
    expiry_rule_label: expiry_rule_label !== undefined ? expiry_rule_label.trim() : (dbData.tag_masters[index].expiry_rule_label || ''),
    color: color || dbData.tag_masters[index].color || '#ff6600',
    description: description !== undefined ? description.trim() : dbData.tag_masters[index].description
  };

  dbData.tag_masters[index] = updatedTag;

  // Cascade update to all member records if tag name changed
  if (oldName.toLowerCase() !== tagName.toLowerCase() && Array.isArray(dbData.members)) {
    dbData.members.forEach(m => {
      if (Array.isArray(m.tags)) {
        m.tags = m.tags.map(t => t.toLowerCase() === oldName.toLowerCase() ? tagName : t);
      }
    });
  }

  recordAuditLog(
    req.user.username,
    'UPDATE_TAG_MASTER',
    updatedTag.id,
    `แก้ไขมาสเตอร์แท็ก: "${oldName}" -> "${updatedTag.name}" (${updatedTag.expiry_type})`
  );

  saveDb();

  res.json({
    message: 'แก้ไขข้อมูลแท็กและอัปเดตสมาชิกที่เกี่ยวข้องสำเร็จ',
    tag: updatedTag,
    tags: dbData.tag_masters
  });
});

// DELETE /api/tags/:id - Delete tag master
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;

  const index = (dbData.tag_masters || []).findIndex(t => t.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'ไม่พบข้อมูลแท็กที่ต้องการลบ' });
  }

  const deleted = dbData.tag_masters[index];
  const oldName = deleted.name;

  dbData.tag_masters.splice(index, 1);

  // Cascade remove deleted tag from member records
  if (Array.isArray(dbData.members)) {
    dbData.members.forEach(m => {
      if (Array.isArray(m.tags)) {
        m.tags = m.tags.filter(t => t.toLowerCase() !== oldName.toLowerCase());
      }
    });
  }

  recordAuditLog(
    req.user.username,
    'DELETE_TAG_MASTER',
    id,
    `ลบมาสเตอร์แท็ก: "${oldName}" (อัปเดตสมาชิกที่ใช้แท็กนี้เรียบร้อย)`
  );

  saveDb();

  res.json({
    message: `ลบแท็ก "${oldName}" และอัปเดตสมาชิกเรียบร้อยแล้ว`,
    tags: dbData.tag_masters
  });
});

module.exports = router;
