import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { CalendarCheck } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { formatPercentage } from '../../utils/formatters';

export interface AttendanceDonutChartProps {
  present: number;
  absent: number;
  attendancePercentage: number;
  emptyMessage?: string;
}

const COLORS = {
  present: '#16A34A',
  absent: '#DC2626',
};

export const AttendanceDonutChart: React.FC<AttendanceDonutChartProps> = ({
  present,
  absent,
  attendancePercentage,
  emptyMessage = 'Ainda não existem registros de chamada lançados para este escopo.',
}) => {
  const total = present + absent;

  if (total === 0) {
    return (
      <EmptyState
        compact
        icon={<CalendarCheck className="w-6 h-6" />}
        title="Sem registros de frequência"
        description={emptyMessage}
      />
    );
  }

  const data = [
    { name: 'Presenças', value: present, color: COLORS.present },
    { name: 'Faltas', value: absent, color: COLORS.absent },
  ];

  return (
    <div className="space-y-4">
      <div className="h-56 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={84}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string) => [
                `${value} registro(s)`,
                name,
              ]}
              contentStyle={{
                borderRadius: '0.5rem',
                borderColor: '#E2E8F0',
                fontSize: '12px',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-[#0F172A] tabular-nums">
            {formatPercentage(attendancePercentage, 1)}
          </span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
            Assiduidade
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-xs">
        <div className="p-2 rounded-lg bg-slate-50">
          <span className="text-slate-500 block">Total Aulas</span>
          <span className="font-bold text-[#0F172A] tabular-nums">{total}</span>
        </div>
        <div className="p-2 rounded-lg bg-emerald-50/70">
          <span className="text-emerald-700 block">Presenças</span>
          <span className="font-bold text-emerald-700 tabular-nums">
            {present}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-red-50/70">
          <span className="text-red-700 block">Faltas</span>
          <span className="font-bold text-red-700 tabular-nums">{absent}</span>
        </div>
      </div>
    </div>
  );
};
