'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, GripVertical,
  Play, PlayCircle, Square, MessageSquare, MoreHorizontal,
  UserRound, Tag, Pencil, X, Circle, CircleAlert, Timer,
} from 'lucide-react';
import { useTimer } from '@/contexts/TimerContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { TaskCommentsDrawer, type TaskComment } from './TaskCommentsDrawer';
import { MOCK_TASKS, type TaskItem, type TaskStatus } from './mock-data';
import { StopTimerDialog } from '@/components/StopTimerDialog';

/* ── task tags ── */

const TASK_PRIORITY_OPTIONS = [
  { value: 'a1', label: 'A1' },
  { value: 'a2', label: 'A2' },
  { value: 'a3', label: 'A3' },
] as const;

type TaskPriorityTag = typeof TASK_PRIORITY_OPTIONS[number]['value'] | '';

interface TaskTagEntry { priority: TaskPriorityTag }

export type TaskColumnKey =
  | 'project'
  | 'assignee'
  | 'reassignmentNote'
  | 'dueDate'
  | 'status'
  | 'timeSpent'
  | 'timer'
  | 'comments'
  | 'tags'
  | 'action';

export const TASK_COLUMN_OPTIONS: Array<{ key: TaskColumnKey; label: string }> = [
  { key: 'project',          label: 'Project' },
  { key: 'assignee',         label: 'Assignee' },
  { key: 'reassignmentNote', label: 'Reassignment Note' },
  { key: 'dueDate',          label: 'Due Date' },
  { key: 'status',           label: 'Status' },
  { key: 'timeSpent',        label: 'Time Spent' },
  { key: 'timer',            label: 'Timer' },
  { key: 'comments',         label: 'Comments' },
  { key: 'tags',             label: 'Tags' },
  { key: 'action',           label: 'Action' },
];

const TASK_COLUMN_WEIGHTS: Record<TaskColumnKey, number> = {
  project:          13,
  assignee:         11,
  reassignmentNote: 12,
  dueDate:          11,
  status:           10,
  timeSpent:        8,
  timer:            11,
  comments:         7,
  tags:             12,
  action:           6,
};

const DEFAULT_VISIBLE_TASK_COLUMNS = new Set<TaskColumnKey>(
  TASK_COLUMN_OPTIONS.map(({ key }) => key),
);

const TAG_BADGE: Record<string, string> = {
  a1: 'bg-red-100    text-red-600',
  a2: 'bg-amber-100  text-amber-600',
  a3: 'bg-green-100  text-green-700',
};

