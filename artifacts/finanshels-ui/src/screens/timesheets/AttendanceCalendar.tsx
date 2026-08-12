'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type AttendanceRecord, type AttendanceStatus } from './mock-data';

/* ── Status colours ── */
const STATUS_STYLE: Record<AttendanceStatus, { dot: string; pill: string; detail: string }> = {
  Present:   { dot: 'bg-emerald-500', pill: 'bg-emerald-50  border-emerald-200  text-emerald-700', detail: 'bg-emerald-50  border-emerald-200  text-emerald-700' },
  Remote:    { dot: 'bg-violet-500',  pill: 'bg-violet-50   border-violet-200   text-violet-700',  detail: 'bg-violet-50   border-violet-200   text-violet-700'  },
  Late:      { dot: 'bg-amber-500',   pill: 'bg-amber-50    border-amber-200    text-amber-700',   detail: 'bg-amber-50    border-amber-200    text-amber-700'   },
  'Half Day':{ dot: 'bg-orange-500',  pill: 'bg-orange-50   border-orange-200   text-orange-700',  detail: 'bg-orange-50   border-orange-200   text-orange-700'  },
  Absent:    { dot: 'bg-red-500',     pill: 'bg-red-50      border-red-200      text-red-600',     detail: 'bg-red-50      border-red-200      text-red-600'     },
};

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/* Build a 6-row grid of calendar cells for the given month */
function buildGrid(year: number, month: number) {
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ iso: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ iso: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ iso: isoDate(year, month, d), day: d });
  const trailing = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trailing; i++) cells.push({ iso: null, day: null });
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

interface Props { records: AttendanceRecord[] }

