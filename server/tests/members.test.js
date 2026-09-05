const assert = require('assert');
const { dbData, calculateMemberStatus, getDaysUntilExpiry } = require('../db');
const bcrypt = require('bcryptjs');

console.log('---------------------------------------------------------');
console.log(' RUNNING AUTOMATED UNIT & INTEGRATION TESTS FOR HOG-MMS');
console.log('---------------------------------------------------------');

function runTests() {
  try {
    // Test 1: Derived Status Logic Rule based on Chapter Expiry Date & Officer/VIP tag
    console.log('[TEST 1] Testing Member Status Derived Calculation...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    assert.strictEqual(calculateMemberStatus(tomorrowStr), 'Active', 'Status should be Active when expiry date is in future');
    assert.strictEqual(calculateMemberStatus(yesterdayStr), 'Expired', 'Status should be Expired when expiry date is in past');

    // Test Officer / VIP Lifetime Active rule
    const officerMember = { tags: ['Officer'], chapter_expiry_date: '' };
    assert.strictEqual(calculateMemberStatus(officerMember), 'Active', 'Officer should have Active status without expiry date');

    console.log('  -> PASS: Member status calculation logic meets specification.');

    // Test 2: Days until expiry calculation
    console.log('[TEST 2] Testing Days Until Expiry Calculation...');
    const daysRem = getDaysUntilExpiry(tomorrowStr);
    assert.strictEqual(daysRem, 1, 'Days remaining should be 1');
    console.log('  -> PASS: Days until expiry calculated correctly.');

    // Test 3: Password verification
    console.log('[TEST 3] Testing Password Hashing & Authentication...');
    const admin = dbData.users.find(u => u.username === 'admin');
    assert.ok(admin, 'Admin user should exist in seed data');
    const isMatch = bcrypt.compareSync('password123', admin.password_hash);
    assert.ok(isMatch, 'Password should match hashed seed password');
    console.log('  -> PASS: Password hashing & verification working properly.');

    // Test 4: Member Data integrity in DB Store
    console.log('[TEST 4] Testing Database Store Structure...');
    assert.ok(Array.isArray(dbData.members), 'Database members store should be an array');
    console.log('  -> PASS: Member store structure verified (ready for production data).');

    // Test 5: Audit Log Recording
    console.log('[TEST 5] Testing Audit Log Recording...');
    assert.ok(dbData.audit_logs.length > 0, 'Audit logs should contain initial logs');
    console.log('  -> PASS: Audit trail records exist.');

    console.log('---------------------------------------------------------');
    console.log(' ALL AUTOMATED TESTS PASSED SUCCESSFULLY! (5/5 PASSED)');
    console.log('---------------------------------------------------------');
  } catch (err) {
    console.error(' TEST FAILED:', err.message);
    process.exit(1);
  }
}

runTests();

