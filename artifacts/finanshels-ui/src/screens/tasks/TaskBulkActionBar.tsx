'use client';

import { CalendarDays, CirclePause, ListTodo, PlayCircle, Trash2, UserRound, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  count: number;
  onHold: () => void;
  showOnHold?: boolean;
  showResume?: boolean;
  onReassign: () => void;
  onChangeStatus: () => void;
  onEditDeadline: () => void;
  onDelete?: () => void;
  onClear: () => void;
}

function Divider() {
  return <span className="mx-1 h-5 w-px flex-shrink-0 bg-white/20" />;
}

export function TaskBulkActionBar({
  count,
  onHold,
  showOnHold = true,
  showResume = false,
  onReassign,
  onChangeStatus,
  onEditDeadline,
  onDelete,
  onClear,
}: Props) {
  return (
    <div
      className={cn(
        'fixed bottom-3 sm:bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex w-max items-center justify-center gap-0 rounded-2xl sm:rounded-full bg-[#0D2436] shadow-2xl',
        'max-w-[calc(100vw-1.5rem)] overflow-x-auto lg:min-w-0 lg:max-w-[calc(100vw-2rem)] lg:overflow-x-auto xl:overflow-visible',
        'transition-all duration-300 ease-out',
        count > 0
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-4 opacity-0 pointer-events-none',
      )}
    >
      <div className="flex flex-shrink-0 items-center gap-2 py-2.5 pl-3 pr-3 sm:pr-4">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold leading-none text-white">
          {count}
        </span>
        <span className="hidden sm:inline whitespace-nowrap text-[13px] font-medium text-white">
          {count === 1 ? 'Task Selected' : 'Tasks Selected'}
        </span>
      </div>

      {showOnHold && (
        <>
          <Divider />

          <button
            type="button"
            onClick={onHold}
            className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white"
          >
            {showResume
              ? <PlayCircle size={14} strokeWidth={1.8} />
              : <CirclePause size={14} strokeWidth={1.8} />}
            <span className="hidden sm:inline">{showResume ? 'Resume' : 'On Hold'}</span>
          </button>
        </>
      )}

      <Divider />

      <button
        type="button"
        onClick={onReassign}
        className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white"
      >
        <UserRound size={14} strokeWidth={1.8} />
        <span className="hidden sm:inline">Reassign</span>
      </button>

      <Divider />

      <button
        type="button"
        onClick={onChangeStatus}
        className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white"
      >
        <ListTodo size={14} strokeWidth={1.8} />
        <span className="hidden sm:inline">Change Status</span>
      </button>

      <Divider />

      <button
        type="button"
        onClick={onEditDeadline}
        className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white"
      >
        <CalendarDays size={14} strokeWidth={1.8} />
        <span className="hidden sm:inline">Edit Deadline</span>
      </button>

      {onDelete && (
        <>
          <Divider />

          <button
            type="button"
            onClick={onDelete}
            className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-red-300 transition-colors hover:text-red-200"
          >
            <Trash2 size={14} strokeWidth={1.8} />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </>
      )}

      <Divider />

      <button
        type="button"
        onClick={onClear}
        aria-label="Clear task selection"
        className="mr-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  );
}