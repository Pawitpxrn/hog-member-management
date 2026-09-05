const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'hog_database.json');

// Memory/File DB Store
let dbData = {
  users: [],
  members: [],
  audit_logs: [],
  sheets_config: {
    webhook_url: '',
    enabled: false,
    last_sync: null,
    sync_status: 'NOT_CONFIGURED'
  }
};

function loadDb() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      dbData = JSON.parse(content);
      if (!Array.isArray(dbData.tag_masters)) {
        dbData.tag_masters = [
          { id: 'tag-001', name: 'Officer', expiry_type: 'LIFETIME', color: '#ff6600', description: 'กรรมการกลุ่ม / ผู้บริหาร' },
          { id: 'tag-002', name: 'VIP', expiry_type: 'LIFETIME', color: '#eab308', description: 'สมาชิก VIP กิตติมศักดิ์' },
          { id: 'tag-003', name: 'Rally Leader', expiry_type: 'EXPIRY_REQUIRED', color: '#c084fc', description: 'ผู้นำทริปเดินทาง' },
          { id: 'tag-004', name: 'Safety Officer', expiry_type: 'EXPIRY_REQUIRED', color: '#60a5fa', description: 'เจ้าหน้าที่ดูแลความปลอดภัย' },
          { id: 'tag-005', name: 'Regular', expiry_type: 'EXPIRY_REQUIRED', color: '#94a3b8', description: 'สมาชิกทั่วไป' }
        ];
      }

      // Ensure missing schema fields & migrate member codes to simple 1, 2, 3...
      if (Array.isArray(dbData.members)) {
        dbData.members.forEach((m, idx) => {
          if (!m.tags) m.tags = [];
          if (!m.chapter_expiry_date) m.chapter_expiry_date = m.hog_th_expiry_date || m.expiry_date || '';
          if (!m.interaction_logs) m.interaction_logs = [];

          // Convert old format HOG-2026-0001 to simple sequence number "1", "2", "3"...
          if (!m.member_code || /^HOG-/i.test(m.member_code)) {
            m.member_code = (idx + 1).toString();
          }

          m.tags.forEach(tName => {
            if (!tName || typeof tName !== 'string') return;
            const trimmed = tName.trim();
            if (!trimmed) return;
            const exists = dbData.tag_masters.some(tm => tm.name.toLowerCase() === trimmed.toLowerCase());
            if (!exists) {
              const isLifetime = isLifetimeTag(trimmed);
              dbData.tag_masters.push({
                id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                name: trimmed,
                expiry_type: isLifetime ? 'LIFETIME' : 'EXPIRY_REQUIRED',
                color: isLifetime ? '#eab308' : '#ff6600',
                description: 'สร้างขึ้นอัตโนมัติจากข้อมูลสมาชิกในระบบ'
              });
            }
          });
        });
      }
    } catch (err) {
      console.error('Error loading DB file, reinitializing...', err);
      initSeedData();
    }
  } else {
    initSeedData();
  }
}

function saveDb() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbData, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving DB file:', err);
  }
}

function initSeedData() {
  console.log('Initializing clean database for HOG Harley Member Management System...');
  
  const adminPasswordHash = bcrypt.hashSync('admin123', 10);
  const staffPasswordHash = bcrypt.hashSync('staff123', 10);
  
  dbData.tag_masters = [
    { id: 'tag-001', name: 'Officer', expiry_type: 'LIFETIME', color: '#ff6600', description: 'กรรมการกลุ่ม / ผู้บริหาร (ไม่มีวันหมดอายุ)' },
    { id: 'tag-002', name: 'VIP', expiry_type: 'LIFETIME', color: '#eab308', description: 'สมาชิก VIP กิตติมศักดิ์ (ไม่มีวันหมดอายุ)' },
    { id: 'tag-003', name: 'Member', expiry_type: 'EXPIRY_REQUIRED', color: '#94a3b8', description: 'สมาชิกทั่วไป (กำหนดวันหมดอายุ)' }
  ];

  dbData.users = [
    {
      id: 'usr-admin-01',
      username: 'admin',
      password_hash: adminPasswordHash,
      full_name: 'Administrator',
      role: 'admin',
      created_at: new Date('2025-01-01T08:00:00Z').toISOString()
    },
    {
      id: 'usr-staff-01',
      username: 'staff',
      password_hash: staffPasswordHash,
      full_name: 'Officer',
      role: 'staff',
      created_at: new Date('2025-01-15T09:30:00Z').toISOString()
    }
  ];

  dbData.members = [];

  dbData.audit_logs = [
    {
      id: 'log-001',
      username: 'admin',
      action: 'SYSTEM_INIT',
      target_id: 'SYSTEM',
      details: 'ล้างข้อมูลและเริ่มต้นระบบ HOG Member Management System พร้อมใช้งานจริง',
      created_at: new Date().toISOString()
    }
  ];

  saveDb();
}

loadDb();

// Helper to check if a tag grants lifetime active status
function isLifetimeTag(tag) {
  if (!tag || typeof tag !== 'string') return false;
  
  if (Array.isArray(dbData.tag_masters)) {
    const found = dbData.tag_masters.find(t => t.name.toLowerCase() === tag.trim().toLowerCase());
    if (found) {
      return found.expiry_type === 'LIFETIME';
    }
  }

  const lower = tag.toLowerCase();
  return lower.includes('officer') || 
         lower.includes('vip') || 
         lower.includes('lifetime') || 
         lower.includes('กิตติมศักดิ์') || 
         lower.includes('ประธาน');
}

// Derived Status Calculation Rule (BR-004 + Officer/VIP Rule)
function calculateMemberStatus(memberOrDate) {
  if (!memberOrDate) return 'Expired';

  let chapterExp = '';
  let tags = [];

  if (typeof memberOrDate === 'object') {
    tags = memberOrDate.tags || [];
    chapterExp = memberOrDate.chapter_expiry_date || memberOrDate.hog_th_expiry_date || memberOrDate.expiry_date;
  } else if (typeof memberOrDate === 'string') {
    chapterExp = memberOrDate;
  }

  // Special Rule: Officer / VIP / Lifetime / Honorary custom tags have Lifetime Active Status with no expiry required
  if (tags.some(t => isLifetimeTag(t))) {
    return 'Active';
  }

  if (!chapterExp) return 'Expired';

  const todayStr = new Date().toISOString().split('T')[0];
  if (chapterExp >= todayStr) {
    return 'Active';
  }
  return 'Expired';
}

function getDaysUntilExpiry(memberOrDate) {
  if (!memberOrDate) return -999;

  let chapterExp = '';
  let tags = [];

  if (typeof memberOrDate === 'object') {
    tags = memberOrDate.tags || [];
    chapterExp = memberOrDate.chapter_expiry_date || memberOrDate.hog_th_expiry_date || memberOrDate.expiry_date;
  } else if (typeof memberOrDate === 'string') {
    chapterExp = memberOrDate;
  }

  if (tags.some(t => isLifetimeTag(t))) {
    return 999; // Lifetime
  }

  if (!chapterExp) return -999;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(chapterExp);
  exp.setHours(0, 0, 0, 0);
  const diffTime = exp.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

module.exports = {
  dbData,
  saveDb,
  initSeedData,
  calculateMemberStatus,
  getDaysUntilExpiry
};

