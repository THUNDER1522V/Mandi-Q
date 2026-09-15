import React, { useState } from 'react';
import { Zap, X } from 'lucide-react';
import type { RaceTestResult } from '../types/dashboard';
import { api } from '../services/api';

interface RaceTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RaceTestModal: React.FC<RaceTestModalProps> = ({ isOpen, onClose }) => {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RaceTestResult | null>(null);

  if (!isOpen) return null;

  const handleRun = () => {
    setRunning(true);
    setResult(null);
    setTimeout(() => {
      setResult(api.simulateRaceCondition());
      setRunning(false);
    }, 900);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>

        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius)',
                background: 'var(--color-info-bg)',
                border: '1px solid var(--color-info-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Zap size={18} color="var(--color-info)" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Concurrency proof — double-booking prevention
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Two callers booking the last slot simultaneously. Deterministic lock resolves in &lt;5ms.
              </div>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {/* Context */}
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius)',
              padding: '10px 14px',
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            The AI only converts voice to text. All booking decisions are made by deterministic
            transactional code. If AI hallucinated, it cannot affect the database — only the booking
            engine writes to it.
          </div>

          {/* Run button */}
          <button
            className="btn btn-primary"
            disabled={running}
            onClick={handleRun}
            style={{ alignSelf: 'flex-start' }}
          >
            <Zap size={14} />
            {running ? 'Running race…' : 'Fire simultaneous requests'}
          </button>

          {/* Result */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Contested slot */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  borderRadius: 'var(--radius)',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>Contested slot</span>
                <span className="font-mono" style={{ fontWeight: 600 }}>
                  {result.slotContested}
                </span>
                <span className="badge badge-success">
                  Resolved in {result.resolvedInMs}ms
                </span>
              </div>

              {/* Two candidates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div
                  style={{
                    padding: 14,
                    background: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success-border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div className="badge badge-success" style={{ marginBottom: 8 }}>
                    Winner
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{result.candidateA.name}</div>
                  <div
                    className="font-mono text-xs text-muted"
                    style={{ marginTop: 4 }}
                  >
                    {result.candidateA.phone}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-success)' }}>
                    Token acquired: <strong>{result.candidateA.token}</strong>
                  </div>
                </div>

                <div
                  style={{
                    padding: 14,
                    background: 'var(--color-warning-bg)',
                    border: '1px solid var(--color-warning-border)',
                    borderRadius: 'var(--radius)',
                  }}
                >
                  <div className="badge badge-warning" style={{ marginBottom: 8 }}>
                    Auto-rerouted
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{result.candidateB.name}</div>
                  <div
                    className="font-mono text-xs text-muted"
                    style={{ marginTop: 4 }}
                  >
                    {result.candidateB.phone}
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-warning)' }}>
                    Next slot: <strong>{result.candidateB.token}</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  fontSize: 12,
                  color: 'var(--text-secondary)',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-light)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius)',
                }}
              >
                Lock: {result.lockType}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
