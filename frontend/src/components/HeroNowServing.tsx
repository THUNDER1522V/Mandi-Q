import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FarmerBooking } from '../types/dashboard';
import {
  CheckCircle2,
  XCircle,
  Megaphone,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface HeroNowServingProps {
  servingFarmers: FarmerBooking[];
  waitingFarmers: FarmerBooking[];
  waitingCount: number;
  completedCount: number;
  totalCount: number;
  isHalted?: boolean;
  onCallNext: (bayNumber: number) => void;
  onMarkServed: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onAnnounce: (token: string, name: string, bay: number) => void;
  onSelectFarmer: (farmer: FarmerBooking) => void;
}

export const HeroNowServing: React.FC<HeroNowServingProps> = ({
  servingFarmers,
  waitingFarmers,
  waitingCount,
  completedCount,
  totalCount,
  isHalted = false,
  onCallNext,
  onMarkServed,
  onMarkNoShow,
  onAnnounce,
  onSelectFarmer,
}) => {
  console.log('[HeroNowServing Render] serving:', servingFarmers.length, 'waiting:', waitingFarmers.length, 'totalCount:', totalCount, 'completedCount:', completedCount);
  const [selectedBayIndex, setSelectedBayIndex] = useState(0);

  const activeFarmer = servingFarmers.length > 0
    ? (servingFarmers[selectedBayIndex] || servingFarmers[0])
    : undefined;

  const nextWaiting = waitingFarmers.length > 0 ? waitingFarmers[0] : undefined;

  const progressPercent = totalCount > 0
    ? Math.min(100, Math.round((completedCount / totalCount) * 100))
    : 0;

  const canCallNext = waitingCount > 0 && !isHalted;
  const currentBayNumber = activeFarmer ? (activeFarmer.bayNumber || 1) : 1;

  return (
    <motion.section
      aria-label="Operations Hero"
      className="card"
      animate={{
        opacity: isHalted ? 0.72 : 1,
        filter: isHalted ? 'grayscale(20%)' : 'none',
      }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        padding: '32px 36px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Editorial top hairline accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3.5,
          background: isHalted
            ? 'var(--color-danger)'
            : activeFarmer
            ? 'linear-gradient(90deg, var(--brand-navy) 0%, #1A4EB3 100%)'
            : 'var(--border-light)',
          transition: 'background 220ms ease',
        }}
      />

      {/* ── TOP OPERATIONAL ROW ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              background: isHalted
                ? 'var(--color-danger-bg)'
                : activeFarmer
                ? 'var(--color-serving-bg)'
                : 'var(--bg-subtle)',
              border: `1px solid ${
                isHalted
                  ? 'var(--color-danger-border)'
                  : activeFarmer
                  ? 'var(--color-serving-border)'
                  : 'var(--border-light)'
              }`,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isHalted
                ? 'var(--color-danger)'
                : activeFarmer
                ? 'var(--brand-navy)'
                : 'var(--text-secondary)',
              transition: 'all 200ms ease',
            }}
          >
            <span
              className={`status-dot ${isHalted ? 'danger' : activeFarmer ? 'serving animate-pulse' : 'neutral'}`}
              style={{ width: 6.5, height: 6.5 }}
            />
            {isHalted ? 'Procurement Paused' : activeFarmer ? 'Now Serving' : 'Weighbridges Ready'}
          </span>

          {activeFarmer && (
            <span
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                fontWeight: 500,
              }}
            >
              Bay 0{currentBayNumber} · {currentBayNumber === 1 ? '60-Ton Scale' : '40-Ton Scale'}
            </span>
          )}

          {/* Quick toggle if both bays are active */}
          {servingFarmers.length > 1 && (
            <div style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
              {servingFarmers.map((f, idx) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedBayIndex(idx)}
                  className={`btn btn-sm ${selectedBayIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '2px 8px', fontSize: 11 }}
                >
                  Bay 0{f.bayNumber || idx + 1}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isHalted ? (
            <span className="badge badge-danger" style={{ fontSize: 11, padding: '3px 10px' }}>
              Halted by APMC Administration
            </span>
          ) : activeFarmer ? (
            <span className="badge badge-success" style={{ fontSize: 11, padding: '3px 10px' }}>
              <span className="status-dot success" />
              Scale Active · In Window
            </span>
          ) : (
            <span className="badge badge-neutral" style={{ fontSize: 11, padding: '3px 10px' }}>
              {canCallNext ? `${waitingCount} waiting for dispatch` : 'Queue Clear'}
            </span>
          )}
        </div>
      </div>

      {/* ── CORE EDITORIAL CENTERPIECE WITH MOTION ───────────── */}
      <AnimatePresence mode="wait">
        {activeFarmer ? (
          <motion.div
            key={activeFarmer.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
              gap: 36,
              alignItems: 'center',
            }}
          >
            {/* Left Column: Dominant Token & Farmer Profile */}
            <div>
              {/* Undisputed Dominant Token */}
              <motion.div
                key={activeFarmer.token}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="font-mono"
                style={{
                  fontSize: 64,
                  fontWeight: 800,
                  color: 'var(--brand-navy)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {activeFarmer.token}
              </motion.div>

              {/* Confident Farmer Name */}
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                  marginTop: 10,
                  cursor: 'pointer',
                  lineHeight: 1.2,
                }}
                onClick={() => onSelectFarmer(activeFarmer)}
                title="Click to view gate pass"
              >
                {activeFarmer.farmerName}
              </h1>

              {/* Tertiary Metadata with generous breathing room */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  flexWrap: 'wrap',
                  marginTop: 14,
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                  {activeFarmer.crop}
                </span>
                <span style={{ color: 'var(--border-medium)' }}>·</span>
                <span>
                  <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>
                    {activeFarmer.quantityQuintals}
                  </strong>{' '}
                  Quintals
                </span>
                <span style={{ color: 'var(--border-medium)' }}>·</span>
                <span>{activeFarmer.village}</span>
                <span style={{ color: 'var(--border-medium)' }}>·</span>
                <span className="font-mono">{activeFarmer.vehicleNumber}</span>
              </div>

              {/* Action Buttons with handcrafted product design */}
              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  marginTop: 26,
                  alignItems: 'center',
                }}
              >
                <button
                  className="btn btn-primary"
                  onClick={() => onCallNext(currentBayNumber)}
                  disabled={!canCallNext}
                  style={{ padding: '9px 22px', fontSize: 13, fontWeight: 600 }}
                  title={canCallNext ? 'Call next waiting farmer in FIFO order' : 'No waiting farmers'}
                >
                  Call Next
                  <ArrowRight size={14} strokeWidth={2} />
                </button>

                <button
                  className="btn btn-success-outline"
                  onClick={() => onMarkServed(activeFarmer.id)}
                  disabled={isHalted}
                  style={{ padding: '9px 20px', fontSize: 13, fontWeight: 600 }}
                >
                  <CheckCircle2 size={15} strokeWidth={2} />
                  Mark Served
                </button>

                <button
                  className="btn btn-danger-outline"
                  onClick={() => onMarkNoShow(activeFarmer.id)}
                  disabled={isHalted}
                  style={{ padding: '9px 18px', fontSize: 13 }}
                >
                  <XCircle size={15} strokeWidth={2} />
                  No-Show
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() => onAnnounce(activeFarmer.token, activeFarmer.farmerName, currentBayNumber)}
                  title="Public Address Announcement"
                  style={{ padding: '9px 16px', fontSize: 13 }}
                >
                  <Megaphone size={15} strokeWidth={2} />
                  PA Announce
                </button>

                <button
                  className="btn btn-ghost"
                  onClick={() => onSelectFarmer(activeFarmer)}
                  title="View Full Gate Pass"
                  style={{ padding: '9px 16px', fontSize: 13 }}
                >
                  Gate Pass
                  <ChevronRight size={15} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* Right Column: Apple Fitness Style Progress Tile & Next in Sequence */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-light)',
                borderRadius: 'var(--radius)',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Progress Section */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    Current Progress
                  </span>
                  <span
                    className="font-mono"
                    style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-navy)' }}
                  >
                    {progressPercent}%
                  </span>
                </div>

                {/* Animated Progress Track */}
                <div
                  style={{
                    height: 6,
                    borderRadius: 'var(--radius-pill)',
                    background: 'var(--bg-muted)',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      height: '100%',
                      background: 'var(--brand-navy)',
                      borderRadius: 'var(--radius-pill)',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--text-secondary)',
                    marginTop: 8,
                  }}
                >
                  <span>
                    <strong style={{ color: 'var(--text-primary)' }}>{completedCount}</strong> of {totalCount} processed
                  </span>
                  <span>
                    <strong style={{ color: 'var(--color-warning-text)' }}>{waitingCount}</strong> waiting
                  </span>
                </div>
              </div>

              {/* Next in Sequence Preview */}
              <div
                style={{
                  borderTop: '1px solid var(--border-subtle)',
                  paddingTop: 16,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-tertiary)',
                    marginBottom: 8,
                  }}
                >
                  Next in Queue
                </div>

                {nextWaiting ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span
                          className="font-mono"
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: 'var(--brand-navy)',
                          }}
                        >
                          {nextWaiting.token}
                        </span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {nextWaiting.farmerName}
                        </span>
                      </div>
                      <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                        {nextWaiting.crop} · {nextWaiting.quantityQuintals} Qtl · {nextWaiting.village}
                      </div>
                    </div>

                    <span
                      className="font-mono text-xs text-muted"
                      style={{
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-pill)',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-light)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Slot: {nextWaiting.slotTime}
                    </span>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    Queue Clear · Waiting for next farmer.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          /* Empty State (All Weighbridges Ready) with gentle fade-in */
          <motion.div
            key="empty-state"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 24,
              padding: '16px 0',
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
                Queue Clear
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                Waiting for the next arrival. All weighbridges are calibrated and ready.
              </div>

              {nextWaiting && (
                <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                  Next in FIFO sequence:{' '}
                  <strong className="font-mono" style={{ color: 'var(--brand-navy)', fontSize: 16 }}>
                    {nextWaiting.token}
                  </strong>{' '}
                  — <strong>{nextWaiting.farmerName}</strong> ({nextWaiting.crop}, {nextWaiting.quantityQuintals} Qtl)
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => onCallNext(1)}
                disabled={!canCallNext}
                style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600 }}
                title={canCallNext ? 'Call next waiting farmer to Bay 01' : 'No waiting farmers'}
              >
                Call to Bay 01
                <ArrowRight size={14} strokeWidth={2} />
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => onCallNext(2)}
                disabled={!canCallNext}
                style={{ padding: '10px 24px', fontSize: 13, fontWeight: 600 }}
                title={canCallNext ? 'Call next waiting farmer to Bay 02' : 'No waiting farmers'}
              >
                Call to Bay 02
                <ArrowRight size={14} strokeWidth={2} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};
