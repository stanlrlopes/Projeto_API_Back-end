import React, { createContext, useCallback, useState } from 'react';
import { Toast, ToastItem, ToastType } from '../components/ui/Toast';

export interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (params: {
    type: ToastType;
    title: string;
    message?: string;
    durationMs?: number;
  }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismissToast: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | undefined>(
  undefined,
);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({
      type,
      title,
      message,
      durationMs = 4500,
    }: {
      type: ToastType;
      title: string;
      message?: string;
      durationMs?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);

      if (durationMs > 0) {
        window.setTimeout(() => {
          dismissToast(id);
        }, durationMs);
      }
    },
    [dismissToast],
  );

  const success = useCallback(
    (title: string, message?: string) =>
      showToast({ type: 'success', title, message }),
    [showToast],
  );

  const error = useCallback(
    (title: string, message?: string) =>
      showToast({ type: 'error', title, message }),
    [showToast],
  );

  const warning = useCallback(
    (title: string, message?: string) =>
      showToast({ type: 'warning', title, message }),
    [showToast],
  );

  const info = useCallback(
    (title: string, message?: string) =>
      showToast({ type: 'info', title, message }),
    [showToast],
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        dismissToast,
      }}
    >
      {children}
      {toasts.length > 0 && (
        <div
          aria-label="Notificações do sistema"
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 w-full max-w-sm px-4 sm:px-0 pointer-events-none"
        >
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast toast={toast} onDismiss={dismissToast} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
};
