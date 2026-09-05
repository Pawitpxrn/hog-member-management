import React from 'react';
import { Users, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

export default function StatsOverview({ stats, currentFilter, onFilterChange }) {
  if (!stats) return null;

  const cards = [
    {
      id: 'ALL',
      title: 'ทั้งหมด (Total)',
      count: stats.total || 0,
      icon: Users,
      color: '#ff6600',
      bg: 'rgba(255, 102, 0, 0.1)',
      border: 'rgba(255, 102, 0, 0.3)',
      filterKey: 'all'
    },
    {
      id: 'active',
      title: 'ปกติ (Active)',
      count: stats.active || 0,
      icon: CheckCircle2,
      color: '#4ade80',
      bg: 'rgba(34, 197, 94, 0.1)',
      border: 'rgba(34, 197, 94, 0.3)',
      filterKey: 'active'
    },
    {
      id: 'expiring_soon',
      title: 'ใกล้หมดอายุ (< 30 วัน)',
      count: stats.expiring_soon || 0,
      icon: AlertTriangle,
      color: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.1)',
      border: 'rgba(245, 158, 11, 0.3)',
      filterKey: 'expiring_soon'
    },
    {
      id: 'expired',
      title: 'หมดอายุแล้ว (Expired)',
      count: stats.expired || 0,
      icon: XCircle,
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.1)',
      border: 'rgba(239, 68, 68, 0.3)',
      filterKey: 'expired'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '10px',
      marginBottom: '14px'
    }}>
      {cards.map(card => {
        const IconComponent = card.icon;
        const isSelected = currentFilter === card.filterKey;

        return (
          <div
            key={card.id}
            onClick={() => onFilterChange(card.filterKey)}
            className="glass-panel"
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              borderColor: isSelected ? card.color : 'var(--border-color)',
              background: isSelected ? card.bg : 'var(--bg-glass)',
              transform: isSelected ? 'translateY(-1px)' : 'none',
              boxShadow: isSelected ? `0 0 14px ${card.bg}` : 'var(--shadow-card)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                {card.title}
              </span>
              <div style={{
                padding: '5px',
                borderRadius: '6px',
                background: card.bg,
                border: `1px solid ${card.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconComponent size={15} color={card.color} />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                {card.count}
              </span>
              <span style={{ fontSize: '0.75rem', color: card.color, fontWeight: 600 }}>
                คน
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

