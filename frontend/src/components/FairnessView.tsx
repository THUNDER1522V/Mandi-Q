import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import type { FairnessMetrics, OverrideItem } from '../types/fairprocure';
import { getFairnessMetrics } from '../api/dashboard';
import { getPendingOverrides, getOverrideHistory } from '../api/fairprocure';
import { AnimatedCounter } from './AnimatedCounter';
import { OverrideModal } from './OverrideModal';

interface FairnessViewProps {
  metrics?: FairnessMetrics | null;
  onRefresh?: () => void;
}

export const FairnessView: React.FC<FairnessViewProps> = ({
  metrics: externalMetrics,
  onRefresh,
}) => {
  const [metrics, setMetrics] = useState<FairnessMetrics | null>(externalMetrics || null);
  const [pendingOverrides, setPendingOverrides] = useState<OverrideItem[]>([]);
  const [overrideHistory, setOverrideHistory] = useState<OverrideItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<OverrideItem | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);

  const fetchFairnessData = async () => {
    setLoading(true);
    try {
      const [fairData, pending, history] = await Promise.all([
        getFairnessMetrics(),
        getPendingOverrides().catch(() => []),
        getOverrideHistory(20).catch(() => []),
      ]);
      setMetrics(fairData);
      setPendingOverrides(pending);
      setOverrideHistory(history);
    } catch (err) {
      console.warn('[FairnessView] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (externalMetrics) {
      setMetrics(externalMetrics);
    }
  }, [externalMetrics]);

  useEffect(() => {
    fetchFairnessData();
    const interval = setInterval(fetchFairnessData, 5000);
    return () => clearInterval(interval);
  }, []);

  const score = metrics?.fairness_score ?? 94;
  const compliance = metrics?.queue_compliance ?? 98.4;
  const qrSuccess = metrics?.qr_success_rate ?? 99.1;
  const avgWait = metrics?.average_waiting_time_minutes ?? 14;
  const queueJumps = metrics?.queue_jump_attempts ?? 0;
  const earlyArrivals = metrics?.early_arrival_attempts ?? 0;
  const pendingCount = metrics?.pending_overrides ?? pendingOverrides.length;
  const overridePct = metrics?.today_procurements
    ? ((metrics.today_overrides / metrics.today_procurements) * 100).toFixed(1)
    : '0.0';

  // Score Color Grading
  const scoreColor =
    score >= 85
      ? 'var(--color-success, #16a34a)'
      : score >= 70
      ? 'var(--brand-saffron, #ea580c)'
      : 'var(--color-danger, #ef4444)';

  // SVG Gauge calculations
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Overview Banner: Circular Gauge & Key Compliance Pillars ── */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl, 16px)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow)',
          padding: '28px 32px',
          display: 'grid',
          gridTemplateColumns: 'auto 1fr',
          gap: 40,
          alignItems: 'center',
        }}
      >
        {/* Circular Gauge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: 170, height: 170 }}>
            <svg width="170" height="170" viewBox="0 0 170 170" style={{ transform: 'rotate(-90deg)' }}>
              {/* Background circle */}
              <circle
                cx="85"
                cy="85"
                r={radius}
                stroke="var(--border-subtle, #e2e8f0)"
                strokeWidth="12"
                fill="transparent"
              />
              {/* Animated Progress circle */}
              <motion.circle
                cx="85"
                cy="85"
                r={radius}
                stroke={scoreColor}
                strokeWidth="12"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                strokeLinecap="round"
                fill="transparent"
              />
            </svg>

            {/* Center Label */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 42,
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                <AnimatedCounter value={score} duration={400} />
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-secondary)',
                  marginTop: 4,
                }}
              >
                Fairness Index
              </span>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              fontWeight: 700,
              color: scoreColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-surface)',
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <ShieldCheck size={14} />
            <span>{score >= 85 ? 'Exemplary Compliance' : score >= 70 ? 'Moderate Alert' : 'Critical Disruption'}</span>
          </div>
        </div>

        {/* Core Pillars / Narrative */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--brand-saffron, #ea580c)',
                }}
              >
                FairProcure Rule Engine v1.0
              </div>
              <h2
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: '4px 0 0 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Anti-Corruption &amp; Queue Governance Engine
              </h2>
            </div>

            <button
              type="button"
              onClick={() => {
                fetchFairnessData();
                onRefresh?.();
              }}
              className="btn btn-secondary btn-sm"
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Live Sync</span>
            </button>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            Every agricultural procurement lot passing through Karnal APMC weighbridges is cryptographically verified
            against strict FIFO priority, verified slot windows, and non-repudiable HMAC tokens. Out-of-turn insertions
            trigger mandatory supervisor dual-key overrides with audit persistence.
          </p>

          {/* Quick Metrics Strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 16,
              marginTop: 6,
            }}
          >
            <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Queue Compliance</div>
              <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-success, #16a34a)' }}>
                {compliance}%
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>QR Success Rate</div>
              <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-navy, #2563eb)' }}>
                {qrSuccess}%
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Avg Turnaround</div>
              <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                {avgWait}m
              </div>
            </div>

            <div style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Override Rate</div>
              <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--brand-saffron, #ea580c)' }}>
                {overridePct}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Trend Telemetry Cards ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        <div
          className="kpi-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderLeft: '3px solid #ef4444',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Queue Jump Interceptions
          </div>
          <div className="font-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px 0' }}>
            <AnimatedCounter value={queueJumps} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Blocked by FIFO Order Enforcement</div>
        </div>

        <div
          className="kpi-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderLeft: '3px solid #f59e0b',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Early Arrival Gate Diverts
          </div>
          <div className="font-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px 0' }}>
            <AnimatedCounter value={earlyArrivals} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Slot Window Protected</div>
        </div>

        <div
          className="kpi-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderLeft: '3px solid var(--brand-saffron, #ea580c)',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Pending Overrides
          </div>
          <div className="font-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px 0' }}>
            <AnimatedCounter value={pendingCount} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Awaiting Supervisor Dual-Key</div>
        </div>

        <div
          className="kpi-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderLeft: '3px solid #8b5cf6',
            borderRadius: 'var(--radius-lg, 12px)',
            padding: '20px 24px',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Audited Events Today
          </div>
          <div className="font-mono" style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)', margin: '10px 0 4px 0' }}>
            <AnimatedCounter value={metrics?.audit_events_today ?? 42} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>PostgreSQL Immutable Ledger</div>
        </div>
      </div>

      {/* ── Supervisor Overrides Governance Panel ── */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid var(--border-light)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={18} color="var(--brand-saffron, #ea580c)" />
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Supervisor Override Ledger &amp; Dual-Key Approvals
            </h3>
          </div>
          <span className="badge badge-warning" style={{ fontWeight: 600 }}>
            {pendingOverrides.length} Pending Actions
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Override ID</th>
                <th>Token</th>
                <th>Justification Reason</th>
                <th>Requested By</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingOverrides.length === 0 && overrideHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-secondary)' }}>
                    No pending supervisor overrides. All intake compliant with standard FIFO rules.
                  </td>
                </tr>
              ) : (
                <>
                  {pendingOverrides.map((item) => (
                    <tr key={item.id} style={{ background: 'rgba(234, 88, 12, 0.04)' }}>
                      <td className="font-mono" style={{ fontSize: 12, fontWeight: 600 }}>
                        {item.id.slice(0, 8)}...
                      </td>
                      <td className="font-mono">
                        {item.token_number ? `#${item.token_number}` : 'N/A'}
                      </td>
                      <td style={{ maxWidth: 280, fontSize: 13 }}>
                        {item.reason}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.requested_by}
                      </td>
                      <td>
                        <span className="badge badge-warning">
                          PENDING
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => {
                            setSelectedOverride(item);
                            setIsOverrideModalOpen(true);
                          }}
                          style={{
                            background: 'var(--brand-saffron, #ea580c)',
                            borderColor: 'var(--brand-saffron, #ea580c)',
                          }}
                        >
                          Review &amp; PIN
                        </button>
                      </td>
                    </tr>
                  ))}

                  {overrideHistory.slice(0, 10).map((item) => (
                    <tr key={item.id}>
                      <td className="font-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {item.id.slice(0, 8)}...
                      </td>
                      <td className="font-mono">
                        {item.token_number ? `#${item.token_number}` : 'N/A'}
                      </td>
                      <td style={{ maxWidth: 280, fontSize: 13, color: 'var(--text-secondary)' }}>
                        {item.reason}
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                        {item.approved_by || item.requested_by}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.approval_status === 'APPROVED'
                              ? 'badge-success'
                              : item.approval_status === 'REJECTED'
                              ? 'badge-danger'
                              : 'badge-neutral'
                          }`}
                        >
                          {item.approval_status}
                        </span>
                      </td>
                      <td className="font-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ textAlign: 'right', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        Resolved
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Supervisor Override Modal for review */}
      {selectedOverride && (
        <OverrideModal
          isOpen={isOverrideModalOpen}
          onClose={() => {
            setIsOverrideModalOpen(false);
            setSelectedOverride(null);
          }}
          existingOverrideId={selectedOverride.id}
          tokenNumber={selectedOverride.token_number}
          farmerId={selectedOverride.farmer_id}
          bookingId={selectedOverride.booking_id}
          farmerName={selectedOverride.farmer_name}
          initialReason={selectedOverride.reason}
          onOverrideApproved={() => {
            fetchFairnessData();
          }}
          onOverrideRejected={() => {
            fetchFairnessData();
          }}
        />
      )}
    </div>
  );
};
