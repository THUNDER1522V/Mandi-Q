import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Clock,
  Circle,
  X,
  ShieldCheck,
  Truck,
  Scale,
  CreditCard,
  LogOut,
  QrCode,
  UserCheck,
  Layers,
} from 'lucide-react';
import type { ProcurementEventItem, ProcurementStatus } from '../types/fairprocure';
import { getProcurementTimeline } from '../api/fairprocure';

export const PROCUREMENT_MILESTONES: {
  status: ProcurementStatus;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
}[] = [
  { status: 'ARRIVED', label: 'Arrived at Gate', sublabel: 'Vehicle entry detected at APMC gate', icon: Truck },
  { status: 'QR_VERIFIED', label: 'QR Verified', sublabel: 'Digital cryptographic pass authenticated', icon: QrCode },
  { status: 'QUEUE_ENTERED', label: 'Queue Entered', sublabel: 'Enrolled in electronic intake ledger', icon: Layers },
  { status: 'WAITING', label: 'Waiting for Bay', sublabel: 'Staged in holding lane', icon: Clock },
  { status: 'WEIGHMENT_STARTED', label: 'Weighment Started', sublabel: 'Gross vehicle weight capture on scale', icon: Scale },
  { status: 'WEIGHMENT_COMPLETED', label: 'Weighment Completed', sublabel: 'Tare weight recorded and net yield calculated', icon: CheckCircle2 },
  { status: 'PROCUREMENT_STARTED', label: 'Procurement Started', sublabel: 'FairProcure governance cleared intake', icon: ShieldCheck },
  { status: 'PROCUREMENT_COMPLETED', label: 'Procurement Completed', sublabel: 'Lot accepted and graded by Mandi Inspector', icon: UserCheck },
  { status: 'PAYMENT_INITIATED', label: 'Payment Initiated', sublabel: 'PFMS Direct Benefit Transfer generated', icon: CreditCard },
  { status: 'PAYMENT_COMPLETED', label: 'Payment Completed', sublabel: 'Bank settlement confirmed via NPCI/DBT', icon: CheckCircle2 },
  { status: 'EXITED', label: 'Exited Mandi', sublabel: 'Gate checkout pass issued and cleared', icon: LogOut },
];

interface ProcurementTimelineProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId?: string;
  tokenNumber?: number | string;
  farmerName?: string;
  currentStatus?: string;
}