function TaskTagsDialog({
  open, onClose, onSave, taskName, initial,
}: {
  open:     boolean;
  onClose:  () => void;
  onSave:   (priority: TaskPriorityTag) => void;
  taskName: string;
  initial:  TaskTagEntry;
}) {
  const [priority, setPriority] = useState<TaskPriorityTag>(initial.priority);

  useEffect(() => {
    if (open) setPriority(initial.priority);
  }, [open, initial.priority]);

  const isEditing = Boolean(initial.priority);
  const canSave   = Boolean(priority);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />

        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[480px]',
            'rounded-2xl bg-white shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          <div className="flex items-start justify-between px-5 pt-5">
            <div>
              <DialogPrimitive.Title className="text-[16px] font-semibold text-gray-900">
                {isEditing ? 'Edit Tags' : 'Add Tags'}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-[13px] leading-snug text-gray-500">
                Set an optional priority tag for{' '}
                <span className="font-medium text-gray-700">{taskName}</span>.
              </DialogPrimitive.Description>
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="ml-3 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div className="space-y-1.5">
              <label className="text-[13px] font-medium text-gray-800">Priority</label>
              <div className="relative">
                <Select value={priority} onValueChange={v => setPriority(v as TaskPriorityTag)}>
                  <SelectTrigger className={cn(
                    'h-11 w-full rounded-xl border px-4 text-[13px] transition-colors focus:outline-none focus:ring-0',
                    priority
                      ? 'border-brand text-gray-900 pr-10 [&>svg]:hidden'
                      : 'border-gray-200 text-gray-400',
                    'data-[state=open]:border-brand',
                  )}>
                    <SelectValue placeholder="Select priority…" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                    {TASK_PRIORITY_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}
                        className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {priority && (
                  <button
                    type="button"
                    aria-label="Remove priority tag"
                    onPointerDown={e => e.preventDefault()}
                    onClick={e => { e.stopPropagation(); setPriority(''); }}
                    className="absolute right-3 top-0 bottom-0 flex items-center justify-center text-gray-400 hover:text-gray-600"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { onSave(priority); onClose(); }}
              disabled={!canSave}
              className={cn(
                'h-10 rounded-xl text-[13px] font-semibold transition-colors',
                canSave
                  ? 'bg-brand text-white hover:bg-brand-hover'
                  : 'cursor-not-allowed bg-orange-200 text-white',
              )}
            >
              Save
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ── status chip styles ── */

const STATUS_CHIP: Record<TaskStatus, string> = {
  'To Do':       'border border-gray-200    bg-gray-50    text-gray-600',
  'In Progress': 'border border-blue-200    bg-blue-50    text-blue-700',
  'Done':        'border border-emerald-200 bg-emerald-50 text-emerald-700',
  'In Review':   'border border-violet-200   bg-violet-50   text-violet-700',
  'Completed':  'border border-emerald-200 bg-emerald-50 text-emerald-700',
  'Overdue':     'border border-red-200     bg-red-50     text-red-600',
  'On Hold':     'border border-amber-200   bg-amber-50   text-amber-700',
  'Archived':    'border border-gray-200    bg-gray-100   text-gray-500',
};

/* ── due-date indicator ── */

function getDueDateIndicator(isoDate: string, status: TaskStatus) {
  if (status === 'Done' || status === 'Archived') return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(isoDate); due.setHours(0, 0, 0, 0);
  const days  = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0)  return { text: `${Math.abs(days)}d overdue`, cls: 'text-red-500 bg-red-50' };
  if (days === 0) return { text: 'Due today',                 cls: 'text-orange-500 bg-orange-50' };
  if (days <= 3)  return { text: `In ${days}d`,               cls: 'text-amber-600 bg-amber-50' };
  return null;
}

/* ── format seconds → Xh Ym ── */

function fmtTime(seconds: number): string {
  if (seconds === 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0)          return `${h}h`;
  return `${m}m`;
}

/* ── per-row live timer ── */

function RowTimer({
  taskId,
  taskName,
  taskStatus,
  baseSeconds,
  projectName,
  onStatusAdvance,
  onStatusSet,
}: {
  taskId:           string;
  taskName:         string;
  taskStatus:       TaskStatus;
  baseSeconds:      number;
  projectName?:     string;
  onStatusAdvance?: () => void;
  onStatusSet?:     (status: TaskStatus) => void;
}) {
  const timer = useTimer();
  const [confirmOpen,    setConfirmOpen]    = useState(false); // start
  const [stopDialogOpen, setStopDialogOpen] = useState(false); // stop

  /* Is this row the active timer? */
  const isActive = timer.active && timer.taskId === taskId;

  /* Live elapsed display when this row is active */
  const [elapsedDisplay, setElapsedDisplay] = useState<string | null>(null);

  useEffect(() => {
    if (!isActive || !timer.startedAt) { setElapsedDisplay(null); return; }

    function calcDisplay() {
      const effectiveNow = timer.pausedAt ?? Date.now();
      const totalMs  = Math.max(0, effectiveNow - timer.startedAt! - (timer.totalPausedMs ?? 0));
      const totalSec = Math.floor(totalMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    setElapsedDisplay(calcDisplay());
    if (!timer.running) return; // paused — freeze display, no interval needed

    const id = setInterval(() => setElapsedDisplay(calcDisplay()), 1000);

    /* Re-sync display whenever the page becomes visible again.
       - visibilitychange: tab switches and many mobile browsers
       - resume: Page Lifecycle API — fires after freeze (screen lock / app switch)
       - pageshow: BFCache restoration */
    function onVisible() {
      if (document.visibilityState === 'visible') setElapsedDisplay(calcDisplay());
    }
    function onResume() { setElapsedDisplay(calcDisplay()); }
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) setElapsedDisplay(calcDisplay());
    }

    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('resume', onResume);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('resume', onResume);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [isActive, timer.startedAt, timer.totalPausedMs, timer.pausedAt, timer.running]);

  /* Static display from baseSeconds — always HH:MM:SS so initial shows 00:00:00 */
  function fmtStatic(sec: number) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const display = isActive && elapsedDisplay !== null
    ? elapsedDisplay
    : fmtStatic(baseSeconds);

  /* Start is available only for untouched To Do tasks */
  const canStart = taskStatus === 'To Do' && baseSeconds === 0;

  /* ── confirm start dialog node — matches DeleteTaskDialog layout ── */
  const confirmDialogNode = (
    <DialogPrimitive.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px]',
            'rounded-2xl bg-white p-6 shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
            <Timer size={20} className="text-emerald-600" />
          </div>
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            Start timer?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Start tracking time for{' '}
            <span className="font-medium text-gray-700">&ldquo;{taskName}&rdquo;</span>?
          </DialogPrimitive.Description>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirmOpen(false);
                // Delay start until the dialog close animation (0.18s) finishes
                // so the stop button doesn't flash through the fading overlay
                setTimeout(() => {
                  timer.startTimer(taskId, taskName, projectName ?? '');
                  if (taskStatus === 'To Do') onStatusAdvance?.();
                }, 200);
              }}
              className="flex-1 rounded-lg bg-[#f97316] px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-[#ea580c]"
            >
              Start Timer
            </button>
          </div>
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

  /* ── active row: show live timer + stop button (opens StopTimerDialog) ── */
  if (isActive) {
    return (
      <>
        <StopTimerDialog
          open={stopDialogOpen}
          onClose={() => setStopDialogOpen(false)}
          onConfirm={({ newStatus }) => {
            timer.stopTimer();
            if (newStatus) onStatusSet?.(newStatus);
            setStopDialogOpen(false);
            toast.success(`Timer stopped for "${taskName}"`);
          }}
        />
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setStopDialogOpen(true)}
                className="flex items-center gap-1 rounded-full px-2 py-[3px] text-[11px] font-medium transition-colors whitespace-nowrap bg-brand/10 text-brand hover:bg-brand/20"
              >
                <Square size={8} fill="currentColor" className="flex-shrink-0" />
                {display}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
              Stop timer
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    );
  }

  /* ── untouched task: time display + separate Start Timer CTA ── */
  if (canStart) {
    return (
      <>
        {confirmDialogNode}
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-[3px] text-[11px] font-semibold text-emerald-700 transition-colors whitespace-nowrap hover:bg-emerald-100"
              >
                <Play size={8} fill="currentColor" className="flex-shrink-0" />
                Start Timer
              </button>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
            >
              Start timer
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </>
    );
  }

  /* ── all other tasks: no timer control ── */
  return (
    <span className="text-[11px] text-gray-400 font-medium px-2">—</span>
  );
}

