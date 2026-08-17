'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActiveFilterChip {
  key: string;
  label: string;
  value: string;
}

export function makeActiveFilterChipKey(filterKey: string, value: string) {
  return `${filterKey}::${encodeURIComponent(value)}`;
}

export function parseActiveFilterChipKey(key: string) {
  const separator = key.indexOf('::');
  if (separator === -1) return { filterKey: key, value: null };

  return {
    filterKey: key.slice(0, separator),
    value: decodeURIComponent(key.slice(separator + 2)),
  };
}

interface ActiveFilterChipsProps {
  chips: ActiveFilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
  className?: string;
}

export function ActiveFilterChips({
  chips,
  onRemove,
  onClearAll,
  className,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className={cn('mt-3 flex flex-wrap items-center gap-2', className)}>
      {chips.map(chip => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-orange-50/50 py-1.5 pl-3 pr-2 text-[13px] font-medium"
        >
          <span className="font-normal text-gray-500">{chip.label}:</span>
          <span className="text-brand">{chip.value}</span>
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={`Remove ${chip.label} filter`}
            className="ml-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-brand transition-colors hover:bg-orange-200"
          >
            <X size={11} strokeWidth={2.5} />
          </button>
        </span>
      ))}

      {chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3.5 py-1.5 text-[13px] font-medium text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-700"
        >
          <X size={12} strokeWidth={2.5} />
          Clear all
        </button>
      )}
    </div>
  );
}