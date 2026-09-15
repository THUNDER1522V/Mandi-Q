import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { FarmerBooking } from '../types/dashboard';
import { Megaphone, CheckCircle2, XCircle, ChevronRight, ArrowRight } from 'lucide-react';

interface NowServingCardProps {
  servingFarmers: FarmerBooking[];
  waitingFarmers?: FarmerBooking[];
  waitingCount: number;
  isHalted?: boolean;
  onMarkServed: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onCallNext: (bayNumber: number) => void;
  onAnnounce: (token: string, name: string, bay: number) => void;
  onSelectFarmer: (farmer: FarmerBooking) => void;
}

const BayPanel: React.FC<{
  bayNumber: number;
  bayName: string;
  operatorName: string;
  farmer?: FarmerBooking;
  nextFarmer?: FarmerBooking;
  waitingCount: number;
  isHalted?: boolean;
  onMarkServed: (id: string) => void;
  onMarkNoShow: (id: string) => void;
  onCallNext: (bayNumber: number) => void;
  onAnnounce: (token: string, name: string, bay: number) => void;
  onSelectFarmer: (farmer: FarmerBooking) => void;
}> = ({
  bayNumber,
  bayName,
  operatorName,
  farmer,
  nextFarmer,
  waitingCount,
  isHalted = false,
  onMarkServed,
  onMarkNoShow,
  onCallNext,
  onAnnounce,
  onSelectFarmer,
}) => {
  const [justCalled, setJustCalled] = useState(false);
  const prevFarmerId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (farmer && farmer.id !== prevFarmerId.current) {
      prevFarmerId.current = farmer.id;
      const animTimer = setTimeout(() => {
        setJustCalled(true);
      }, 10);
      const resetTimer = setTimeout(() => {
        setJustCalled(false);
      }, 2500);
      return () => {
        clearTimeout(animTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [farmer]);

  const canCallNext = waitingCount > 0 && !isHalted;

  return (
    <div
      className={`bay-card${farmer ? ' active' : ''}`}
      style={{
        background: farmer ? 'var(--bg-card)' : 'var(--bg-surface)',
        border: farmer ? '1.5px solid var(--brand-navy)' : '1px solid var(--border-light)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        transition: 'all var(--transition-fast)',
        boxShadow: farmer ? 'var(--shadow-sm)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 188,
        ...(justCalled
          ? {
              boxShadow: '0 0 16px rgba(10, 46, 115, 0.18)',
              borderColor: 'var(--brand-navy)',
            }
          : {}),
      }}
    >
      <div>
        {/* Bay Header: Bay Number & Scale Details + Occupied/Ready Pill */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 8,
            paddingBottom: 6,
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <div
              className="font-mono"
              style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <span>BAY 0{bayNumber}</span>
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-secondary)' }}>· {bayName}</span>
            </div>
          </div>

          {/* Prominent Status Pill */}
          <motion.div
            key={farmer ? 'occupied' : 'ready'}
            initial={{ scale: 0.94, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              background: farmer ? 'var(--color-action-bg)' : 'var(--bg-subtle)',
              border: `1px solid ${farmer ? 'var(--color-action-border)' : 'var(--border-light)'}`,
            }}
          >
            <span className={`status-dot ${farmer ? 'serving animate-pulse' : 'neutral'}`} style={{ width: 5.5, height: 5.5 }} />
            <span
              style={{
                fontSize: 10,
                color: farmer ? 'var(--brand-navy)' : 'var(--text-secondary)',
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {farmer ? 'Occupied' : 'Ready'}
            </span>
          </motion.div>
        </div>

        {/* Bay Operational Details with AnimatePresence */}
        <AnimatePresence mode="wait">
          {farmer ? (
            <motion.div
              key={farmer.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {/* Token + Farmer Name + Village / Phone */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <motion.span
                    key={farmer.token}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                    className="font-mono"
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color: 'var(--brand-navy)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {farmer.token}
                  </motion.span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelectFarmer(farmer)}
                    title="View gate pass"
                  >
                    {farmer.farmerName}
                  </span>
                </div>
                <div className="text-xs text-muted" style={{ fontSize: 11 }}>
                  {farmer.village} · <span className="font-mono">{farmer.phone}</span>
                </div>
              </div>

              {/* Compact Unified Telemetry Strip: Weight, Crop & Vehicle */}
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius-xs)',
                  padding: '5px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 11,
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Intake: </span>
                  <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                    {farmer.quantityQuintals} Qtl{' '}
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                      ({(farmer.quantityQuintals * 0.1).toFixed(1)} MT Net)
                    </span>
                  </span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Crop: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{farmer.crop}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)' }}>Vehicle: </span>
                  <strong className="font-mono" style={{ color: 'var(--text-primary)' }}>{farmer.vehicleNumber}</strong>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Ready State */
            <motion.div
              key="bay-ready"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 4 }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Weighbridge Calibrated
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                Zero tare verified (0.00 MT). Scale is ready to accept vehicle.
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer: Operator, Next Token & Controls */}
      <div style={{ marginTop: 8 }}>
        {/* Subtle Operator & Next Token Bar */}
        <div
          style={{
            padding: '5px 10px',
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 8,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            Operator: <strong style={{ color: 'var(--text-primary)' }}>{operatorName}</strong>
          </div>

          <div>
            {nextFarmer ? (
              <span>
                Next:{' '}
                <strong className="font-mono" style={{ color: 'var(--brand-navy)' }}>
                  {nextFarmer.token}
                </strong>
              </span>
            ) : (
              <span>Next: Clear</span>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
          {farmer ? (
            <>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onCallNext(bayNumber)}
                disabled={!canCallNext}
                title={isHalted ? 'Procurement halted' : canCallNext ? `Call next waiting farmer to Bay 0${bayNumber}` : 'No waiting farmers'}
                style={{ padding: '4px 9px', fontSize: 11, gap: 4 }}
              >
                <span>Call Next</span>
                <ArrowRight size={11} strokeWidth={2} />
              </button>

              <button
                className="btn btn-success-outline btn-sm"
                onClick={() => onMarkServed(farmer.id)}
                disabled={isHalted}
                style={{ padding: '4px 9px', fontSize: 11, gap: 4 }}
              >
                <CheckCircle2 size={11} strokeWidth={2} />
                <span>Mark Served</span>
              </button>

              <button
                className="btn btn-danger-outline btn-sm"
                onClick={() => onMarkNoShow(farmer.id)}
                disabled={isHalted}
                style={{ padding: '4px 8px', fontSize: 11, gap: 4 }}
              >
                <XCircle size={11} strokeWidth={2} />
                <span>No-Show</span>
              </button>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onAnnounce(farmer.token, farmer.farmerName, bayNumber)}
                title="Public Address Broadcast"
                disabled={isHalted}
                style={{ padding: '4px 7px', fontSize: 11, gap: 3 }}
              >
                <Megaphone size={11} />
                <span>PA</span>
              </button>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => onSelectFarmer(farmer)}
                title="View Gate Pass"
                style={{ padding: '4px 7px', fontSize: 11 }}
              >
                <ChevronRight size={12} />
              </button>
            </>
          ) : (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => onCallNext(bayNumber)}
              disabled={!canCallNext}
              style={{ width: '100%', justifyContent: 'center', padding: '4px 10px', fontSize: 11, gap: 5 }}
            >
              <span>Call Next to Bay 0{bayNumber}</span>
              <ArrowRight size={12} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const NowServingCard: React.FC<NowServingCardProps> = ({
  servingFarmers,
  waitingFarmers = [],
  waitingCount,
  isHalted = false,
  onMarkServed,
  onMarkNoShow,
  onCallNext,
  onAnnounce,
  onSelectFarmer,
}) => {
  const bay1Farmer = servingFarmers.find((f) => f.bayNumber === 1);
  const bay2Farmer = servingFarmers.find((f) => f.bayNumber === 2);

  const nextFarmerBay1 = waitingFarmers[0];
  const nextFarmerBay2 = waitingFarmers.length > 1 ? waitingFarmers[1] : waitingFarmers[0];

  return (
    <section
      aria-label="Weighbridge Bays"
      className="card"
      style={{
        padding: '16px 20px',
        background: 'var(--bg-card)',
        border: '1.5px solid var(--border-medium)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative top hairline accent */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: isHalted
            ? 'var(--color-danger)'
            : 'linear-gradient(90deg, var(--brand-navy) 0%, #1A4EB3 100%)',
        }}
      />

      {/* Header bar matching Image 2 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
            }}
          >
            WEIGHBRIDGE BAYS
          </span>
          <span className="badge badge-neutral" style={{ fontSize: 10, padding: '2px 8px' }}>
            2 Calibrated Scales
          </span>
        </div>

        <div className="font-mono text-xs text-muted">
          {waitingCount > 0 ? (
            <span style={{ color: 'var(--color-warning-text)', fontWeight: 600, fontSize: 11 }}>
              {waitingCount} farmers waiting for assignment
            </span>
          ) : (
            <span style={{ color: 'var(--color-success)', fontWeight: 500, fontSize: 11 }}>
              Queue Clear · Both scales available
            </span>
          )}
        </div>
      </div>

      {/* 2-Column Side-by-Side Bay Panels */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 14,
        }}
      >
        <BayPanel
          bayNumber={1}
          bayName="60-Ton Gross Scale (North Gate)"
          operatorName="Satish Kumar (APMC Officer)"
          farmer={bay1Farmer}
          nextFarmer={nextFarmerBay1}
          waitingCount={waitingCount}
          isHalted={isHalted}
          onMarkServed={onMarkServed}
          onMarkNoShow={onMarkNoShow}
          onCallNext={onCallNext}
          onAnnounce={onAnnounce}
          onSelectFarmer={onSelectFarmer}
        />
        <BayPanel
          bayNumber={2}
          bayName="40-Ton Gross Scale (South Gate)"
          operatorName="Ramesh Singh (APMC Officer)"
          farmer={bay2Farmer}
          nextFarmer={nextFarmerBay2}
          waitingCount={waitingCount}
          isHalted={isHalted}
          onMarkServed={onMarkServed}
          onMarkNoShow={onMarkNoShow}
          onCallNext={onCallNext}
          onAnnounce={onAnnounce}
          onSelectFarmer={onSelectFarmer}
        />
      </div>
    </section>
  );
};
