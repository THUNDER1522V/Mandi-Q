import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import type { FarmerBooking } from '../types/dashboard';

interface QueuePipelineProps {
  servingFarmers: FarmerBooking[];
  waitingFarmers: FarmerBooking[];
  onCallToBay: (id: string, bayNumber: number) => void;
  onSelectFarmer: (farmer: FarmerBooking) => void;
  onOpenQueueTable?: () => void;
}

export const QueuePipeline: React.FC<QueuePipelineProps> = ({
  servingFarmers,
  waitingFarmers,
  onCallToBay,
  onSelectFarmer,
  onOpenQueueTable,
}) => {
  // Only display valid active bays (Bay 1 & Bay 2) in the serving stage
  const bay1Farmer = servingFarmers.find((f) => f.bayNumber === 1);
  const bay2Farmer = servingFarmers.find((f) => f.bayNumber === 2);
  const activeServing = [bay1Farmer, bay2Farmer].filter(Boolean) as FarmerBooking[];

  // Ensure waiting farmers are strictly ordered by sequential token number
  const sortedWaiting = [...waitingFarmers].sort((a, b) => {
    const numA = typeof a.rawTokenNumber === 'number' ? a.rawTokenNumber : parseInt(a.token.replace(/\D/g, '') || '0', 10);
    const numB = typeof b.rawTokenNumber === 'number' ? b.rawTokenNumber : parseInt(b.token.replace(/\D/g, '') || '0', 10);
    return numA - numB;
  });

  const nextTokens = sortedWaiting.slice(0, 4);
  const remainingCount = Math.max(0, sortedWaiting.length - 4);

  return (
    <section
      aria-label="Live Queue Departure Board"
      className="card"
      style={{
        padding: '24px 28px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 14,
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--text-secondary)',
            }}
          >
            DISPATCH SEQUENCE
          </span>
          <span
            className="badge badge-neutral font-mono"
            style={{ fontSize: 11, padding: '2px 8px' }}
          >
            {waitingFarmers.length} In Line
          </span>
        </div>

        <div
          className="font-mono text-xs text-muted"
          style={{ letterSpacing: '0.02em' }}
        >
          FIFO Automated Schedule · Arrival Gate Karnal
        </div>
      </div>

      {/* Airport Departure Board Track with Spring Motion */}
      {servingFarmers.length === 0 && waitingFarmers.length === 0 ? (
        <motion.div
          key="empty-queue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="empty-state"
          style={{
            padding: '48px 16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>
            Queue Clear
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Waiting for the next arrival.
          </div>
        </motion.div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 16,
            alignItems: 'stretch',
          }}
        >
          <AnimatePresence initial={false}>
            {/* Active Serving Stage (Bay 01 and Bay 02) */}
            {activeServing.map((farmer) => (
              <motion.div
                key={farmer.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'var(--bg-card)',
                  border: '1.5px solid var(--brand-navy)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 18px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        color: 'var(--brand-navy)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span className="status-dot serving animate-pulse" style={{ width: 6, height: 6 }} />
                      Bay 0{farmer.bayNumber || 1} Active
                    </span>
                    <span className="font-mono text-xs text-muted">{farmer.slotTime}</span>
                  </div>

                  {/* Large Monospace Token */}
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 30,
                      fontWeight: 800,
                      color: 'var(--brand-navy)',
                      letterSpacing: '-0.03em',
                      lineHeight: 1.1,
                    }}
                  >
                    {farmer.token}
                  </div>

                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginTop: 4,
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelectFarmer(farmer)}
                  >
                    {farmer.farmerName}
                  </div>

                  <div className="text-xs text-muted" style={{ marginTop: 3 }}>
                    {farmer.crop} · {farmer.quantityQuintals} Qtl
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    className="badge badge-serving"
                    style={{ fontSize: 10, padding: '2px 7px' }}
                  >
                    On Scale
                  </span>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onSelectFarmer(farmer)}
                    style={{ padding: '2px 8px', fontSize: 11 }}
                  >
                    Gate Pass
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Next Up Tokens (Departure Board Tiles) */}
            {nextTokens.map((farmer, index) => (
              <motion.div
                key={farmer.id}
                layout
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -10 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'background var(--transition-fast)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        color: 'var(--text-secondary)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      Next #{index + 1}
                    </span>
                    <span
                      className="font-mono text-xs"
                      style={{
                        color: 'var(--color-warning-text)',
                        fontWeight: 600,
                      }}
                    >
                      {farmer.slotTime}
                    </span>
                  </div>

                  {/* Large Monospace Token */}
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {farmer.token}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginTop: 3,
                      cursor: 'pointer',
                    }}
                    onClick={() => onSelectFarmer(farmer)}
                  >
                    {farmer.farmerName}
                  </div>

                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                    {farmer.crop} · {farmer.quantityQuintals} Qtl
                  </div>
                </div>

                {/* Quick Assignment Pills */}
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 10,
                    borderTop: '1px solid var(--border-subtle)',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onCallToBay(farmer.id, 1)}
                      style={{ padding: '3px 8px', fontSize: 11 }}
                      title="Dispatch to Weighbridge Bay 1"
                    >
                      To Bay 1
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => onCallToBay(farmer.id, 2)}
                      style={{ padding: '3px 8px', fontSize: 11 }}
                      title="Dispatch to Weighbridge Bay 2"
                    >
                      To Bay 2
                    </button>
                  </div>

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onSelectFarmer(farmer)}
                    style={{ padding: '2px 6px', fontSize: 11 }}
                  >
                    Details
                  </button>
                </div>
              </motion.div>
            ))}

            {/* Remaining Overflow Count — Interactive Button to Open Queue Table */}
            {remainingCount > 0 && (
              <motion.div
                key="overflow-count"
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                whileHover={
                  onOpenQueueTable
                    ? {
                        scale: 1.03,
                        borderColor: 'var(--primary)',
                        boxShadow: '0 4px 16px rgba(14, 165, 233, 0.18)',
                      }
                    : undefined
                }
                whileTap={onOpenQueueTable ? { scale: 0.97 } : undefined}
                onClick={onOpenQueueTable}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenQueueTable?.();
                  }
                }}
                role={onOpenQueueTable ? 'button' : undefined}
                tabIndex={onOpenQueueTable ? 0 : undefined}
                title={onOpenQueueTable ? 'Click to open Live Queue Table' : undefined}
                style={{
                  background: 'var(--bg-subtle)',
                  border: '1px dashed var(--border-medium)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  gap: 4,
                  cursor: onOpenQueueTable ? 'pointer' : 'default',
                  userSelect: 'none',
                  outline: 'none',
                  transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
                }}
              >
                <div
                  className="font-mono"
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                  }}
                >
                  +{remainingCount}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Waiting in Queue
                </div>
                {onOpenQueueTable && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--primary)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 9px',
                      borderRadius: 'var(--radius-pill)',
                      background: 'rgba(14, 165, 233, 0.1)',
                    }}
                  >
                    <span>Open Queue</span>
                    <ArrowRight size={11} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
};
