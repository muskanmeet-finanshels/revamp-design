'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectsPaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/** Returns the page-number slots to render, with `null` representing an ellipsis gap. */
function buildPageSlots(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const delta = 2; // pages on each side of current
  const left  = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const slots: (number | null)[] = [1];
  if (left > 2) slots.push(null);          // left ellipsis
  for (let p = left; p <= right; p++) slots.push(p);
  if (right < total - 1) slots.push(null); // right ellipsis
  slots.push(total);
  return slots;
}

export function ProjectsPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
}: ProjectsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalItems);

  /* ── Go-to-page input state ── */
  const [jumpValue, setJumpValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  /* Keep input blank when current page changes via other controls */
  useEffect(() => { setJumpValue(''); }, [page]);

  function commitJump(raw: string) {
    const n = parseInt(raw, 10);
    if (!Number.isNaN(n)) onPageChange(Math.min(Math.max(1, n), totalPages));
    setJumpValue('');
  }

  const slots = buildPageSlots(page, totalPages);

  const navBtnBase =
    'flex h-8 items-center justify-center rounded-lg border border-gray-200 px-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-4 border-t border-gray-100 px-1 py-3">

      {/* ── Left: record count ── */}
      <span className="text-[12.5px] text-gray-500 whitespace-nowrap">
        Showing {from}–{to} of {totalItems}
      </span>

      {/* ── Centre: navigation controls ── */}
      <div className="flex items-center gap-1">

        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="First page"
          className={navBtnBase}
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          title="Previous page"
          className={cn(navBtnBase, 'gap-1 px-3 text-[12.5px] font-medium')}
        >
          <ChevronLeft size={13} />
          Previous
        </button>

        {/* Page number slots */}
        {slots.map((slot, idx) =>
          slot === null ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-8 w-7 items-center justify-center text-[12.5px] text-gray-400 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={slot}
              onClick={() => onPageChange(slot)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors',
                slot === page
                  ? 'bg-brand text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {slot}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          title="Next page"
          className={cn(navBtnBase, 'gap-1 px-3 text-[12.5px] font-medium')}
        >
          Next
          <ChevronRight size={13} />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Last page"
          className={navBtnBase}
        >
          <ChevronsRight size={14} />
        </button>
      </div>

      {/* ── Right: jump to page ── */}
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        <span className="text-[12.5px] text-gray-500">Go to</span>
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={totalPages}
          value={jumpValue}
          onChange={e => setJumpValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitJump(jumpValue);
          }}
          placeholder="page"
          className={cn(
            'h-8 w-16 rounded-lg border border-gray-200 bg-white px-2 text-center text-[12.5px] text-gray-800',
            'placeholder:text-gray-400',
            'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
            '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          )}
        />
        <button
          onClick={() => commitJump(jumpValue)}
          disabled={!jumpValue.trim()}
          className={cn(
            'h-8 rounded-lg border border-gray-200 px-3 text-[12.5px] font-medium text-gray-600 transition-colors',
            'hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40',
          )}
        >
          Go
        </button>
      </div>

    </div>
  );
}
