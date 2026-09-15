import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ActivityEvent } from '../types/dashboard';
import {
  CheckCircle2,
  CreditCard,
  AlertTriangle,
  Radio,
  Scale,
} from 'lucide-react';

interface LiveActivityFeedProps {
  events: ActivityEvent[];
  maxItems?: number;
}

export const LiveActivityFeed: React.FC<LiveActivityFeedProps> = ({
  events,
  maxItems = 20,
}) => {
  const displayedEvents = events.slice(0, maxItems);

  const getEventIcon = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'served':
        return <CheckCircle2 size={13} color="var(--color-success)" strokeWidth={2} />;
      case 'payment':
        return <CreditCard size={13} color="var(--color-success)" strokeWidth={2} />;
      case 'bay':
        return <Scale size={13} color="var(--brand-navy)" strokeWidth={2} />;
      case 'halt':
        return <AlertTriangle size={13} color="var(--color-danger)" strokeWidth={2} />;
      case 'sms':
      case 'system':
      default:
        return <Radio size={13} color="var(--brand-navy)" strokeWidth={2} />;
    }
  };

  const getEventBadge = (type: ActivityEvent['type']) => {
    switch (type) {
      case 'served':
        return <span className="badge badge-success">Completed</span>;
      case 'payment':
        return <span className="badge badge-success">Paid</span>;
      case 'bay':
        return <span className="badge badge-serving">Dispatched</span>;
      case 'sms':
        return <span className="badge badge-neutral">SMS</span>;
      case 'halt':
        return <span className="badge badge-danger">Halted</span>;
      case 'system':
      default:
        return <span className="badge badge-neutral">System</span>;
    }
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        boxShadow: 'var(--shadow)',
        overflow: 'hidden',
        background: 'var(--bg-card)',
      }}
    >
      {/* Editorial Timeline Header */}
      <div
        className="card-header"
        style={{
          padding: '18px 26px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--bg-surface)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="status-dot success animate-pulse" style={{ width: 6.5, height: 6.5 }} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            ACTIVITY TIMELINE
          </span>
        </div>

        <span
          className="font-mono text-xs text-muted"
          style={{
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
          }}
        >
          {events.length} Events
        </span>
      </div>

      {/* Editorial Linear/GitHub Activity Stream with Slide from Top */}
      <div
        style={{
          padding: '24px 28px',
          overflowY: 'auto',
          maxHeight: 540,
        }}
      >
        {displayedEvents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
              Operations running normally.
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Awaiting next operations telemetry event.
            </div>
          </motion.div>
        ) : (
          <div className="timeline" style={{ gap: 20 }}>
            <AnimatePresence initial={false}>
              {displayedEvents.map((evt, index) => (
                <motion.div
                  key={evt.id || `${evt.timestamp}-${index}`}
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="timeline-item"
                  style={{
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Timeline Line & Icon */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      flexShrink: 0,
                      width: 26,
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 'var(--radius-pill)',
                        background: index === 0 ? 'var(--color-action-bg)' : 'var(--bg-subtle)',
                        border: `1px solid ${index === 0 ? 'var(--color-action-border)' : 'var(--border-light)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {getEventIcon(evt.type)}
                    </div>
                    {index < displayedEvents.length - 1 && (
                      <div
                        style={{
                          width: 1.5,
                          flex: 1,
                          background: 'var(--border-subtle)',
                          marginTop: 6,
                          minHeight: 28,
                        }}
                      />
                    )}
                  </div>

                  {/* Event Details */}
                  <div
                    style={{
                      flex: 1,
                      paddingBottom: index < displayedEvents.length - 1 ? 14 : 0,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {evt.title}
                        </span>
                        {getEventBadge(evt.type)}
                      </div>

                      <span
                        className="font-mono text-xs text-muted"
                        style={{ fontSize: 11 }}
                      >
                        {evt.timestamp}
                      </span>
                    </div>

                    {evt.detail && (
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--text-secondary)',
                          marginTop: 4,
                          lineHeight: 1.5,
                        }}
                      >
                        {evt.detail}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