/* ── sortable header ── */

export type SortKey = 'name' | 'project' | 'assignee' | 'status' | 'priority' | 'dueDate';

function SortableHead({
  label, sortKey, currentKey, currentDir, onSort, className,
}: {
  label:      string;
  sortKey:    SortKey;
  currentKey: SortKey;
  currentDir: 'asc' | 'desc';
  onSort:     (k: SortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
        active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
        className,
      )}
    >
      {label}
      {active
        ? currentDir === 'asc'
          ? <ArrowUp    size={11} className="text-brand" />
          : <ArrowDown  size={11} className="text-brand" />
        : <ArrowUpDown  size={11} className="opacity-40" />
      }
    </button>
  );
}

/* ── action menu ── */

function ActionMenu({
  taskName,
  onDelete,
  onChangeAssignee,
  onMarkComplete,
}: {
  taskName: string;
  onDelete: () => void;
  onChangeAssignee: () => void;
  onMarkComplete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none"
          aria-label="Task actions"
        >
          <MoreHorizontal size={14} />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-44 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl"
      >
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            toast.success(`"${taskName}" started`);
          }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Start
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            toast.success(`"${taskName}" put on hold`);
          }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          On Hold
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onMarkComplete();
          }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Mark Complete
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            toast.success(`"${taskName}" sent for review`);
          }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          In Review
        </button>

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onChangeAssignee();
          }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Change Assignee
        </button>

        <div className="my-1 border-t border-gray-100" />

        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onDelete();
          }}
          className="w-full rounded-md px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Delete Task
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── delete confirmation dialog ── */

function DeleteTaskDialog({
  task,
  onClose,
  onConfirm,
}: {
  task: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: (task: { id: string; name: string }) => void;
}) {
  return (
    <DialogPrimitive.Root
      open={task !== null}
      onOpenChange={open => { if (!open) onClose(); }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px]',
            'rounded-2xl bg-white p-6 shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <CircleAlert size={20} className="text-red-500" />
          </div>
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            Delete task?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Are you sure you want to delete{' '}
            <span className="font-medium text-gray-700">
              {task?.name ? `"${task.name}"` : 'this task'}
            </span>
            ? This action cannot be undone.
          </DialogPrimitive.Description>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (task) onConfirm(task); }}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete Task
            </button>
          </div>
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

/* ── mark incomplete confirmation dialog ── */
function MarkIncompleteDialog({
  task,
  onClose,
  onConfirm,
}: {
  task: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: (task: { id: string; name: string }) => void;
}) {
  return (
    <DialogPrimitive.Root
      open={task !== null}
      onOpenChange={open => { if (!open) onClose(); }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px]',
            'rounded-2xl bg-white p-6 shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <CircleAlert size={20} className="text-brand" />
          </div>
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            Mark task as incomplete?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Are you sure you want to mark{' '}
            <span className="font-medium text-gray-700">
              {task?.name ? `"${task.name}"` : 'this task'}
            </span>
            {' '}as incomplete?
          </DialogPrimitive.Description>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (task) onConfirm(task); }}
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Mark Incomplete
            </button>
          </div>
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

