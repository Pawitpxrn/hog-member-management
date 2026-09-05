import React, { useState } from 'react';
import { Lock, User, ShieldAlert, ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      backgroundImage: 'linear-gradient(rgba(10, 11, 13, 0.78), rgba(10, 11, 13, 0.88)), url("/harley_bg.jpg")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat'
    }}>
      {/* Translucent Cyber-Grid Pattern Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(255, 102, 0, 0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255, 102, 0, 0.07) 1px, transparent 1px)
        `,
        backgroundSize: '36px 36px',
        pointerEvents: 'none',
        zIndex: 1
      }} />

      {/* Main Glassmorphism Login Card */}
      <div className="glass-panel" style={{
        position: 'relative',
        zIndex: 2,
        width: '100%',
        maxWidth: '440px',
        padding: '40px 34px',
        borderRadius: '22px',
        border: '1.5px solid rgba(255, 102, 0, 0.45)',
        boxShadow: '0 30px 70px rgba(0,0,0,0.95), 0 0 45px rgba(255, 102, 0, 0.25)',
        background: 'rgba(12, 18, 30, 0.78)',
        backdropFilter: 'blur(24px)'
      }}>
        {/* Emblem & Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div style={{
            width: '94px',
            height: '94px',
            margin: '0 auto 18px auto',
            borderRadius: '22px',
            overflow: 'hidden',
            border: '2.5px solid #ff6600',
            boxShadow: '0 0 35px rgba(255, 102, 0, 0.6)',
            background: '#000',
            padding: '6px'
          }}>
            <img src="/logo.jpg" alt="HOG Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>

          <h1 style={{
            fontSize: '1.58rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            lineHeight: 1.2
          }}>
            HOG <span style={{ color: '#ff6600', textShadow: '0 0 25px rgba(255,102,0,0.7)' }}>MEMBER MANAGEMENT</span>
          </h1>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px', fontWeight: 500 }}>
            เข้าสู่ระบบสำหรับเจ้าหน้าที่และผู้ดูแลระบบ (HOG-MMS)
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.18)',
            border: '1px solid rgba(239, 68, 68, 0.45)',
            color: '#f87171',
            padding: '12px 14px',
            borderRadius: '10px',
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
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>Username (ชื่อเข้าใช้ระบบ)</label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#ff6600" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="กรอกชื่อผู้ใช้..."
                style={{
                  width: '100%',
                  paddingLeft: '44px',
                  height: '46px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  borderColor: 'rgba(255, 102, 0, 0.35)',
                  background: 'rgba(8, 12, 20, 0.85)'
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '28px' }}>
            <label className="form-label" style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>Password (รหัสผ่าน)</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#ff6600" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="กรอกรหัสผ่าน..."
                style={{
                  width: '100%',
                  paddingLeft: '44px',
                  paddingRight: '44px',
                  height: '46px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  borderColor: 'rgba(255, 102, 0, 0.35)',
                  background: 'rgba(8, 12, 20, 0.85)'
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0
                }}
                title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{
              width: '100%',
              justify: 'center',
              height: '48px',
              borderRadius: '10px',
              fontSize: '0.95rem',
              fontWeight: 800,
              boxShadow: '0 4px 20px rgba(255, 102, 0, 0.45)',
              background: 'linear-gradient(135deg, #ff6600 0%, #d95300 100%)'
            }}
            disabled={loading}
          >
            <span>{loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ (Sign In)'}</span>
            <ArrowRight size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
