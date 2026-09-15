import React from 'react';
import type { FarmerBooking, PaymentStatus } from '../types/dashboard';
import {
  X, Megaphone, CheckCircle2, XCircle,
  Hash, MapPin, Phone, Truck, Wheat,
  CreditCard, IndianRupee, Clock, AlertCircle,
  Loader2, Package, Droplets, Scale, Download, Printer, ExternalLink,
} from 'lucide-react';
import { getFarmerQRUrl, downloadFarmerQR } from '../api/qr';


// ─────────────────────────────────────────────────────────────────────────────
// Payment derivation helper
//
// Priority:
//   1. Use farmer.paymentStatus when the backend provides it (future-proof).
//   2. Derive a provisional status from QueueStatus when it is absent.
//
// "Pre-procurement" statuses map to PENDING.
// "Post-procurement" statuses map to CREDITED (provisional, until backend confirms).
// ─────────────────────────────────────────────────────────────────────────────

const POST_PROCUREMENT_STATUSES: FarmerBooking['status'][] = [
  'SERVED',
];

function derivePaymentStatus(farmer: FarmerBooking): PaymentStatus {
  // Backend field takes precedence — no inference needed.
  if (farmer.paymentStatus) return farmer.paymentStatus;

  if (POST_PROCUREMENT_STATUSES.includes(farmer.status)) return 'CREDITED';
  if (farmer.status === 'NO_SHOW') return 'PENDING'; // no payment due; still shown as pending
  return 'PENDING';
}

// ─────────────────────────────────────────────────────────────────────────────
// PaymentBadge
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentBadgeProps { status: PaymentStatus }

const BADGE_STYLES: Record<PaymentStatus, { bg: string; border: string; color: string; dot: string }> = {
  PENDING:    { bg: 'var(--color-warning-bg)',  border: 'var(--color-warning-border)',  color: 'var(--color-warning)',      dot: 'var(--color-warning)' },
  PROCESSING: { bg: 'var(--color-action-bg)',   border: 'var(--color-action-border)',   color: 'var(--color-action)',       dot: 'var(--color-action)' },
  CREDITED:   { bg: 'var(--color-success-bg)',  border: 'var(--color-success-border)',  color: 'var(--color-success)',      dot: 'var(--color-success)' },
  FAILED:     { bg: 'var(--color-danger-bg)',   border: 'var(--color-danger-border)',   color: 'var(--color-danger)',       dot: 'var(--color-danger)' },
};

const BADGE_LABELS: Record<PaymentStatus, string> = {
  PENDING:    'Pending',
  PROCESSING: 'Processing',
  CREDITED:   'Credited',
  FAILED:     'Failed',
};

const PaymentBadge: React.FC<PaymentBadgeProps> = ({ status }) => {
  const s = BADGE_STYLES[status];
  const icon =
    status === 'CREDITED'   ? <CheckCircle2 size={12} /> :
    status === 'PROCESSING' ? <Loader2 size={12} style={{ animation: 'spin 1.5s linear infinite' }} /> :
    status === 'FAILED'     ? <AlertCircle size={12} /> :
    null; // PENDING — no icon, just dot

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '3px 9px',
        borderRadius: 99,
        fontSize: 12,
        fontWeight: 600,
        background: s.bg,
        border: `1px solid ${s.border}`,
        color: s.color,
      }}
    >
      {icon ?? (
        <span
          style={{
            display: 'inline-block',
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: s.dot,
          }}
        />
      )}
      {BADGE_LABELS[status]}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared row sub-component (unchanged from original)
// ─────────────────────────────────────────────────────────────────────────────

interface RowProps { label: string; value: React.ReactNode; icon?: React.ReactNode }

const DetailRow: React.FC<RowProps> = ({ label, value, icon }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '8px 0',
      borderBottom: '1px solid var(--border-light)',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
      {icon}
      {label}
    </div>
    <div style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', color: 'var(--text-primary)' }}>
      {value}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Section divider — separates Procurement fields from Payment fields
// ─────────────────────────────────────────────────────────────────────────────

const SectionHeading: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '14px 0 4px',
    }}
  >
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: 'var(--text-tertiary)',
        textTransform: 'uppercase',
      }}
    >
      {label}
    </span>
    <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Payment section
// ─────────────────────────────────────────────────────────────────────────────

interface PaymentSectionProps { farmer: FarmerBooking }