/* ── resume confirmation dialog ── */
function ResumeTaskDialog({
  task,
  onClose,
  onConfirm,
}: {
  task: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: (task: { id: string; name: string }) => void;
}) {
  return (
    <DialogPrimitive.Root
      open={task !== null}
      onOpenChange={open => { if (!open) onClose(); }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px]',
            'rounded-2xl bg-white p-6 shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
            <PlayCircle size={20} className="text-brand" />
          </div>
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            Resume task?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Are you sure you want to resume{' '}
            <span className="font-medium text-gray-700">
              {task?.name ? `"${task.name}"` : 'this task'}
            </span>
            ? The task will return to In Progress.
          </DialogPrimitive.Description>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (task) onConfirm(task); }}
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Resume Task
            </button>
          </div>
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

/* ── mark complete confirmation dialog ── */
function MarkCompleteDialog({
  task,
  onClose,
  onConfirm,
}: {
  task: { id: string; name: string } | null;
  onClose: () => void;
  onConfirm: (task: { id: string; name: string }) => void;
}) {
  return (
    <DialogPrimitive.Root
      open={task !== null}
      onOpenChange={open => { if (!open) onClose(); }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50',
            'data-[state=open]:animate-overlay-enter',
            'data-[state=closed]:animate-overlay-leave',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed inset-0 z-50 m-auto h-fit w-[calc(100vw-3rem)] max-w-[420px]',
            'rounded-2xl bg-white p-6 shadow-2xl outline-none',
            'data-[state=open]:animate-dialog-enter',
            'data-[state=closed]:animate-dialog-leave',
          )}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-50">
            <CircleAlert size={20} className="text-green-600" />
          </div>
          <DialogPrimitive.Title className="mt-4 text-[16px] font-semibold text-gray-900">
            Mark task as complete?
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-[13.5px] leading-relaxed text-gray-500">
            Are you sure you want to mark{' '}
            <span className="font-medium text-gray-700">
              {task?.name ? `"${task.name}"` : 'this task'}
            </span>
            {' '}as complete?
          </DialogPrimitive.Description>
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => { if (task) onConfirm(task); }}
              className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Mark Complete
            </button>
          </div>
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

/* ── seed comment data for mock tasks ── */

const CURRENT_USER = { name: 'Wade Warren', initials: 'WW' };

const SEED_TEXTS = [
  'Following up on this — please check the latest updates.',
  'Client has been notified. Waiting on their response.',
  'Documents received and reviewed. No issues found.',
  'Priority escalated based on client feedback.',
  'Blocked pending approval from management.',
  'All materials have been uploaded to the portal.',
  'Deadline confirmed with the client.',
  'Need additional information before proceeding.',
  'Reassigned as per team lead request.',
  'Status updated after team sync call.',
  'Client confirmed receipt of all documents.',
  'Invoice discrepancy noted — checking with accounts.',
  'First draft completed and sent for review.',
  'Feedback incorporated. Ready for final sign-off.',
];

function seedComments(allTasks: typeof MOCK_TASKS): Record<string, TaskComment[]> {
  const map: Record<string, TaskComment[]> = {};
  // base timestamp: Aug 3 2026, noon UTC
  const base = new Date('2026-08-03T12:00:00Z').getTime();

  for (const task of allTasks) {
    if (task.comments === 0) continue;
    const list: TaskComment[] = [];
    for (let i = 0; i < task.comments; i++) {
      // oldest first — spread over the last N days
      const offsetMs = (task.comments - i) * 6 * 60 * 60 * 1000; // every 6h apart
      const createdAt = new Date(base - offsetMs);
      // alternate between assignee (if any) and current user
      const useAssignee = i % 2 === 0 && task.assignee;
      const author   = useAssignee ? task.assignee!.name    : CURRENT_USER.name;
      const initials = useAssignee ? task.assignee!.initials : CURRENT_USER.initials;
      list.push({
        id:       `${task.id}-seed-${i}`,
        author,
        initials,
        text:     SEED_TEXTS[i % SEED_TEXTS.length],
        createdAt,
      });
    }
    map[task.id] = list;
  }
  return map;
}

/* ── props ── */

interface Props {
  tasks:          TaskItem[];
  selectedIds:    Set<string>;
  onToggle:       (id: string) => void;
  onSelectAll:    () => void;
  onDelete:       (id: string) => void;
  onChangeAssignee?: (task: TaskItem) => void;
  sortKey:        SortKey;
  sortDir:        'asc' | 'desc';
  onSort:         (k: SortKey) => void;
  showProject?:   boolean;
  visibleColumns?: Set<TaskColumnKey>;
  columnOrder?:     TaskColumnKey[];
  onColumnReorder?: (order: TaskColumnKey[]) => void;
  onStatusChange?: (taskId: string, status: TaskStatus) => void;
}

