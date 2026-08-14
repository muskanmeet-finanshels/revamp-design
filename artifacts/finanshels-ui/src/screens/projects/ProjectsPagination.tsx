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
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const delta = 1; // one page each side of current
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

  const pageSizeOptions = Array.from(
    new Set([10, 12, 20, 50, pageSize]),
  ).sort((a, b) => a - b);

  /* ── shared icon-button class (K < > >|) ── */
  const iconBtn = cn(
    'inline-flex h-8 w-8 items-center justify-center rounded-md',
    'border border-gray-200 bg-white text-gray-500',
    'transition-colors hover:bg-gray-50 hover:text-gray-700',
    'disabled:cursor-not-allowed disabled:opacity-35',
  );

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-y-3 gap-x-6 border-t border-gray-100 px-1 py-3">

      {/* ── Left — Rows per page ── */}
      <label className="flex items-center gap-2.5 whitespace-nowrap">
        <span className="text-[13px] font-medium text-gray-700">Rows per page</span>
        <span className="relative">
          <select
            value={pageSize}
            onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            aria-label="Rows per page"
            className={cn(
              'h-8 w-[62px] appearance-none rounded-md',
              'border border-gray-200 bg-white',
              'pl-3 pr-7 text-[13px] text-gray-700',
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

      {/* ── Center — Showing X to Y of Z ── */}
      <p className="whitespace-nowrap text-[13px] text-gray-500">
        Showing{' '}
        <span className="font-semibold text-gray-800">{from}</span>
        {' '}to{' '}
        <span className="font-semibold text-gray-800">{to}</span>
        {' '}of{' '}
        <span className="font-semibold text-gray-800">{totalItems}</span>
      </p>

      {/* ── Right — navigation ── */}
      <div className="flex items-center gap-0.5">

        {/* First */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          title="First page"
          className={iconBtn}
        >
          <ChevronsLeft size={14} strokeWidth={1.8} />
        </button>

        {/* Previous */}
        <button
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page === 1}
          title="Previous page"
          className={iconBtn}
        >
          <ChevronLeft size={14} strokeWidth={1.8} />
        </button>

        {/* Page number slots */}
        {slots.map((slot, idx) =>
          slot === null ? (
            /* Ellipsis */
            <span
              key={`ellipsis-${idx}`}
              className="inline-flex h-8 w-8 items-center justify-center text-[13px] text-gray-400 select-none"
            >
              ···
            </span>
          ) : (
            /* Page button — active gets a circle outline, inactive is bare text */
            <button
              key={slot}
              onClick={() => onPageChange(slot)}
              aria-current={slot === page ? 'page' : undefined}
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] transition-colors',
                slot === page
                  ? 'border border-gray-800 font-semibold text-gray-900'
                  : 'font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800',
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
          className={iconBtn}
        >
          <ChevronRight size={14} strokeWidth={1.8} />
        </button>

        {/* Last */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
          title="Last page"
          className={iconBtn}
        >
          <ChevronsRight size={14} strokeWidth={1.8} />
        </button>

      </div>
    </div>
  );
}
