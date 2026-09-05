import React, { useState } from 'react';
import { Search, Plus, Edit3, Trash2, Calendar, Phone, AlertCircle, RefreshCw, CheckCircle, Clock, MessageSquare, Tag, Star, User, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const isLifetimeTag = (tag, tagMasters = []) => {
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

export default function MemberList({
  members = [],
  loading = false,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  onAddMember,
  onEditMember,
  onDeleteMember,
  onOpenInteractions,
  userRole = 'admin',
  tagMasters = [],
  selectedTagFilter = 'ALL',
  onTagFilterChange
}) {
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [sortKey, setSortKey] = useState('renewal_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Collect all unique tags dynamically
  const dynamicTagSet = new Set(tagMasters.map(t => t.name));
  members.forEach(m => {
    const mTags = Array.isArray(m.tags) ? m.tags : (typeof m.tags === 'string' ? m.tags.split(',') : []);
    mTags.forEach(t => {
      const trimmed = t.trim();
      if (trimmed) dynamicTagSet.add(trimmed);
    });
  });
  const availableTags = ['ALL', ...Array.from(dynamicTagSet)];

  const getTagBadgeStyle = (t) => {
    const foundMaster = tagMasters.find(tm => tm.name.toLowerCase() === t.toLowerCase());
    if (foundMaster) {
      const isLifetime = foundMaster.expiry_type === 'LIFETIME';
      const color = foundMaster.color || (isLifetime ? '#fde047' : '#ff6600');
      return { bg: `${color}25`, color: color, border: `${color}60`, isLifetime };
    }
    const isLifetime = isLifetimeTag(t, tagMasters);
    return { bg: isLifetime ? 'rgba(234, 179, 8, 0.25)' : 'rgba(255, 102, 0, 0.2)', color: isLifetime ? '#fde047' : '#ff8533', border: isLifetime ? 'rgba(234, 179, 8, 0.5)' : 'rgba(255, 102, 0, 0.4)', isLifetime };
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder(key.includes('date') || key.includes('expiry') ? 'desc' : 'asc');
    }
  };

  const filteredMembers = members.filter(m => {
    if (selectedTagFilter !== 'ALL') {
      const mTags = Array.isArray(m.tags) ? m.tags : (typeof m.tags === 'string' ? m.tags.split(',').map(t => t.trim()) : []);
      if (!mTags.includes(selectedTagFilter)) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const phoneDigits = searchQuery.replace(/\D/g, '');
      const matchName = m.name && m.name.toLowerCase().includes(q);
      const matchPhone = phoneDigits && m.phone && m.phone.replace(/\D/g, '').includes(phoneDigits);
      const matchCode = m.member_code && m.member_code.toLowerCase().includes(q);
      const matchLine = m.line_id && m.line_id.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchCode && !matchLine) return false;
    }
    return true;
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let valA = '';
    let valB = '';

    switch (sortKey) {
      case 'name':
        valA = a.name || '';
        valB = b.name || '';
        break;
      case 'phone':
        valA = (a.phone || '').replace(/\D/g, '');
        valB = (b.phone || '').replace(/\D/g, '');
        break;
      case 'renewal_date':
        valA = a.renewal_date || '';
        valB = b.renewal_date || '';
        break;
      case 'chapter_expiry_date':
        valA = a.chapter_expiry_date || a.hog_th_expiry_date || (a.is_officer_or_vip ? '9999-12-31' : '');
        valB = b.chapter_expiry_date || b.hog_th_expiry_date || (b.is_officer_or_vip ? '9999-12-31' : '');
        break;
      case 'hog_int_expiry_date':
        valA = a.hog_int_expiry_date || '';
        valB = b.hog_int_expiry_date || '';
        break;
      case 'status':
        const orderMap = { 'Active': 1, 'Expiring Soon': 2, 'Expired': 3 };
        valA = orderMap[a.status] || 4;
        valB = orderMap[b.status] || 4;
        break;
      default:
        valA = a.created_at || '';
        valB = b.created_at || '';
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const renderSortableHeader = (label, key) => {
    const isActive = sortKey === key;
    return (
      <th
        onClick={() => handleSort(key)}
        style={{
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          userSelect: 'none',
          color: isActive ? '#ff6600' : '#ffffff',
          transition: 'all 0.2s'
        }}
        title={`คลิกเพื่อสลับการเรียงลำดับตาม ${label}`}
      >
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          <span>{label}</span>
          {isActive ? (
            sortOrder === 'asc' ? <ArrowUp size={13} color="#ff6600" /> : <ArrowDown size={13} color="#ff6600" />
          ) : (
            <ArrowUpDown size={12} color="#64748b" style={{ opacity: 0.5 }} />
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '16px' }}>
      {/* Lightbox Image Preview Modal */}
      {previewImageUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setPreviewImageUrl(null)}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img src={previewImageUrl} alt="Full view" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: '12px', border: '2px solid #ff6600', boxShadow: '0 0 30px rgba(0,0,0,0.8)' }} />
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', marginTop: '8px' }}>แตะตรงไหนก็ได้เพื่อปิดหน้าต่าง Attachment</p>
          </div>
        </div>
      )}

      {/* Table Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        marginBottom: '14px'
      }}>
        {/* Search & Tag Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="ค้นหาด้วยชื่อ, เบอร์โทร, Line ID หรือรหัส..."
              value={searchQuery}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="form-input"
              style={{ width: '100%', paddingLeft: '36px', background: 'rgba(10, 11, 13, 0.9)', fontSize: '0.82rem' }}
            />
          </div>

          <select
            value={selectedTagFilter}
            onChange={(e) => onTagFilterChange && onTagFilterChange(e.target.value)}
            className="form-select"
            style={{ width: '140px', fontSize: '0.82rem' }}
          >
            {availableTags.map(t => (
              <option key={t} value={t}>{t === 'ALL' ? 'ทุกแท็ก' : `🏷️ ${t}`}</option>
            ))}
          </select>

          {/* Sort Selector Dropdown */}
          <select
            value={`${sortKey}_${sortOrder}`}
            onChange={(e) => {
              const parts = e.target.value.split('_');
              const order = parts.pop();
              const key = parts.join('_');
              setSortKey(key);
              setSortOrder(order);
            }}
            className="form-select"
            style={{ width: '185px', fontSize: '0.82rem', borderColor: 'rgba(255, 102, 0, 0.3)' }}
            title="เลือกการเรียงลำดับรายการสมาชิก"
          >
            <option value="renewal_date_desc">📅 วันต่ออายุ (ล่าสุดก่อน)</option>
            <option value="renewal_date_asc">📅 วันต่ออายุ (เก่าสุดก่อน)</option>
            <option value="chapter_expiry_date_asc">⏳ วันหมดอายุ Chapter (น้อยไปมาก)</option>
            <option value="chapter_expiry_date_desc">⏳ วันหมดอายุ Chapter (มากไปน้อย)</option>
            <option value="name_asc">👤 ชื่อสมาชิก (ก-ฮ / A-Z)</option>
            <option value="name_desc">👤 ชื่อสมาชิก (ฮ-ก / Z-A)</option>
            <option value="phone_asc">📞 เบอร์โทรศัพท์ (0-9)</option>
            <option value="status_asc">🟢 สถานะ (Active ก่อน)</option>
          </select>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'rgba(10, 11, 13, 0.6)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'active', label: 'Active' },
              { id: 'expiring_soon', label: 'ใกล้หมดอายุ (<30วัน)' },
              { id: 'expired', label: 'Expired' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => onStatusFilterChange(f.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  background: statusFilter === f.id ? 'var(--primary-orange)' : 'transparent',
                  color: statusFilter === f.id ? '#ffffff' : '#94a3b8',
                  transition: 'all 0.2s',
                  whiteSpace: 'nowrap'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {userRole === 'admin' && (
            <button className="btn-primary" onClick={onAddMember} style={{ whiteSpace: 'nowrap', padding: '6px 14px', fontSize: '0.82rem' }}>
              <Plus size={16} />
              <span>เพิ่มสมาชิกใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Responsive Data Table */}
      <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <table className="data-table">
          <thead>
            <tr>
              {renderSortableHeader('สมาชิก & แท็ก', 'name')}
              {renderSortableHeader('เบอร์โทร & Line ID', 'phone')}
              {renderSortableHeader('วันต่ออายุ', 'renewal_date')}
              {renderSortableHeader('หมดอายุ Chapter', 'chapter_expiry_date')}
              {renderSortableHeader('หมดอายุ HOG Int', 'hog_int_expiry_date')}
              {renderSortableHeader('สถานะ', 'status')}
              <th style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin-icon" style={{ marginBottom: '8px' }} />
                  <p>กำลังโหลดข้อมูลสมาชิก...</p>
                </td>
              </tr>
            ) : sortedMembers.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <AlertCircle size={32} color="#ff6600" style={{ marginBottom: '12px' }} />
                  <p style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff' }}>ไม่พบข้อมูลสมาชิก</p>
                  <p style={{ fontSize: '0.82rem' }}>ลองค้นหาด้วยคำอื่น หรือกดปุ่ม "เพิ่มสมาชิกใหม่" เพื่อเพิ่มข้อมูล</p>
                </td>
              </tr>
            ) : (
              sortedMembers.map((member) => {
                const tags = Array.isArray(member.tags)
                  ? member.tags
                  : (typeof member.tags === 'string' ? member.tags.split(',').map(t => t.trim()) : []);
                const isOfficerOrVip = tags.some(t => isLifetimeTag(t, tagMasters));
                const logCount = (member.interaction_logs || []).length;

                return (
                  <tr key={member.id}>
                    {/* Photo + Member Name + Member Code + Tags */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          onClick={() => member.profile_image_url && setPreviewImageUrl(member.profile_image_url)}
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: '#000',
                            border: member.profile_image_url ? '1.5px solid #ff6600' : '1px solid var(--border-color)',
                            overflow: 'hidden',
                            flexShrink: 0,
                            cursor: member.profile_image_url ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={member.profile_image_url ? 'คลิกเพื่อดู Attachment' : 'ไม่มี Attachment'}
                        >
                          {member.profile_image_url ? (
                            <img src={member.profile_image_url} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <User size={18} color="#64748b" />
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: '#ffffff', fontSize: '0.88rem' }}>
                            {member.name}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px', flexWrap: 'wrap' }}>
                            {tags.map(t => {
                              const st = getTagBadgeStyle(t);
                              return (
                                <span key={t} style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  background: st.bg,
                                  color: st.color,
                                  border: `1px solid ${st.border}`,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  {st.isLifetime && <Star size={10} color="#fde047" fill="#fde047" />}
                                  {t}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Phone & Line ID */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Phone size={13} color="#94a3b8" />
                          <span style={{ color: '#ffffff', fontWeight: 500 }}>{member.phone}</span>
                        </div>
                        {member.line_id && (
                          <div style={{ fontSize: '0.75rem', color: '#4ade80', marginTop: '2px' }}>
                            LINE: {member.line_id}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Renewal Date */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.82rem' }}>
                        <Calendar size={13} color="#64748b" />
                        <span>{member.renewal_date || '-'}</span>
                      </div>
                    </td>

                    {/* Chapter Expiry Date (Primary) */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isOfficerOrVip ? (
                        <span style={{
                          color: '#fde047',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: 'rgba(234, 179, 8, 0.15)',
                          border: '1px solid rgba(234, 179, 8, 0.4)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Star size={12} fill="#fde047" color="#fde047" />
                          <span>Officer</span>
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ffffff', fontWeight: 600, fontSize: '0.82rem' }}>
                          <Calendar size={13} color="#ff6600" />
                          <span>{member.chapter_expiry_date || member.hog_th_expiry_date || '-'}</span>
                        </div>
                      )}
                    </td>

                    {/* HOG Int Expiry Date (Reference Only) */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94a3b8', fontSize: '0.82rem' }}>
                        <span>{member.hog_int_expiry_date || '-'}</span>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {isOfficerOrVip ? (
                        <div className="badge badge-active" style={{ background: 'rgba(234, 179, 8, 0.2)', color: '#fde047', border: '1px solid rgba(234, 179, 8, 0.5)', fontSize: '0.78rem' }}>
                          <Star size={12} fill="#fde047" color="#fde047" />
                          <span>Officer</span>
                        </div>
                      ) : member.status === 'Active' ? (
                        <div className="badge badge-active" style={{ fontSize: '0.78rem' }}>
                          <CheckCircle size={13} />
                          <span>Active</span>
                        </div>
                      ) : member.status === 'Expiring Soon' ? (
                        <div className="badge badge-expiring" style={{ fontSize: '0.78rem' }}>
                          <Clock size={13} />
                          <span>Expiring Soon</span>
                        </div>
                      ) : (
                        <div className="badge badge-expired" style={{ fontSize: '0.78rem' }}>
                          <AlertCircle size={13} />
                          <span>Expired</span>
                        </div>
                      )}
                    </td>

                    {/* Actions & CRM Interaction Button */}
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        {/* CRM Interaction Log Button */}
                        <button
                          className="btn-action"
                          onClick={() => onOpenInteractions(member)}
                          title="ดูและบันทึกประวัติการติดต่อ"
                          style={{
                            background: logCount > 0 ? 'rgba(255, 102, 0, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                            border: logCount > 0 ? '1px solid rgba(255, 102, 0, 0.4)' : '1px solid var(--border-color)',
                            color: logCount > 0 ? '#ff8533' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <MessageSquare size={13} color={logCount > 0 ? '#ff8533' : '#94a3b8'} />
                          <span>ประวัติ ({logCount})</span>
                        </button>

                        {/* Edit Button (Admin Only) */}
                        {userRole === 'admin' && (
                          <button
                            className="btn-action"
                            onClick={() => onEditMember(member)}
                            title="แก้ไขข้อมูลสมาชิก"
                            style={{ color: '#60a5fa', borderColor: 'rgba(96, 165, 250, 0.3)', padding: '4px 8px' }}
                          >
                            <Edit3 size={15} />
                          </button>
                        )}

                        {/* Delete Button (Admin Only) */}
                        {userRole === 'admin' && (
                          <button
                            className="btn-action btn-delete"
                            onClick={() => onDeleteMember(member)}
                            style={{ padding: '4px 8px' }}
                            title="ลบสมาชิก (Admin Only)"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
