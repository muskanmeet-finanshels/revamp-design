import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SortDirection = 'asc' | 'desc';

interface SortableTableHeadProps {
  label: string;
  sortKey: string;
  currentKey: string;
  currentDirection: SortDirection;
  onSort: (sortKey: string) => void;
  className?: string;
}

export function SortableTableHead({
  label,
  sortKey,
  currentKey,
  currentDirection,
  onSort,
  className,
}: SortableTableHeadProps) {
  const active = currentKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
        active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
        className,
      )}
    >
      {label}
      {active
        ? currentDirection === 'asc'
          ? <ArrowUp size={11} className="text-brand" />
          : <ArrowDown size={11} className="text-brand" />
        : <ArrowUpDown size={11} className="opacity-40" />}
    </button>
  );
}