import React from 'react';
import { ShieldCheck, LogOut, FileText, User, Table, Tag, Users } from 'lucide-react';

export default function Navbar({ user, onLogout, onOpenAudit, onOpenSheets, onOpenTags, onOpenUsers }) {
  return (
    <header className="glass-panel" style={{ borderRadius: '0 0 12px 12px', margin: '0 0 14px 0', borderTop: 'none' }}>
      <div style={{ maxWidth: '1300px', margin: '0 auto', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        {/* Brand Logo & System Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            overflow: 'hidden',
            border: '2px solid #ff6600',
            boxShadow: '0 0 12px rgba(255, 102, 0, 0.4)',
            background: '#000'
          }}>
            <img src="/logo.jpg" alt="HOG Emblem" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.5px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              HOG <span style={{ color: '#ff6600' }}>MEMBER MANAGEMENT</span>
            </h1>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} color="#ff6600" /> System Code: HOG-MMS (v1.0)
            </p>
          </div>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* User Role Tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '4px 10px',
            borderRadius: '16px'
          }}>
            <User size={14} color="#ff6600" />
            <div style={{ fontSize: '0.78rem' }}>
              <span style={{ color: '#ffffff', fontWeight: 600 }}>
                {(user.full_name || user.username).replace(/HOG Club\s*/gi, '').trim()}
              </span>
              <span style={{
                marginLeft: '6px',
                fontSize: '0.68rem',
                padding: '1px 5px',
                borderRadius: '3px',
                background: user.role === 'admin' ? 'rgba(255, 102, 0, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                color: user.role === 'admin' ? '#ff6600' : '#60a5fa',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {user.role}
              </span>
            </div>
          </div>

          {/* User Management Button (Admin Only) */}
          {user && user.role === 'admin' && (
            <button className="btn-secondary" onClick={onOpenUsers} title="จัดการผู้ใช้งานและสร้าง Password" style={{ borderColor: 'rgba(168, 85, 247, 0.3)', color: '#c084fc', padding: '5px 10px', fontSize: '0.78rem' }}>
              <Users size={14} color="#c084fc" />
              <span>ผู้ใช้งาน</span>
            </button>
          )}

          {/* Tag Master Button (Admin Only) */}
          {user && user.role === 'admin' && (
            <button className="btn-secondary" onClick={onOpenTags} title="จัดการมาสเตอร์แท็ก" style={{ borderColor: 'rgba(234, 179, 8, 0.3)', color: '#fde047', padding: '5px 10px', fontSize: '0.78rem' }}>
              <Tag size={14} color="#fde047" />
              <span>แท็ก</span>
            </button>
          )}

          {/* Google Sheets Sync Button (Admin Only) */}
          {user && user.role === 'admin' && (
            <button className="btn-secondary" onClick={onOpenSheets} title="ตั้งค่าและซิงค์ข้อมูลกับ Google Sheets" style={{ borderColor: 'rgba(34, 197, 94, 0.3)', color: '#4ade80', padding: '5px 10px', fontSize: '0.78rem' }}>
              <Table size={14} color="#4ade80" />
              <span>G-Sheets</span>
            </button>
          )}

          {/* Audit Log Button */}
          <button className="btn-secondary" onClick={onOpenAudit} title="ดูประวัติการทำรายการ" style={{ padding: '5px 10px', fontSize: '0.78rem' }}>
            <FileText size={14} color="#ff6600" />
            <span>Audit Log</span>
          </button>

          {/* Logout Button */}
          <button className="btn-secondary" onClick={onLogout} style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '5px 10px', fontSize: '0.78rem' }}>
            <LogOut size={14} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>
    </header>
  );
}
