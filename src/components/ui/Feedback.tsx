import React, { createContext, useCallback, useContext, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (title: string, tone?: ToastTone, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((title: string, tone: ToastTone = 'info', description?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, title, tone, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
      >
        {toasts.map((t) => {
          const palette =
            t.tone === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-50'
              : t.tone === 'error'
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-50'
              : t.tone === 'warning'
              ? 'bg-amber-950/95 border-amber-500/40 text-amber-50'
              : 'bg-[#071A47]/95 border-blue-400/35 text-white';

          const Icon =
            t.tone === 'success'
              ? CheckCircle2
              : t.tone === 'error'
              ? XCircle
              : t.tone === 'warning'
              ? AlertTriangle
              : Info;

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all ${palette}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-snug">{t.title}</p>
                {t.description && <p className="text-xs opacity-85 mt-0.5 leading-relaxed">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const ConfirmModal: React.FC<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6"
      >
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              destructive ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{message}</p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors min-h-[42px]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors min-h-[42px] disabled:opacity-50 ${
              destructive ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#1250C4] hover:bg-[#0D3DA0]'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const EmptyState: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center text-center py-10 px-6 bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl">
    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1250C4] flex items-center justify-center mb-3">
      {icon}
    </div>
    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const DemoDisclaimerStrip: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    className={`flex items-center justify-between gap-2 bg-[#071A47] text-blue-100 border-b border-blue-500/20 ${
      compact ? 'px-3 py-1.5 text-[11px]' : 'px-4 py-2 text-xs'
    }`}
  >
    <span className="font-medium truncate">
      Demo Simulation Mode · All balances, fleet plans, yields & transactions are simulated
    </span>
    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-blue-300">
      No Real Funds
    </span>
  </div>
);
