import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  AlertOctagon,
  AlertTriangle,
  Info,
  ShieldAlert,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { FairnessAlert } from '../types/fairprocure';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: FairnessAlert[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onSelectAlert?: (alert: FairnessAlert) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  isLoading = false,
  onRefresh,
  onSelectAlert,
}) => {
  // ESC key handler
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const getSeverityStyle = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return {
          badge: 'bg-red-500/20 text-red-500 border-red-500/40 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800',
          icon: <AlertOctagon size={16} className="text-red-500 animate-pulse" />,
          glow: 'border-l-4 border-l-red-500',
        };
      case 'HIGH':
        return {
          badge: 'bg-amber-500/20 text-amber-600 border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
          icon: <AlertTriangle size={16} className="text-amber-500" />,
          glow: 'border-l-4 border-l-amber-500',
        };
      case 'MEDIUM':
        return {
          badge: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/40 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800',
          icon: <Info size={16} className="text-yellow-500" />,
          glow: 'border-l-4 border-l-yellow-500',
        };
      default:
        return {
          badge: 'bg-blue-500/20 text-blue-600 border-blue-500/40 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800',
          icon: <Info size={16} className="text-blue-500" />,
          glow: 'border-l-4 border-l-blue-500',
        };
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="alert-drawer-title"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/80 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h2 id="alert-drawer-title" className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Live Security & Governance Alerts
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Real-time anti-corruption stream · APMC Mandi
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {onRefresh && (
                  <button
                    type="button"
                    onClick={onRefresh}
                    title="Refresh alerts"
                    className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close notification drawer"
                  className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 divide-y-0">
              {alerts.length === 0 ? (
                <div className="text-center py-16 px-4">
                  <div className="inline-flex p-3 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 mb-3">
                    <CheckCircle2 size={28} />
                  </div>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">All Operations Fair</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                    Zero queue jumps, slot violations, or pending supervisor overrides detected.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const style = getSeverityStyle(alert.severity);
                  const timeFormatted = new Date(alert.created_at).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  });

                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 shadow-sm transition-all hover:shadow-md ${style.glow}`}
                      onClick={() => onSelectAlert?.(alert)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {style.icon}
                          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                            {alert.title}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${style.badge}`}
                        >
                          {alert.severity}
                        </span>
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
                        {alert.message}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400 dark:text-zinc-500 pt-2 border-t border-zinc-200/50 dark:border-zinc-700/40">
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{timeFormatted}</span>
                        </div>
                        {alert.entity_id && (
                          <span className="font-mono text-[10px] truncate max-w-[140px]">
                            ID: {alert.entity_id.slice(0, 8)}...
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-center text-xs text-zinc-500">
              Auto-updating via PostgreSQL CDC telemetry stream (5s)
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
