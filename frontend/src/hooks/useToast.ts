import { useContext } from 'react';
import { ToastContext, ToastContextValue } from '../contexts/ToastContext';

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error(
      'useToast deve ser utilizado dentro de um <ToastProvider>.',
    );
  }
  return context;
}
