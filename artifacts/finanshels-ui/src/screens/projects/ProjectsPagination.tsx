'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export interface ProjectsPaginationProps {
  page: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
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

export function ProjectsPagination({
  page,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 12, 20, 50],
}: ProjectsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const slots = buildPageSlots(page, totalPages);
  const [targetPage, setTargetPage] = useState(String(page));

  const sizeOptions = Array.from(new Set([...pageSizeOptions, pageSize])).sort((a, b) => a - b);
  const targetPageNumber = Number(targetPage);
  const canGoToTargetPage =
    targetPage.trim() !== '' &&
    Number.isInteger(targetPageNumber) &&
    targetPageNumber >= 1 &&
    targetPageNumber <= totalPages;

  useEffect(() => {
    setTargetPage(String(page));
  }, [page]);

  const goToTargetPage = () => {
    if (canGoToTargetPage) onPageChange(targetPageNumber);
  };

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

  return (
    <div className="mt-3 border-t border-gray-100 px-1 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        {/* ── Left (desktop) / Row 1 (mobile): Go to page ── */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:justify-start">
          <form
            className="flex items-center gap-2"
            onSubmit={event => {
              event.preventDefault();
              goToTargetPage();
            }}
          >
            <label htmlFor="pagination-target-page" className="whitespace-nowrap text-[12.5px] text-gray-500">
              Go to page
            </label>
            <input
              id="pagination-target-page"
              type="number"
              min={1}
              max={totalPages}
              step={1}
              inputMode="numeric"
              value={targetPage}
              onChange={event => setTargetPage(event.target.value)}
              aria-label={`Go to page, 1 to ${totalPages}`}
              title={`Enter a page number from 1 to ${totalPages}`}
              className={cn(
                'h-8 w-[58px] rounded-lg border border-gray-200 bg-white px-2 text-center text-[12.5px] text-gray-700 shadow-sm',
                'outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand/20',
              )}
            />
            <button
              type="submit"
              disabled={!canGoToTargetPage}
              className={cn(
                'h-8 rounded-lg border border-gray-200 px-2.5 text-[12.5px] font-medium text-gray-600 transition-colors',
                canGoToTargetPage
                  ? 'hover:bg-gray-50 hover:text-gray-700'
                  : 'cursor-not-allowed opacity-40',
              )}
            >
              Go
            </button>
          </form>

        </div>

        {/* ── Right (desktop): Rows per page + navigation ── */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-end sm:gap-5">

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
              <ChevronLeft size={14} strokeWidth={1.8} />
              {/* Text hidden on mobile */}
              <span className="hidden sm:inline ml-1">Previous</span>
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
              {/* Text hidden on mobile */}
              <span className="hidden sm:inline mr-1">Next</span>
              <ChevronRight size={14} strokeWidth={1.8} />
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
