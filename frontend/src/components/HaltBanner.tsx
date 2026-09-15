import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, Play } from 'lucide-react';

interface HaltBannerProps {
  isHalted: boolean;
  haltReason: string;
  rescheduledCount: number;
  onInspect: () => void;
  onResume: () => void;
}

export const HaltBanner: React.FC<HaltBannerProps> = ({
  isHalted,
  haltReason,
  rescheduledCount,
  onInspect,
  onResume,
}) => {
  console.log('[HaltBanner Render] isHalted:', isHalted, 'haltReason:', haltReason, 'rescheduledCount:', rescheduledCount);
  return (
    <AnimatePresence>
      {isHalted && (
        <motion.div
          initial={{ opacity: 0, y: -12, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -12, height: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden' }}
        >
          <div
            className="alert-banner danger"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderRadius: 'var(--radius)',
              marginBottom: 'var(--sp-2)',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            {/* Left: Icon + Message */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={18} color="var(--color-danger)" />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-danger)', letterSpacing: '0.02em' }}>
                    PROCUREMENT HALTED
                  </span>
                  <span className="status-dot danger animate-pulse" style={{ width: 6, height: 6 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Reason: <span style={{ color: 'var(--text-primary)' }}>{haltReason || 'Emergency halt authorised'}</span>
                  {rescheduledCount > 0 && (
                    <span style={{ marginLeft: 12, color: 'var(--text-secondary)' }}>
                      · <strong style={{ color: 'var(--color-warning)' }}>{rescheduledCount}</strong> farmers automatically rescheduled
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onInspect}
                style={{ fontSize: 12 }}
              >
                Inspect Alerts &amp; SMS
              </button>

              <button
                className="btn btn-primary btn-sm"
                onClick={onResume}
                style={{
                  background: 'var(--color-success)',
                  borderColor: 'var(--color-success)',
                  fontSize: 12,
                }}
              >
                <Play size={13} fill="#FFFFFF" />
                Resume Procurement
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
