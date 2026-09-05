const express = require('express');
const router = express.Router();
const { dbData, saveDb, calculateMemberStatus, getDaysUntilExpiry } = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { notifyMemberEvent, notifyAuditLog, notifyCrmLogEvent } = require('../services/googleSheets');

function isValidPhone(phone) {
  if (!phone) return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length >= 9 && digitsOnly.length <= 11;
}

function isLifetimeTag(tag) {
  if (!tag || typeof tag !== 'string') return false;
  const lower = tag.toLowerCase();
  return lower.includes('officer') || 
         lower.includes('vip') || 
         lower.includes('lifetime') || 
         lower.includes('กิตติมศักดิ์') || 
         lower.includes('ประธาน');
}

function syncMissingTagsToMaster(memberTags) {
  if (!Array.isArray(memberTags)) return;
  if (!Array.isArray(dbData.tag_masters)) {
    dbData.tag_masters = [];
  }
  memberTags.forEach(tagName => {
    if (!tagName || typeof tagName !== 'string') return;
    const trimmed = tagName.trim();
    if (!trimmed) return;

    const exists = dbData.tag_masters.some(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      const isLifetime = isLifetimeTag(trimmed);
      const newTagMaster = {
        id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: trimmed,
        expiry_type: isLifetime ? 'LIFETIME' : 'EXPIRY_REQUIRED',
        color: isLifetime ? '#eab308' : '#ff6600',
        description: 'สร้างขึ้นอัตโนมัติจากระบบข้อมูลสมาชิก'
      };
      dbData.tag_masters.push(newTagMaster);
    }
  });
}

// GET /api/members - List members with search, status filter, tag filter
router.get('/', authenticateToken, (req, res) => {
  let { search, status, tag, page = 1, limit = 50 } = req.query;
  page = parseInt(page, 10) || 1;
  limit = parseInt(limit, 10) || 50;

  let results = dbData.members.map(m => {
    const computedStatus = calculateMemberStatus(m);
    const daysRemaining = getDaysUntilExpiry(m);
    const isOfficerOrVip = (m.tags || []).some(isLifetimeTag);
    const isExpiringSoon = !isOfficerOrVip && computedStatus === 'Active' && daysRemaining >= 0 && daysRemaining <= 30;

    return {
      ...m,
      line_id: m.line_id || '',
      profile_image_url: m.profile_image_url || '',
      tags: m.tags || [],
      interaction_logs: m.interaction_logs || [],
      chapter_expiry_date: m.chapter_expiry_date || m.hog_th_expiry_date || m.expiry_date || '',
      hog_int_expiry_date: m.hog_int_expiry_date || '',
      status: computedStatus,
      is_officer_or_vip: isOfficerOrVip,
      days_remaining: daysRemaining,
      is_expiring_soon: isExpiringSoon
    };
  });

  // Search filter (Name or Phone or Code)
  if (search) {
    const q = search.trim().toLowerCase();
    results = results.filter(m => 
      (m.name && m.name.toLowerCase().includes(q)) ||
      (m.phone && m.phone.replace(/\D/g, '').includes(q.replace(/\D/g, ''))) ||
      (m.member_code && m.member_code.toLowerCase().includes(q))
    );
  }

  // Tag filter
  if (tag && tag !== 'ALL') {
    results = results.filter(m => (m.tags || []).includes(tag));
  }

  // Status filter (Active / Expired / Expiring Soon)
  if (status) {
    const s = status.toLowerCase();
    if (s === 'active') {
      results = results.filter(m => m.status === 'Active');
    } else if (s === 'expired') {
      results = results.filter(m => m.status === 'Expired');
    } else if (s === 'expiring_soon') {
      results = results.filter(m => m.is_expiring_soon);
    }
  }

  // Sort by created_at descending
  results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const total = results.length;
  const startIndex = (page - 1) * limit;
  const paginatedResults = results.slice(startIndex, startIndex + limit);

  return res.json({
    members: paginatedResults,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit)
    }
  });
});

// GET /api/members/stats - Executive summary metrics
router.get('/stats', authenticateToken, (req, res) => {
  const members = dbData.members.map(m => {
    const isOfficerOrVip = (m.tags || []).includes('Officer') || (m.tags || []).includes('VIP');
    const status = calculateMemberStatus(m);
    const daysRemaining = getDaysUntilExpiry(m);
    return {
      ...m,
      status,
      is_officer_or_vip: isOfficerOrVip,
      days_remaining: daysRemaining
    };
  });

  const total = members.length;
  const active = members.filter(m => m.status === 'Active').length;
  const expired = members.filter(m => m.status === 'Expired').length;
  const expiringSoon = members.filter(m => !m.is_officer_or_vip && m.status === 'Active' && m.days_remaining >= 0 && m.days_remaining <= 30).length;
  const officersCount = members.filter(m => m.is_officer_or_vip).length;

  return res.json({
    total,
    active,
    expired,
    expiring_soon: expiringSoon,
    officers: officersCount
  });
});

