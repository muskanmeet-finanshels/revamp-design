'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CalendarDays, CalendarClock, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { DrawerField, DrawerInput, DrawerTextarea } from '@/components/ui/drawer-fields';

type ActionType = 'extend' | 'shorten' | 'fixedDay';

interface SelectedProject {
  title:   string;
  dueDate: string; // e.g. "03 Jul 2026"
}

interface Props {
  open:      boolean;
  onClose:   () => void;
  count:     number;
  projects:  SelectedProject[];
  onConfirm: () => void;
}

const ACTION_OPTIONS: { value: ActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'extend',    label: 'Extend Deadline',            icon: <Plus         size={13} className="text-emerald-600" /> },
  { value: 'shorten',   label: 'Shorten Deadline',           icon: <Minus        size={13} className="text-red-500"     /> },
  { value: 'fixedDay',  label: 'Set Fixed Day of the Month', icon: <CalendarClock size={13} className="text-brand"      /> },
];

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function EditDeadlineDrawer({ open, onClose, count, projects, onConfirm }: Props) {
  const [mounted,    setMounted]    = useState(false);
  const [action,     setAction]     = useState<ActionType>('extend');
  const [actionOpen, setActionOpen] = useState(false);
  const [days,       setDays]       = useState(7);
  const [dayOfMonth, setDayOfMonth] = useState(15);
  const [reason,     setReason]     = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* reset when re-opened */
  useEffect(() => {
    if (open) {
      setAction('extend');
      setDays(7);
      setDayOfMonth(15);
      setReason('');
      setActionOpen(false);
    }
  }, [open]);

  const canConfirm =
    reason.trim().length > 0 &&
    (action === 'extend' || action === 'shorten'
      ? days > 0
      : dayOfMonth >= 1 && dayOfMonth <= 31);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm();
    onClose();
  }

  const selectedAction = ACTION_OPTIONS.find(o => o.value === action)!;

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={17} />
            </button>
            <p className="text-[15px] font-semibold text-gray-900 leading-tight">
              Edit Project Deadlines
            </p>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canConfirm
                ? 'bg-brand hover:bg-brand-hover'
                : 'bg-orange-200 cursor-not-allowed',
            )}
          >
            Confirm Changes
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 py-5 space-y-6">

            {/* ── Selected project summary ── */}
            {projects.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
                  {count} {count === 1 ? 'Project' : 'Projects'} Selected
                </p>
                <div className="max-h-[112px] space-y-2 overflow-y-auto pr-1">
                  {projects.map(project => (
                    <div
                      key={`${project.title}-${project.dueDate}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3"
                    >
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-gray-900">
                        {project.title}
                      </span>
                      <span className="flex-shrink-0 text-[12px] text-gray-500">
                        Due {project.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Action dropdown ── */}
            <div className="space-y-1.5">
              <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
                Action
              </p>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setActionOpen(o => !o)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[13px] text-gray-800 transition-colors hover:border-brand focus:outline-none"
                >
                  <span className="flex items-center gap-2">
                    {selectedAction.icon}
                    {selectedAction.label}
                  </span>
                  <svg
                    className={cn('h-4 w-4 text-gray-400 transition-transform', actionOpen && 'rotate-180')}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {actionOpen && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                    {ACTION_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => { setAction(opt.value); setActionOpen(false); }}
                        className={cn(
                          'flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] transition-colors hover:bg-orange-50',
                          action === opt.value ? 'font-semibold text-brand' : 'text-gray-700',
                        )}
                      >
                        {opt.icon}
                        {opt.label}
                        {action === opt.value && (
                          <svg className="ml-auto h-4 w-4 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Days input (extend / shorten) ── */}
            {(action === 'extend' || action === 'shorten') && (
              <DrawerField
                label={`Number of Days to ${action === 'extend' ? 'Add' : 'Remove'}`}
                hint={`All selected projects will be ${action === 'extend' ? 'extended' : 'shortened'} by ${days} ${days === 1 ? 'day' : 'days'}.`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <CalendarDays size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <DrawerInput
                      type="number"
                      min={1}
                      max={365}
                      value={days}
                      onChange={e => setDays(Math.max(1, parseInt(e.target.value) || 1))}
                      className="pl-9 pr-14"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">days</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => setDays(d => Math.max(1, d - 1))}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                      <Minus size={13} />
                    </button>
                    <button type="button" onClick={() => setDays(d => Math.min(365, d + 1))}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 transition-colors">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </DrawerField>
            )}

            {/* ── Fixed day of month input ── */}
            {action === 'fixedDay' && (
              <DrawerField
                label="Day of the Month"
                hint={`All selected projects will be due on the ${ordinal(dayOfMonth)} of each month.`}
              >
                <div className="relative">
                  <CalendarClock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <DrawerInput
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={e => setDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="pl-9 pr-16"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">day</span>
                </div>
              </DrawerField>
            )}

            {/* ── Reason for Change ── */}
            <DrawerField label="Reason for Change" required>
              <DrawerTextarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Explain why the deadline is being changed..."
                rows={4}
              />
            </DrawerField>

          </div>
          <div className="h-4" />
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