export const ProcurementTimeline: React.FC<ProcurementTimelineProps> = ({
  isOpen,
  onClose,
  bookingId,
  tokenNumber,
  farmerName,
  currentStatus = 'WAITING',
}) => {
  const [events, setEvents] = useState<ProcurementEventItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !bookingId) {
      setEvents([]);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getProcurementTimeline(bookingId)
      .then((data) => {
        if (isMounted) {
          setEvents(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('[ProcurementTimeline] Could not fetch remote timeline:', err);
          // Non-blocking error: we will still show the milestones with the currentStatus
          setEvents([]);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, bookingId]);

  if (!isOpen) return null;

  // Determine current step index
  const normalizedCurrent = (currentStatus || 'WAITING').toUpperCase();
  const currentMilestoneIndex = PROCUREMENT_MILESTONES.findIndex(
    (m) => m.status === normalizedCurrent
  );
  // Default to WAITING index if not found
  const activeIndex = currentMilestoneIndex >= 0 ? currentMilestoneIndex : 3;

  const eventMap = new Map<string, ProcurementEventItem>();
  events.forEach((ev) => {
    eventMap.set(ev.status, ev);
  });

  return (
    <AnimatePresence>
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="timeline-modal-title"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1050,
          padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="modal-card"
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl, 16px)',
            border: '1px solid var(--border-light)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            width: '100%',
            maxWidth: 680,
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'rgba(37, 99, 235, 0.12)',
                    color: 'var(--brand-navy, #2563eb)',
                  }}
                >
                  <ShieldCheck size={18} />
                </span>
                <h3
                  id="timeline-modal-title"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  FairProcure Procurement Timeline
                </h3>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 4,
                  display: 'flex',
                  gap: 12,
                }}
              >
                {tokenNumber && (
                  <span>
                    Token: <strong className="font-mono">#{tokenNumber}</strong>
                  </span>
                )}
                {farmerName && <span>Farmer: <strong>{farmerName}</strong></span>}
                {bookingId && (
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                    ID: {bookingId.slice(0, 8)}...
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close timeline"
              className="btn btn-ghost btn-sm"
              style={{
                borderRadius: '50%',
                width: 34,
                height: 34,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Stepper Content */}
          <div
            style={{
              padding: '24px 28px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {loading && (
              <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                Fetching chronological audit events...
              </div>
            )}

            {PROCUREMENT_MILESTONES.map((milestone, idx) => {
              const isCompleted = idx < activeIndex;
              const isCurrent = idx === activeIndex;
              const isFuture = idx > activeIndex;

              const Icon = milestone.icon;
              const recordedEvent = eventMap.get(milestone.status);

              // Color logic:
              // Completed: Green (#16a34a)
              // Current: Blue (#2563eb)
              // Future: Grey (#94a3b8)
              let iconBg = '#f1f5f9';
              let iconColor = '#94a3b8';
              let borderColor = 'var(--border-light, #e2e8f0)';
              let statusLabel = 'Pending';
              let statusBadgeBg = 'rgba(148, 163, 184, 0.12)';
              let statusBadgeColor = '#64748b';

              if (isCompleted) {
                iconBg = 'rgba(22, 163, 74, 0.12)';
                iconColor = '#16a34a';
                borderColor = '#16a34a';
                statusLabel = 'Completed';
                statusBadgeBg = 'rgba(22, 163, 74, 0.12)';
                statusBadgeColor = '#16a34a';
              } else if (isCurrent) {
                iconBg = 'rgba(37, 99, 235, 0.14)';
                iconColor = '#2563eb';
                borderColor = '#2563eb';
                statusLabel = 'In Progress';
                statusBadgeBg = 'rgba(37, 99, 235, 0.15)';
                statusBadgeColor = '#2563eb';
              }

              const timestamp =
                recordedEvent?.completed_at ||
                recordedEvent?.started_at ||
                recordedEvent?.created_at;

              return (
                <div
                  key={milestone.status}
                  style={{
                    display: 'flex',
                    position: 'relative',
                    paddingBottom: idx === PROCUREMENT_MILESTONES.length - 1 ? 0 : 22,
                  }}
                >
                  {/* Vertical Line */}
                  {idx < PROCUREMENT_MILESTONES.length - 1 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: 17,
                        top: 36,
                        bottom: 0,
                        width: 2,
                        backgroundColor: isCompleted ? '#16a34a' : 'var(--border-subtle, #e2e8f0)',
                        zIndex: 1,
                      }}
                    />
                  )}

                  {/* Icon Node */}
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: iconBg,
                      border: `2px solid ${borderColor}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: iconColor,
                      zIndex: 2,
                      flexShrink: 0,
                      position: 'relative',
                      boxShadow: isCurrent ? '0 0 0 4px rgba(37, 99, 235, 0.18)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} />
                    ) : isCurrent ? (
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        style={{ display: 'flex' }}
                      >
                        <Icon size={18} />
                      </motion.div>
                    ) : (
                      <Circle size={14} />
                    )}
                  </div>

                  {/* Node Content */}
                  <div style={{ marginLeft: 16, flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: isCurrent ? 700 : 600,
                            color: isFuture ? 'var(--text-tertiary)' : 'var(--text-primary)',
                          }}
                        >
                          {milestone.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            padding: '2px 7px',
                            borderRadius: 10,
                            background: statusBadgeBg,
                            color: statusBadgeColor,
                          }}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Timestamp */}
                      {timestamp && (
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 11,
                            color: 'var(--text-secondary)',
                            background: 'var(--bg-surface)',
                            padding: '2px 8px',
                            borderRadius: 6,
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {new Date(timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--text-secondary)',
                        marginTop: 2,
                        lineHeight: 1.4,
                      }}
                    >
                      {recordedEvent?.remarks || milestone.sublabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
            }}
          >
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Step {activeIndex + 1} of {PROCUREMENT_MILESTONES.length} · Live FairProcure State Machine
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ minWidth: 80 }}
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
