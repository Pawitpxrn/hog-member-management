const jwt = require('jsonwebtoken');

const JWT_SECRET = 'hog_harley_davidson_secret_key_2026_super_secure';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: ไม่พบข้อมูล Token ยืนยันตัวตน' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Forbidden: Session หมดอายุหรือ Token ไม่ถูกต้อง' });
    }
    req.user = user;
    next();
  });
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden: บัญชีผู้ใช้นี้ไม่มีสิทธิ์ดำเนินการในส่วนนี้' });
    }
    next();
  };
}

module.exports = {
  JWT_SECRET,
  authenticateToken,
  authorizeRoles
};