export function TasksTable({
  tasks,
  selectedIds,
  onToggle,
  onSelectAll,
  onDelete,
  onChangeAssignee,
  sortKey,
  sortDir,
  onSort,
  showProject = true,
  visibleColumns,
  columnOrder,
  onColumnReorder,
  onStatusChange,
}: Props) {
  const sortProps = { currentKey: sortKey, currentDir: sortDir, onSort };
  const activeColumns = visibleColumns ?? DEFAULT_VISIBLE_TASK_COLUMNS;

  /* ── Drag-and-drop column order ── */
  const activeColumnOrder = columnOrder ?? TASK_COLUMN_OPTIONS.map(({ key }) => key);
  const orderedVisible = activeColumnOrder.filter(k =>
    activeColumns.has(k) && (k !== 'project' || showProject),
  );
  const dragKey = useRef<TaskColumnKey | null>(null);
  const [dropTarget, setDropTarget] = useState<TaskColumnKey | null>(null);

  function handleDragStart(key: TaskColumnKey) { dragKey.current = key; }
  function handleDragOver(e: React.DragEvent, key: TaskColumnKey) {
    e.preventDefault();
    if (dragKey.current && dragKey.current !== key) setDropTarget(key);
  }
  function handleDrop(key: TaskColumnKey) {
    if (!dragKey.current || dragKey.current === key) { setDropTarget(null); return; }
    const from = dragKey.current;
    const next = [...activeColumnOrder];
    const fromIdx = next.indexOf(from);
    const toIdx   = next.indexOf(key);
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, from);
    onColumnReorder?.(next);
    dragKey.current = null;
    setDropTarget(null);
  }
  function handleDragEnd() { dragKey.current = null; setDropTarget(null); }

  const TASK_SORT_MAP: Partial<Record<TaskColumnKey, SortKey>> = {
    project: 'project', assignee: 'assignee', dueDate: 'dueDate', status: 'status',
  };
  const TASK_COL_LABEL: Record<TaskColumnKey, string> = Object.fromEntries(
    TASK_COLUMN_OPTIONS.map(({ key: k, label }) => [k, label]),
  ) as Record<TaskColumnKey, string>;

  function renderTaskHeader(key: TaskColumnKey) {
    const isDrop   = dropTarget === key;
    const sortable = TASK_SORT_MAP[key];
    const label    = key === 'tags' ? '' : TASK_COL_LABEL[key];
    return (
      <TableHead
        key={key}
        draggable
        onDragStart={() => handleDragStart(key)}
        onDragOver={e => handleDragOver(e, key)}
        onDrop={() => handleDrop(key)}
        onDragEnd={handleDragEnd}
        className={cn('group select-none transition-colors', isDrop && 'border-l-2 border-brand bg-orange-50/60')}
      >
        <div className="flex min-w-max items-center gap-1.5">
          {sortable ? (
            <button
              type="button"
              onClick={() => onSort(sortable)}
              className={cn(
                'flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
                sortKey === sortable ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
              )}
            >
              <span className="whitespace-nowrap">{label}</span>
              {sortKey === sortable
                ? sortDir === 'asc'
                  ? <ArrowUp size={11} className="text-brand" />
                  : <ArrowDown size={11} className="text-brand" />
                : <ArrowUpDown size={11} className="opacity-40" />}
            </button>
          ) : (
            <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              {label}
            </span>
          )}
          <GripVertical size={13} aria-hidden="true"
            className="ml-auto flex-shrink-0 cursor-grab text-gray-300 opacity-60 transition-colors group-hover:text-brand group-hover:opacity-100 active:cursor-grabbing" />
        </div>
      </TableHead>
    );
  }

  function renderTaskCell(key: TaskColumnKey, task: TaskItem) {
    const dueFmt       = new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const dueIndicator = getDueDateIndicator(task.dueDate, task.status);
    const projectLabel = task.projects.map(p => p.title).join(', ');
    const tag          = getTag(task.id);
    const hasTags      = Boolean(tag.priority);
    switch (key) {
      case 'project': return (
        <TableCell key={key} className="py-3">
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block max-w-[220px] cursor-default truncate whitespace-nowrap text-[12px] leading-snug text-gray-700">{projectLabel}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">{projectLabel}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </TableCell>
      );
      case 'assignee': return (
        <TableCell key={key} className="py-3">
          <TooltipProvider delayDuration={150}>
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="block max-w-[100px] cursor-default truncate text-[12px] text-gray-700">{task.assignee.name}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">{task.assignee.name}</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-default items-center gap-2">
                      <div className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 ring-[1.5px] ring-white">
                        <UserRound size={11} className="text-gray-400" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">Unassigned</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        </TableCell>
      );
      case 'reassignmentNote': return (
        <TableCell key={key} className="py-3">
          {task.reassignmentNote ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block max-w-[160px] cursor-default truncate whitespace-nowrap text-[12px] text-gray-600">{task.reassignmentNote}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[320px] whitespace-normal break-words rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">{task.reassignmentNote}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className="text-[12px] text-gray-300">—</span>
          )}
        </TableCell>
      );
      case 'dueDate': return (
        <TableCell key={key} className="py-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] text-gray-700">{dueFmt}</span>
            {dueIndicator && (
              <span className={cn('w-fit rounded-full px-2 py-[2px] text-[10.5px] font-medium whitespace-nowrap', dueIndicator.cls)}>{dueIndicator.text}</span>
            )}
          </div>
        </TableCell>
      );
      case 'status': return (
        <TableCell key={key} className="py-3">
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-[3px] text-[11.5px] font-medium leading-tight whitespace-nowrap', STATUS_CHIP[task.status])}>
            {task.status}
          </span>
        </TableCell>
      );
      case 'timeSpent': return (
        <TableCell key={key} className="py-3">
          <span className="text-[12px] font-medium text-gray-600">{fmtTime(task.timeSpentSeconds)}</span>
        </TableCell>
      );
      case 'timer': return (
        <TableCell key={key} className="py-3">
          <RowTimer
            taskId={task.id}
            taskName={task.name}
            taskStatus={task.status}
            baseSeconds={task.timeSpentSeconds}
            projectName={task.projects[0]?.title ?? ''}
            onStatusAdvance={() => onStatusChange?.(task.id, 'In Progress')}
            onStatusSet={(status) => onStatusChange?.(task.id, status)}
          />
        </TableCell>
      );
      case 'comments': return (
        <TableCell key={key} className="py-3">
          {(() => {
            const count    = (commentsMap[task.id] ?? []).length;
            const lastSeen = lastSeenMap[task.id] ?? 0;
            const hasNew   = count > lastSeen;
            return (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => openDrawerFor(task.id)}
                      className="relative flex items-center gap-1 text-gray-500 hover:text-brand transition-colors"
                    >
                      {hasNew && (
                        <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-60" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                        </span>
                      )}
                      <MessageSquare size={13} className="flex-shrink-0" />
                      <span className="text-[12px] font-medium">{count}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                    {hasNew
                      ? `${count - lastSeen} new comment${count - lastSeen !== 1 ? 's' : ''}`
                      : count === 0 ? 'Add a comment' : `View ${count} comment${count !== 1 ? 's' : ''}`
                    }
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })()}
        </TableCell>
      );
      case 'tags': return (
        <TableCell key={key} className="py-3">
          <div className="flex items-center gap-1.5">
            {tag.priority && (
              <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold leading-tight uppercase', TAG_BADGE[tag.priority])}>
                {tag.priority.toUpperCase()}
              </span>
            )}
            <button
              onClick={() => setOpenTagId(task.id)}
              className="group flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-1 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-brand hover:text-brand whitespace-nowrap"
            >
              {hasTags
                ? <Pencil size={10} className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-brand" />
                : <Tag    size={10} className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-brand" />
              }
              {hasTags ? 'Edit Tags' : 'Add Tags'}
            </button>
          </div>
        </TableCell>
      );
      case 'action': return (
        <TableCell key={key} className="py-3 pr-3">
          {task.status === 'On Hold' ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => setResumeTask({ id: task.id, name: task.name })} aria-label="Resume task"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-brand hover:text-brand">
                    <PlayCircle size={15} strokeWidth={1.8} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6} className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">Resume</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : task.status === 'Done' ? (
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => setIncompleteTask({ id: task.id, name: task.name })} aria-label="Mark as Incomplete"
                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:border-brand hover:text-brand">
                    <Circle size={15} strokeWidth={1.8} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6} className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">Mark as Incomplete</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : task.status === 'Archived' ? null : (
            <ActionMenu
              taskName={task.name}
              onDelete={() => setDeleteTask({ id: task.id, name: task.name })}
              onChangeAssignee={() => onChangeAssignee?.(task)}
              onMarkComplete={() => setCompleteTask({ id: task.id, name: task.name })}
            />
          )}
        </TableCell>
      );
      default: return null;
    }
  }

  const selectColumnWeight = 4;
  const taskColumnWeight = 18;
  const visibleColumnWeight = TASK_COLUMN_OPTIONS.reduce(
    (total, { key }) => total + (
      activeColumns.has(key) && (key !== 'project' || showProject)
        ? TASK_COLUMN_WEIGHTS[key]
        : 0
    ),
    selectColumnWeight + taskColumnWeight,
  );
  const columnWidth = (weight: number) => `${(weight / visibleColumnWeight) * 100}%`;

  /* per-row tag state */
  const [taskTags,   setTaskTags]   = useState<Record<string, TaskTagEntry>>({});
  const [openTagId,  setOpenTagId]  = useState<string | null>(null);
  const [deleteTask, setDeleteTask] = useState<{ id: string; name: string } | null>(null);
  const [incompleteTask, setIncompleteTask] = useState<{ id: string; name: string } | null>(null);
  const [completeTask, setCompleteTask] = useState<{ id: string; name: string } | null>(null);
  const [resumeTask, setResumeTask] = useState<{ id: string; name: string } | null>(null);

  function getTag(id: string): TaskTagEntry {
    return taskTags[id] ?? { priority: '' };
  }
  function saveTag(id: string, priority: TaskPriorityTag) {
    setTaskTags(prev => ({ ...prev, [id]: { priority } }));
  }

  /* comment state — render deterministic seed first, then hydrate from localStorage */
  const [commentsMap, setCommentsMap] = useState<Record<string, TaskComment[]>>(
    () => seedComments(MOCK_TASKS),
  );
  const [commentsHydrated, setCommentsHydrated] = useState(false);
  const [openCommentTaskId, setOpenCommentTaskId] = useState<string | null>(null);

  /* Load saved comments after mount so the first client render matches the server. */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fh_task_comments');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Array<Omit<TaskComment, 'createdAt'> & { createdAt: string }>>;
        const saved = Object.fromEntries(
          Object.entries(parsed).map(([k, v]) => [
            k,
            v.map(c => ({ ...c, createdAt: new Date(c.createdAt) })),
          ]),
        );
        setCommentsMap(prev => ({ ...prev, ...saved }));
      }
    } catch {}
    setCommentsHydrated(true);
  }, []);

  /* Persist only after the saved state has been loaded. */
  useEffect(() => {
    if (!commentsHydrated) return;
    try {
      const serializable = Object.fromEntries(
        Object.entries(commentsMap).map(([k, v]) => [
          k,
          v.map(c => ({ ...c, createdAt: c.createdAt.toISOString() })),
        ])
      );
      localStorage.setItem('fh_task_comments', JSON.stringify(serializable));
    } catch {}
  }, [commentsMap, commentsHydrated]);

  /* last-seen comment counts — persisted to localStorage so badges survive page reload */
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, number>>({});

  /* Load last-seen counts after mount (two-phase, matching comments hydration pattern). */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('fh_task_comments_seen');
      if (raw) setLastSeenMap(JSON.parse(raw) as Record<string, number>);
    } catch {}
  }, []);

  /* open drawer + mark comments as seen for that task */
  function openDrawerFor(taskId: string) {
    setOpenCommentTaskId(taskId);
    const count = (commentsMap[taskId] ?? []).length;
    setLastSeenMap(prev => {
      const next = { ...prev, [taskId]: count };
      try { localStorage.setItem('fh_task_comments_seen', JSON.stringify(next)); } catch {}
      return next;
    });
  }

  /* also mark as seen whenever the open drawer receives new comments */
  useEffect(() => {
    if (!openCommentTaskId) return;
    const count = (commentsMap[openCommentTaskId] ?? []).length;
    setLastSeenMap(prev => {
      if (prev[openCommentTaskId] === count) return prev;
      const next = { ...prev, [openCommentTaskId]: count };
      try { localStorage.setItem('fh_task_comments_seen', JSON.stringify(next)); } catch {}
      return next;
    });
  }, [openCommentTaskId, commentsMap]);

  const openCommentTask = tasks.find(t => t.id === openCommentTaskId)
    ?? MOCK_TASKS.find(t => t.id === openCommentTaskId)
    ?? null;

  function addComment(taskId: string, text: string) {
    const next: TaskComment = {
      id:        `${taskId}-u-${Date.now()}`,
      author:    CURRENT_USER.name,
      initials:  CURRENT_USER.initials,
      text,
      createdAt: new Date(),
    };
    setCommentsMap(prev => ({
      ...prev,
      [taskId]: [...(prev[taskId] ?? []), next],
    }));
    toast.success('Comment added');
  }

  return (
    <>
    <div className="min-w-0 overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 bg-white shadow-sm">
      <Table className="w-full min-w-[1220px] table-auto">

        <TableHeader className="whitespace-nowrap">
          <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">

            {/* Select-all checkbox */}
            <TableHead className="w-10 pl-4">
              {(() => {
                const allSelected = tasks.length > 0 && tasks.every(task => selectedIds.has(task.id));
                const someSelected = !allSelected && tasks.some(task => selectedIds.has(task.id));

                return (
                  <button
                    type="button"
                    onClick={onSelectAll}
                    aria-label={allSelected ? 'Deselect all tasks' : 'Select all tasks'}
                    aria-checked={someSelected ? 'mixed' : allSelected}
                    role="checkbox"
                    className={cn(
                      'flex h-[13px] w-[13px] items-center justify-center rounded-[3px] border transition-colors',
                      allSelected
                        ? 'border-brand bg-brand'
                        : someSelected
                          ? 'border-brand bg-brand/20'
                          : 'border-gray-300 bg-white hover:border-brand/60',
                    )}
                  >
                    {allSelected && <Check size={8} className="text-white" strokeWidth={3} />}
                    {someSelected && !allSelected && (
                      <span className="block h-[2px] w-[7px] rounded-full bg-brand" />
                    )}
                  </button>
                );
              })()}
            </TableHead>

            {/* Task */}
            <TableHead className="min-w-[200px]">
              <SortableHead label="Task" sortKey="name" {...sortProps} />
            </TableHead>

            {orderedVisible.map(k => renderTaskHeader(k))}

          </TableRow>
        </TableHeader>

        <TableBody>
          {tasks.map(task => {
            const isSelected = selectedIds.has(task.id);

            return (
              <TableRow
                key={task.id}
                className={cn(
                  'border-b border-gray-100 transition-colors',
                  isSelected ? 'bg-brand/5 hover:bg-brand/[0.07]' : 'hover:bg-gray-50/70',
                )}
              >

                {/* Checkbox */}
                <TableCell className="pl-4 py-3 w-10">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onToggle(task.id); }}
                    aria-checked={isSelected}
                    role="checkbox"
                    className={cn(
                      'flex h-[13px] w-[13px] flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors',
                      isSelected
                        ? 'border-brand bg-brand'
                        : 'border-gray-300 bg-white hover:border-brand/60',
                    )}
                  >
                    {isSelected && <Check size={8} className="text-white" strokeWidth={3} />}
                  </button>
                </TableCell>

                {/* Task name */}
                <TableCell className="py-3">
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="block max-w-[220px] cursor-default truncate whitespace-nowrap text-[13px] font-semibold leading-snug text-gray-900">
                          {task.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                        {task.name}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>

                {orderedVisible.map(k => renderTaskCell(k, task))}


              </TableRow>
            );
          })}
        </TableBody>

      </Table>

      {/* ── one tags dialog per task ── */}
      {tasks.map(task => {
        const tag = getTag(task.id);
        return (
          <TaskTagsDialog
            key={task.id}
            open={openTagId === task.id}
            onClose={() => setOpenTagId(null)}
            onSave={priority => saveTag(task.id, priority)}
            taskName={task.name}
            initial={tag}
          />
        );
      })}
    </div>

    {/* ── Comments drawer — outside scroll container so it overlays correctly ── */}
    <TaskCommentsDrawer
      open={openCommentTaskId !== null}
      onClose={() => setOpenCommentTaskId(null)}
      taskName={openCommentTask?.name ?? ''}
      comments={openCommentTaskId ? (commentsMap[openCommentTaskId] ?? []) : []}
      onAdd={text => {
        if (openCommentTaskId) addComment(openCommentTaskId, text);
      }}
    />

    <DeleteTaskDialog
      task={deleteTask}
      onClose={() => setDeleteTask(null)}
      onConfirm={({ id, name }) => {
        onDelete(id);
        setDeleteTask(null);
        toast.success(`"${name}" deleted`, {
          description: 'The task was removed successfully.',
          duration: 5000,
        });
      }}
    />

    <MarkIncompleteDialog
      task={incompleteTask}
      onClose={() => setIncompleteTask(null)}
      onConfirm={({ id, name }) => {
        onStatusChange?.(id, 'To Do');
        setIncompleteTask(null);
        toast.success(`"${name}" marked incomplete`);
      }}
    />

    <ResumeTaskDialog
      task={resumeTask}
      onClose={() => setResumeTask(null)}
      onConfirm={({ id, name }) => {
        onStatusChange?.(id, 'In Progress');
        setResumeTask(null);
        toast.success(`"${name}" resumed`, {
          description: 'The task is now in progress.',
          duration: 3500,
        });
      }}
    />

    <MarkCompleteDialog
      task={completeTask}
      onClose={() => setCompleteTask(null)}
      onConfirm={({ id, name }) => {
        onStatusChange?.(id, 'Done');
        setCompleteTask(null);
        toast.success(`"${name}" marked complete`);
      }}
    />
    </>
  );
}
