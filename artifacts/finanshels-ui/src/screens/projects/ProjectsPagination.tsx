'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectsPaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** Returns page-number slots; `null` = ellipsis gap. */
function buildPageSlots(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const delta = 2; // pages on each side of current
  const left  = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const slots: (number | null)[] = [1];
  if (left > 2)       slots.push(null);
  for (let p = left; p <= right; p++) slots.push(p);
  if (right < total - 1) slots.push(null);
  slots.push(total);
  return slots;
}

export function ProjectsPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ProjectsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, totalItems);
  const slots = buildPageSlots(page, totalPages);

  const pageSizeOptions = Array.from(new Set([10, 12, 20, 50, pageSize])).sort((a, b) => a - b);

  const navBtnBase =
    'flex h-8 items-center justify-center rounded-lg border border-gray-200 px-2 text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-4 border-t border-gray-100 px-1 py-3">

      {/* ── Left — Rows per page ── */}
      <label className="flex items-center gap-2.5 whitespace-nowrap">
        <span className="text-[12.5px] text-gray-500">Rows per page</span>
        <span className="relative">
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            aria-label="Rows per page"
            className={cn(
              'h-8 w-[58px] appearance-none rounded-lg',
              'border border-gray-200 bg-white',
              'pl-3 pr-7 text-[12.5px] text-gray-700 shadow-sm',
              'outline-none transition-colors',
              'focus:border-brand focus:ring-1 focus:ring-brand/20',
            )}
          >
            {pageSizeOptions.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
          <ChevronDown
            size={12}
            aria-hidden
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </span>
      </label>

      {/* ── Right: visible range + navigation controls ── */}
      <div className="ml-auto flex items-center gap-6">
        <p className="whitespace-nowrap text-[12.5px] text-gray-500">
          Showing {from} to {to} of {totalItems}
        </p>

        <div className="flex items-center gap-1">

        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="First page"
          className={navBtnBase}
        >
          <ChevronsLeft size={14} strokeWidth={1.8} />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          title="Previous page"
          className={cn(navBtnBase, 'gap-1 px-3 text-[12.5px] font-medium')}
        >
          Previous
          <ChevronLeft size={14} strokeWidth={1.8} />
        </button>

        {/* Page number slots */}
        {slots.map((slot, idx) =>
          slot === null ? (
            /* Ellipsis */
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
              aria-current={slot === page ? 'page' : undefined}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] font-medium transition-colors',
                slot === page
                  ? 'bg-brand text-white'
                  : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {slot}
            </button>
          ),
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          title="Next page"
          className={cn(navBtnBase, 'gap-1 px-3 text-[12.5px] font-medium')}
        >
          Next
          <ChevronRight size={14} strokeWidth={1.8} />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Last page"
          className={navBtnBase}
        >
          <ChevronsRight size={14} strokeWidth={1.8} />
        </button>

        </div>
      </div>
    </div>
  );
}
