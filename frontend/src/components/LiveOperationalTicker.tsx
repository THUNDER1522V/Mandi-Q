import React, { useMemo } from 'react';
import type { ActivityEvent } from '../types/dashboard';
import { Radio } from 'lucide-react';

interface LiveOperationalTickerProps {
  events: ActivityEvent[];
  isLive: boolean;
  waitingCount: number;
  isHalted: boolean;
}

export const LiveOperationalTicker: React.FC<LiveOperationalTickerProps> = ({
  events,
  isLive,
  waitingCount,
  isHalted,
}) => {
  // Generate a continuous stream of operational status snippets
  const tickerItems = useMemo(() => {
    if (events.length > 0) {
      return events.slice(0, 5).map((e) => ({
        id: e.id,
        time: e.timestamp,
        text: `${e.title}${e.detail ? ` · ${e.detail}` : ''}`,
      }));
    }

    return [
      { id: 't1', time: 'LIVE', text: 'All APMC Weighbridges operational · Scales tare zero-calibrated' },
      { id: 't2', time: 'LIVE', text: `${waitingCount} farmers queued in automated FIFO intake sequence` },
      { id: 't3', time: 'LIVE', text: 'Karnal APMC Central Procurement Gateway synchronized' },
    ];
  }, [events, waitingCount]);

  return (
    <footer
      role="region"
      aria-label="Live Operational Telemetry"
      className="live-ticker-bar"
    >
      {/* ── Left: Product Identity & Stream Tag ───────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
        {/* Subtle Tricolor Pip */}
        <span
          style={{
            display: 'inline-flex',
            width: 15,
            height: 9,
            borderRadius: 2,
            overflow: 'hidden',
            border: '1px solid var(--ticker-border-top)',
            boxShadow: '0 0 2px rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <span style={{ width: '33.33%', height: '100%', background: '#FF9933' }} />
          <span style={{ width: '33.33%', height: '100%', background: '#FFFFFF' }} />
          <span style={{ width: '33.33%', height: '100%', background: '#138808' }} />
        </span>

        <span className="live-ticker-label">
          <Radio size={11} color="var(--brand-navy)" />
          Operations Telemetry
        </span>

        <span style={{ color: 'var(--ticker-text-secondary)', opacity: 1 }}>|</span>
      </div>

      {/* ── Center: Dynamic Streaming Operational Snippets ─────── */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          margin: '0 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 18,
            animation: 'tickerSlide 35s linear infinite',
          }}
        >
          {tickerItems.concat(tickerItems).map((item, idx) => (
            <span
              key={`${item.id}-${idx}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                fontSize: 11,
              }}
            >
              {/* 100% Contrast Timestamp */}
              <span className="live-ticker-time">
                [{item.time}]
              </span>
              {/* Primary Ticker Event Text */}
              <span
                className="live-ticker-text"
                style={{
                  color: isHalted ? 'var(--color-danger)' : 'var(--ticker-text-primary)',
                  fontWeight: isHalted ? 600 : 500,
                }}
              >
                {item.text}
              </span>
              <span style={{ color: 'var(--ticker-text-secondary)', margin: '0 4px', opacity: 1 }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Right: Live Gateway Sync Pulse ─────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          flexShrink: 0,
          fontSize: 11,
          color: 'var(--ticker-text-secondary)',
          opacity: 1,
        }}
      >
        <span
          className={`status-dot ${isLive ? (isHalted ? 'danger animate-pulse' : 'success animate-pulse') : 'neutral'}`}
          style={{ width: 6, height: 6 }}
        />
        <span className="font-mono" style={{ fontWeight: 700, color: 'var(--ticker-text-primary)', opacity: 1 }}>
          {isLive ? (isHalted ? 'HALTED' : '60 FPS · APMC Karnal') : 'Offline'}
        </span>
      </div>
    </footer>
  );
};
