import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  KeyRound,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  UserCheck,
} from 'lucide-react';
import {
  requestOverride,
  approveOverride,
  rejectOverride,
} from '../api/fairprocure';
import type { OverrideItem } from '../types/fairprocure';

interface OverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOverrideApproved?: (item: OverrideItem) => void;
  onOverrideRejected?: (item: OverrideItem) => void;
  farmerId?: string;
  bookingId?: string;
  tokenNumber?: number;
  farmerName?: string;
  initialReason?: string;
  existingOverrideId?: string;
}

export const OverrideModal: React.FC<OverrideModalProps> = ({
  isOpen,
  onClose,
  onOverrideApproved,
  onOverrideRejected,
  farmerId,
  bookingId,
  tokenNumber,
  farmerName,
  initialReason = 'QUEUE_JUMP_ATTEMPT: Out-of-turn intake clearance requested for perishable/emergency lot',
  existingOverrideId,
}) => {
  const [reason, setReason] = useState(initialReason);
  const [supervisorPin, setSupervisorPin] = useState('');
  const supervisorId = 'SUP-KARNAL-01';
  const supervisorName = 'Assistant Mandi Secretary';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason(initialReason);
      setSupervisorPin('');
      setError(null);
      setSuccessMessage(null);
    }
  }, [isOpen, initialReason]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleApprove = async () => {
    if (!reason.trim()) {
      setError('Please provide an official reason for the supervisor override.');
      return;
    }
    if (!supervisorPin || supervisorPin.trim().length < 4) {
      setError('A valid 4-digit Supervisor PIN is required for authorization.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let activeOverrideId = existingOverrideId;

      // 1. If override is not created yet, request it first
      if (!activeOverrideId) {
        const reqResult = await requestOverride({
          farmer_id: farmerId,
          booking_id: bookingId,
          token_number: tokenNumber,
          reason: reason.trim(),
          requested_by: supervisorId,
        });
        activeOverrideId = reqResult.id;
      }

      // 2. Approve the override with supervisor PIN
      const approveResult = await approveOverride({
        override_id: activeOverrideId,
        supervisor_id: supervisorId,
        supervisor_name: supervisorName,
        pin: supervisorPin.trim(),
        method: 'PIN',
      });

      setSuccessMessage('Supervisor override successfully authorized. FairProcure clearance granted.');
      setTimeout(() => {
        onOverrideApproved?.(approveResult);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('[OverrideModal] Approval failed:', err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Supervisor authorization failed. Invalid PIN or compliance rejection.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('A rejection justification is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let activeOverrideId = existingOverrideId;

      if (!activeOverrideId) {
        const reqResult = await requestOverride({
          farmer_id: farmerId,
          booking_id: bookingId,
          token_number: tokenNumber,
          reason: reason.trim(),
          requested_by: supervisorId,
        });
        activeOverrideId = reqResult.id;
      }

      const rejectResult = await rejectOverride({
        override_id: activeOverrideId,
        supervisor_id: supervisorId,
        reason: reason.trim(),
      });

      setSuccessMessage('Override officially rejected. Out-of-turn intake denied.');
      setTimeout(() => {
        onOverrideRejected?.(rejectResult);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('[OverrideModal] Rejection failed:', err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Rejection submission failed.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div
        className="modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="override-modal-title"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1100,
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
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            width: '100%',
            maxWidth: 540,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgba(234, 88, 12, 0.12)',
                  color: 'var(--brand-saffron, #ea580c)',
                }}
              >
                <ShieldAlert size={20} />
              </span>
              <div>
                <h3
                  id="override-modal-title"
                  style={{
                    fontSize: 18,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    margin: 0,
                  }}
                >
                  Supervisor Override Authorization
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                  FairProcure Non-Compliant Intake Verification
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
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

          {/* Body */}
          <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Target context banner */}
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                background: 'rgba(234, 88, 12, 0.08)',
                border: '1px solid rgba(234, 88, 12, 0.25)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <AlertTriangle size={18} color="var(--brand-saffron, #ea580c)" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                <strong>Rule Engine Notice:</strong> Intake out-of-turn or early slot attempt detected.
                {tokenNumber && (
                  <span> Token: <strong>#{tokenNumber}</strong></span>
                )}
                {farmerName && (
                  <span> ({farmerName})</span>
                )}
                . Official dual-supervisor authentication is required to bypass FIFO order.
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--color-danger, #ef4444)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <XCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'rgba(22, 163, 74, 0.1)',
                  border: '1px solid rgba(22, 163, 74, 0.3)',
                  color: 'var(--color-success, #16a34a)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Field: Reason */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  marginBottom: 6,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                Override Reason / Justification *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="field-input"
                placeholder="Specify regulatory or humanitarian reason for out-of-turn intake..."
                style={{ width: '100%', resize: 'vertical', fontSize: 13 }}
                disabled={loading}
              />
            </div>

            {/* Field: Supervisor PIN */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  Supervisor Security PIN *
                </label>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  Default Mandi PIN: 1234
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <KeyRound
                  size={16}
                  color="var(--text-tertiary)"
                  style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="password"
                  maxLength={6}
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  placeholder="Enter 4-digit PIN"
                  className="field-input font-mono"
                  style={{ width: '100%', paddingLeft: 38, fontSize: 15, letterSpacing: '0.2em' }}
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleApprove();
                  }}
                />
              </div>
            </div>

            {/* Supervisor ID Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: 'var(--text-tertiary)',
              }}
            >
              <UserCheck size={14} />
              <span>
                Authorizing Operator: <strong>{supervisorName}</strong> ({supervisorId})
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              gap: 12,
            }}
          >
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={handleReject}
                disabled={loading}
                style={{
                  color: 'var(--color-danger, #ef4444)',
                  borderColor: 'rgba(239, 68, 68, 0.3)',
                  padding: '8px 16px',
                }}
              >
                Reject Intake
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleApprove}
                disabled={loading}
                style={{
                  background: 'var(--brand-saffron, #ea580c)',
                  borderColor: 'var(--brand-saffron, #ea580c)',
                  padding: '8px 18px',
                  fontWeight: 600,
                  boxShadow: '0 2px 8px rgba(234, 88, 12, 0.25)',
                }}
              >
                {loading ? 'Authorizing...' : 'Approve Override'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
