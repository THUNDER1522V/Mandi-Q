import React from 'react';
import { PhoneIncoming, StopCircle, Zap, RotateCcw, Code2 } from 'lucide-react';

interface DemoToolbarProps {
  onSimulateBooking: () => void;
  onOpenRaceTest: () => void;
  onOpenHalt: () => void;
  onResetData: () => void;
  onClose: () => void;
  isDemoMode?: boolean;
  onToggleMode?: () => void;
}

/**
 * Developer panel — shown ONLY when Ctrl+Shift+D is pressed.
 * Never visible during normal operations or presentations.
 */
export const DemoToolbar: React.FC<DemoToolbarProps> = ({
  onSimulateBooking,
  onOpenRaceTest,
  onOpenHalt,
  onResetData,
  onClose,
  isDemoMode = false,
  onToggleMode,
}) => {
  return (
    <div className="dev-panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
        <Code2 size={14} color="var(--color-action)" />
        <span className="dev-panel-label">OPERATIONS DEV CONSOLE</span>
      </div>

      <button
        className="btn btn-secondary btn-sm"
        onClick={onSimulateBooking}
      >
        <PhoneIncoming size={12} />
        Simulate booking
      </button>

      <button
        className="btn btn-secondary btn-sm"
        onClick={onOpenHalt}
      >
        <StopCircle size={12} color="var(--color-danger)" />
        Trigger halt
      </button>

      <button
        className="btn btn-secondary btn-sm"
        onClick={onOpenRaceTest}
      >
        <Zap size={12} color="var(--color-warning)" />
        Race test
      </button>

      <button
        className="btn btn-secondary btn-sm"
        onClick={onResetData}
      >
        <RotateCcw size={12} />
        Reset data
      </button>

      {onToggleMode && (
        <button
          className="btn btn-secondary btn-sm"
          onClick={onToggleMode}
          style={{
            fontWeight: 700,
            background: isDemoMode ? 'var(--brand-navy)' : 'rgba(245, 158, 11, 0.12)',
            color: isDemoMode ? '#FFFFFF' : '#B45309',
            borderColor: isDemoMode ? 'var(--brand-navy)' : 'rgba(245, 158, 11, 0.3)',
          }}
        >
          {isDemoMode ? 'Switch to Live Backend' : 'Switch to Demo Data'}
        </button>
      )}

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="font-mono text-xs text-muted">
          Ctrl+Shift+D to close
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={onClose}
        >
          Close panel
        </button>
      </div>
    </div>
  );
};
