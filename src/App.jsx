import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, FileText, Clock, User as UserIcon, RefreshCw } from 'lucide-react';
import Navbar from './components/Navbar';
import StatsOverview from './components/StatsOverview';
import MemberList from './components/MemberList';
import MemberModal from './components/MemberModal';
import AuditLogModal from './components/AuditLogModal';
import GoogleSheetsModal from './components/GoogleSheetsModal';
import InteractionLogModal from './components/InteractionLogModal';
import TagMasterModal from './components/TagMasterModal';
import UserManagementModal from './components/UserManagementModal';
import LoginPage from './components/LoginPage';

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('hog_token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hog_user');
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.full_name) {
        parsed.full_name = parsed.full_name.replace(/HOG (Club\s*)?/gi, '').trim() || 'Administrator';
        localStorage.setItem('hog_user', JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      return null;
    }
  });

  const [members, setMembers] = useState([]);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [tagMasters, setTagMasters] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [chapterFilter, setChapterFilter] = useState('ALL');

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [activeInteractionMember, setActiveInteractionMember] = useState(null);
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage('');
    }, 4000);
  };

  // Helper fetch with Auth header
  const authFetch = useCallback(async (url, options = {}) => {
    if (!token) throw new Error('No authentication token');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
      handleLogout();
      throw new Error('Session หมดอายุ กรุณาล็อกอินใหม่อีกครั้ง');
    }
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'เกิดข้อผิดพลาด');
    }
    return data;
  }, [token]);

  // Load stats
  const fetchStats = useCallback(async () => {
    try {
      const data = await authFetch('/api/members/stats');
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [authFetch]);

  // Load members
  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (searchQuery) queryParams.append('search', searchQuery);
      if (statusFilter && statusFilter !== 'all') queryParams.append('status', statusFilter);
      if (chapterFilter && chapterFilter !== 'ALL') queryParams.append('chapter', chapterFilter);

      const data = await authFetch(`/api/members?${queryParams.toString()}`);
      setMembers(data.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch, searchQuery, statusFilter, chapterFilter]);

  // Load Tag Masters
  const fetchTagMasters = useCallback(async () => {
    try {
      const data = await authFetch('/api/tags');
      setTagMasters(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tag masters:', err);
    }
  }, [authFetch]);

  // Load Audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const data = await authFetch('/api/audit-logs');
      setAuditLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  }, [authFetch]);

  useEffect(() => {
    if (token && user) {
      fetchMembers();
      fetchStats();
      fetchTagMasters();
      fetchAuditLogs();
    }
  }, [token, user, fetchMembers, fetchStats, fetchTagMasters, fetchAuditLogs]);

  // Handle Login success
  const handleLoginSuccess = (loggedInUser, newToken) => {
    setUser(loggedInUser);
    setToken(newToken);
    showToast(`ยินดีต้อนรับคุณ ${loggedInUser.full_name || loggedInUser.username}`);
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('hog_token');
    localStorage.removeItem('hog_user');
    setToken('');
    setUser(null);
  };

  // Open Add Member modal
  const handleOpenAddModal = () => {
    setEditingMember(null);
    setIsMemberModalOpen(true);
  };

  // Open Edit Member modal
  const handleOpenEditModal = (member) => {
    setEditingMember(member);
    setIsMemberModalOpen(true);
  };

  // Open Interactions modal
  const handleOpenInteractionModal = (member) => {
    setActiveInteractionMember(member);
    setIsInteractionModalOpen(true);
  };

  // Add Interaction Log & Transfer Slip
  const handleAddInteraction = async (memberId, note, slipUrl = '') => {
    const res = await authFetch(`/api/members/${memberId}/interactions`, {
      method: 'POST',
      body: JSON.stringify({ note, slip_url: slipUrl })
    });

    showToast(slipUrl ? 'บันทึกประวัติและสลิปโอนเงินเรียบร้อย' : 'บันทึกประวัติการติดต่อเรียบร้อย');
    
    // Instantly update active modal state so newly added log shows immediately
    if (res && res.interaction_logs) {
      setActiveInteractionMember(prev => prev ? {
        ...prev,
        interaction_logs: res.interaction_logs,
        last_slip_url: slipUrl || prev.last_slip_url
      } : null);
    }
    fetchMembers();
    return res;
  };

  // Tag Master Save (Create / Edit)
  const handleSaveTagMaster = async (id, formData) => {
    if (id) {
      const res = await authFetch(`/api/tags/${id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      showToast(res.message || 'แก้ไขข้อมูลแท็กสำเร็จ');
    } else {
      const res = await authFetch('/api/tags', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast(res.message || 'เพิ่มแท็กใหม่สำเร็จ');
    }
    fetchTagMasters();
    fetchMembers(); // refresh statuses
    fetchStats();
  };

  // Tag Master Delete
  const handleDeleteTagMaster = async (id) => {
    const res = await authFetch(`/api/tags/${id}`, {
      method: 'DELETE'
    });
    showToast(res.message || 'ลบแท็กเรียบร้อยแล้ว');
    fetchTagMasters();
    fetchMembers();
    fetchStats();
  };

  // Save Member (Add / Edit)
  const handleSaveMember = async (formData) => {
    if (editingMember) {
      const res = await authFetch(`/api/members/${editingMember.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      showToast(res.message || 'แก้ไขข้อมูลสำเร็จ');
    } else {
      const res = await authFetch('/api/members', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      showToast(res.message || 'เพิ่มสมาชิกใหม่สำเร็จ');
    }

    fetchMembers();
    fetchStats();
  };

  // Delete Member
  const handleDeleteMember = async (member) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ที่จะลบข้อมูลสมาชิกคุณ "${member.name}" (${member.member_code})?`)) {
      return;
    }

    try {
      const res = await authFetch(`/api/members/${member.id}`, {
        method: 'DELETE'
      });
      showToast(res.message || 'ลบสมาชิกเรียบร้อยแล้ว');
      fetchMembers();
      fetchStats();
    } catch (err) {
      alert(err.message);
    }
  };

  // Open Audit Log modal
  const handleOpenAuditModal = () => {
    fetchAuditLogs();
    setIsAuditModalOpen(true);
  };

  // Open Google Sheets Modal
  const handleOpenSheetsModal = () => {
    setIsSheetsModalOpen(true);
  };

  const handleSaveSheetsConfig = async (webhookUrl) => {
    const res = await authFetch('/api/sheets/config', {
      method: 'POST',
      body: JSON.stringify({ webhook_url: webhookUrl })
    });
    showToast(res.message);
  };

  const handleSyncAllSheets = async () => {
    const res = await authFetch('/api/sheets/sync-all', {
      method: 'POST'
    });
    showToast(res.message);
  };

  // Render Login page if unauthenticated
  if (!token || !user) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '40px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #ff6600 0%, #e05500 100%)',
          color: '#ffffff',
          padding: '14px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(255, 102, 0, 0.4)',
          fontWeight: 600,
          fontSize: '0.9rem',
          zIndex: 999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          ✨ {toastMessage}
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onOpenAudit={handleOpenAuditModal}
        onOpenSheets={handleOpenSheetsModal}
        onOpenTags={() => setIsTagModalOpen(true)}
        onOpenUsers={() => setIsUserModalOpen(true)}
      />

      {/* Main Dashboard Container */}
      <main style={{ maxWidth: '1300px', margin: '0 auto', padding: '0 24px' }}>
        {/* Staff Read-Only Notice Banner */}
        {user.role === 'staff' && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.12)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '10px',
            padding: '10px 16px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.82rem',
            color: '#60a5fa'
          }}>
            <ShieldCheck size={18} color="#60a5fa" />
            <span>
              <strong>โหมดการใช้งานสิทธิ์ Officer (Staff Mode):</strong> เข้าดูรายชื่อสมาชิก สถิติ ค้นหา และดูไฟล์แนบ Attachment ได้อย่างเดียว (Read-Only)
            </span>
          </div>
        )}

        {/* KPI Cards Overview */}
        <StatsOverview
          stats={stats}
          currentFilter={statusFilter}
          onFilterChange={(fKey) => setStatusFilter(fKey)}
        />

        {/* Member Table Section */}
        <MemberList
          members={members}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          chapterFilter={chapterFilter}
          onChapterFilterChange={setChapterFilter}
          onAddMember={handleOpenAddModal}
          onEditMember={handleOpenEditModal}
          onDeleteMember={handleDeleteMember}
          onOpenInteractions={handleOpenInteractionModal}
          userRole={user.role}
          tagMasters={tagMasters}
        />
      </main>

      {/* Add / Edit Member Modal */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSave={handleSaveMember}
        memberData={editingMember}
        isEditing={!!editingMember}
        tagMasters={tagMasters}
        onSaveTagMaster={handleSaveTagMaster}
      />

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        logs={auditLogs}
      />

      {/* Google Sheets Config & Sync Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        onSaveConfig={handleSaveSheetsConfig}
        onSyncAll={handleSyncAllSheets}
      />

      {/* CRM Interaction Log Modal */}
      <InteractionLogModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        member={activeInteractionMember}
        onAddInteraction={handleAddInteraction}
        userRole={user.role}
      />

      {/* Tag Master Management Modal */}
      <TagMasterModal
        isOpen={isTagModalOpen}
        onClose={() => setIsTagModalOpen(false)}
        tags={tagMasters}
        onSaveTag={handleSaveTagMaster}
        onDeleteTag={handleDeleteTagMaster}
      />

      {/* System User & Password Management Modal */}
      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        currentUser={user}
      />
    </div>
  );
}


