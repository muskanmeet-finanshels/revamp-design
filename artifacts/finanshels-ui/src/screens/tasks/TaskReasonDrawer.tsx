'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { DrawerField, DrawerTextarea } from '@/components/ui/drawer-fields';
import type { TaskItem } from './mock-data';

type TaskReasonMode = 'hold' | 'delete';

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  mode: TaskReasonMode;
  onConfirm: (reason: string) => void;
}

export function TaskReasonDrawer({
  open,
  onClose,
  tasks,
  mode,
  onConfirm,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState('');
  const isDelete = mode === 'delete';
  const count = tasks.length;
  const noun = count === 1 ? 'Task' : 'Tasks';

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) setReason('');
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleConfirm() {
    const trimmed = reason.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
    setReason('');
    onClose();
  }

  const content = (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">
              {isDelete ? `Delete ${noun}` : `Hold ${noun}`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reason.trim()}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              isDelete
                ? reason.trim() ? 'bg-red-500 hover:bg-red-600' : 'cursor-not-allowed bg-red-200'
                : reason.trim() ? 'bg-brand hover:bg-brand-hover' : 'cursor-not-allowed bg-orange-200',
            )}
          >
            {isDelete ? `Delete ${noun}` : 'Confirm Now'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">
            <div className={cn(
              'flex gap-3 rounded-lg px-4 py-3.5',
              isDelete
                ? 'border border-red-200 bg-red-50'
                : 'border border-amber-200 bg-amber-50',
            )}>
              <AlertTriangle
                size={17}
                className={cn(
                  'mt-0.5 flex-shrink-0',
                  isDelete ? 'text-red-500' : 'text-amber-500',
                )}
                strokeWidth={2}
              />
              <div>
                <p className={cn(
                  'text-[13.5px] font-semibold',
                  isDelete ? 'text-red-700' : 'text-amber-700',
                )}>
                  {count} {noun} Selected
                </p>
                <p className={cn(
                  'mt-0.5 text-[12.5px] leading-snug',
                  isDelete ? 'text-red-600' : 'text-amber-600',
                )}>
                  {isDelete
                    ? 'All associated task data will be permanently deleted.'
                    : 'Putting these tasks on hold will pause their work until the status is changed.'}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
                {count} {noun} Selected
              </p>
              <div className="max-h-[140px] space-y-2 overflow-y-auto pr-1">
                {tasks.map(task => (
                  <div key={task.id} className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-gray-900">
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <DrawerField label={isDelete ? 'Reason for Deletion' : 'Reason for Hold'} required>
              <DrawerTextarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder={
                  isDelete
                    ? 'Explain why this task is being deleted...'
                    : 'Describe why these task(s) are being put on hold...'
                }
                rows={5}
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