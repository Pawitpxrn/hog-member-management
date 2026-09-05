import React, { useState, useEffect } from 'react';
import { X, Users, UserPlus, Key, ShieldCheck, Trash2, Edit3, CheckCircle, AlertCircle, ShieldAlert } from 'lucide-react';

export default function UserManagementModal({ isOpen, onClose, currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create new
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('staff');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('hog_token');
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ไม่สามารถโหลดรายชื่อผู้ใช้ได้');
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      resetForm();
      setSuccessMsg('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('staff');
    setError('');
  };

  const handleOpenCreateForm = () => {
    setEditingUser(null);
    setUsername('');
    setPassword('');
    setFullName('');
    setRole('staff');
    setError('');
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (u) => {
    setEditingUser(u);
    setUsername(u.username);
    setPassword(''); // leave blank for password reset optional
    setFullName(u.full_name || '');
    setRole(u.role || 'staff');
    setError('');
    setIsFormOpen(true);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!editingUser && (!username.trim() || !password.trim())) {
      setError('กรุณากรอก Username และ Password ให้ครบถ้วน');
      return;
    }

    if (!editingUser && password.trim().length < 4) {
      setError('Password ต้องมีความยาวอย่างน้อย 4 ตัวอักษร');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('hog_token');
      let url = '/api/users';
      let method = 'POST';
      let bodyData = {
        username: username.trim(),
        password: password.trim(),
        full_name: fullName.trim(),
        role
      };

      if (editingUser) {
        url = `/api/users/${editingUser.id}`;
        method = 'PUT';
        bodyData = {
          full_name: fullName.trim(),
          role,
          ...(password.trim() ? { password: password.trim() } : {})
        };
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ดำเนินการไม่สำเร็จ');

      setSuccessMsg(data.message || 'บันทึกข้อมูลเรียบร้อยแล้ว');
      resetForm();
      fetchUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (u) => {
    if (u.username.toLowerCase() === currentUser?.username?.toLowerCase()) {
      alert('ไม่สามารถลบบัญชีผู้ใช้ของตนเองได้');
      return;
    }

    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${u.username}" (${u.full_name}) ออกจากระบบ?`)) {
      return;
    }

    try {
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('hog_token');
      const res = await fetch(`/api/users/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'ลบผู้ใช้ไม่สำเร็จ');

      setSuccessMsg(data.message || 'ลบผู้ใช้งานเรียบร้อยแล้ว');
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    return new Date(isoStr).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 102, 0, 0.1)', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
              <Users size={22} color="#ff6600" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
                จัดการผู้ใช้งานระบบ (User & Password Management)
              </h2>
              <p style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                สร้างบัญชีเจ้าหน้าที่ กำหนดสิทธิ์การใช้งาน และรีเซ็ตรหัสผ่าน
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <CheckCircle size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Create / Edit Form Card */}
        {isFormOpen ? (
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px', border: '1px solid rgba(255, 102, 0, 0.4)', background: 'rgba(15, 23, 42, 0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {editingUser ? <Edit3 size={16} color="#ff6600" /> : <UserPlus size={16} color="#ff6600" />}
                <span>{editingUser ? `แก้ไขผู้ใช้งาน / เปลี่ยนรหัสผ่าน (${editingUser.username})` : 'สร้างบัญชีผู้ใช้งานใหม่'}</span>
              </h3>
              <button type="button" className="btn-secondary" onClick={resetForm} style={{ fontSize: '0.75rem', padding: '3px 8px' }}>
                ยกเลิก
              </button>
            </div>

            <form onSubmit={handleSubmitForm}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>Username (ชื่อเข้าใช้ระบบ)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น officer01"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!!editingUser}
                    required
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>ชื่อ-นามสกุล / ตำแหน่ง</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="เช่น คุณสมชาย (เจ้าหน้าที่)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>
                    Password {editingUser && <span style={{ color: '#94a3b8', fontWeight: 'normal' }}>(กรอกเฉพาะเมื่อต้องการรีเซ็ตรหัสผ่าน)</span>}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder={editingUser ? 'เว้นว่างไว้หากไม่ต้องการเปลี่ยน' : 'ตั้งรหัสผ่านอย่างน้อย 4 ตัวอักษร'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingUser}
                    style={{ fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.78rem' }}>สิทธิ์การใช้งาน (Role)</label>
                  <select
                    className="form-input"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <option value="staff">👤 Staff User (เจ้าหน้าที่บันทึกข้อมูล)</option>
                    <option value="admin">🔑 Administrator (ผู้ดูแลระบบสูงสุด)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                <button type="button" className="btn-secondary" onClick={resetForm} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn-primary" disabled={submitting} style={{ fontSize: '0.8rem', padding: '6px 16px' }}>
                  <span>{submitting ? 'กำลังบันทึก...' : (editingUser ? 'บันทึกการปรับปรุง' : 'สร้างผู้ใช้งาน')}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <button className="btn-primary" onClick={handleOpenCreateForm} style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
              <UserPlus size={16} />
              <span>+ สร้างผู้ใช้งานใหม่ (Add New User)</span>
            </button>
          </div>
        )}

        {/* Users Table */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)', maxHeight: '360px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>Username & ชื่อผู้ใช้</th>
                <th style={{ whiteSpace: 'nowrap' }}>บทบาท (Role)</th>
                <th style={{ whiteSpace: 'nowrap' }}>วันที่สร้างบัญชี</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    กำลังโหลดข้อมูลผู้ใช้งานระบบ...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                    ยังไม่มีข้อมูลผู้ใช้งาน
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>
                          {u.username}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {u.full_name}
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: u.role === 'admin' ? 'rgba(255, 102, 0, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: u.role === 'admin' ? '#ff6600' : '#60a5fa',
                        border: `1px solid ${u.role === 'admin' ? 'rgba(255, 102, 0, 0.4)' : 'rgba(59, 130, 246, 0.4)'}`
                      }}>
                        {u.role === 'admin' ? '🔑 ADMIN' : '👤 STAFF'}
                      </span>
                    </td>

                    <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {formatDate(u.created_at)}
                    </td>

                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="btn-secondary"
                          onClick={() => handleOpenEditForm(u)}
                          title="แก้ไข / รีเซ็ตรหัสผ่าน"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'rgba(234, 179, 8, 0.3)', color: '#fde047' }}
                        >
                          <Key size={13} color="#fde047" />
                          <span>แก้ไข/ตั้งรหัสใหม่</span>
                        </button>

                        <button
                          className="btn-secondary"
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.username.toLowerCase() === currentUser?.username?.toLowerCase()}
                          title={u.username.toLowerCase() === currentUser?.username?.toLowerCase() ? 'ไม่สามารถลบบัญชีที่กำลังล็อกอินได้' : 'ลบผู้ใช้'}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.75rem',
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            color: '#f87171',
                            opacity: u.username.toLowerCase() === currentUser?.username?.toLowerCase() ? 0.4 : 1
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: '0.82rem' }}>
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
