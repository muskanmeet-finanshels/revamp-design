'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProjectsPaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

/** Returns page-number slots; `null` = ellipsis gap. Delta=1 keeps it mobile-friendly. */
function buildPageSlots(current: number, total: number): (number | null)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);

  const left  = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  const slots: (number | null)[] = [1];
  if (left > 2)          slots.push(null);
  for (let p = left; p <= right; p++) slots.push(p);
  if (right < total - 1) slots.push(null);
  slots.push(total);
  return slots;
}

const PAGE_SIZE_OPTIONS = [10, 12, 20, 50];

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

  const sizeOptions = Array.from(new Set([...PAGE_SIZE_OPTIONS, pageSize])).sort((a, b) => a - b);

  /* Shared base for the « / < / > / » icon buttons */
  const iconBtn = (disabled: boolean) =>
    cn(
      'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200',
      'text-gray-500 transition-colors',
      disabled
        ? 'cursor-not-allowed opacity-40'
        : 'hover:bg-gray-50 hover:text-gray-700',
    );

  /* Previous / Next wider buttons (text hidden on mobile) */
  const labelBtn = (disabled: boolean) =>
    cn(
      'flex h-8 items-center justify-center rounded-lg border border-gray-200',
      'px-2 sm:px-3 text-[12.5px] font-medium text-gray-600 transition-colors',
      disabled
        ? 'cursor-not-allowed opacity-40'
        : 'hover:bg-gray-50 hover:text-gray-700',
    );

  const ShowingText = ({ className }: { className?: string }) => (
    <p className={cn('whitespace-nowrap text-[12.5px] text-gray-500', className)}>
      Showing {from} to {to} of {totalItems}
    </p>
  );

  return (
    <div className="mt-3 border-t border-gray-100 px-1 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* ── Row 1 (mobile) / Left (desktop): Rows per page + mobile Showing ── */}
        <div className="flex items-center justify-between gap-4 sm:justify-start">
          <label className="flex items-center gap-2.5 whitespace-nowrap">
            <span className="text-[12.5px] text-gray-500">Rows per page</span>
            <span className="relative">
              <select
                value={pageSize}
                onChange={e => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
                aria-label="Rows per page"
                className={cn(
                  'h-8 w-[58px] appearance-none rounded-lg',
                  'border border-gray-200 bg-white shadow-sm',
                  'pl-3 pr-7 text-[12.5px] text-gray-700',
                  'outline-none transition-colors',
                  'focus:border-brand focus:ring-1 focus:ring-brand/20',
                )}
              >
                {sizeOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
              <ChevronDown
                size={12}
                aria-hidden
                className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </span>
          </label>

          {/* Showing text — mobile only (right of Rows per page) */}
          <ShowingText className="sm:hidden" />
        </div>

        {/* ── Row 2 (mobile) / Right (desktop): Showing (desktop) + navigation ── */}
        <div className="flex items-center justify-center gap-4 sm:justify-end sm:gap-5">

          {/* Showing text — desktop only */}
          <ShowingText className="hidden sm:block" />

          {/* Navigation */}
          <div className="flex items-center gap-1">

            {/* First */}
            <button
              onClick={() => onPageChange(1)}
              disabled={page === 1}
              title="First page"
              className={iconBtn(page === 1)}
            >
              <ChevronsLeft size={14} strokeWidth={1.8} />
            </button>

            {/* Previous */}
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page === 1}
              title="Previous page"
              className={labelBtn(page === 1)}
            >
              {/* Text hidden on mobile */}
              <span className="hidden sm:inline mr-1">Previous</span>
              <ChevronLeft size={14} strokeWidth={1.8} />
            </button>

            {/* Page number slots */}
            {slots.map((slot, idx) =>
              slot === null ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-8 w-6 items-center justify-center text-[12.5px] text-gray-400 select-none"
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
              className={labelBtn(page === totalPages)}
            >
              <ChevronRight size={14} strokeWidth={1.8} />
              {/* Text hidden on mobile */}
              <span className="hidden sm:inline ml-1">Next</span>
            </button>

            {/* Last */}
            <button
              onClick={() => onPageChange(totalPages)}
              disabled={page === totalPages}
              title="Last page"
              className={iconBtn(page === totalPages)}
            >
              <ChevronsRight size={14} strokeWidth={1.8} />
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
