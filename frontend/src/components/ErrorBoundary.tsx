import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MANDIQ Frontend Uncaught Error Boundary caught an exception:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('mandiq_theme_mode');
      sessionStorage.clear();
    } catch {
      // ignore
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden font-sans">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-950/20 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative z-10 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 text-xs text-slate-400 font-semibold tracking-wider uppercase mb-3">
              APMC FairProcure Telemetry Protection
            </div>

            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Console Exception Intercepted
            </h1>

            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              An unexpected UI exception was captured. Platform state integrity and procurement ledger databases remain fully secure.
            </p>

            {this.state.error && (
              <div className="mb-6 text-left bg-slate-950 border border-slate-800/80 rounded-lg p-3 overflow-x-auto text-xs font-mono text-red-400 max-h-36">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Console
              </button>

              <button
                type="button"
                onClick={this.handleResetCache}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-colors border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Cache & Reload
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/60 text-xs text-slate-400 flex items-center justify-between">
              <span>MANDIQ v1.0.0 Production</span>
              <span>National Agriculture Market (e-NAM) Standard</span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
