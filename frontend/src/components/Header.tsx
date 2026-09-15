import React, { useState, useEffect, useRef } from 'react';
import { WifiOff } from 'lucide-react';
import { MandiQLogo } from './MandiQLogo';
import { ThemeToggle, type ThemeMode } from './ThemeToggle';

interface HeaderProps {
  isHalted: boolean;
  lastSyncTime: string;
  isLive: boolean;
  isDemoMode?: boolean;
  onToggleMode?: () => void;
  alertsCount?: number;
  onNotificationsClick?: () => void;
  onResetSimulation?: () => void;
  theme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isHalted,
  lastSyncTime,
  isLive,
  isDemoMode = false,
  onToggleMode: _onToggleMode,
  alertsCount = 0,
  onNotificationsClick: _onNotificationsClick,
  theme = 'day',
  onThemeChange,
}) => {
  console.log('[Header Render] isLive:', isLive, 'isDemoMode:', isDemoMode, 'isHalted:', isHalted, 'alertsCount:', alertsCount, 'lastSyncTime:', lastSyncTime);
  const [time, setTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST'
      );
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Live relative sync telemetry (seconds ago) ──
  const [secondsAgo, setSecondsAgo] = useState('0.3');
  const lastSyncAtRef = useRef<number>(0);

  useEffect(() => {
    if (lastSyncTime) {
      lastSyncAtRef.current = Date.now();
      const timer = setTimeout(() => {
        setSecondsAgo('0.2');
      }, 10);
      return () => clearTimeout(timer);
    }
  }, [lastSyncTime]);

  useEffect(() => {
    lastSyncAtRef.current = Date.now();
    const interval = setInterval(() => {
      if (lastSyncAtRef.current > 0) {
        const elapsed = Math.max(0, (Date.now() - lastSyncAtRef.current) / 1000);
        setSecondsAgo(elapsed.toFixed(1));
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header" style={{ position: 'relative' }}>
      {/* Official 3px Tricolor Accent Strip */}
      <div
        className="tricolor-strip"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          zIndex: 20,
        }}
      />

      {/* Left: MANDIQ · Karnal APMC · Agricultural Operations Intelligence */}
      <div className="header-left" style={{ alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <MandiQLogo size={32} />
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: 16,
                letterSpacing: '0.04em',
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              MandiQ
            </span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--brand-navy)',
                letterSpacing: '-0.01em',
              }}
            >
              Karnal APMC
            </span>
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              letterSpacing: '0.01em',
              lineHeight: 1.3,
            }}
          >
            Agricultural Operations Intelligence
          </div>
        </div>
      </div>

      {/* Right: Time, System Status, Connection Status, Backend Status, Notifications */}
      <div className="header-right" style={{ gap: 'var(--sp-2)' }}>

        {/* Demo Mode Badge vs. Live Telemetry Indicator */}
        {isDemoMode ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 12px',
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.28)',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <span className="status-dot waiting" style={{ width: 6.5, height: 6.5 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', letterSpacing: '0.02em' }}>
              Demo Mode
            </span>
            <span style={{ color: 'var(--border-light)', fontSize: 11 }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              Using Sample Procurement Data
            </span>
          </div>
        ) : (
          /* 1. Iconic LIVE Telemetry Indicator */
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '4px 10px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-pill)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {isLive ? (
              <>
                <div className="live-indicator-badge">
                  <span className="live-indicator-dot" />
                  <span className="live-indicator-text">LIVE</span>
                </div>
                <span style={{ color: 'var(--border-light)', fontSize: 11 }}>·</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                  Sync <span className="font-mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{secondsAgo}s</span>
                </span>
              </>
            ) : (
              <>
                <WifiOff size={12} color="var(--text-tertiary)" />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Connecting...</span>
              </>
            )}
          </div>
        )}

        {/* 5. Command Center Operational Theme Control (☀ Day / 🌙 Night) */}
        {onThemeChange && (
          <ThemeToggle theme={theme} onThemeChange={onThemeChange} />
        )}

        {/* 6. Current Time (IBM Plex Mono) */}
        <span
          className="font-mono"
          style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: '0.02em',
            color: 'var(--text-primary)',
            padding: '5px 12px',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          {time}
        </span>

      </div>
    </header>
  );
};
