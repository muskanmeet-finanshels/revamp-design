'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { DrawerField } from '@/components/ui/drawer-fields';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import type { TaskItem, TaskStatus } from './mock-data';

export const TASK_STATUS_OPTIONS: readonly TaskStatus[] = [
  'To Do',
  'In Progress',
  'Done',
  'Overdue',
  'On Hold',
  'Archived',
];

interface Props {
  open: boolean;
  onClose: () => void;
  tasks: TaskItem[];
  onConfirm: (status: TaskStatus) => void;
}

function statusCounts(tasks: TaskItem[]) {
  return tasks.reduce<Record<string, number>>((counts, task) => {
    counts[task.status] = (counts[task.status] ?? 0) + 1;
    return counts;
  }, {});
}

export function ChangeTaskStatusDrawer({ open, onClose, tasks, onConfirm }: Props) {
  const [mounted, setMounted] = useState(false);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) setNewStatus('');
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleConfirm() {
    if (!newStatus) return;
    onConfirm(newStatus as TaskStatus);
    setNewStatus('');
    onClose();
  }

  const counts = statusCounts(tasks);
  const currentStatus = Object.entries(counts)
    .map(([status, count]) => `${status} (${count})`)
    .join(', ');

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
            <span className="text-[15px] font-semibold text-gray-900">Change Status</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!newStatus}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              newStatus ? 'bg-brand hover:bg-brand-hover' : 'cursor-not-allowed bg-orange-200',
            )}
          >
            Confirm Now
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-5 py-5">
            <div>
              <label className="mb-2 block text-[12px] font-medium text-gray-500" htmlFor="current-task-status">
                Current Status
              </label>
              <input
                id="current-task-status"
                type="text"
                value={currentStatus}
                disabled
                readOnly
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[13px] font-medium text-gray-700 outline-none disabled:cursor-not-allowed disabled:opacity-100"
              />
            </div>

            <DrawerField label="New Status" required>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className={cn(
                  'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                  'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                  'data-[state=open]:border-brand',
                )}>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                  {TASK_STATUS_OPTIONS.map(status => (
                    <SelectItem
                      key={status}
                      value={status}
                      className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium"
                    >
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DrawerField>
          </div>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}