// POST /api/members/upload-image - Upload base64 member photo/attachment
router.post('/upload-image', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { image_base64 } = req.body;
  if (!image_base64) {
    return res.status(400).json({ message: 'ไม่พบข้อมูลรูปภาพ' });
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const matches = image_base64.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    
    let ext = 'jpg';
    let dataBuffer;

    if (matches && matches.length === 3) {
      ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      dataBuffer = Buffer.from(matches[2], 'base64');
    } else {
      dataBuffer = Buffer.from(image_base64, 'base64');
    }

    const filename = `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(uploadsDir, filename), dataBuffer);
    const imageUrl = `/uploads/${filename}`;
    return res.json({ message: 'อัปโหลดรูปภาพสำเร็จ', image_url: imageUrl });
  } catch (err) {
    console.error('Image Upload Error:', err);
    return res.status(500).json({ message: 'เกิดข้อผิดพลาดในการบันทึกไฟล์รูปภาพ' });
  }
});

// POST /api/members - Add new member
router.post('/', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { name, phone, line_id, profile_image_url, tags, renewal_date, chapter_expiry_date, hog_int_expiry_date, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อสมาชิก' });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: 'กรุณากรอกเบอร์โทรศัพท์' });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง (กรุณากรอกเบอร์โทร 9-11 หลัก)' });
  }

  const memberTags = Array.isArray(tags) ? tags : [];
  const isOfficerOrVip = memberTags.some(isLifetimeTag);

  // Chapter Expiry Date required unless Officer/VIP
  if (!isOfficerOrVip && !chapter_expiry_date) {
    return res.status(400).json({ message: 'กรุณาระบุวันหมดอายุ Chapter (สำหรับสมาชิกทั่วไป)' });
  }

  if (!isOfficerOrVip && renewal_date && chapter_expiry_date < renewal_date) {
    return res.status(400).json({ message: 'วันหมดอายุ Chapter ต้องไม่เร็วกว่าวันที่ต่ออายุ' });
  }

  // Duplicate Phone check
  const duplicatePhone = dbData.members.find(m => m.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (duplicatePhone) {
    return res.status(400).json({ message: `เบอร์โทรศัพท์ ${phone} มีการลงทะเบียนในระบบแล้ว โดยคุณ ${duplicatePhone.name}` });
  }

  let maxSeq = 0;
  dbData.members.forEach(m => {
    const num = parseInt((m.member_code || '').replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > maxSeq) {
      maxSeq = num;
    }
  });
  const memberCode = (maxSeq + 1).toString();

  const newMember = {
    id: `mem-${Date.now()}`,
    member_code: memberCode,
    name: name.trim(),
    phone: phone.trim(),
    line_id: line_id ? line_id.trim() : '',
    profile_image_url: profile_image_url || '',
    tags: memberTags,
    renewal_date: renewal_date || new Date().toISOString().split('T')[0],
    chapter_expiry_date: isOfficerOrVip ? '' : (chapter_expiry_date || ''),
    hog_int_expiry_date: hog_int_expiry_date || '',
    notes: notes ? notes.trim() : '',
    interaction_logs: [],
    created_by: req.user.username,
    updated_by: req.user.username,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  dbData.members.push(newMember);
  syncMissingTagsToMaster(memberTags);

  const logEntry = {
    id: `log-${Date.now()}`,
    username: req.user.username,
    action: 'CREATE_MEMBER',
    target_id: newMember.id,
    details: `เพิ่มสมาชิกใหม่: ${newMember.name} (${newMember.member_code}) [Line: ${newMember.line_id || '-'}]`,
    created_at: new Date().toISOString()
  };
  dbData.audit_logs.unshift(logEntry);

  saveDb();
  notifyMemberEvent('CREATE', { ...newMember, status: calculateMemberStatus(newMember) });

  const status = calculateMemberStatus(newMember);
  return res.status(201).json({
    message: 'เพิ่มสมาชิกใหม่เรียบร้อยแล้ว',
    member: {
      ...newMember,
      status
    }
  });
});

// PUT /api/members/:id - Edit member
router.put('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { name, phone, line_id, profile_image_url, tags, renewal_date, chapter_expiry_date, hog_int_expiry_date, notes } = req.body;

  const index = dbData.members.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'ไม่พบข้อมูลสมาชิกที่ต้องการแก้ไข' });
  }

  const existing = dbData.members[index];

  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อสมาชิก' });
  }

  if (!phone || !phone.trim()) {
    return res.status(400).json({ message: 'กรุณากรอกเบอร์โทรศัพท์' });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' });
  }

  const memberTags = Array.isArray(tags) ? tags : (existing.tags || []);
  const isOfficerOrVip = memberTags.some(isLifetimeTag);

  if (!isOfficerOrVip && !chapter_expiry_date) {
    return res.status(400).json({ message: 'กรุณาระบุวันหมดอายุ Chapter (สำหรับสมาชิกทั่วไป)' });
  }

  // Duplicate Phone check excluding current member
  const duplicatePhone = dbData.members.find(m => m.id !== id && m.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (duplicatePhone) {
    return res.status(400).json({ message: `เบอร์โทรศัพท์ ${phone} มีอยู่ในระบบแล้วโดยสมาชิกท่านอื่น (${duplicatePhone.name})` });
  }

  const updatedMember = {
    ...existing,
    name: name.trim(),
    phone: phone.trim(),
    line_id: line_id !== undefined ? line_id.trim() : (existing.line_id || ''),
    profile_image_url: profile_image_url !== undefined ? profile_image_url : (existing.profile_image_url || ''),
    tags: memberTags,
    renewal_date: renewal_date || existing.renewal_date,
    chapter_expiry_date: isOfficerOrVip ? '' : (chapter_expiry_date || ''),
    hog_int_expiry_date: hog_int_expiry_date !== undefined ? hog_int_expiry_date : existing.hog_int_expiry_date,
    notes: notes !== undefined ? notes.trim() : existing.notes,
    updated_by: req.user.username,
    updated_at: new Date().toISOString()
  };

  dbData.members[index] = updatedMember;
  syncMissingTagsToMaster(memberTags);

  const logEntry = {
    id: `log-${Date.now()}`,
    username: req.user.username,
    action: 'UPDATE_MEMBER',
    target_id: updatedMember.id,
    details: `แก้ไขข้อมูลสมาชิก: ${updatedMember.name} (${updatedMember.member_code}) [Tags: ${memberTags.join(', ')}]`,
    created_at: new Date().toISOString()
  };
  dbData.audit_logs.unshift(logEntry);

  saveDb();
  notifyMemberEvent('UPDATE', { ...updatedMember, status: calculateMemberStatus(updatedMember) });

  const status = calculateMemberStatus(updatedMember);
  return res.json({
    message: 'อัปเดตข้อมูลสมาชิกเรียบร้อยแล้ว',
    member: {
      ...updatedMember,
      status
    }
  });
});

// POST /api/members/:id/interactions - Add interaction log note & optional transfer slip for a member
router.post('/:id/interactions', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;
  const { note, slip_url } = req.body;

  if (!note || !note.trim()) {
    return res.status(400).json({ message: 'กรุณากรอกข้อความบันทึกการติดต่อ' });
  }

  const index = dbData.members.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'ไม่พบสมาชิกที่ต้องการบันทึกประวัติ' });
  }

  const member = dbData.members[index];
  if (!member.interaction_logs) {
    member.interaction_logs = [];
  }

  const newLog = {
    id: `int-${Date.now()}`,
    username: req.user.username,
    note: note.trim(),
    slip_url: slip_url || '',
    created_at: new Date().toISOString()
  };

  member.interaction_logs.unshift(newLog);
  if (slip_url) {
    member.last_slip_url = slip_url;
  }
  member.updated_by = req.user.username;
  member.updated_at = new Date().toISOString();

  // Audit log for CRM interaction and slip upload
  const auditDetails = slip_url 
    ? `บันทึกประวัติการติดต่อพร้อมแนบสลิปโอนเงิน (${member.name}): "${note.trim()}" [Slip: ${slip_url}]`
    : `บันทึกประวัติการติดต่อสมาชิก (${member.name}): "${note.trim()}"`;

  dbData.audit_logs.unshift({
    id: `log-${Date.now()}`,
    username: req.user.username,
    action: 'UPDATE_MEMBER',
    target_id: member.id,
    details: auditDetails,
    created_at: new Date().toISOString()
  });

  saveDb();
  notifyMemberEvent('UPDATE', { ...member, status: calculateMemberStatus(member) });
  notifyCrmLogEvent(member, newLog);

  return res.status(201).json({
    message: 'บันทึกประวัติการติดต่อเรียบร้อยแล้ว',
    interaction: newLog,
    interaction_logs: member.interaction_logs
  });
});

// DELETE /api/members/:id - Delete member
router.delete('/:id', authenticateToken, authorizeRoles('admin'), (req, res) => {
  const { id } = req.params;

  const index = dbData.members.findIndex(m => m.id === id);
  if (index === -1) {
    return res.status(404).json({ message: 'ไม่พบสมาชิกที่ต้องการลบ' });
  }

  const target = dbData.members[index];
  dbData.members.splice(index, 1);

  dbData.audit_logs.unshift({
    id: `log-${Date.now()}`,
    username: req.user.username,
    action: 'DELETE_MEMBER',
    target_id: target.id,
    details: `ลบสมาชิกออกจากระบบ: ${target.name} (${target.member_code})`,
    created_at: new Date().toISOString()
  });

  saveDb();
  notifyMemberEvent('DELETE', target);

  return res.json({ message: 'ลบสมาชิกออกจากระบบสำเร็จ' });
});

module.exports = router;
