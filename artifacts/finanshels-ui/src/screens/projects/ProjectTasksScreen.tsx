'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  Search, Download, SlidersHorizontal, X, CirclePause, PlayCircle, Trash2, Columns3, Check,
  Home, Users2, CalendarDays, Banknote, CheckCircle2, ListTodo,
  Tag, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { MOCK_TASKS, type TaskItem, type TaskPriority, type TaskStatus } from '../tasks/mock-data';
import { MOCK_PROJECTS, type Project, type ProjectStatus } from './mock-data';
import {
  TaskFilterDrawer, EMPTY_TASK_FILTERS, countActiveTaskFilters, type TaskFilterState,
} from '../tasks/TaskFilterDrawer';
import {
  TasksTable,
  TASK_COLUMN_OPTIONS,
  type SortKey,
  type TaskColumnKey,
} from '../tasks/TasksTable';
import { ProjectsPagination } from './ProjectsPagination';
import { TaskBulkActionBar } from '../tasks/TaskBulkActionBar';
import { ChangeTaskStatusDrawer } from '../tasks/ChangeTaskStatusDrawer';
import { TaskEditDeadlineDrawer } from '../tasks/TaskEditDeadlineDrawer';
import { TaskReassignDrawer } from '../tasks/TaskReassignDrawer';
import {
  AddTagsDialog, type PriorityValue, type SeverityValue,
} from './AddTagsDialog';
import { ActiveFilterChips, type ActiveFilterChip } from '@/components/ActiveFilterChips';

/* ── Tag badge maps (same as ProjectCard) ── */
const PRIORITY_BADGE: Record<string, string> = {
  p0: 'bg-red-100    text-red-500',
  p1: 'bg-orange-100 text-orange-600',
  p2: 'bg-amber-100  text-amber-600',
  p3: 'bg-green-100  text-green-600',
};
const SEVERITY_BADGE: Record<string, string> = {
  s1: 'bg-purple-100 text-purple-600',
  s2: 'bg-blue-100   text-blue-600',
};

const PROJECT_TASK_COLUMN_OPTIONS = TASK_COLUMN_OPTIONS.filter(({ key }) => key !== 'project');
const PRIORITY_LABEL: Record<string, string> = { p0: 'P0 — Critical', p1: 'P1 — High', p2: 'P2 — Medium', p3: 'P3 — Low' };
const SEVERITY_LABEL: Record<string, string> = { s1: 'S1 — High Severity', s2: 'S2 — Low Severity' };

/* ── Project detail card ── */

const STATUS_CHIP: Record<ProjectStatus, { label: string; dotCls: string; chipCls: string }> = {
  Current:   { label: 'Current',   dotCls: 'bg-emerald-400', chipCls: 'border-emerald-200 bg-emerald-50 text-emerald-700'  },
  Overdue:   { label: 'Overdue',   dotCls: 'bg-red-400',     chipCls: 'border-red-200 bg-red-50 text-red-600'              },
  'On Hold': { label: 'On Hold',   dotCls: 'bg-amber-400',   chipCls: 'border-amber-200 bg-amber-50 text-amber-700'        },
  Completed: { label: 'Completed', dotCls: 'bg-teal-400',    chipCls: 'border-teal-200 bg-teal-50 text-teal-700'           },
  Archived:  { label: 'Archived',  dotCls: 'bg-gray-300',    chipCls: 'border-gray-200 bg-gray-100 text-gray-600'          },
};

