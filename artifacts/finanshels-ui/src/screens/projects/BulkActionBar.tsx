'use client';

import { UserRound, CalendarDays, CirclePause, PlayCircle, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  count:        number;
  onReassign:   () => void;
  onEditDeadline: () => void;
  onHold:       () => void;
  showResume?:  boolean;
  onDelete:     () => void;
  onClear:      () => void;
}

function Divider() {
  return <span className="mx-1 h-5 w-px flex-shrink-0 bg-white/20" />;
}

export function BulkActionBar({
  count,
  onReassign,
  onEditDeadline,
  onHold,
  showResume = false,
  onDelete,
  onClear,
}: Props) {
  return (
    <div
      className={cn(
        'fixed bottom-3 sm:bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-0 rounded-2xl sm:rounded-full bg-[#0D2436] shadow-2xl',
        'max-w-[calc(100vw-1.5rem)] overflow-x-auto',
        'transition-all duration-300 ease-out',
        count > 0
          ? 'translate-y-0 opacity-100 pointer-events-auto'
          : 'translate-y-4 opacity-0 pointer-events-none',
      )}
    >
      {/* ── Count + label ── */}
      <div className="flex flex-shrink-0 items-center gap-2 py-2.5 pl-3 pr-3 sm:pr-4">
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[12px] font-bold text-white leading-none">
          {count}
        </span>
        <span className="hidden sm:inline whitespace-nowrap text-[13px] font-medium text-white">
          {count === 1 ? 'Project Selected' : 'Projects Selected'}
        </span>
      </div>

      <Divider />

      {/* ── Reassign ── */}
      <button
        onClick={onReassign}
        className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white"
      >
        <UserRound size={14} strokeWidth={1.8} />
        <span className="hidden sm:inline">Reassign</span>
      </button>

      <Divider />

      {/* ── Edit Deadline ── */}
      <button
        onClick={onEditDeadline}
        className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white"
      >
        <CalendarDays size={14} strokeWidth={1.8} />
        <span className="hidden sm:inline">Edit Deadline</span>
      </button>

      <Divider />

      {/* ── On Hold ── */}
      <button
        onClick={onHold}
        className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:text-white"
      >
        {showResume
          ? <PlayCircle size={14} strokeWidth={1.8} />
          : <CirclePause size={14} strokeWidth={1.8} />}
        <span className="hidden sm:inline">{showResume ? 'Resume' : 'On Hold'}</span>
      </button>

      <Divider />

      {/* ── Delete ── */}
      <button
        onClick={onDelete}
        className="flex flex-shrink-0 items-center gap-1.5 px-3 sm:px-4 py-2.5 text-[13px] font-medium text-red-400 transition-colors hover:text-red-300"
      >
        <Trash2 size={14} strokeWidth={1.8} />
        <span className="hidden sm:inline">Delete</span>
      </button>

      <Divider />

      {/* ── Clear ── */}
      <button
        onClick={onClear}
        aria-label="Clear selection"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:text-white mr-1"
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  );
}
