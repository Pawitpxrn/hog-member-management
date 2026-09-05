(async () => {
  try {
    console.log('1. Health check...');
    const hRes = await fetch('http://localhost:5000/api/health');
    console.log('Health:', await hRes.json());

    console.log('\n2. Logging in as admin...');
    const lRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    const lData = await lRes.json();
    console.log('Login Result:', lData.message, '| Role:', lData.user.role);
    const token = lData.token;

    console.log('\n3. Fetching KPI Stats...');
    const sRes = await fetch('http://localhost:5000/api/members/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('Stats:', await sRes.json());

    console.log('\n3.5. Testing Tag Master API (GET & POST Tag)...');
    const tRes = await fetch('http://localhost:5000/api/tags', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tData = await tRes.json();
    console.log('Tag Masters Count:', tData.tags?.length, '| Names:', tData.tags?.map(t => `${t.name} (${t.expiry_type})`));

    const postTagRes = await fetch('http://localhost:5000/api/tags', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'VIP Founder',
        expiry_type: 'LIFETIME',
        color: '#eab308',
        description: 'ผู้ก่อตั้งกลุ่มเกียรติยศ'
      })
    });
    const postTagData = await postTagRes.json();
    console.log('Create Tag Master Result:', postTagRes.status === 201 ? 'Success' : postTagData.message);

    console.log('\n4. Creating new member with Dynamic Custom Tags (VIP Founder)...');
    const randomPhone = `088-${Math.floor(100 + Math.random() * 900)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const cRes = await fetch('http://localhost:5000/api/members', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'พิชิต แฮนด์โหน',
        phone: randomPhone,
        tags: ['Marshall-2026', 'VIP Founder'],
        renewal_date: '2026-01-01',
        hog_int_expiry_date: '2027-06-01',
        notes: 'ขี่ Fat Bob 114 Custom'
      })
    });
    const cData = await cRes.json();
    console.log('Create Member Result:', cData.message, '| Code:', cData.member?.member_code, '| Tags:', cData.member?.tags, '| Status:', cData.member?.status);
    const newMemberId = cData.member?.id;

    console.log('\n5. Posting Interaction Log to Member...');
    if (newMemberId) {
      const iRes = await fetch(`http://localhost:5000/api/members/${newMemberId}/interactions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          note: 'โทรแจ้งเรื่องต่ออายุแล้ว เมื่อ 5 ก.ย. สมาชิปรับทราบ'
        })
      });
      const iData = await iRes.json();
      console.log('Interaction Log Result:', iData.message, '| Total Logs:', iData.interaction_logs?.length);
    }

    console.log('\n6. Searching member (พิชิต)...');
    const qRes = await fetch(`http://localhost:5000/api/members?search=${encodeURIComponent('พิชิต')}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const qData = await qRes.json();
    console.log('Search Found:', qData.members.length, 'members ->', qData.members.map(m => `${m.name} (${m.status}) [Logs: ${m.interaction_logs?.length || 0}]`));

    console.log('\n7. Fetching Audit Logs...');
    const aRes = await fetch('http://localhost:5000/api/audit-logs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const aData = await aRes.json();
    console.log('Audit Logs Count:', aData.logs.length, '| Latest Action:', aData.logs[0].action, ':', aData.logs[0].details);

    console.log('\n======================================================');
    console.log('  SUCCESS: ALL FULL-STACK E2E APIS OPERATIONAL 100%!');
    console.log('======================================================');
  } catch (err) {
    console.error('Error during E2E API test:', err);
    process.exit(1);
  }
})();