const PaymentSection: React.FC<PaymentSectionProps> = ({ farmer }) => {
  const resolvedStatus = derivePaymentStatus(farmer);
  const isCredited  = resolvedStatus === 'CREDITED';
  const isPending   = resolvedStatus === 'PENDING';
  const isProcessing = resolvedStatus === 'PROCESSING';
  const isFailed    = resolvedStatus === 'FAILED';

  return (
    <>
      <SectionHeading label="Payment" />

      {/* ── Payment Status ─────────────────────── */}
      <DetailRow
        label="Payment status"
        icon={<CreditCard size={13} />}
        value={
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <PaymentBadge status={resolvedStatus} />
            {isPending && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                Payment will be initiated after procurement
              </span>
            )}
            {isProcessing && (
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                Being processed by PFMS / e-Kharid
              </span>
            )}
          </div>
        }
      />

      {/* ── Payment Amount (only when credited or backend provides it) ─── */}
      {(isCredited || isProcessing) && farmer.paymentAmount != null && (
        <DetailRow
          label="Payment amount"
          icon={<IndianRupee size={13} />}
          value={
            <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>
              ₹{farmer.paymentAmount.toLocaleString('en-IN')}
            </span>
          }
        />
      )}

      {/* ── Transaction reference ───────────────── */}
      {farmer.paymentReference && (
        <DetailRow
          label="Transaction ref."
          icon={<Hash size={13} />}
          value={
            <span className="font-mono" style={{ fontSize: 12 }}>
              {farmer.paymentReference}
            </span>
          }
        />
      )}

      {/* ── Payment time ────────────────────────── */}
      {farmer.paymentTime && (
        <DetailRow
          label="Paid at"
          icon={<Clock size={13} />}
          value={
            <span className="font-mono" style={{ fontSize: 12 }}>
              {farmer.paymentTime}
            </span>
          }
        />
      )}

      {/* ── Failure reason ──────────────────────── */}
      {isFailed && (
        <div
          style={{
            margin: '6px 0 4px',
            padding: '8px 12px',
            background: 'var(--color-danger-bg)',
            border: '1px solid var(--color-danger-border)',
            borderRadius: 'var(--radius)',
            fontSize: 12,
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 6,
          }}
        >
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Failure reason: </strong>
            {farmer.paymentFailureReason ?? 'Payment could not be processed. Contact PFMS helpdesk.'}
          </span>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

interface FarmerDetailModalProps {
  farmer: FarmerBooking | null;
  onClose: () => void;
  onMarkServed: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onAnnounce: (token: string, name: string) => void;
  onViewGatePass?: (farmer: FarmerBooking) => void;
}

export const FarmerDetailModal: React.FC<FarmerDetailModalProps> = ({
  farmer,
  onClose,
  onMarkServed,
  onMarkNoShow,
  onAnnounce,
  onViewGatePass,
}) => {

  if (!farmer) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 480 }}
      >
        {/* ── Header ────────────────────────────────── */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span
                className="font-mono"
                style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}
              >
                {farmer.token}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{farmer.farmerName}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
              Mandi Intake Gate Pass — Karnal APMC
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* ── Body ──────────────────────────────────── */}
        <div
          className="modal-body"
          style={{ gap: 0, padding: '0 24px', maxHeight: '70vh', overflowY: 'auto' }}
        >
          {/* ── Procurement section heading ──────────── */}
          <SectionHeading label="Procurement" />

          {/* Phone */}
          <DetailRow
            label="Phone"
            icon={<Phone size={13} />}
            value={<span className="font-mono">{farmer.phone}</span>}
          />

          {/* Village */}
          <DetailRow
            label="Village"
            icon={<MapPin size={13} />}
            value={farmer.village}
          />

          {/* Crop */}
          <DetailRow
            label="Crop"
            icon={<Wheat size={13} />}
            value={`${farmer.crop} · ${farmer.quantityQuintals} quintals`}
          />

          {/* Vehicle */}
          <DetailRow
            label="Vehicle"
            icon={<Truck size={13} />}
            value={
              <span>
                {farmer.vehicleType}{' '}
                <span className="font-mono">{farmer.vehicleNumber}</span>
              </span>
            }
          />

          {/* Slot */}
          <DetailRow
            label="Slot"
            icon={<Hash size={13} />}
            value={<span className="font-mono">{farmer.slotTime}</span>}
          />

          {/* Moisture % (if present) */}
          {farmer.moisturePct != null && (
            <DetailRow
              label="Moisture Content"
              icon={<Droplets size={13} />}
              value={
                <span className="font-mono" style={{ color: farmer.moisturePct <= 14 ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {farmer.moisturePct.toFixed(1)}% {farmer.moisturePct <= 14 ? '(Compliant <14%)' : '(Marginal)'}
                </span>
              }
            />
          )}

          {/* Scale Weight Telemetry (if present) */}
          {(farmer.grossWeightKg != null || farmer.netWeightQuintals != null) && (
            <DetailRow
              label="Weighbridge Scale"
              icon={<Scale size={13} />}
              value={
                <span className="font-mono" style={{ fontSize: 12 }}>
                  {farmer.grossWeightKg ? `${farmer.grossWeightKg.toLocaleString('en-IN')} kg Gross` : ''}
                  {farmer.tareWeightKg ? ` · ${farmer.tareWeightKg.toLocaleString('en-IN')} kg Tare` : ''}
                  {farmer.netWeightQuintals ? ` (${farmer.netWeightQuintals} Qtl Net)` : ''}
                </span>
              }
            />
          )}

          {/* Procurement status (workflow) */}
          <DetailRow
            label="Procurement status"
            icon={<Package size={13} />}
            value={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontSize: 12,
                  fontWeight: 600,
                  color:
                    farmer.status === 'SERVED'      ? 'var(--color-success)' :
                    farmer.status === 'SERVING'     ? 'var(--color-serving)' :
                    farmer.status === 'NO_SHOW'     ? 'var(--color-danger)'  :
                    farmer.status === 'RESCHEDULED' ? 'var(--color-warning)' :
                    'var(--text-secondary)',
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'currentColor',
                  }}
                />
                {farmer.status === 'WAITING'     && 'In queue'}
                {farmer.status === 'SERVING'     && 'On weighbridge'}
                {farmer.status === 'SERVED'      && 'Completed'}
                {farmer.status === 'NO_SHOW'     && 'No-show'}
                {farmer.status === 'RESCHEDULED' && 'Rescheduled'}
              </span>
            }
          />

          {/* ── Payment section ──────────────────────── */}
          <PaymentSection farmer={farmer} />

          {/* ── Supporting information ───────────────── */}
          <SectionHeading label="Booking details" />

          {/* Booked via */}
          <DetailRow
            label="Booked via"
            value={farmer.bookedVia}
          />

          {/* Booking time */}
          <DetailRow
            label="Booking time"
            value={<span className="font-mono">{farmer.bookingTimestamp}</span>}
          />

          {/* Weighbridge bay (conditional) */}
          {farmer.bayNumber && (
            <DetailRow
              label="Weighbridge bay"
              value={<span>Bay 0{farmer.bayNumber}</span>}
            />
          )}

          {/* Notes (conditional) */}
          {farmer.notes && (
            <div
              style={{
                margin: '10px 0 4px',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--text-secondary)',
              }}
            >
              {farmer.notes}
            </div>
          )}

          {/* Rescheduled banner (conditional) */}
          {farmer.status === 'RESCHEDULED' && farmer.originalToken && (
            <div
              style={{
                margin: '10px 0 4px',
                background: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning-border)',
                borderRadius: 'var(--radius)',
                padding: '8px 12px',
                fontSize: 12,
                color: 'var(--color-warning)',
              }}
            >
              Rescheduled from token{' '}
              <span className="font-mono">{farmer.originalToken}</span>.{' '}
              Original slot: {farmer.originalSlot}
            </div>
          )}

          {/* ── APMC QR Gate Pass Preview (Sprint 7) ─────────────── */}
          <SectionHeading label="APMC Digital Identity & Pass" />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: '12px 16px',
              margin: '8px 0 14px',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  background: '#ffffff',
                  borderRadius: 8,
                  padding: 4,
                  border: '1px solid var(--border-light)',
                  boxShadow: '0 2px 6px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <img
                  src={getFarmerQRUrl(farmer.farmer_id || farmer.id, 'png')}
                  alt="QR Preview"
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Digital Gate Pass
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  HMAC-SHA256 Cryptographic Pass
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onViewGatePass?.(farmer);
                }}
                title="View Full Digital Gate Pass"
                style={{ padding: '4px 8px', fontSize: 11.5, display: 'inline-flex', gap: 4 }}
              >
                <ExternalLink size={12} />
                <span>View Large</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => downloadFarmerQR(farmer.farmer_id || farmer.id, 'png')}
                title="Download QR PNG"
                style={{ padding: '4px 8px', fontSize: 11.5 }}
              >
                <Download size={12} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  onClose();
                  onViewGatePass?.(farmer);
                  setTimeout(() => window.print(), 300);
                }}
                title="Print APMC Gate Pass"
                style={{ padding: '4px 8px', fontSize: 11.5 }}
              >
                <Printer size={12} />
              </button>
            </div>
          </div>

          {/* Spacer below last row */}
          <div style={{ height: 16 }} />

        </div>

        {/* ── Footer ────────────────────────────────── */}
        <div className="modal-footer" style={{ marginTop: 0, justifyContent: 'space-between' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => onAnnounce(farmer.token, farmer.farmerName)}
          >
            <Megaphone size={13} />
            PA announce
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            {farmer.status !== 'SERVED' && farmer.status !== 'NO_SHOW' && (
              <>
                <button
                  className="btn btn-danger-outline btn-sm"
                  onClick={() => { onMarkNoShow(farmer.id); onClose(); }}
                >
                  <XCircle size={13} />
                  No-show
                </button>
                <button
                  className="btn btn-success-outline btn-sm"
                  onClick={() => { onMarkServed(farmer.id); onClose(); }}
                >
                  <CheckCircle2 size={13} />
                  Mark served
                </button>
              </>
            )}
            <button className="btn btn-secondary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
