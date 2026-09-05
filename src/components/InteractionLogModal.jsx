import React, { useState, useEffect } from 'react';
import { X, MessageSquare, Plus, Clock, User, Send, FileImage, Image as ImageIcon } from 'lucide-react';

export default function InteractionLogModal({ isOpen, onClose, member, onAddInteraction, userRole = 'admin' }) {
  const [note, setNote] = useState('');
  const [slipUrl, setSlipUrl] = useState('');
  const [uploadingSlip, setUploadingSlip] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localLogs, setLocalLogs] = useState([]);

  useEffect(() => {
    if (member && Array.isArray(member.interaction_logs)) {
      setLocalLogs(member.interaction_logs);
    } else {
      setLocalLogs([]);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const handleSlipFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    try {
      setUploadingSlip(true);
      setError('');
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64 = evt.target.result;
        try {
          const token = localStorage.getItem('hog_token');
          const res = await fetch('/api/members/upload-image', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ image_base64: base64 })
          });
          const data = await res.json();
          if (res.ok && data.image_url) {
            setSlipUrl(data.image_url);
          } else {
            setError(data.message || 'ไม่สามารถอัปโหลดไฟล์ Attachment ได้');
          }
        } catch (err) {
          setError('เกิดข้อผิดพลาดในการแนบ Attachment');
        } finally {
          setUploadingSlip(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการอ่านไฟล์');
      setUploadingSlip(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('กรุณากรอกข้อความบันทึกการติดต่อหรือรายละเอียดการต่ออายุ');
      return;
    }
    setError('');

    try {
      setSubmitting(true);
      const res = await onAddInteraction(member.id, note, slipUrl);
      if (res && res.interaction_logs) {
        setLocalLogs(res.interaction_logs);
      }
      setNote('');
      setSlipUrl('');
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const logs = localLogs;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        {/* Full Image Preview Lightbox */}
        {previewModalImg && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.9)',
              zIndex: 2500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px'
            }}
            onClick={() => setPreviewModalImg(null)}
          >
            <div
              style={{ position: 'relative', maxWidth: '90%', maxHeight: '85vh', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewModalImg(null)}
                style={{
                  position: 'absolute',
                  top: '-14px',
                  right: '-14px',
                  background: '#ff6600',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
                  zIndex: 2501
                }}
              >
                ✕
              </button>
              <img
                src={previewModalImg}
                alt="Attachment Full View"
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  borderRadius: '12px',
                  border: '2px solid #ff6600',
                  boxShadow: '0 0 40px rgba(255, 102, 0, 0.4)',
                  objectFit: 'contain'
                }}
              />
              <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <a
                  href={previewModalImg}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '5px 12px', textDecoration: 'none', color: '#4ade80', borderColor: 'rgba(34, 197, 94, 0.4)' }}
                >
                  🖼️ เปิดรูปขนาดเต็มในแท็บใหม่
                </a>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setPreviewModalImg(null)}
                  style={{ fontSize: '0.8rem', padding: '5px 12px' }}
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 102, 0, 0.1)', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
              <MessageSquare size={20} color="#ff6600" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>
                ประวัติการติดต่อและ Attachment (CRM Logs)
              </h2>
              <span style={{ fontSize: '0.82rem', color: '#ff6600', fontWeight: 600 }}>
                {member.name}
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Add Note & Attachment Form (Admin Only) */}
        {userRole === 'admin' ? (
          <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={14} color="#ff6600" /> บันทึกประวัติ / แนบ Attachment
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="บันทึกประวัติการติดต่อ / รายละเอียดการต่ออายุ..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', marginBottom: '8px' }}
              />

              {/* Attachment Control */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <label className="btn-secondary" style={{ cursor: 'pointer', padding: '5px 10px', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  <FileImage size={14} color="#4ade80" />
                  <span>{uploadingSlip ? 'กำลังอัปโหลด...' : (slipUrl ? '✅ แนบ Attachment เรียบร้อย (เปลี่ยนไฟล์)' : '📎 แนบ Attachment')}</span>
                  <input type="file" accept="image/*" onChange={handleSlipFileSelect} style={{ display: 'none' }} disabled={uploadingSlip} />
                </label>

                {slipUrl && (
                  <div
                    onClick={() => setPreviewModalImg(slipUrl)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.4)', padding: '3px 8px', borderRadius: '6px', cursor: 'pointer' }}
                    title="คลิกเพื่อดูรูปภาพแบบเต็มจอ"
                  >
                    <img src={slipUrl} alt="Attachment Thumb" style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }} />
                    <span style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>🔍 แตะเพื่อดูรูปเต็ม</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSlipUrl(''); }} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', marginLeft: '4px', fontSize: '0.8rem' }}>✕</button>
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={submitting} style={{ padding: '6px 14px', marginLeft: 'auto' }}>
                  <Send size={14} />
                  <span>{submitting ? 'กำลังบันทึก...' : 'บันทึกประวัติ'}</span>
                </button>
              </div>
            </div>
            {error && (
              <div style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '6px' }}>
                ⚠️ {error}
              </div>
            )}
          </form>
        ) : (
          <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#60a5fa', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '16px' }}>
            ℹ️ สิทธิ์ Staff: สำหรับดูประวัติการติดต่อและ Attachment ได้อย่างเดียว (Read-Only)
          </div>
        )}

        {/* Logs Timeline */}
        <div style={{ maxHeight: '42vh', overflowY: 'auto', paddingRight: '4px' }}>
          <h4 style={{ fontSize: '0.82rem', color: '#94a3b8', marginBottom: '10px', fontWeight: 600 }}>
            ประวัติบันทึกและ Attachment ที่ผ่านมา ({logs.length} รายการ):
          </h4>

          {logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(10, 11, 13, 0.6)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: '#64748b', fontSize: '0.82rem' }}>
              ยังไม่มีประวัติการติดต่อหรือ Attachment ของสมาชิกท่านนี้
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {logs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    background: 'rgba(10, 11, 13, 0.8)',
                    border: '1px solid var(--border-color)',
                    borderLeft: log.slip_url ? '3px solid #4ade80' : '3px solid #ff6600',
                    borderRadius: '8px',
                    padding: '10px 12px'
                  }}
                >
                  <p style={{ fontSize: '0.85rem', color: '#f1f5f9', marginBottom: '6px', lineHeight: '1.4' }}>
                    "{log.note}"
                  </p>

                  {/* Attachment Card & Preview Button */}
                  {log.slip_url && (
                    <div style={{ marginBottom: '8px', marginTop: '4px' }}>
                      <div
                        onClick={() => setPreviewModalImg(log.slip_url)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '10px',
                          background: 'rgba(34, 197, 94, 0.12)',
                          border: '1px solid rgba(34, 197, 94, 0.4)',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                        }}
                        title="คลิกเพื่อเปิดดูรูปภาพ Attachment ขนาดเต็ม"
                      >
                        <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', border: '1.5px solid #4ade80', flexShrink: 0, background: '#000' }}>
                          <img src={log.slip_url} alt="Attachment" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div>
                          <span style={{ fontSize: '0.8rem', color: '#4ade80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <ImageIcon size={14} color="#4ade80" /> 🖼️ แนบไฟล์ Attachment
                          </span>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
                            คลิกที่นี่เพื่อเปิดดูรูปขนาดใหญ่ (Zoom View)
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontWeight: 600 }}>
                      <User size={12} color="#ff6600" />
                      {log.username}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose}>
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