export function AttendanceCalendar({ records }: Props) {
  /* "today" pinned to the mock dataset's latest date */
  const TODAY_ISO = '2026-08-04';
  const todayDate = new Date(TODAY_ISO + 'T00:00:00');

  const [month, setMonth] = useState(new Date(2026, 7, 1));   // Aug 2026
  const [selected, setSelected] = useState<string | null>(TODAY_ISO);

  const year     = month.getFullYear();
  const monthIdx = month.getMonth();

  /* Group records by ISO date */
  const byDate = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    records.forEach(r => { (map[r.date] ??= []).push(r); });
    return map;
  }, [records]);

  const weeks = useMemo(() => buildGrid(year, monthIdx), [year, monthIdx]);
  const selectedRecords = selected ? (byDate[selected] ?? []) : [];

  function prevMonth() { setMonth(new Date(year, monthIdx - 1, 1)); }
  function nextMonth() { setMonth(new Date(year, monthIdx + 1, 1)); }
  function goToday()   { setMonth(new Date(2026, 7, 1)); setSelected(TODAY_ISO); }

  /* Status breakdown for selected day */
  const breakdown = useMemo(() => {
    const counts: Partial<Record<AttendanceStatus, number>> = {};
    selectedRecords.forEach(r => { counts[r.status] = (counts[r.status] ?? 0) + 1; });
    return counts;
  }, [selectedRecords]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">

      {/* ── Calendar grid ── */}
      <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3.5">
          <button
            type="button" onClick={prevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
          >
            <ChevronLeft size={15} />
          </button>

          <div className="flex flex-1 items-center justify-center gap-3">
            <span className="text-[15px] font-semibold text-gray-900">
              {MONTH_NAMES[monthIdx]} {year}
            </span>
            <button
              type="button" onClick={goToday}
              className="flex h-7 items-center gap-1.5 rounded-md border border-gray-200 px-2.5 text-[12px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
            >
              <CalendarDays size={12} />
              Today
            </button>
          </div>

          <button
            type="button" onClick={nextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-800"
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/70">
          {WEEKDAYS.map(d => (
            <div key={d} className="py-2.5 text-center text-[10.5px] font-bold uppercase tracking-widest text-gray-400">
              {d}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="divide-y divide-gray-100">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 divide-x divide-gray-100">
              {week.map((cell, ci) => {
                if (!cell.iso) {
                  return (
                    <div
                      key={ci}
                      className={cn(
                        'min-h-[90px] p-1.5',
                        ci >= 5 ? 'bg-gray-50/60' : 'bg-gray-50/30',
                      )}
                    />
                  );
                }

                const recs       = byDate[cell.iso] ?? [];
                const isToday    = cell.iso === TODAY_ISO;
                const isSel      = cell.iso === selected;
                const isWeekend  = ci >= 5;
                const visible    = recs.slice(0, 3);
                const overflow   = recs.length - visible.length;

                return (
                  <div
                    key={ci}
                    onClick={() => setSelected(isSel ? null : cell.iso)}
                    className={cn(
                      'min-h-[90px] cursor-pointer p-1.5 transition-colors',
                      isSel      ? 'bg-orange-50/70 ring-1 ring-inset ring-brand/20' :
                      isWeekend  ? 'bg-gray-50/50 hover:bg-gray-100/60' :
                                   'hover:bg-gray-50/80',
                    )}
                  >
                    {/* Day number */}
                    <div className="mb-1 flex items-center justify-between">
                      <span className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[12px] font-medium leading-none',
                        isToday
                          ? 'bg-brand font-bold text-white'
                          : isSel
                            ? 'font-semibold text-brand'
                            : isWeekend
                              ? 'text-gray-400'
                              : 'text-gray-700',
                      )}>
                        {cell.day}
                      </span>
                      {recs.length > 0 && (
                        <span className="text-[9px] font-medium text-gray-300">
                          {recs.length}
                        </span>
                      )}
                    </div>

                    {/* Event pills */}
                    <div className="flex flex-col gap-px">
                      {visible.map(r => {
                        const s = STATUS_STYLE[r.status];
                        return (
                          <div
                            key={r.id}
                            className={cn(
                              'flex items-center gap-1 rounded px-1 py-[2px] text-[10.5px] border truncate',
                              s.pill,
                            )}
                          >
                            <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', s.dot)} />
                            <span className="truncate leading-none">
                              {r.name.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <span className="pl-1 text-[10px] text-gray-400">
                          +{overflow} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          {(Object.keys(STATUS_STYLE) as AttendanceStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', STATUS_STYLE[s].dot)} />
              <span className="text-[11.5px] text-gray-500">{s}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Detail panel ── */}
      {selected && (
        <div className="w-full flex-shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:w-72">
          {/* Panel header */}
          <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3.5">
            <div>
              <p className="text-[13px] font-semibold text-gray-900">
                {new Date(selected + 'T00:00:00').toLocaleDateString('en-GB', {
                  weekday: 'long', day: '2-digit', month: 'long',
                })}
              </p>
              <p className="mt-0.5 text-[12px] text-gray-400">
                {selectedRecords.length > 0
                  ? `${selectedRecords.length} record${selectedRecords.length !== 1 ? 's' : ''}`
                  : 'No records'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="flex h-6 w-6 items-center justify-center rounded text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={13} />
            </button>
          </div>

          {selectedRecords.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-[13px] text-gray-400">
              No attendance on this day
            </div>
          ) : (
            <>
              {/* Status summary chips */}
              <div className="flex flex-wrap gap-1.5 border-b border-gray-100 px-4 py-3">
                {(Object.entries(breakdown) as [AttendanceStatus, number][]).map(([s, n]) => (
                  <span
                    key={s}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                      STATUS_STYLE[s].detail,
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_STYLE[s].dot)} />
                    {s} · {n}
                  </span>
                ))}
              </div>

              {/* Record list */}
              <ul className="max-h-[420px] divide-y divide-gray-50 overflow-y-auto">
                {selectedRecords.map(r => {
                  const s = STATUS_STYLE[r.status];
                  return (
                    <li key={r.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium text-gray-900">{r.name}</span>
                        <span className={cn(
                          'flex-shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-[3px] text-[11px] font-medium',
                          s.detail,
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                          {r.status}
                        </span>
                      </div>
                      {r.checkIn !== '—' && (
                        <div className="mt-1 flex items-center gap-3 text-[11.5px] text-gray-400">
                          <span>In <span className="font-medium text-gray-700">{r.checkIn}</span></span>
                          <span>Out <span className="font-medium text-gray-700">{r.checkOut}</span></span>
                          <span className="text-gray-500">{r.duration}</span>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
