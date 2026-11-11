import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';
import { formatDecimal, MIN_PASSING_AVERAGE } from '../../utils/formatters';

export interface PerformanceBarItem {
  label: string;
  score: number;
  maxScore?: number;
  subtitle?: string;
}

export interface PerformanceBarChartProps {
  items: PerformanceBarItem[];
  showPassingLine?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  valueLabel?: string;
}

export const PerformanceBarChart: React.FC<PerformanceBarChartProps> = ({
  items,
  showPassingLine = true,
  emptyTitle = 'Sem avaliações registradas',
  emptyDescription = 'Não há notas lançadas para compor o gráfico de desempenho.',
  valueLabel = 'Nota / Média',
}) => {
  if (!items || items.length === 0) {
    return (
      <EmptyState
        compact
        icon={<BarChart3 className="w-6 h-6" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={items}
            margin={{ top: 12, right: 16, left: -12, bottom: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#E2E8F0"
            />
            <XAxis
              dataKey="label"
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: '#475569', fontSize: 11 }}
              axisLine={{ stroke: '#CBD5E1' }}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: number) => [
                formatDecimal(value, 2),
                valueLabel,
              ]}
              labelFormatter={(label: string, payload) => {
                const item = payload?.[0]?.payload as
                  | PerformanceBarItem
                  | undefined;
                return item?.subtitle ? `${label} — ${item.subtitle}` : label;
              }}
              contentStyle={{
                borderRadius: '0.5rem',
                borderColor: '#E2E8F0',
                fontSize: '12px',
              }}
            />
            {showPassingLine && (
              <ReferenceLine
                y={MIN_PASSING_AVERAGE}
                stroke="#D97706"
                strokeDasharray="4 4"
                label={{
                  value: `Média mín. (${formatDecimal(MIN_PASSING_AVERAGE, 1)})`,
                  position: 'insideTopRight',
                  fill: '#B45309',
                  fontSize: 11,
                }}
              />
            )}
            <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={48}>
              {items.map((entry, idx) => {
                const isLow = entry.score < MIN_PASSING_AVERAGE;
                return (
                  <Cell
                    key={`${entry.label}-${idx}`}
                    fill={isLow ? '#D97706' : '#2563EB'}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#2563EB]" />
            Desempenho Regular (&ge; {formatDecimal(MIN_PASSING_AVERAGE, 1)})
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#D97706]" />
            Atenção Pedagógica (&lt; {formatDecimal(MIN_PASSING_AVERAGE, 1)})
          </span>
        </div>
        <span>Dados reais da API</span>
      </div>
    </div>
  );
};
