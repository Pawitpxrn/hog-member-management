const bcrypt = require('bcryptjs');

const adminHash = bcrypt.hashSync('admin123', 10);
const staffHash = bcrypt.hashSync('staff123', 10);

console.log('ADMIN_HASH:', adminHash);
console.log('STAFF_HASH:', staffHash);
console.log('Check admin123:', bcrypt.compareSync('admin123', adminHash));
console.log('Check staff123:', bcrypt.compareSync('staff123', staffHash));
