import React, { useState, useEffect } from 'react';
import { X, UserPlus, Edit3, Phone, CheckCircle, AlertCircle, ShieldAlert, Tag, Star } from 'lucide-react';

const checkIsLifetime = (tag, tagMasters = []) => {
  if (!tag || typeof tag !== 'string') return false;
  if (Array.isArray(tagMasters)) {
    const found = tagMasters.find(t => t.name.toLowerCase() === tag.trim().toLowerCase());
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
};

export default function MemberModal({ isOpen, onClose, onSave, memberData, isEditing, tagMasters = [] }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    line_id: '',
    profile_image_url: '',
    tags: [],
    renewal_date: '',
    chapter_expiry_date: '',
    hog_int_expiry_date: '',
    notes: ''
  });

  const [customTagInput, setCustomTagInput] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const availableTagList = Array.from(new Set([
    ...tagMasters.map(t => t.name)
  ]));

  useEffect(() => {
    if (memberData && isEditing) {
      // Parse tags
      let parsedTags = [];
      if (Array.isArray(memberData.tags)) {
        parsedTags = memberData.tags;
      } else if (typeof memberData.tags === 'string' && memberData.tags.trim()) {
        parsedTags = memberData.tags.split(',').map(t => t.trim());
      }

      setFormData({
        name: memberData.name || '',
        phone: memberData.phone || '',
        line_id: memberData.line_id || '',
        profile_image_url: memberData.profile_image_url || '',
        tags: parsedTags,
        renewal_date: memberData.renewal_date || '',
        chapter_expiry_date: memberData.chapter_expiry_date || memberData.hog_th_expiry_date || memberData.expiry_date || '',
        hog_int_expiry_date: memberData.hog_int_expiry_date || '',
        notes: memberData.notes || ''
      });
    } else {
      // Default dates for new member (Renewal today, Expiry +1 year)
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date();
      nextYear.setFullYear(nextYear.getFullYear() + 1);
      const nextYearStr = nextYear.toISOString().split('T')[0];

      setFormData({
        name: '',
        phone: '',
        line_id: '',
        profile_image_url: '',
        tags: [],
        renewal_date: today,
        chapter_expiry_date: nextYearStr,
        hog_int_expiry_date: nextYearStr,
        notes: ''
      });
    }
    setCustomTagInput('');
    setError('');
  }, [memberData, isEditing, isOpen]);

  if (!isOpen) return null;

  const isVipOfficer = formData.tags.some(t => checkIsLifetime(t, tagMasters));

  // Calculate live derived status preview
  const todayStr = new Date().toISOString().split('T')[0];
  let statusBadgeClass = 'badge-active';
  let statusText = 'HOG TH: Active (ปกติ)';

  if (isVipOfficer) {
    statusBadgeClass = 'badge-active';
    statusText = '⭐ Officer';
  } else if (!formData.chapter_expiry_date) {
    statusBadgeClass = 'badge-expired';
    statusText = 'Expired (โปรดระบุวันหมดอายุ)';
  } else if (formData.chapter_expiry_date < todayStr) {
    statusBadgeClass = 'badge-expired';
    statusText = 'Expired';
  } else {
    const diffDays = Math.ceil((new Date(formData.chapter_expiry_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      statusBadgeClass = 'badge-expiring';
      statusText = `Expiring Soon (เหลือ ${diffDays} วัน)`;
    } else {
      statusBadgeClass = 'badge-active';
      statusText = 'Active';
    }
  }

  const handleTagToggle = (tag) => {
    if (formData.tags.includes(tag)) {
      setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    } else {
      setFormData({ ...formData, tags: [...formData.tags, tag] });
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (!formData.tags.includes(trimmed)) {
      setFormData({ ...formData, tags: [...formData.tags, trimmed] });
    }
    setCustomTagInput('');
  };

  const handleImageFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG, WebP)');
      return;
    }

    try {
      setUploadingImage(true);
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
            setFormData(prev => ({ ...prev, profile_image_url: data.image_url }));
          } else {
            setError(data.message || 'ไม่สามารถอัปโหลดรูปภาพได้');
          }
        } catch (err) {
          setError('เกิดข้อผิดพลาดในการแนบไฟล์รูปภาพ');
        } finally {
          setUploadingImage(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการอ่านไฟล์');
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Business Rules Client Validation (BR-001, BR-002, BR-003)
    if (!formData.name.trim()) {
      setError('กรุณากรอกชื่อ-นามสกุลสมาชิก');
      return;
    }

    if (!formData.phone.trim()) {
      setError('กรุณากรอกเบอร์โทรศัพท์');
      return;
    }

    if (!formData.renewal_date) {
      setError('กรุณาระบุวันที่ต่ออายุสมาชิก');
      return;
    }

    if (!isVipOfficer && !formData.chapter_expiry_date) {
      setError('กรุณาระบุวันหมดอายุสมาชิก (Chapter Expiry Date)');
      return;
    }

    if (!isVipOfficer && formData.chapter_expiry_date < formData.renewal_date) {
      setError('วันหมดอายุ Chapter ต้องไม่เร็วกว่าวันต่ออายุสมาชิก (Renewal Date)');
      return;
    }

    try {
      setSubmitting(true);
      await onSave(formData);
      onClose();
    } catch (err) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '680px', padding: '20px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(255, 102, 0, 0.1)', border: '1px solid rgba(255, 102, 0, 0.3)' }}>
              {isEditing ? <Edit3 size={20} color="#ff6600" /> : <UserPlus size={20} color="#ff6600" />}
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', color: '#ffffff', fontWeight: 800 }}>
                {isEditing ? 'แก้ไขข้อมูลสมาชิก (Edit Member)' : 'เพิ่มสมาชิกใหม่ (Add Member)'}
              </h2>
              {isEditing && memberData?.member_code && (
                <span style={{ fontSize: '0.8rem', color: '#ff6600', fontFamily: 'monospace' }}>
                  {memberData.member_code}
                </span>
              )}
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
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem'
          }}>
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Member Profile Attachment Bar */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label">Attachment</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                background: '#000',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {formData.profile_image_url ? (
                  <img src={formData.profile_image_url} alt="Attachment preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <UserPlus size={24} color="#64748b" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <label className="btn-secondary" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    <span>{uploadingImage ? 'กำลังอัปโหลด...' : '📎 แนบ Attachment'}</span>
                    <input type="file" accept="image/*" onChange={handleImageFileSelect} style={{ display: 'none' }} disabled={uploadingImage} />
                  </label>
                  {formData.profile_image_url && (
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setFormData(prev => ({ ...prev, profile_image_url: '' }))}
                      style={{ color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', padding: '6px 12px', fontSize: '0.82rem' }}
                    >
                      ลบ Attachment
                    </button>
                  )}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px' }}>
                  รองรับไฟล์รูปภาพ JPG, PNG (ซิงค์เข้า Google Sheets อัตโนมัติ)
                </p>
              </div>
            </div>
          </div>

          {/* Member Name */}
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label">ชื่อ-นามสกุล สมาชิก * (Required)</label>
            <input
              type="text"
              className="form-input"
              placeholder="ตัวอย่าง: สมชาย สายซิ่ง"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          {/* Phone Number & Line ID 2-Column Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">เบอร์โทรศัพท์ * (Phone Number)</label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="081-234-5678"
                  style={{ paddingLeft: '36px', width: '100%' }}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Line ID (ไอดีไลน์)</label>
              <input
                type="text"
                className="form-input"
                placeholder="เช่น @somchai_hog"
                value={formData.line_id}
                onChange={(e) => setFormData({ ...formData, line_id: e.target.value })}
              />
            </div>
          </div>

          {/* Tags Selection (CRM Dynamic Custom Tagging) */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Tag size={15} color="#ff6600" />
              <span>แท็กประเภทสมาชิก (Member Segmentation / Tags)</span>
            </label>

            {/* Selected and Available Tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
              {Array.from(new Set([...availableTagList, ...formData.tags])).map((tag) => {
                const isSelected = formData.tags.includes(tag);
                const isLifetime = checkIsLifetime(tag, tagMasters);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleTagToggle(tag)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: isSelected
                        ? (isLifetime ? '1px solid #eab308' : '1px solid #ff6600')
                        : '1px solid var(--border-color)',
                      background: isSelected
                        ? (isLifetime ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 102, 0, 0.2)')
                        : 'rgba(255, 255, 255, 0.05)',
                      color: isSelected
                        ? (isLifetime ? '#fde047' : '#ff8533')
                        : '#94a3b8',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isLifetime && <Star size={12} fill={isSelected ? '#fde047' : 'none'} color="#fde047" />}
                    <span>{tag}</span>
                    {isSelected && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTagToggle(tag);
                        }}
                        style={{ marginLeft: '4px', opacity: 0.7, fontSize: '0.75rem' }}
                      >
                        ✕
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Tag Input */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                placeholder="พิมพ์สร้างแท็กใหม่ เช่น Marshall, Founder, Sponsor..."
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomTag}
                className="btn-secondary"
                style={{ padding: '6px 14px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              >
                + เพิ่มแท็ก
              </button>
            </div>

            {isVipOfficer && (
              <p style={{ fontSize: '0.78rem', color: '#eab308', marginTop: '8px', fontStyle: 'italic' }}>
                💡 สมาชิกที่มีแท็ก Officer, VIP หรือแท็กกิตติมศักดิ์ มีสถานะ ⭐ Officer (ไม่มีวันหมดอายุ)
              </p>
            )}
          </div>

          {/* Renewal Date */}
          <div className="form-group">
            <label className="form-label">วันที่ต่ออายุ (Renewal Date) *</label>
            <input
              type="date"
              className="form-input"
              value={formData.renewal_date}
              onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
              required
            />
          </div>

          {/* Expiry Dates: Chapter (Primary) vs HOG Int (Reference) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" style={{ color: '#ff6600', fontWeight: 700 }}>
                🇹🇭 วันหมดอายุ Chapter {!isVipOfficer && '*'}
              </label>
              <input
                type="date"
                className="form-input"
                style={{ borderColor: 'rgba(255, 102, 0, 0.4)' }}
                value={formData.chapter_expiry_date}
                onChange={(e) => setFormData({ ...formData, chapter_expiry_date: e.target.value })}
                required={!isVipOfficer}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ color: '#60a5fa' }}>
                🌐 วันหมดอายุ HOG Int (อ้างอิง)
              </label>
              <input
                type="date"
                className="form-input"
                value={formData.hog_int_expiry_date}
                onChange={(e) => setFormData({ ...formData, hog_int_expiry_date: e.target.value })}
              />
            </div>
          </div>

          {/* Derived Status Preview Card */}
          <div style={{
            background: 'rgba(10, 11, 13, 0.7)',
            border: '1px solid var(--border-color)',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              สถานะคำนวณจากระบบ:
            </span>
            <div className={`badge ${statusBadgeClass}`}>
              {statusBadgeClass === 'badge-active' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              <span>{statusText}</span>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label">หมายเหตุเพิ่มเติม (Notes / Bike Model)</label>
            <textarea
              rows="3"
              className="form-textarea"
              placeholder="ระบุรุ่นรถฮาร์ลีย์ หรือรายละเอียดอื่นๆ (ถ้ามี)..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
              ยกเลิก
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'กำลังบันทึก...' : (isEditing ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มสมาชิก')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

