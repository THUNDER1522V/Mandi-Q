import React from 'react';
import type { SmsNotification, HaltEvent } from '../types/dashboard';
import { CheckCheck, Phone, Radio, AlertTriangle } from 'lucide-react';

interface AlertsPanelProps {
  alerts: SmsNotification[];
  haltEvents: HaltEvent[];
}

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, haltEvents }) => {
  console.log('[AlertsPanel Render] alerts count:', alerts.length, 'haltEvents count:', haltEvents.length);
  return (
    <section aria-label="Notifications and Alerts" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>

      {/* Left Column: Halt Emergency Audit Events */}
      <div className="card" style={{ border: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <div
          className="card-header"
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Halt Emergency Records</span>
            {haltEvents.length > 0 && (
              <span className="badge badge-danger">{haltEvents.length} Events</span>
            )}
          </div>
        </div>

        <div className="card-body" style={{ padding: '22px' }}>
          {haltEvents.length === 0 ? (
            <div
              className="empty-state"
              style={{
                padding: '48px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                No Scheduled Halts
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Procurement is operating normally.
              </div>
            </div>
          ) : (
            <div className="timeline">
              {haltEvents.map((evt, i) => (
                <div key={evt.id} className="timeline-item">
                  <div className="timeline-line">
                    <div className="timeline-dot danger" />
                    {i < haltEvents.length - 1 && <div className="timeline-connector" />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < haltEvents.length - 1 ? 18 : 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 13,
                          color: 'var(--color-danger)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <AlertTriangle size={14} />
                        Procurement Halted
                      </div>
                      <span className="font-mono text-xs text-muted">{evt.timestamp}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.4 }}>
                      {evt.reason}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        gap: 10,
                        fontSize: 12,
                        padding: '6px 12px',
                        background: 'var(--color-danger-bg)',
                        border: '1px solid var(--color-danger-border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Staff: <strong style={{ color: 'var(--text-primary)' }}>{evt.haltedBy.split(' (')[0]}</strong>
                      </span>
                      <span style={{ color: 'var(--border-medium)' }}>·</span>
                      <span style={{ color: 'var(--color-danger)', fontWeight: 600 }}>
                        {evt.affectedCount} farmers rescheduled
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Live Notification Feed (Neutral, red only for critical, muted when completed) */}
      <div className="card" style={{ border: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <div
          className="card-header"
          style={{
            padding: '16px 22px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Dispatched Notifications</span>
            {alerts.length > 0 && (
              <span className="badge badge-neutral">
                <CheckCheck size={11} />
                {alerts.length} Dispatched
              </span>
            )}
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {alerts.length === 0 ? (
            <div
              className="empty-state"
              style={{
                padding: '48px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                Operations Running Normally
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                All notifications have been delivered.
              </div>
            </div>
          ) : (
            <div
              className="timeline"
              style={{ padding: '22px', maxHeight: 520, overflowY: 'auto' }}
            >
              {alerts.map((a, i) => {
                const isFailed = a.status === 'FAILED';
                const isDelivered = a.status === 'DELIVERED';

                return (
                  <div
                    key={a.id}
                    className="timeline-item"
                    style={{ opacity: isDelivered ? 0.88 : 1 }}
                  >
                    <div className="timeline-line">
                      <div
                        className={`timeline-dot ${isFailed ? 'danger' : 'neutral'}`}
                        style={{
                          background: isFailed
                            ? 'var(--color-danger)'
                            : isDelivered
                            ? 'var(--text-tertiary)'
                            : 'var(--brand-navy)',
                        }}
                      />
                      {i < alerts.length - 1 && <div className="timeline-connector" />}
                    </div>

                    <div style={{ flex: 1, paddingBottom: i < alerts.length - 1 ? 18 : 0 }}>
                      {/* Farmer Name + Channel + Timestamp */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                            {a.farmerName}
                          </span>
                          <span
                            className="badge badge-neutral"
                            style={{
                              fontSize: 10,
                              padding: '1px 6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 600,
                            }}
                          >
                            {a.channel === 'VOICE' ? <Radio size={10} /> : <Phone size={10} />}
                            {a.channel}
                          </span>
                        </div>
                        <span className="font-mono text-xs text-muted">{a.timestamp}</span>
                      </div>

                      {/* Delivery Status */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 8,
                          fontSize: 12,
                        }}
                      >
                        <span className="font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {a.phone}
                        </span>
                        <span style={{ color: 'var(--border-light)' }}>·</span>
                        <span
                          className={`badge ${isFailed ? 'badge-danger' : 'badge-neutral'}`}
                          style={{ fontSize: 10, padding: '1px 6px' }}
                        >
                          {a.status}
                        </span>
                        {a.newToken && (
                          <>
                            <span style={{ color: 'var(--border-light)' }}>·</span>
                            <span
                              className="font-mono text-xs"
                              style={{ color: 'var(--brand-navy)', fontWeight: 600 }}
                            >
                              New Token: {a.newToken}
                            </span>
                          </>
                        )}
                        {a.newSlot && (
                          <>
                            <span style={{ color: 'var(--border-light)' }}>·</span>
                            <span className="text-xs text-muted font-mono">{a.newSlot}</span>
                          </>
                        )}
                      </div>

                      {/* Message Body (Neutral, unboxed feel) */}
                      <div
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-light)',
                          borderRadius: 'var(--radius)',
                          padding: '10px 14px',
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {a.message || a.messageHindi}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </section>
  );
};
