import React from 'react';
import type { MandiMetrics } from '../types/dashboard';
import type { FairnessMetrics, QRDashboardMetrics } from '../types/fairprocure';
import { AnimatedCounter } from './AnimatedCounter';
import { Users, Clock, Scale, Timer } from 'lucide-react';

interface StatCardsProps {
  metrics: MandiMetrics;
  onFilterClick?: (status: string) => void;
  activeFilter?: string;
  fairnessMetrics?: FairnessMetrics | null;
  qrMetrics?: QRDashboardMetrics | null;
}

export const StatCards: React.FC<StatCardsProps> = ({
  metrics,
  onFilterClick,
  activeFilter,
  fairnessMetrics,
  qrMetrics: _qrMetrics,
}) => {
  const cards = [
    {
      key: 'TOTAL_FARMERS',
      filterKey: 'ALL',
      label: 'Total Farmers',
      value: metrics.totalRegistered,
      suffix: '',
      meta: 'Registered APMC Farmers',
      accentColor: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.14)',
      icon: Users,
    },
    {
      key: 'ACTIVE_QUEUE',
      filterKey: 'WAITING',
      label: 'Active Queue',
      value: metrics.waitingCount,
      suffix: '',
      meta: 'Farmers awaiting bay intake',
      accentColor: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.14)',
      icon: Clock,
    },
    {
      key: 'TODAYS_PROCUREMENT',
      filterKey: 'SERVED',
      label: "Today's Procurement",
      value: fairnessMetrics?.today_procurements ?? metrics.totalQuintalsProcured,
      suffix: ' Qtl',
      meta: 'Produce weighed & cleared today',
      accentColor: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.14)',
      icon: Scale,
    },
    {
      key: 'AVG_WAITING_TIME',
      filterKey: 'WAITING',
      label: 'Avg Waiting Time',
      value: Math.round(fairnessMetrics?.average_waiting_time_minutes ?? metrics.avgWaitMinutes),
      suffix: ' min',
      meta: 'Gate to weighbridge turnaround',
      accentColor: '#ea580c',
      bgColor: 'rgba(234, 88, 12, 0.14)',
      icon: Timer,
    },
  ];

  return (
    <section
      aria-label="Operational Metrics"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 14,
      }}
    >
      {cards.map((c) => {
        const isActive = activeFilter === c.filterKey;
        const IconComponent = c.icon;
        return (
          <div
            key={c.key}
            onClick={() => c.filterKey && onFilterClick?.(c.filterKey)}
            style={{
              background: 'var(--bg-card, #0f172a)',
              border: `1px solid ${isActive ? c.accentColor : 'var(--border-light, rgba(255,255,255,0.08))'}`,
              borderLeft: `4px solid ${c.accentColor}`,
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '18px 20px',
              boxShadow: isActive
                ? `0 0 0 1.5px ${c.accentColor}, 0 4px 16px rgba(0,0,0,0.25)`
                : 'var(--shadow-sm, 0 2px 8px rgba(0,0,0,0.18))',
              cursor: onFilterClick && c.filterKey ? 'pointer' : 'default',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="kpi-card"
          >
            {/* Top Row: Label and Colored Icon Capsule */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-secondary, #94a3b8)',
                }}
              >
                {c.label}
              </span>

              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: c.bgColor,
                  color: c.accentColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <IconComponent size={16} strokeWidth={2.4} />
              </div>
            </div>

            {/* Value Display */}
            <div
              className="font-mono"
              style={{
                fontSize: 34,
                fontWeight: 800,
                color: 'var(--text-primary, #f8fafc)',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'baseline',
              }}
            >
              <AnimatedCounter value={c.value} duration={300} />
              {c.suffix && (
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--text-secondary, #94a3b8)',
                    marginLeft: 4,
                  }}
                >
                  {c.suffix}
                </span>
              )}
            </div>

            {/* Bottom Meta */}
            <div
              style={{
                fontSize: 12,
                color: 'var(--text-tertiary, #64748b)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: c.accentColor,
                  display: 'inline-block',
                }}
              />
              <span>{c.meta}</span>
            </div>
          </div>
        );
      })}
    </section>
  );
};
