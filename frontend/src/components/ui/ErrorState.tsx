import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Não foi possível carregar os dados',
  message,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="w-full rounded-xl border border-red-200 bg-red-50/70 p-6 flex flex-col items-center justify-center text-center"
    >
      <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
        <AlertTriangle className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-semibold text-red-900">{title}</h4>
      <p className="mt-1 text-xs text-red-700 max-w-md leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <div className="mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={onRetry}
          >
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
};
