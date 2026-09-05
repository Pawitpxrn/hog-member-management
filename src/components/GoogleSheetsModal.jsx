import React, { useState, useEffect } from 'react';
import { X, Table, Check, Copy, RefreshCw, Link2, HelpCircle, ShieldCheck } from 'lucide-react';

export default function GoogleSheetsModal({ isOpen, onClose, onSaveConfig, onSyncAll }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [scriptTemplate, setScriptTemplate] = useState('');
  const [config, setConfig] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('hog_token');
      const res = await fetch('/api/sheets/config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setConfig(data.config);
        setWebhookUrl(data.config?.webhook_url || '');
        setScriptTemplate(data.script_template || '');
      }
    } catch (err) {
      console.error('Failed to fetch sheets config:', err);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      await onSaveConfig(webhookUrl);
      setMessage('บันทึก Webhook URL สำเร็จเรียบร้อยแล้ว');
      fetchConfig();
    } catch (err) {
      setMessage(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(scriptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      setMessage('');
      await onSyncAll();
      setMessage('⚡ ซิงค์ข้อมูลทั้งหมดไปยัง Google Sheets สำเร็จเรียบร้อยแล้ว!');
      fetchConfig();
    } catch (err) {
      setMessage(`ข้อผิดพลาดการซิงค์: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
              <Table size={22} color="#4ade80" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', color: '#ffffff', fontWeight: 800 }}>
                ตั้งค่าและเชื่อมต่อ Google Sheets Integration
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ซิงค์ข้อมูลสมาชิกและ Audit Logs ไปยัง Google Sheets อัตโนมัติเรียลไทม์
              </span>
            </div>
          </div>

          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* System Status Banner */}
        <div style={{
          background: config?.enabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${config?.enabled ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          borderRadius: '10px',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={20} color={config?.enabled ? '#4ade80' : '#fbbf24'} />
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff' }}>
                สถานะการเชื่อมต่อ: {config?.enabled ? '🟢 กำลังเชื่อมต่อกับ Google Sheets' : '🟡 ยังไม่ได้ตั้งค่า Webhook URL'}
              </div>
              {config?.last_sync && (
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                  ซิงค์ล่าสุด: {new Date(config.last_sync).toLocaleString('th-TH')}
                </div>
              )}
            </div>
          </div>

          {config?.enabled && (
            <button
              onClick={handleManualSync}
              className="btn-primary"
              disabled={syncing}
              style={{ padding: '8px 14px', fontSize: '0.82rem', background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}
            >
              <RefreshCw size={14} className={syncing ? 'spin-icon' : ''} />
              <span>{syncing ? 'กำลังซิงค์...' : '⚡ ซิงค์ข้อมูลเดี๋ยวนี้'}</span>
            </button>
          )}
        </div>

        {message && (
          <div style={{
            background: message.includes('สำเร็จ') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${message.includes('สำเร็จ') ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: message.includes('สำเร็จ') ? '#4ade80' : '#f87171',
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.85rem'
          }}>
            {message}
          </div>
        )}

        {/* Setup Steps Accordion */}
        <div style={{ background: 'rgba(10, 11, 13, 0.8)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.9rem', color: '#ff6600', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HelpCircle size={16} /> วิธีติดตั้งบน Google Sheet ของคุณ (3 ขั้นตอนง่ายๆ):
          </h4>
          <ol style={{ fontSize: '0.82rem', color: '#cbd5e1', paddingLeft: '20px', lineHeight: '1.6' }}>
            <li>เปิด Google Sheet ของคุณ แล้วไปที่เมนู <strong>Extensions &gt; Apps Script</strong></li>
            <li>กดปุ่ม <strong>"คัดลอกโค้ด Apps Script"</strong> ด้านล่าง แล้วนำไปวางในไฟล์ <code style={{ color: '#ff6600' }}>Code.gs</code></li>
            <li>กด <strong>Deploy &gt; New Deployment</strong> เลือก Type: <strong>Web app</strong>, Execute as: <strong>Me</strong>, Access: <strong>Anyone</strong> แล้วคัดลอก URL นำมาวางที่ช่องด้านล่าง</li>
          </ol>
        </div>

        {/* Copy Apps Script Code Button */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <label className="form-label">โค้ด Google Apps Script สำเร็จรูป (ภาษาไทย)</label>
            <button
              type="button"
              onClick={handleCopyCode}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: copied ? '#4ade80' : 'var(--border-color)' }}
            >
              {copied ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
              <span>{copied ? 'คัดลอกโค้ดแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
            </button>
          </div>
          <pre style={{
            background: '#090a0c',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px',
            fontSize: '0.75rem',
            color: '#a7f3d0',
            maxHeight: '140px',
            overflowY: 'auto',
            fontFamily: 'monospace'
          }}>
            {scriptTemplate}
          </pre>
        </div>

        {/* Webhook URL Form */}
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Google Apps Script Web App URL</label>
            <div style={{ position: 'relative' }}>
              <Link2 size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="url"
                className="form-input"
                placeholder="https://script.google.com/macros/s/.../exec"
                style={{ width: '100%', paddingLeft: '38px' }}
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
              ตัวอย่าง: https://script.google.com/macros/s/AKfycbx.../exec
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>
              ปิด
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า Webhook'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
