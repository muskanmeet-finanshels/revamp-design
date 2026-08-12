'use client';

import { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTimer } from '@/contexts/TimerContext';
import type { TaskStatus } from '@/screens/tasks/mock-data';
import { DrawerTextarea } from '@/components/ui/drawer-fields';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface StopTimerResult {
  notes:     string;
  newStatus: TaskStatus | null; // null = keep current
}

interface StopTimerDialogProps {
  open:      boolean;
  onClose:   () => void;
  onConfirm: (result: StopTimerResult) => void;
}

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: 'To Do',      label: 'To Do'      },
  { value: 'On Hold',    label: 'On Hold'    },
  { value: 'In Review',  label: 'In Review'  },
  { value: 'Completed',  label: 'Completed'  },
  { value: 'Done',       label: 'Done'       },
];

function fmtElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function StopTimerDialog({ open, onClose, onConfirm }: StopTimerDialogProps) {
  const timer = useTimer();

  const [elapsed,   setElapsed]   = useState('00:00:00');
  const [newStatus, setNewStatus] = useState('');      // '' = keep current
  const [notes,     setNotes]     = useState('');

  /* Live elapsed counter while the dialog is open */
  useEffect(() => {
    if (!open || !timer.startedAt) return;

    function calc() {
      const effectiveNow = timer.pausedAt ?? Date.now();
      const ms = Math.max(0, effectiveNow - timer.startedAt! - (timer.totalPausedMs ?? 0));
      setElapsed(fmtElapsed(ms));
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [open, timer.startedAt, timer.totalPausedMs, timer.pausedAt]);

  /* Reset form every time dialog opens */
  useEffect(() => {
    if (open) { setNewStatus(''); setNotes(''); }
  }, [open]);

  function handleConfirm() {
    onConfirm({
      notes,
      newStatus: newStatus ? (newStatus as TaskStatus) : null,
    });
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-[60] bg-black/50',
            'data-[state=open]:animate-overlay-enter data-[state=closed]:animate-overlay-leave',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-[60] m-auto h-fit w-[calc(100vw-3rem)] max-w-[480px]',
            'rounded-2xl bg-white p-6 shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter data-[state=closed]:animate-dialog-leave',
          )}
        >
          {/* ── Title + elapsed ── */}
          <DialogPrimitive.Title className="text-[18px] font-bold text-gray-900">
            Stop Timer
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-1 text-[13.5px] text-gray-500">
            Timer has been running for{' '}
            <span className="font-bold text-gray-800">{elapsed}</span>.
          </DialogPrimitive.Description>

          {/* ── Task / Project info ── */}
          <div className="mt-4 space-y-0.5 text-[13.5px]">
            <p>
              <span className="font-semibold text-gray-900">Task: </span>
              <span className="text-gray-600">{timer.taskName}</span>
            </p>
            {timer.projectName && (
              <p>
                <span className="font-semibold text-gray-900">Project: </span>
                <span className="text-gray-600">{timer.projectName}</span>
              </p>
            )}
          </div>

          {/* ── Status dropdown ── */}
          <div className="mt-5">
            <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
              Update Task Status
            </label>
            <Select
              value={newStatus || '__keep__'}
              onValueChange={(v) => setNewStatus(v === '__keep__' ? '' : v)}
            >
              <SelectTrigger
                aria-label="Update Task Status"
                className="h-11 w-full rounded-xl border border-brand px-4 text-[13px] text-gray-900 transition-colors focus:outline-none focus:ring-0 data-[state=open]:border-brand [&>svg]:text-gray-400"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[200] rounded-xl border border-gray-100 bg-white shadow-xl">
                <SelectItem value="__keep__" className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                  Keep current status (no change)
                </SelectItem>
                {STATUS_OPTIONS.map(o => (
                  <SelectItem key={o.value} value={o.value} className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Notes textarea ── */}
          <div className="mt-4">
            <label className="mb-2 block text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
              Notes
            </label>
            <DrawerTextarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about the work completed..."
              rows={3}
            />
          </div>

          {/* ── Buttons ── */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-[13.5px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-red-500 px-5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-red-600 active:scale-[0.98]"
            >
              Stop Timer
            </button>
          </div>

          {/* ── Close × ── */}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={16} strokeWidth={2} />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
