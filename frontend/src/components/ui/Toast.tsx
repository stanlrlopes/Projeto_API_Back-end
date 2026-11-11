import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const toastStyles: Record<ToastType, { border: string; icon: React.ReactNode }> = {
  success: {
    border: 'border-l-4 border-l-emerald-600',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
  },
  error: {
    border: 'border-l-4 border-l-red-600',
    icon: <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />,
  },
  warning: {
    border: 'border-l-4 border-l-amber-500',
    icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
  },
  info: {
    border: 'border-l-4 border-l-[#2563EB]',
    icon: <Info className="w-5 h-5 text-[#2563EB] shrink-0" />,
  },
};

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const style = toastStyles[toast.type];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full max-w-sm bg-white rounded-lg border border-slate-200 shadow-lg p-4 flex items-start gap-3 ${style.border}`}
    >
      {style.icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0F172A]">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 text-xs text-slate-600 break-words">{toast.message}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-1 rounded text-slate-400 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
        aria-label="Fechar notificação"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
