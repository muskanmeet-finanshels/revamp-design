'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CalendarDays, Plus, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { DrawerField, DrawerInput } from '@/components/ui/drawer-fields';
import { DatePicker } from '@/components/ui/date-picker';
import { type TaskItem } from './mock-data';

type ActionType = 'extend' | 'shorten' | 'fixedDay' | 'fixed';

interface Props {
  open:      boolean;
  onClose:   () => void;
  selectedTasks: Pick<TaskItem, 'name' | 'dueDate'>[];
  onConfirm: () => void;
}

const ACTION_OPTIONS: { value: ActionType; label: string; icon: React.ReactNode }[] = [
  { value: 'extend',  label: 'Extend Deadline',  icon: <Plus         size={13} className="text-emerald-600" /> },
  { value: 'shorten', label: 'Shorten Deadline', icon: <Minus        size={13} className="text-red-500"     /> },
  { value: 'fixedDay', label: 'Set Fixed Day of the Month', icon: <CalendarDays size={13} className="text-brand" /> },
  { value: 'fixed',   label: 'Set Fixed Date',   icon: <CalendarDays size={13} className="text-brand"       /> },
];

function formatDueDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function TaskEditDeadlineDrawer({ open, onClose, selectedTasks = [], onConfirm }: Props) {
  const [mounted,    setMounted]    = useState(false);
  const [action,     setAction]     = useState<ActionType>('extend');
  const [actionOpen, setActionOpen] = useState(false);
  const [days,       setDays]       = useState(7);
  const [fixedDay,   setFixedDay]   = useState(1);
  const [fixedDate,  setFixedDate]  = useState('');

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
      setFixedDay(1);
      setFixedDate('');
      setActionOpen(false);
    }
  }, [open]);

  const canConfirm =
    action === 'fixed' ? fixedDate.length > 0 :
    action === 'fixedDay' ? fixedDay >= 1 && fixedDay <= 31 :
    days > 0;

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
              Edit Task Deadlines
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

            {/* ── Selected task summary ── */}
            {selectedTasks.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
                  {selectedTasks.length} {selectedTasks.length === 1 ? 'Task' : 'Tasks'} Selected
                </p>
                <div className="max-h-[112px] space-y-2 overflow-y-auto pr-1">
                  {selectedTasks.map(task => (
                    <div key={`${task.name}-${task.dueDate}`} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-gray-900">
                        {task.name}
                      </span>
                      <span className="flex-shrink-0 text-[12px] text-gray-500">
                        Due {formatDueDate(task.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Action ── */}
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
                  <svg className={cn('h-4 w-4 text-gray-400 transition-transform', actionOpen && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                hint={`All selected tasks will be ${action === 'extend' ? 'extended' : 'shortened'} by ${days} ${days === 1 ? 'day' : 'days'}.`}
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
                hint={`All selected tasks will be due on day ${fixedDay} of each month.`}
              >
                <div className="relative">
                  <CalendarDays size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <DrawerInput
                    type="number"
                    min={1}
                    max={31}
                    value={fixedDay}
                    onChange={e => setFixedDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="pl-9 pr-20"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] text-gray-400">
                    day
                  </span>
                </div>
              </DrawerField>
            )}

            {/* ── Fixed date picker ── */}
            {action === 'fixed' && (
              <DrawerField
                label="New Due Date"
                hint={fixedDate ? `All selected tasks will be due on ${new Date(fixedDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.` : undefined}
              >
                <DatePicker
                  value={fixedDate}
                  onChange={setFixedDate}
                  placeholder="Select due date"
                />
              </DrawerField>
            )}

          </div>
          <div className="h-4" />
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
