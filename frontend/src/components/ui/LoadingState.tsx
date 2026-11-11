import React from 'react';
import { Spinner } from './Spinner';

export interface LoadingStateProps {
  message?: string;
  label?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  label,
  fullScreen = false,
}) => {
  const displayText = label || message || 'Carregando informações...';

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 text-slate-600 ${
        fullScreen ? 'min-h-screen bg-[#F8FAFC] p-6' : 'py-12 px-4'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB]">
        <Spinner size="md" />
      </div>
      <p className="text-sm font-medium text-slate-700">{displayText}</p>
    </div>
  );
};
