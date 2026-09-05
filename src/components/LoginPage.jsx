import React, { useState } from 'react';
import { Lock, User, ShieldAlert, ArrowRight, ShieldCheck } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('กรุณากรอก Username และ Password');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }

      // Save token and notify parent
      localStorage.setItem('hog_token', data.token);
      localStorage.setItem('hog_user', JSON.stringify(data.user));
      onLoginSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (demoUser, demoPass) => {
    setUsername(demoUser);
    setPassword(demoPass);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'radial-gradient(circle at 50% 30%, rgba(255, 102, 0, 0.08) 0%, #0a0b0d 70%)'
    }}>
      <div className="glass-panel" style={{
        width: '100%',
        maxWidth: '440px',
        padding: '36px',
        border: '1px solid rgba(255, 102, 0, 0.3)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255,102,0,0.15)'
      }}>
        {/* Emblem & Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            margin: '0 auto 16px auto',
            borderRadius: '16px',
            overflow: 'hidden',
            border: '2px solid #ff6600',
            boxShadow: '0 0 25px rgba(255, 102, 0, 0.4)',
            background: '#000'
          }}>
            <img src="/logo.jpg" alt="HOG Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h1 style={{
            fontSize: '1.45rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            HOG <span style={{ color: '#ff6600' }}>MEMBER MANAGEMENT</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>
            เข้าสู่ระบบสำหรับเจ้าหน้าที่และผู้ดูแลระบบ (HOG-MMS)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '12px 14px',
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

        {/* Login Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="กรอกชื่อผู้ใช้..."
                style={{ width: '100%', paddingLeft: '42px' }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                className="form-input"
                placeholder="กรอกรหัสผ่าน..."
                style={{ width: '100%', paddingLeft: '42px' }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} disabled={loading}>
            <span>{loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Quick Demo Helper Cards */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
          <p style={{ fontSize: '0.78rem', color: '#64748b', textAlign: 'center', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <ShieldCheck size={14} color="#ff6600" /> คลิกปุ่มด้านล่างเพื่อทดสอบเข้าสู่ระบบ:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleQuickLogin('admin', 'password123')}
              style={{ fontSize: '0.78rem', justifyContent: 'center', padding: '8px' }}
            >
              🔑 Administrator
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleQuickLogin('staff', 'password123')}
              style={{ fontSize: '0.78rem', justifyContent: 'center', padding: '8px' }}
            >
              👤 Officer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
