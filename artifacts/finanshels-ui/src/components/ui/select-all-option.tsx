'use client';

import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export function allVisibleSelected(visible: readonly string[], selected: readonly string[]) {
  return visible.length > 0 && visible.every(value => selected.includes(value));
}

export function toggleVisibleSelection(visible: readonly string[], selected: readonly string[]) {
  if (allVisibleSelected(visible, selected)) {
    const visibleValues = new Set(visible);
    return selected.filter(value => !visibleValues.has(value));
  }
  const next = new Set(selected);
  visible.forEach(value => next.add(value));
  return [...next];
}

export function SelectAllOption({
  visible,
  selected,
  onChange,
  filtered = false,
}: {
  visible: readonly string[];
  selected: readonly string[];
  onChange: (values: string[]) => void;
  filtered?: boolean;
}) {
  const checked = allVisibleSelected(visible, selected);
  const partial = !checked && visible.some(value => selected.includes(value));

  return (
    <div className="border-b border-gray-100 px-2 pb-1.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={partial ? 'mixed' : checked}
        disabled={visible.length === 0}
        onClick={() => onChange(toggleVisibleSelection(visible, selected))}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50',
          checked && 'bg-orange-50 font-medium text-brand',
        )}
      >
        <span className={cn(
          'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[4px] border-[1.5px]',
          checked || partial ? 'border-brand bg-brand' : 'border-gray-300 bg-white',
        )}>
          {checked ? <Check size={11} className="text-white" strokeWidth={3} /> :
            partial ? <Minus size={11} className="text-white" strokeWidth={3} /> : null}
        </span>
        {filtered ? 'Select all results' : 'Select all'}
      </button>
    </div>
  );
}