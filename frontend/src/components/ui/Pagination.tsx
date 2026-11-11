import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (nextPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}) => {
  if (total === 0) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 text-xs text-slate-600">
      <div>
        Exibindo <strong className="text-[#0F172A] tabular-nums">{startItem}</strong> a{' '}
        <strong className="text-[#0F172A] tabular-nums">{endItem}</strong> de{' '}
        <strong className="text-[#0F172A] tabular-nums">{total}</strong> registro(s)
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={() => onPageChange(page - 1)}
        >
          Anterior
        </Button>

        <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 font-semibold text-[#0F172A] tabular-nums">
          Página {page} de {safeTotalPages}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= safeTotalPages}
          rightIcon={<ChevronRight className="w-4 h-4" />}
          onClick={() => onPageChange(page + 1)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
};