/* Circular project progress indicator */
function ProgressRing({ pct }: { pct: number }) {
  const r = 29;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width="78" height="78" viewBox="0 0 78 78" className="-rotate-90">
      <circle cx="39" cy="39" r={r} fill="none" stroke="#f3f4f6" strokeWidth="6" />
      <circle
        cx="39"
        cy="39"
        r={r}
        fill="none"
        stroke="url(#ringGrad)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#fb923c" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function ProjectDetailCard({ project }: { project: Project }) {
  const chip      = STATUS_CHIP[project.status];

  const [tagsOpen,  setTagsOpen]  = useState(false);
  const [priority,  setPriority]  = useState<PriorityValue>('');
  const [severity,  setSeverity]  = useState<SeverityValue>('');
  const hasTags = Boolean(priority || severity);

  /* ── Comparison shown in the supplied card reference ── */
  const sevenDayDelta = '22%';

  const SevenDayComparison = () => (
    <div className="mt-2 flex items-center gap-1 text-[11px] leading-4">
      <span aria-hidden="true" className="text-[9px] text-emerald-500">▲</span>
      <span className="font-semibold text-emerald-600">{sevenDayDelta}</span>
      <span className="text-gray-400">from previous 7 days</span>
    </div>
  );

  return (
    <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-4">

      {/* ═══════════════════════════════════════════════
          Hero panel
      ═══════════════════════════════════════════════ */}
      <div className="relative h-full overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm sm:col-span-2">

        <div className="p-6">
          {/* Header row: title + status chip */}
          <div className="relative min-h-[76px]">
            <div className="min-w-0 pr-[90px]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Project</p>
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="min-w-0 truncate text-[19px] font-bold leading-snug text-gray-900">
                  {project.title}
                </h2>
                <span className={cn(
                  'flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                  chip.chipCls,
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', chip.dotCls)} />
                  {chip.label}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1.5">
                  <Home size={11} className="text-gray-400 flex-shrink-0" />
                  <span className="text-[12px] text-gray-500">{project.client.name}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Users2 size={11} className="text-gray-400 flex-shrink-0" />
                  <span className="text-[12px] text-gray-500">{project.serviceType.label}</span>
                </span>
              </div>
            </div>
            <div className="absolute right-0 top-0 h-[78px] w-[78px]">
              <ProgressRing pct={project.progress} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="flex flex-col items-center leading-none">
                  <span className="text-[18px] font-semibold tracking-tight text-gray-900">{project.progress}%</span>
                  <span className="mt-1 text-[7px] font-medium uppercase tracking-[0.16em] text-gray-400">Done</span>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="mt-5 border-t border-gray-100" />

          {/* Meta grid: account manager · team lead · assignees · tags */}
          <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Account Manager</p>
              <p className="text-[12.5px] font-medium leading-5 text-gray-800">
                {project.accountManager?.name ?? 'Unassigned'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Team Lead</p>
              <p className="text-[12.5px] font-medium leading-5 text-gray-800">
                {project.teamLeads.length > 0
                  ? project.teamLeads.map(m => m.name).join(', ')
                  : (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">Unassigned</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                          Unassigned
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Assignees</p>
              <p className="text-[12.5px] font-medium leading-5 text-gray-800">
                {project.assignees.length > 0
                  ? project.assignees.map(m => m.name).join(', ')
                  : (
                    <TooltipProvider delayDuration={150}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-default">Unassigned</span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                          Unassigned
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Tags</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {priority && (
                  <span title={PRIORITY_LABEL[priority]}
                    className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', PRIORITY_BADGE[priority])}>
                    {priority.toUpperCase()}
                  </span>
                )}
                {severity && (
                  <span title={SEVERITY_LABEL[severity]}
                    className={cn('rounded-md px-2 py-0.5 text-[11px] font-medium', SEVERITY_BADGE[severity])}>
                    {severity.toUpperCase()}
                  </span>
                )}
                <button
                  onClick={() => setTagsOpen(true)}
                  className="group flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-brand hover:text-brand"
                >
                  {hasTags
                    ? <Pencil size={10} className="text-gray-500 group-hover:text-brand transition-colors" />
                    : <Tag    size={10} className="text-gray-500 group-hover:text-brand transition-colors" />
                  }
                  {hasTags ? 'Edit' : 'Add Tags'}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Tags dialog — outside hero so portals don't bubble */}
      <AddTagsDialog
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        onSave={(p, s) => { setPriority(p); setSeverity(s); }}
        projectTitle={project.title}
        initialPriority={priority}
        initialSeverity={severity}
      />

      {/* ═══════════════════════════════════════
          Right section — 2×2 compact stat grid
      ═══════════════════════════════════════ */}
      <div className="grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-3 sm:col-span-2">

        {/* ── Total Tasks ── */}
        <div className="h-full rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-400">Total Tasks</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
              <ListTodo size={13} className="text-gray-500" />
            </span>
          </div>
          <p className="text-[22px] font-bold leading-snug text-gray-900">
            {project.tasksTotal}
          </p>
          <SevenDayComparison />
        </div>

        {/* ── Completed ── */}
        <div className="h-full rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-400">Completed</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 size={13} className="text-emerald-500" />
            </span>
          </div>
          <p className="text-[22px] font-bold leading-snug text-gray-900">
            {project.tasksCompleted}
          </p>
          <SevenDayComparison />
        </div>

        {/* ── Revenue ── */}
        {project.revenue != null && project.invoiceType ? (
          <div className="h-full rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-400">
                {project.invoiceType === 'bundled' ? 'Internal Revenue' : 'Main Revenue'}
              </p>
              <span className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg',
                project.invoiceType === 'bundled' ? 'bg-violet-50' : 'bg-emerald-50',
              )}>
                <Banknote size={13} className={project.invoiceType === 'bundled' ? 'text-violet-500' : 'text-emerald-500'} />
              </span>
            </div>
            <p className="text-[22px] font-bold leading-snug text-gray-900">
              AED {project.revenue.toLocaleString()}
            </p>
            <SevenDayComparison />
          </div>
        ) : (
          <div className="h-full rounded-2xl border border-dashed border-gray-200 bg-gray-50/40 px-4 py-3.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Revenue</p>
            <p className="text-[14px] text-gray-400">Not set</p>
          </div>
        )}

        {/* ── Due Date ── */}
        <div className="h-full rounded-2xl border border-gray-100 bg-white px-4 py-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-400">Due Date</p>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50">
              <CalendarDays size={13} className="text-sky-500" />
            </span>
          </div>
          <p className="text-[22px] font-bold leading-snug text-gray-900">
            {project.dueDate}
          </p>
        </div>

      </div>
    </div>
  );
}

/* ── constants ── */

const DEFAULT_PAGE_SIZE = 20;

type StatusView =
  | 'All' | 'Overdue' | 'Today' | 'Next 30 days'
  | 'Completed' | 'Upcoming' | 'On Hold' | 'Archived';

const STATUSES: Array<{ value: StatusView; label: string }> = [
  { value: 'All',          label: 'All Status'   },
  { value: 'Overdue',      label: 'Overdue'      },
  { value: 'Today',        label: 'Today'        },
  { value: 'Next 30 days', label: 'Next 30 Days' },
  { value: 'Completed',    label: 'Completed'    },
  { value: 'Upcoming',     label: 'Upcoming'     },
  { value: 'On Hold',      label: 'On Hold'      },
  { value: 'Archived',     label: 'Archived'     },
];

const PRIORITY_ORDER: Record<TaskPriority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_ORDER = {
  Overdue: 0, 'In Progress': 1, 'To Do': 2, Done: 3, 'On Hold': 4, Archived: 5,
} as Record<string, number>;

function matchesStatusView(task: { status: string; dueDate: string }, view: StatusView): boolean {
  if (view === 'All') return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
  const days  = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  switch (view) {
    case 'Overdue':      return task.status !== 'Done' && task.status !== 'Archived' && days < 0;
    case 'Today':        return days === 0 && task.status !== 'Done' && task.status !== 'Archived';
    case 'Next 30 days': return days >= 1 && days <= 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'Completed':    return task.status === 'Done';
    case 'Upcoming':     return days > 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'On Hold':      return task.status === 'On Hold';
    case 'Archived':     return task.status === 'Archived';
    default:             return true;
  }
}

function projectDueDate(dueDate: string): string {
  const parsed = new Date(dueDate.replace(/^Due\s+/i, ''));
  return Number.isNaN(parsed.getTime()) ? '2026-12-31' : parsed.toISOString().slice(0, 10);
}

function buildProjectTaskList(project: (typeof MOCK_PROJECTS)[number]): TaskItem[] {
  const linkedTasks = MOCK_TASKS.filter(task =>
    task.projects.some(taskProject => taskProject.id === project.id),
  );

  const tasks = linkedTasks.slice(0, project.tasksTotal);
  const additionalCount = Math.max(0, project.tasksTotal - tasks.length);
  const linkedCompletedCount = tasks.filter(task => task.status === 'Done').length;
  const additionalCompletedCount = Math.max(
    0,
    Math.min(additionalCount, project.tasksCompleted - linkedCompletedCount),
  );
  const dueDate = projectDueDate(project.dueDate);
  const assignee = project.assignees[0]
    ? { initials: project.assignees[0].initials, name: project.assignees[0].name }
    : null;

  for (let index = 0; index < additionalCount; index += 1) {
    tasks.push({
      id: `${project.id}-task-${index + 1}`,
      name: `${project.title} — Task ${index + 1}`,
      projects: [{
        id: project.id,
        title: project.title,
        clientName: project.client.name,
        clientColor: project.client.color,
      }],
      assignee,
      status: index < additionalCompletedCount ? 'Done' : 'To Do',
      priority: 'Medium',
      dueDate,
      timeSpentSeconds: 0,
      comments: 0,
    });
  }

  return tasks;
}

/* ── screen ── */

export function ProjectTasksScreen() {
  /* read project ID from the route */
  const params = useParams();
  const projectId = (params?.id as string) ?? '';

  /* resolve project metadata */
  const project = MOCK_PROJECTS.find(p => p.id === projectId);
  const projectTitle = project?.title ?? (projectId ? `Project ${projectId}` : '');

  /* base task list scoped to this project */
  const baseTasks = useMemo(
    () => (project ? buildProjectTaskList(project) : []),
    [project],
  );

  /* search + status */
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusView>('All');
  const statusIsFiltered   = status !== 'All';
  const activeStatusLabel  = statusIsFiltered
    ? (STATUSES.find(s => s.value === status)?.label ?? status)
    : 'All Status';

  /* sort */
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  function handleSort(key: SortKey) {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  }

  const [visibleColumns, setVisibleColumns] = useState<Set<TaskColumnKey>>(
    () => new Set(PROJECT_TASK_COLUMN_OPTIONS.map(({ key }) => key)),
  );

  function toggleColumn(column: TaskColumnKey) {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  }

  function toggleAllColumns() {
    setVisibleColumns(prev =>
      prev.size === PROJECT_TASK_COLUMN_OPTIONS.length
        ? new Set<TaskColumnKey>()
        : new Set(PROJECT_TASK_COLUMN_OPTIONS.map(({ key }) => key)),
    );
  }

  /* pagination + selection */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TaskStatus>>({});
  const [changeStatusDrawerOpen, setChangeStatusDrawerOpen] = useState(false);
  const [holdDialogOpen, setHoldDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [holdResumeReason, setHoldResumeReason] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDeadlineOpen, setEditDeadlineOpen] = useState(false);
  const [reassignDrawerOpen, setReassignDrawerOpen] = useState(false);
  const [reassignTask, setReassignTask] = useState<TaskItem | null>(null);

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function clearSelection() { setSelectedIds(new Set()); }

  function handleDeleteTask(id: string) {
    setDeletedTaskIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setDeleteDialogOpen(true);
  }

  function handleBulkDeleteConfirmed() {
    const ids = new Set(selectedIds);
    const count = ids.size;
    const noun  = count === 1 ? 'task' : 'tasks';

    setDeletedTaskIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      return next;
    });
    clearSelection();

    toast.success(`${count} ${noun} deleted`, {
      description: `The selected ${noun} ${count === 1 ? 'has' : 'have'} been removed.`,
      duration: 5000,
    });
  }

  function handleChangeStatus(newStatus: TaskStatus) {
    const count = selectedIds.size;
    if (count === 0) return;
    setStatusOverrides(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => { next[id] = newStatus; });
      return next;
    });
    setChangeStatusDrawerOpen(false);
    clearSelection();
    toast.success(`${count} ${count === 1 ? 'task' : 'tasks'} updated`, {
      description: `Status updated to ${newStatus}.`,
      duration: 3500,
    });
  }

  function handleHoldConfirmed() {
    const count = selectedIds.size;
    if (count === 0 || !holdResumeReason.trim()) return;
    setStatusOverrides(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => { next[id] = 'On Hold'; });
      return next;
    });
    setHoldDialogOpen(false);
    setHoldResumeReason('');
    clearSelection();
    toast.success(`${count} ${count === 1 ? 'task' : 'tasks'} put on hold`, {
      description: `Reason: ${holdResumeReason.trim()}`,
      duration: 3500,
    });
  }

  function handleResumeConfirmed() {
    const count = selectedIds.size;
    if (count === 0 || !holdResumeReason.trim()) return;

    setStatusOverrides(prev => {
      const next = { ...prev };
      selectedIds.forEach(id => { next[id] = 'In Progress'; });
      return next;
    });
    setResumeDialogOpen(false);
    setHoldResumeReason('');
    clearSelection();
    toast.success(`${count} ${count === 1 ? 'task' : 'tasks'} resumed`, {
      description: `Reason: ${holdResumeReason.trim()}`,
      duration: 3500,
    });
  }

  /* apply status overrides to base tasks */
  const displayTasks = useMemo<TaskItem[]>(
    () => baseTasks.filter(task => !deletedTaskIds.has(task.id)).map(task => ({
      ...task,
      status: statusOverrides[task.id] ?? task.status,
    })),
    [baseTasks, deletedTaskIds, statusOverrides],
  );
  const selectedTasks = displayTasks.filter(t => selectedIds.has(t.id));
  const hasArchivedSelected = selectedTasks.some(task => task.status === 'Archived');
  const allSelectedOnHold = selectedTasks.length > 0
    && selectedTasks.every(task => task.status === 'On Hold');
  const statusCounts = STATUSES.reduce<Record<StatusView, number>>((counts, { value }) => {
    counts[value] = displayTasks.filter(task => matchesStatusView(task, value)).length;
    return counts;
  }, {} as Record<StatusView, number>);

  /* filter drawer */
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [pendingFilters,   setPendingFilters]    = useState<TaskFilterState>(EMPTY_TASK_FILTERS);
  const [appliedFilters,   setAppliedFilters]    = useState<TaskFilterState>(EMPTY_TASK_FILTERS);
  const filterActiveCount = countActiveTaskFilters(appliedFilters);

  /* reset page + selection on filter changes */
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [search, status, sortKey, sortDir, appliedFilters]);

  /* filtered + sorted list */
  const tasks = useMemo(() => {
    let list = [...displayTasks];

    list = list.filter(t => matchesStatusView(t, status));

    const q = search.trim().toLowerCase();
    if (q) list = list.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.projects.some(p => p.title.toLowerCase().includes(q)) ||
      (t.assignee?.name ?? '').toLowerCase().includes(q),
    );

    const af = appliedFilters;
    if (af.clients.length   > 0) list = list.filter(t => t.projects.some(p => af.clients.includes(p.clientName)));
    if (af.assignees.length > 0) list = list.filter(t => af.assignees.includes(t.assignee?.name ?? ''));

    if (af.dueDateFilter && af.dueDateFilter !== 'All dates') {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      list = list.filter(t => {
        const due  = new Date(t.dueDate);
        const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
        if (af.dueDateFilter === 'Today')        return days === 0;
        if (af.dueDateFilter === 'This Week')    return days >= 0 && days <= 7;
        if (af.dueDateFilter === 'This Month')   return days >= 0 && days <= 30;
        if (af.dueDateFilter === 'Custom Date Range') {
          const dueDate = t.dueDate;
          const startsAfterStart = !af.dueDateStart || dueDate >= af.dueDateStart;
          const endsBeforeEnd = !af.dueDateEnd || dueDate <= af.dueDateEnd;
          return startsAfterStart && endsBeforeEnd;
        }
        return true;
      });
    }

    const dir = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      switch (sortKey) {
        case 'name':     return dir * a.name.localeCompare(b.name);
        case 'project':  return dir * (a.projects[0]?.title ?? '').localeCompare(b.projects[0]?.title ?? '');
        case 'assignee': return dir * (a.assignee?.name ?? '').localeCompare(b.assignee?.name ?? '');
        case 'status':   return dir * ((STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
        case 'priority': return dir * (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
        case 'dueDate':  return dir * a.dueDate.localeCompare(b.dueDate);
        default:         return 0;
      }
    });

    return list;
  }, [search, status, sortKey, sortDir, appliedFilters, displayTasks]);

  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const activeFilterChips: ActiveFilterChip[] = [];
  const taskArrayChip = (
    key: keyof Pick<TaskFilterState, 'taskNames' | 'frequencies' | 'clients' | 'projectNames' | 'services' | 'assignees' | 'tags'>,
    label: string,
  ) => {
    const values = appliedFilters[key];
    if (values.length === 0) return;
    activeFilterChips.push({
      key,
      label,
      value: values.join(', '),
    });
  };
  taskArrayChip('taskNames', 'Task');
  taskArrayChip('frequencies', 'Frequency');
  taskArrayChip('clients', 'Client');
  taskArrayChip('projectNames', 'Project');
  taskArrayChip('services', 'Service');
  taskArrayChip('assignees', 'Assignee');
  taskArrayChip('tags', 'Tags');
  if (appliedFilters.dueDateFilter !== 'All dates') {
    activeFilterChips.push({ key: 'dueDateFilter', label: 'Due Date', value: appliedFilters.dueDateFilter });
  }
  if (appliedFilters.dueDateStart) {
    activeFilterChips.push({ key: 'dueDateStart', label: 'From', value: appliedFilters.dueDateStart });
  }
  if (appliedFilters.dueDateEnd) {
    activeFilterChips.push({ key: 'dueDateEnd', label: 'To', value: appliedFilters.dueDateEnd });
  }

  function removeTaskFilter(key: string) {
    const next = { ...appliedFilters };
    if (key === 'dueDateFilter') {
      next.dueDateFilter = 'All dates';
      next.dueDateStart = '';
      next.dueDateEnd = '';
    } else if (key === 'dueDateStart' || key === 'dueDateEnd') {
      next[key] = '';
    } else {
      next[key as keyof Pick<TaskFilterState, 'taskNames' | 'frequencies' | 'clients' | 'projectNames' | 'services' | 'assignees' | 'tags'>] = [];
    }
    setAppliedFilters(next);
    setPendingFilters(next);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-white px-4 pt-5 pb-10 sm:px-6 sm:pt-6">

      {/* ── Project detail card ── */}
      {project && <ProjectDetailCard project={project} />}

      {/* ── Hold / Delete reason banner ── */}
      {project && (project.status === 'On Hold' || project.status === 'Archived') && (() => {
        const stored =
          project.status === 'On Hold'
            ? (typeof window !== 'undefined' ? localStorage.getItem(`fh_hold_reason_${project.id}`) ?? '' : '')
            : (typeof window !== 'undefined' ? localStorage.getItem(`fh_delete_reason_${project.id}`) ?? '' : '');
        const note =
          stored ||
          (project.status === 'On Hold' ? (project.holdReason ?? '') : (project.deleteReason ?? ''));
        if (!note) return null;
        const isHold = project.status === 'On Hold';
        return (
          <div className={cn(
            'mb-5 flex items-start gap-3 rounded-xl border px-4 py-3.5',
            isHold ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-100',
          )}>
            <div className={cn(
              'mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
              isHold ? 'bg-amber-100' : 'bg-gray-200',
            )}>
              {isHold
                ? <CirclePause size={15} className="text-amber-600" />
                : <Trash2       size={15} className="text-gray-500" />
              }
            </div>
            <div className="min-w-0">
              <p className={cn(
                'mb-1 text-[11px] font-semibold uppercase tracking-widest',
                isHold ? 'text-amber-600' : 'text-gray-500',
              )}>
                {isHold ? 'Reason for Hold' : 'Reason for Deletion'}
              </p>
              <p className="text-[13px] leading-snug text-gray-700">{note}</p>
            </div>
          </div>
        );
      })()}

      {/* ── Page header ── */}
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">
          Tasks
        </h1>
        <p className="mt-0.5 text-[13px] text-gray-500 truncate max-w-xl">
          {projectTitle}
        </p>
      </div>

      {/* ── Status tabs ── */}
      <div className="-mx-4 mb-4 sm:-mx-6">
        <Tabs value={status} onValueChange={v => { setStatus(v as StatusView); setPage(1); }}>
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-gray-200 bg-transparent p-0 px-4 sm:px-6 overflow-x-auto flex-nowrap scrollbar-none">
            {STATUSES.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'relative shrink-0 rounded-none border-b-2 px-3.5 pb-3 pt-1 text-[13px] font-medium transition-colors focus-visible:ring-0 focus-visible:ring-offset-0',
                  'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                  value === status
                    ? 'border-brand text-brand'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {label}
                <span
                  className={cn(
                    'ml-1.5 inline-flex min-w-[20px] items-center justify-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                    value === status ? 'text-brand' : 'text-orange-500',
                  )}
                >
                  {statusCounts[value]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-[13px] placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              <X size={11} className="text-gray-600" />
            </button>
          )}
        </div>

        <div className="hidden flex-1 sm:block" />

        <div className="flex flex-wrap items-center gap-2">

          {/* Download */}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Download data"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50 hover:text-gray-800 focus:outline-none"
                >
                  <Download size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
              >
                Download Data
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Filters button */}
          <button
            onClick={() => { setPendingFilters(appliedFilters); setFilterDrawerOpen(true); }}
            className={cn(
              'relative flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium transition-colors focus:outline-none',
              filterActiveCount > 0
                ? 'border-brand text-brand hover:bg-orange-50/50'
                : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
            )}
          >
            <SlidersHorizontal size={13} className={filterActiveCount > 0 ? 'text-brand' : 'text-gray-500'} />
            Filters
            {filterActiveCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white leading-none">
                {filterActiveCount}
              </span>
            )}
          </button>

          {/* Columns */}
          <TooltipProvider delayDuration={150}>
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      aria-label="Select columns"
                      className={cn(
                        'flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium transition-colors focus:outline-none',
                        visibleColumns.size < PROJECT_TASK_COLUMN_OPTIONS.length
                          ? 'border-brand text-brand hover:bg-orange-50/50'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <Columns3
                        size={13}
                        className={visibleColumns.size < PROJECT_TASK_COLUMN_OPTIONS.length ? 'text-brand' : 'text-gray-500'}
                      />
                      Columns
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  sideOffset={6}
                  className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                >
                  Select Columns
                </TooltipContent>
              </Tooltip>
              <PopoverContent align="end" sideOffset={6} className="w-56 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
                <div className="flex items-center justify-between px-1 pb-1 pt-0.5">
                  <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400">
                    Columns
                  </span>
                </div>
                <button
                  type="button"
                  onClick={toggleAllColumns}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-[7px] text-left text-[13px] font-medium transition-colors outline-none',
                    visibleColumns.size === PROJECT_TASK_COLUMN_OPTIONS.length
                      ? 'bg-orange-50 text-brand'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  Select All
                  {visibleColumns.size === PROJECT_TASK_COLUMN_OPTIONS.length && (
                    <Check size={14} className="flex-shrink-0 text-brand" />
                  )}
                </button>
                <div className="my-1 border-t border-gray-100" />
                {/* Pinned required column */}
                <button
                  type="button"
                  disabled
                  className="flex w-full cursor-not-allowed items-center gap-2 rounded-md px-2 py-2 text-left text-[12.5px] text-gray-400"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded border border-brand bg-brand text-white">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Task
                  <span className="ml-auto text-[10px] text-gray-400">Required</span>
                </button>
                {PROJECT_TASK_COLUMN_OPTIONS.map(({ key, label }) => {
                  const checked = visibleColumns.has(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => toggleColumn(key)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-[12.5px] text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      <span className={cn(
                        'flex h-4 w-4 items-center justify-center rounded border',
                        checked ? 'border-brand bg-brand text-white' : 'border-gray-300 bg-white',
                      )}>
                        {checked && <Check size={11} strokeWidth={3} />}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </TooltipProvider>

        </div>
      </div>

      <ActiveFilterChips
        chips={activeFilterChips}
        onRemove={removeTaskFilter}
        onClearAll={() => {
          setAppliedFilters(EMPTY_TASK_FILTERS);
          setPendingFilters(EMPTY_TASK_FILTERS);
          setPage(1);
        }}
      />

      {/* ── Task table ── */}
      {tasks.length === 0 ? (
        search.trim() || filterActiveCount > 0 || statusIsFiltered ? (
          <Empty
            icon={Search}
            title="No tasks found"
            description="Try adjusting your search or filters to find what you're looking for."
            className="mt-6"
          />
        ) : (
          <Empty
            icon={Search}
            title="No tasks for this project"
            description="There are no tasks linked to this project yet."
            className="mt-6"
          />
        )
      ) : (
        <>
          <div className="mt-4">
            <TasksTable
              tasks={tasks.slice((safePage - 1) * pageSize, safePage * pageSize)}
              selectedIds={selectedIds}
              onToggle={toggleSelect}
              onSelectAll={() => {
                const pageTasks = tasks.slice((safePage - 1) * pageSize, safePage * pageSize);
                const allSelected = pageTasks.length > 0 && pageTasks.every(task => selectedIds.has(task.id));

                setSelectedIds(prev => {
                  const next = new Set(prev);
                  pageTasks.forEach(task => {
                    if (allSelected) next.delete(task.id);
                    else next.add(task.id);
                  });
                  return next;
                });
              }}
              onDelete={handleDeleteTask}
              onChangeAssignee={setReassignTask}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              showProject={false}
               visibleColumns={visibleColumns}
              onStatusChange={(id, status) =>
                setStatusOverrides(prev => ({ ...prev, [id]: status }))
              }
            />
          </div>
          <ProjectsPagination
            page={safePage}
            totalItems={tasks.length}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </>
      )}

      {/* ── Filter drawer ── */}
      <TaskFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        pending={pendingFilters}
        onChange={setPendingFilters}
        onApply={() => {
          setAppliedFilters({ ...pendingFilters, clients: [], projectNames: [] });
        }}
        onReset={() => { setPendingFilters(EMPTY_TASK_FILTERS); setAppliedFilters(EMPTY_TASK_FILTERS); }}
        storageKey="finanshels-project-tasks-filters"
        hideProjectContextFilters
        onApplyDirect={f => {
          const projectScopedFilters = { ...f, clients: [], projectNames: [] };
          setAppliedFilters(projectScopedFilters);
          setPendingFilters(projectScopedFilters);
        }}
      />

      {/* ── Task selection action bar ── */}
      <TaskBulkActionBar
        count={selectedIds.size}
        onHold={() => {
          if (allSelectedOnHold) setResumeDialogOpen(true);
          else setHoldDialogOpen(true);
        }}
        showOnHold={!hasArchivedSelected}
        showResume={allSelectedOnHold && !hasArchivedSelected}
        onReassign={() => setReassignDrawerOpen(true)}
        onChangeStatus={() => setChangeStatusDrawerOpen(true)}
        onEditDeadline={() => setEditDeadlineOpen(true)}
        onDelete={handleBulkDelete}
        onClear={clearSelection}
      />

      {/* ── Confirm deleting selected tasks ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Delete {selectedIds.size === 1 ? 'Task' : 'Tasks'}
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                {selectedIds.size} selected {selectedIds.size === 1 ? 'task' : 'tasks'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                handleBulkDeleteConfirmed();
                setDeleteDialogOpen(false);
              }}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── On Hold confirmation dialog ── */}
      <Dialog
        open={holdDialogOpen || resumeDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setHoldDialogOpen(false);
            setResumeDialogOpen(false);
            setHoldResumeReason('');
          }
        }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              resumeDialogOpen ? 'bg-orange-50' : 'bg-amber-50',
            )}>
              {resumeDialogOpen
                ? <PlayCircle size={20} className="text-brand" />
                : <CirclePause size={20} className="text-amber-600" />}
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              {resumeDialogOpen
                ? `Resume ${selectedIds.size === 1 ? 'Task' : 'Tasks'}`
                : `Put ${selectedIds.size === 1 ? 'Task' : 'Tasks'} On Hold`}
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              {resumeDialogOpen ? (
                <>
                  Are you sure you want to resume{' '}
                  <span className="font-medium text-gray-700">
                    {selectedIds.size} selected {selectedIds.size === 1 ? 'task' : 'tasks'}
                  </span>
                  ? They will return to In Progress.
                </>
              ) : (
                <>
                  Are you sure you want to put{' '}
                  <span className="font-medium text-gray-700">
                    {selectedIds.size} selected {selectedIds.size === 1 ? 'task' : 'tasks'}
                  </span>
                  {' '}on hold? Their work will be paused until the status is changed.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3">
            <label className="mb-1.5 block text-[12.5px] font-medium text-gray-700">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={holdResumeReason}
              onChange={e => setHoldResumeReason(e.target.value)}
              placeholder={resumeDialogOpen ? 'Why are these tasks being resumed?' : 'Why are these tasks being put on hold?'}
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setHoldDialogOpen(false);
                setResumeDialogOpen(false);
                setHoldResumeReason('');
              }}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={resumeDialogOpen ? handleResumeConfirmed : handleHoldConfirmed}
              disabled={!holdResumeReason.trim()}
              className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {resumeDialogOpen ? 'Resume' : 'Put On Hold'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Change status drawer ── */}
      <ChangeTaskStatusDrawer
        open={changeStatusDrawerOpen}
        onClose={() => setChangeStatusDrawerOpen(false)}
        tasks={selectedTasks}
        onConfirm={handleChangeStatus}
      />

      {/* ── Reassign drawer ── */}
      <TaskReassignDrawer
        open={reassignDrawerOpen}
        onClose={() => setReassignDrawerOpen(false)}
        selectedTasks={selectedTasks}
        onConfirm={() => {
          const count = selectedIds.size;
          const noun = count === 1 ? 'task' : 'tasks';
          clearSelection();
          toast.success(`${count} ${noun} reassigned`, { duration: 3500 });
        }}
      />

      {/* ── Single-task reassignment drawer ── */}
      <TaskReassignDrawer
        open={reassignTask !== null}
        onClose={() => setReassignTask(null)}
        selectedTasks={reassignTask ? [reassignTask] : []}
        mode="single"
        onConfirm={() => {
          toast.success(`"${reassignTask?.name ?? 'Task'}" reassigned`, { duration: 3500 });
        }}
      />

      {/* ── Edit deadline drawer ── */}
      <TaskEditDeadlineDrawer
        open={editDeadlineOpen}
        onClose={() => setEditDeadlineOpen(false)}
        selectedTasks={selectedTasks}
        onConfirm={() => {
          const count = selectedIds.size;
          const noun  = count === 1 ? 'task' : 'tasks';
          clearSelection();
          toast.success(`${count} ${noun} deadline updated`, {
            description: 'The deadline changes have been applied.',
            duration: 3500,
          });
        }}
      />
    </div>
  );
}
