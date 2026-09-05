import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Edit3, Trash2, ShieldAlert, Star, Calendar } from 'lucide-react';

const PRESET_COLORS = [
  { label: 'Harley Orange', value: '#ff6600' },
  { label: 'Gold VIP', value: '#eab308' },
  { label: 'Safety Blue', value: '#60a5fa' },
  { label: 'Rally Purple', value: '#c084fc' },
  { label: 'Emerald Green', value: '#10b981' },
  { label: 'Silver Gray', value: '#94a3b8' }
];

export default function TagMasterModal({ isOpen, onClose, tags, onSaveTag, onDeleteTag }) {
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    expiry_type: 'EXPIRY_REQUIRED',
    expiry_rule_label: '',
    color: '#ff6600',
    description: ''
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingTag) {
      setFormData({
        name: editingTag.name || '',
        expiry_type: editingTag.expiry_type || 'EXPIRY_REQUIRED',
        expiry_rule_label: editingTag.expiry_rule_label || '',
        color: editingTag.color || '#ff6600',
        description: editingTag.description || ''
      });
    } else {
      setFormData({
        name: '',
        expiry_type: 'EXPIRY_REQUIRED',
        expiry_rule_label: '',
        color: '#ff6600',
        description: ''
      });
    }
    setError('');
  }, [editingTag, isOpen]);

  if (!isOpen) return null;

  const handleEditClick = (tag) => {
    setEditingTag(tag);
  };

  const handleCancelEdit = () => {
    setEditingTag(null);
    setFormData({
      name: '',
      expiry_type: 'EXPIRY_REQUIRED',
      expiry_rule_label: '',
      color: '#ff6600',
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('กรุณาระบุชื่อแท็ก');
      return;
    }

    try {
      setSubmitting(true);
      if (editingTag) {
        await onSaveTag(editingTag.id, formData);
      } else {
        await onSaveTag(null, formData);
      }
      handleCancelEdit();
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกแท็ก');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (tag) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบแท็ก "${tag.name}"?`)) return;
    try {
      await onDeleteTag(tag.id);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 102, 0, 0.1)', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
              <Tag size={20} color="#ff6600" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
                จัดการมาสเตอร์แท็ก (Tag Master Management)
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                กำหนดชื่อแท็ก เงื่อนไขการหมดอายุ (Lifetime / Expiry) และสีป้ายประจำแท็ก
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.88rem'
          }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Add / Edit Form Box */}
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(10, 11, 13, 0.7)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ff6600', marginBottom: '14px' }}>
            {editingTag ? `✏️ แก้ไขแท็ก "${editingTag.name}"` : '➕ เพิ่มแท็กใหม่ (Add New Tag Master)'}
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            {/* Tag Name */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">ชื่อแท็ก (Tag Name) *</label>
              <input
                type="text"
                className="form-input"
                placeholder="ชื่อแท็ก"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Expiry Condition Selector & Custom Label */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">เงื่อนไขวันหมดอายุ (Expiry Rule) * (ตั้งชื่อเองได้)</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <select
                  className="form-select"
                  value={formData.expiry_type}
                  onChange={(e) => setFormData({ ...formData, expiry_type: e.target.value })}
                >
                  <option value="EXPIRY_REQUIRED">📅 กำหนดวันหมดอายุ (Expiry Required)</option>
                  <option value="LIFETIME">⭐ ตลอดชีพ (Lifetime Active - ไม่ต้องระบุวันหมดอายุ)</option>
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder="พิมพ์กำหนดชื่อเงื่อนไขเอง (ถ้ามี)..."
                  value={formData.expiry_rule_label}
                  onChange={(e) => setFormData({ ...formData, expiry_rule_label: e.target.value })}
                  style={{ fontSize: '0.83rem' }}
                />
              </div>
            </div>
          </div>

          {/* Theme Color & Description */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px', marginBottom: '14px' }}>
            {/* Color Palette */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">สีป้าย (Badge Theme)</label>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                {PRESET_COLORS.map((c) => (
                  <div
                    key={c.value}
                    onClick={() => setFormData({ ...formData, color: c.value })}
                    title={c.label}
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: c.value,
                      cursor: 'pointer',
                      border: formData.color === c.value ? '2px solid #ffffff' : '1px solid transparent',
                      transform: formData.color === c.value ? 'scale(1.15)' : 'scale(1)',
                      transition: 'all 0.15s'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">คำอธิบายแท็ก (Description)</label>
              <input
                type="text"
                className="form-input"
                placeholder="ระบุคำอธิบายสั้นๆ..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>

          {/* Form Controls */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            {editingTag && (
              <button type="button" className="btn-secondary" onClick={handleCancelEdit} disabled={submitting}>
                ยกเลิกการแก้ไข
              </button>
            )}
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : (editingTag ? 'บันทึกการแก้ไขแท็ก' : '+ ยืนยันเพิ่มแท็กใหม่')}
            </button>
          </div>
        </form>

        {/* Existing Tag Masters List Table */}
        <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ whiteSpace: 'nowrap' }}>แท็ก & ป้ายตัวอย่าง</th>
                <th style={{ whiteSpace: 'nowrap' }}>เงื่อนไขวันหมดอายุ (Expiry Rule)</th>
                <th style={{ whiteSpace: 'nowrap' }}>คำอธิบาย</th>
                <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => {
                const isLifetime = t.expiry_type === 'LIFETIME';
                const ruleLabel = t.expiry_rule_label || (isLifetime ? '⭐ Officer (ตลอดชีพ)' : '📅 กำหนดวันหมดอายุ');
                return (
                  <tr key={t.id}>
                    {/* Tag Badge Preview */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '16px',
                        background: isLifetime ? 'rgba(234, 179, 8, 0.2)' : `${t.color}25`,
                        color: isLifetime ? '#fde047' : t.color,
                        border: isLifetime ? '1px solid rgba(234, 179, 8, 0.5)' : `1px solid ${t.color}50`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isLifetime && <Star size={12} fill="#fde047" color="#fde047" />}
                        {t.name}
                      </span>
                    </td>

                    {/* Expiry Rule Condition */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span style={{ color: isLifetime ? '#fde047' : '#94a3b8', fontSize: '0.82rem', fontWeight: isLifetime ? 700 : 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {isLifetime ? <Star size={12} fill="#fde047" /> : <Calendar size={12} />} {ruleLabel}
                      </span>
                    </td>

                    {/* Description */}
                    <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                      {t.description || '-'}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="btn-action"
                          onClick={() => handleEditClick(t)}
                          title="แก้ไขแท็ก"
                          style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)' }}
                        >
                          <Edit3 size={15} />
                        </button>

                        <button
                          className="btn-action btn-delete"
                          onClick={() => handleDelete(t)}
                          title="ลบแท็ก"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
