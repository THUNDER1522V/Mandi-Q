import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface HaltModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmHalt: (reason: string, targetSlot?: string) => void | Promise<void>;
  waitingCount: number;
}

export const HaltModal: React.FC<HaltModalProps> = ({
  isOpen,
  onClose,
  onConfirmHalt,
  waitingCount,
}) => {
  const [confirmed, setConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isSubmitting) return;
    setConfirmed(false);
    setIsSubmitting(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!confirmed || isSubmitting) return;
    try {
      setIsSubmitting(true);
      await onConfirmHalt('Emergency halt authorised by administration', 'Next Available Shift');
      setConfirmed(false);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Modal Header */}
        <div
          className="modal-header"
          style={{
            padding: '24px 24px 16px 24px',
            borderBottom: 'none',
            background: 'var(--bg-card)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 'var(--radius)',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={20} color="var(--color-danger)" />
            </div>

            <div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 17,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em',
                  lineHeight: 1.2,
                }}
              >
                Halt Procurement
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                This action will immediately halt procurement operations and automatically reschedule all waiting farmers.
                {waitingCount > 0 && (
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    {' '}({waitingCount} waiting in queue)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              padding: 6,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Confirmation Checkbox */}
        <div
          className="modal-body"
          style={{
            padding: '8px 24px 24px 24px',
            background: 'var(--bg-card)',
          }}
        >
          <label
            className="halt-confirm-box"
            style={{
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
            }}
          >
            <input
              type="checkbox"
              className="halt-confirm-checkbox"
              checked={confirmed}
              disabled={isSubmitting}
              onChange={(e) => setConfirmed(e.target.checked)}
              style={{
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
              }}
            />
            <span className="halt-confirm-text">
              I authorise this emergency halt and the automated rescheduling of all waiting farmers.
            </span>
          </label>
        </div>

        {/* Sticky Footer Buttons */}
        <div
          className="modal-footer"
          style={{
            position: 'sticky',
            bottom: 0,
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleClose}
            disabled={isSubmitting}
            style={{ minWidth: 80 }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            disabled={!confirmed || isSubmitting}
            onClick={handleConfirm}
            style={{
              opacity: confirmed && !isSubmitting ? 1 : 0.45,
              cursor: confirmed && !isSubmitting ? 'pointer' : 'not-allowed',
              minWidth: 140,
            }}
          >
            {isSubmitting ? 'Halting...' : 'Halt Procurement'}
          </button>
        </div>
      </div>
    </div>
  );
};
