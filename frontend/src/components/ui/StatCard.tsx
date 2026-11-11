import React from 'react';

export type StatCardTone =
  | 'primary'
  | 'navy'
  | 'success'
  | 'warning'
  | 'danger'
  | 'neutral';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  tone?: StatCardTone;
  badgeText?: string;
}

const iconToneStyles: Record<StatCardTone, string> = {
  primary: 'bg-blue-50 text-[#2563EB] border-blue-100',
  navy: 'bg-[#1E3A8A]/10 text-[#1E3A8A] border-[#1E3A8A]/20',
  success: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  warning: 'bg-amber-50 text-amber-600 border-amber-100',
  danger: 'bg-red-50 text-red-600 border-red-100',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
};

const badgeToneStyles: Record<StatCardTone, string> = {
  primary: 'bg-blue-50 text-[#2563EB] border-blue-200',
  navy: 'bg-slate-100 text-[#0F172A] border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  tone = 'primary',
  badgeText,
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 truncate">
            {title}
          </p>
          <p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[#0F172A] tabular-nums">
            {value}
          </p>
        </div>

        <div
          className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${iconToneStyles[tone]}`}
        >
          {icon}
        </div>
      </div>

      {(subtitle || badgeText) && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
          {subtitle ? (
            <span className="text-slate-600 truncate">{subtitle}</span>
          ) : (
            <span />
          )}
          {badgeText && (
            <span
              className={`px-2 py-0.5 rounded font-semibold text-[11px] border shrink-0 ${badgeToneStyles[tone]}`}
            >
              {badgeText}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
