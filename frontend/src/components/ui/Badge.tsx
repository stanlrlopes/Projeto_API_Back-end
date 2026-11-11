import React from 'react';

export type BadgeVariant =
  | 'primary'
  | 'info'
  | 'navy'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantClasses: Record<BadgeVariant, string> = {
  primary: 'bg-[#1E3A8A] text-white border-[#1E3A8A]',
  info: 'bg-blue-50 text-[#2563EB] border-blue-200',
  navy: 'bg-[#0F172A] text-white border-[#0F172A]',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
  ...props
}) => {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider border ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
};
