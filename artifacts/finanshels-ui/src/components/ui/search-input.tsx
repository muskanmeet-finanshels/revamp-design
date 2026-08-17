'use client';

import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  'aria-label'?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  inputClassName,
  'aria-label': ariaLabel,
}: SearchInputProps) {
  return (
    <div
      className={cn(
        'relative flex h-9 items-center rounded-xl border border-gray-200 bg-white transition-colors focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/20',
        className,
      )}
    >
      <Search size={14} className="pointer-events-none absolute left-3 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel ?? placeholder}
        className={cn(
          'h-full w-full bg-transparent pl-9 pr-8 text-[13px] text-gray-800 outline-none placeholder:text-gray-400',
          inputClassName,
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 flex h-4 w-4 items-center justify-center rounded-md bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-700"
        >
          <X size={10} />
        </button>
      )}
    </div>
  );
}