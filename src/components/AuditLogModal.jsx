import React from 'react';
import { X, FileText, Clock, User, ShieldCheck } from 'lucide-react';

export default function AuditLogModal({ isOpen, onClose, logs }) {
  if (!isOpen) return null;

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'LOGIN':
        return { label: 'LOGIN', bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' };
      case 'CREATE_MEMBER':
        return { label: 'CREATE', bg: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' };
      case 'UPDATE_MEMBER':
        return { label: 'UPDATE', bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' };
      case 'DELETE_MEMBER':
        return { label: 'DELETE', bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171' };
      default:
        return { label: action, bg: 'rgba(255, 255, 255, 0.1)', color: '#ffffff' };
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '750px' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 102, 0, 0.1)', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
              <FileText size={20} color="#ff6600" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
                ประวัติการทำรายการในระบบ (Audit Log)
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                บันทึกการเข้าสู่ระบบและสร้าง/แก้ไขข้อมูลสมาชิก (FR-010)
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Logs Timeline */}
        <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '6px' }}>
          {(!logs || logs.length === 0) ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
              ยังไม่มีประวัติการทำรายการในระบบ
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.map((log) => {
                const badge = getActionBadge(log.action);
                return (
                  <div
                    key={log.id}
                    style={{
                      background: 'rgba(10, 11, 13, 0.8)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: badge.bg,
                          color: badge.color
                        }}>
                          {badge.label}
                        </span>

                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={14} color="#94a3b8" />
                          {log.username}
                        </span>
                      </div>

                      <p style={{ fontSize: '0.88rem', color: '#e2e8f0' }}>
                        {log.details}
                      </p>
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', whitespace: 'nowrap' }}>
                      <Clock size={12} />
                      <span>{formatDate(log.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose}>
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}
