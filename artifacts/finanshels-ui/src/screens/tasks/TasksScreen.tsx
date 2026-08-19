'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Search, Download, CheckSquare, SlidersHorizontal, X, TriangleAlert, Clock3,
  CheckCircle2, PauseCircle, CalendarDays, CalendarClock, Archive,
  PlayCircle, Columns3, Check,
} from 'lucide-react';
import { Empty } from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { MOCK_TASKS, type TaskItem, type TaskPriority, type TaskStatus } from './mock-data';
import { getProjectDisplayName, MOCK_PROJECTS } from '../projects/mock-data';
import { useOrgContext } from '@/contexts/OrgContext';
import {
  TaskFilterDrawer,
  EMPTY_TASK_FILTERS,
  countActiveTaskFilters,
  type TaskFilterState,
} from './TaskFilterDrawer';
import {
  TasksTable,
  TASK_COLUMN_OPTIONS,
  type SortKey,
  type TaskColumnKey,
} from './TasksTable';
import { ProjectsPagination } from '../projects/ProjectsPagination';
import { TaskBulkActionBar } from './TaskBulkActionBar';
import { ChangeTaskStatusDrawer } from './ChangeTaskStatusDrawer';
import { TaskEditDeadlineDrawer } from './TaskEditDeadlineDrawer';
import { AdHocTaskDialog } from '@/components/AdHocTaskDialog';
import { TaskReassignDrawer } from './TaskReassignDrawer';
import { TaskReasonDrawer } from './TaskReasonDrawer';
import { toast } from 'sonner';
import {
  ActiveFilterChips,
  makeActiveFilterChipKey,
  parseActiveFilterChipKey,
  type ActiveFilterChip,
} from '@/components/ActiveFilterChips';

/* ─────────────────── constants ─────────────────── */

const DEFAULT_PAGE_SIZE = 20;

/* ─────────────────── status options ─────────────────── */

type StatusView =
  | 'All'
  | 'Not Started'
  | 'Overdue'
  | 'Today'
  | 'Next 30 days'
  | 'Completed'
  | 'Upcoming'
  | 'On Hold'
  | 'Archived';

const STATUSES: Array<{ value: StatusView; label: string }> = [
  { value: 'All',          label: 'All Status'   },
  { value: 'Not Started',  label: 'Not Started'  },
  { value: 'Overdue',      label: 'Overdue'      },
  { value: 'Today',        label: 'Today'        },
  { value: 'Next 30 days', label: 'Next 30 Days' },
  { value: 'Completed',    label: 'Completed'    },
  { value: 'Upcoming',     label: 'Upcoming'     },
  { value: 'On Hold',      label: 'On Hold'      },
  { value: 'Archived',     label: 'Archived'     },
];

const PRIORITY_ORDER: Record<TaskPriority, number> = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_ORDER = { Overdue: 0, 'In Progress': 1, 'To Do': 2, Done: 3, 'On Hold': 4, Archived: 5 } as Record<string, number>;

/* ── Urgency card color schemes ── */
const TASK_STATUS_SCHEMES = {
  Overdue:        { bg: 'bg-red-50',     border: 'border-red-100',     count: 'text-red-500',     icon: 'text-red-400'     },
  Today:          { bg: 'bg-orange-50',  border: 'border-orange-100',  count: 'text-orange-500',  icon: 'text-orange-400'  },
  'Next 30 days': { bg: 'bg-blue-50',    border: 'border-blue-100',    count: 'text-blue-500',    icon: 'text-blue-400'    },
  Completed:      { bg: 'bg-emerald-50', border: 'border-emerald-100', count: 'text-emerald-500', icon: 'text-emerald-400' },
  Upcoming:       { bg: 'bg-violet-50',  border: 'border-violet-100',  count: 'text-violet-500',  icon: 'text-violet-400'  },
  'On Hold':      { bg: 'bg-amber-50',   border: 'border-amber-100',   count: 'text-amber-500',   icon: 'text-amber-400'   },
  Archived:       { bg: 'bg-gray-100',   border: 'border-gray-200',    count: 'text-gray-500',    icon: 'text-gray-400'    },
} as const;

const TASK_STATUS_ICONS = {
  Overdue: TriangleAlert,
  Today: Clock3,
  'Next 30 days': CalendarDays,
  Completed: CheckCircle2,
  Upcoming: CalendarClock,
  'On Hold': PauseCircle,
  Archived: Archive,
} as const;

type TaskUrgencyCard = { label: string; note?: string; count: number };

function buildTaskUrgencyCards(
  view: StatusView,
  allTasks: typeof MOCK_TASKS,
): { cards: TaskUrgencyCard[]; scheme: (typeof TASK_STATUS_SCHEMES)[keyof typeof TASK_STATUS_SCHEMES] } | null {
  if (view !== 'Overdue' && view !== 'Today' && view !== 'Completed' && view !== 'Next 30 days' && view !== 'Upcoming') return null;

  const scheme = TASK_STATUS_SCHEMES[view as keyof typeof TASK_STATUS_SCHEMES]
    ?? TASK_STATUS_SCHEMES.Upcoming;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  function daysUntil(iso: string) {
    const d = new Date(iso); d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - today.getTime()) / 86_400_000);
  }

  const relevant = allTasks.filter(t => matchesStatusView(t, view));
  let cards: TaskUrgencyCard[] = [];

  if (view === 'Overdue') {
    // Keep all four age buckets visible, including zero-count buckets.
    cards = [
      { count: relevant.filter(t => { const v = Math.abs(daysUntil(t.dueDate)); return v >= 1 && v <= 10; }).length, label: '1–10 days overdue' },
      { count: relevant.filter(t => { const v = Math.abs(daysUntil(t.dueDate)); return v > 10 && v <= 30; }).length, label: '10–30 days overdue' },
      { count: relevant.filter(t => { const v = Math.abs(daysUntil(t.dueDate)); return v > 30 && v <= 60; }).length, label: '30–60 days overdue' },
      { count: relevant.filter(t => Math.abs(daysUntil(t.dueDate)) > 60).length, label: '60+ days overdue' },
    ];

  } else if (view === 'Today') {
    cards = [
      { count: relevant.filter(t => t.status !== 'Done' && t.status !== 'Completed').length, label: 'Pending' },
      { count: relevant.filter(t => t.status === 'Done' || t.status === 'Completed').length, label: 'Completed' },
    ];

  } else if (view === 'Completed') {
    const completedLateDays = (task: TaskItem) => Math.max(-daysUntil(task.dueDate), 0);
    cards = [
      { count: relevant.filter(task => completedLateDays(task) === 0).length, label: 'On time' },
      { count: relevant.filter(task => completedLateDays(task) >= 1 && completedLateDays(task) <= 10).length, label: '1–10 days late' },
      { count: relevant.filter(task => completedLateDays(task) >= 11 && completedLateDays(task) <= 30).length, label: '10–30 days late' },
      { count: relevant.filter(task => completedLateDays(task) >= 31).length, label: '30+ days late' },
    ];

  } else if (view === 'Upcoming') {
    const upcomingRanges = [
      { min: 1,  max: 10,       label: 'Starts in 1–10 days' },
      { min: 11, max: 30,       label: 'Starts in 10–30 days' },
      { min: 31, max: 60,       label: 'Starts in 30–60 days' },
      { min: 61, max: Infinity, label: 'Starts in 60+ days' },
    ];
    cards = upcomingRanges.map(range => ({
      count: relevant.filter(task => {
        const days = daysUntil(task.dueDate);
        return days >= range.min && days <= range.max;
      }).length,
      label: range.label,
    }));

  } else {
    const nextThirtyRanges = [
      { min: 0,  max: 3,  label: 'Due in 0–3 days'  },
      { min: 4,  max: 10, label: 'Due in 3–10 days' },
      { min: 11, max: 20, label: 'Due in 10–20 days' },
      { min: 21, max: 30, label: 'Due in 20–30 days' },
    ];
    cards = nextThirtyRanges.map(range => ({
      count: relevant.filter(task => {
        const days = daysUntil(task.dueDate);
        return days >= range.min && days <= range.max;
      }).length,
      label: range.label,
    }));
  }

  return { cards, scheme };
}

/* ─────────────────── status-view filter helper ─────────────────── */

function matchesStatusView(task: { status: string; dueDate: string; timeSpentSeconds?: number }, view: StatusView): boolean {
  if (view === 'All') return true;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
  const days  = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  switch (view) {
    case 'Not Started':  return task.status === 'To Do' && (task.timeSpentSeconds ?? 0) === 0;
    case 'Overdue':      return task.status !== 'Done' && task.status !== 'Completed' && task.status !== 'Archived' && days < 0;
    case 'Today':        return days === 0 && task.status !== 'Archived';
    case 'Next 30 days': return days >= 1 && days <= 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'Completed':    return task.status === 'Done';
    case 'Upcoming':     return days > 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'On Hold':      return task.status === 'On Hold';
    case 'Archived':     return task.status === 'Archived';
    default:             return true;
  }
}

function includesSelectedValue(values: string[], candidates: string[]): boolean {
  if (values.length === 0) return true;
  return values.some(value => candidates.some(candidate => {
    const selected = value.toLowerCase();
    const current = candidate.toLowerCase();
    return current.includes(selected) || selected.includes(current);
  }));
}

function taskText(task: TaskItem): string {
  return `${task.name} ${task.projects.map(getProjectDisplayName).join(' ')}`.toLowerCase();
}

function matchesTaskFrequency(task: TaskItem, frequency: string): boolean {
  const text = taskText(task);
  switch (frequency) {
    case 'One-time':
      return /registration|renewal|onboarding|valuation|disclosure|engagement/.test(text);
    case 'Weekly':
      return false;
    case 'Monthly':
      return /monthly|month|payroll|book ?keeping|management accounts|wps/.test(text);
    case 'Quarterly':
      return /\bq[1-4]\b|quarter/.test(text);
    case 'Annually':
      return /annual|year-end|year end|\bfy\b|yearly/.test(text);
    default:
      return false;
  }
}

function matchesTaskService(task: TaskItem, service: string): boolean {
  const text = taskText(task);
  const patterns: Record<string, RegExp> = {
    Accounting: /book ?keeping|payroll|reconcil|financial statement|invoice|vat|tax return/,
    Finance: /forecast|budget|valuation|financial|bank statement|reconcil/,
    IT: /\bit\b|technology|portal|system|software/,
    Technology: /technology|portal|system|software/,
    HR: /payroll|employee|benefit|onboarding/,
    Compliance: /compliance|regulatory|wps|control|disclosure/,
    Audit: /audit|evidence|workpaper/,
  };
  return patterns[service]?.test(text) ?? false;
}

function matchesTaskTag(task: TaskItem, tag: string): boolean {
  const text = taskText(task);
  const patterns: Record<string, RegExp> = {
    'Tax Filing': /tax|vat/,
    Bookkeeping: /book ?keeping|reconcil/,
    Registration: /registration|renewal|onboarding/,
    Payroll: /payroll|wps/,
    Audit: /audit|evidence|workpaper/,
    Compliance: /compliance|regulatory|control|disclosure/,
    HR: /employee|benefit|onboarding/,
  };
  return patterns[tag]?.test(text) ?? false;
}

/** Stable projectId → departmentId lookup built from the project mock data. */
const PROJECT_DEPT_MAP: Record<string, string> = Object.fromEntries(
  MOCK_PROJECTS.map(p => [p.id, p.serviceType.departmentId]),
);

function filterTasksByAppliedFilters(
  taskList: TaskItem[],
  statusView: StatusView,
  searchValue: string,
  appliedFilters: TaskFilterState,
  /** Resolved dept IDs for the selected department names (from org context). */
  resolvedDeptIds: string[],
): TaskItem[] {
  let list = taskList.filter(task => matchesStatusView(task, statusView));

  const q = searchValue.trim().toLowerCase();
  if (q) {
    list = list.filter(task =>
      task.name.toLowerCase().includes(q) ||
      task.projects.some(project => getProjectDisplayName(project).toLowerCase().includes(q)) ||
      (task.assignee?.name ?? '').toLowerCase().includes(q),
    );
  }

  if (appliedFilters.taskNames.length > 0) {
    list = list.filter(task => includesSelectedValue(
      appliedFilters.taskNames,
      [task.name, ...task.projects.map(getProjectDisplayName)],
    ));
  }
  if (appliedFilters.frequencies.length > 0) {
    list = list.filter(task =>
      appliedFilters.frequencies.some(frequency => matchesTaskFrequency(task, frequency)),
    );
  }
  if (appliedFilters.clients.length > 0) {
    list = list.filter(task =>
      task.projects.some(project => appliedFilters.clients.includes(project.clientName)),
    );
  }
  if (appliedFilters.projectNames.length > 0) {
    list = list.filter(task =>
      task.projects.some(project =>
        includesSelectedValue(appliedFilters.projectNames, [getProjectDisplayName(project)]),
      ),
    );
  }
  if (appliedFilters.departments.length > 0) {
    list = list.filter(task =>
      resolvedDeptIds.length > 0 &&
      task.projects.some(tp => resolvedDeptIds.includes(PROJECT_DEPT_MAP[tp.id] ?? '')),
    );
  }
  if (appliedFilters.services.length > 0) {
    list = list.filter(task =>
      appliedFilters.services.some(service => matchesTaskService(task, service)),
    );
  }
  if (appliedFilters.assignees.length > 0) {
    list = list.filter(task =>
      appliedFilters.assignees.includes(task.assignee?.name ?? ''),
    );
  }
  if (appliedFilters.tags.length > 0) {
    list = list.filter(task =>
      appliedFilters.tags.some(tag => matchesTaskTag(task, tag)),
    );
  }

  if (appliedFilters.dueDateFilter && appliedFilters.dueDateFilter !== 'All dates') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    list = list.filter(task => {
      const due = new Date(task.dueDate);
      const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
      if (appliedFilters.dueDateFilter === 'Today') return days === 0;
      if (appliedFilters.dueDateFilter === 'This Week') return days >= 0 && days <= 7;
      if (appliedFilters.dueDateFilter === 'This Month') return days >= 0 && days <= 30;
      if (appliedFilters.dueDateFilter === 'Custom Date Range') {
        const startsAfterStart = !appliedFilters.dueDateStart || task.dueDate >= appliedFilters.dueDateStart;
        const endsBeforeEnd = !appliedFilters.dueDateEnd || task.dueDate <= appliedFilters.dueDateEnd;
        return startsAfterStart && endsBeforeEnd;
      }
      return true;
    });
  }

  return list;
}

/* ─────────────────── screen ─────────────────── */

export function TasksScreen() {
  const { departments: orgDepts } = useOrgContext();

  /* search */
  const [search, setSearch] = useState('');

  /* status view filter */
  const [status, setStatus] = useState<StatusView>('All');
  const statusIsFiltered    = status !== 'All';
  const activeStatusLabel   = STATUSES.find(s => s.value === status)?.label ?? 'All Status';

  /* column sort — direct (no pending/applied staging) */
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<Set<TaskColumnKey>>(
    () => new Set(TASK_COLUMN_OPTIONS.map(({ key }) => key)),
  );
  const [taskColumnOrder, setTaskColumnOrder] = useState<TaskColumnKey[]>(
    () => TASK_COLUMN_OPTIONS.map(({ key }) => key),
  );
  const [taskColumnOrderHydrated, setTaskColumnOrderHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('fh_tasks_column_order');
      if (stored) {
        const parsed = JSON.parse(stored) as unknown[];
        if (Array.isArray(parsed)) {
          const available = new Set(TASK_COLUMN_OPTIONS.map(({ key }) => key));
          const valid = [...new Set(parsed.filter((k): k is TaskColumnKey =>
            typeof k === 'string' && available.has(k as TaskColumnKey),
          ))];
          const missing = TASK_COLUMN_OPTIONS.map(({ key }) => key).filter(k => !valid.includes(k));
          if (valid.length) setTaskColumnOrder([...valid, ...missing]);
        }
      }
    } catch { /* ignore */ }
    setTaskColumnOrderHydrated(true);

    function onStorage(e: StorageEvent) {
      if (e.key !== 'fh_tasks_column_order' || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as unknown[];
        if (!Array.isArray(parsed)) return;
        const available = new Set(TASK_COLUMN_OPTIONS.map(({ key }) => key));
        const valid = [...new Set(parsed.filter((k): k is TaskColumnKey =>
          typeof k === 'string' && available.has(k as TaskColumnKey),
        ))];
        const missing = TASK_COLUMN_OPTIONS.map(({ key }) => key).filter(k => !valid.includes(k));
        if (valid.length) setTaskColumnOrder([...valid, ...missing]);
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!taskColumnOrderHydrated) return;
    try { localStorage.setItem('fh_tasks_column_order', JSON.stringify(taskColumnOrder)); } catch { /* ignore */ }
  }, [taskColumnOrder, taskColumnOrderHydrated]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

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
      prev.size === TASK_COLUMN_OPTIONS.length
        ? new Set<TaskColumnKey>()
        : new Set(TASK_COLUMN_OPTIONS.map(({ key }) => key)),
    );
  }

  /* pagination + selection */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletedTaskIds, setDeletedTaskIds] = useState<Set<string>>(new Set());
  const [statusOverrides, setStatusOverrides] = useState<Record<string, TaskStatus>>({});
  const [changeStatusDrawerOpen, setChangeStatusDrawerOpen] = useState(false);
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
  const [holdTasks, setHoldTasks] = useState<TaskItem[]>([]);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [holdResumeReason, setHoldResumeReason] = useState('');
  const [deleteTasks, setDeleteTasks] = useState<TaskItem[]>([]);
  const [editDeadlineOpen, setEditDeadlineOpen] = useState(false);
  const [reassignDrawerOpen, setReassignDrawerOpen] = useState(false);
  const [reassignTask, setReassignTask] = useState<TaskItem | null>(null);
  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function clearSelection() {
    setSelectedIds(new Set());
  }

  function openDeleteTask(id: string) {
    const task = displayTasks.find(item => item.id === id);
    if (task) setDeleteTasks([task]);
  }

  function openDeleteSelectedTasks() {
    const selected = displayTasks.filter(task => selectedIds.has(task.id));
    if (selected.length > 0) setDeleteTasks(selected);
  }

  function handleDeleteTasks(reason: string) {
    if (deleteTasks.length === 0 || !reason.trim()) return;

    setDeletedTaskIds(prev => {
      const next = new Set(prev);
      deleteTasks.forEach(task => next.add(task.id));
      return next;
    });
    setSelectedIds(prev => {
      const next = new Set(prev);
      deleteTasks.forEach(task => next.delete(task.id));
      return next;
    });
    deleteTasks.forEach(task => {
      localStorage.setItem(`fh_task_delete_reason_${task.id}`, reason.trim());
    });
    const count = deleteTasks.length;
    setDeleteTasks([]);
    toast.success(`${count} ${count === 1 ? 'task' : 'tasks'} deleted`, {
      description: `Reason: ${reason}`,
      duration: 5000,
    });
  }

  function notifyTaskAction(action: string) {
    const count = selectedIds.size;
    if (count === 0) return;
    const noun = count === 1 ? 'task' : 'tasks';
    clearSelection();
    toast.success(`${count} ${noun} selected for ${action.toLowerCase()}`, {
      description: `The ${noun} are ready for ${action.toLowerCase()}.`,
      duration: 3500,
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
      description: `The selected ${count === 1 ? 'task status is' : 'task statuses are'} now ${newStatus}.`,
      duration: 3500,
    });
  }

  function handleHoldConfirmed(reason: string) {
    const count = holdTasks.length;
    if (count === 0 || !reason.trim()) return;

    setStatusOverrides(prev => {
      const next = { ...prev };
      holdTasks.forEach(task => { next[task.id] = 'On Hold'; });
      return next;
    });
    holdTasks.forEach(task => {
      localStorage.setItem(`fh_task_hold_reason_${task.id}`, reason.trim());
    });
    const heldIds = new Set(holdTasks.map(task => task.id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      heldIds.forEach(id => next.delete(id));
      return next;
    });
    setHoldDrawerOpen(false);
    setHoldTasks([]);
    toast.success(`${count} ${count === 1 ? 'task' : 'tasks'} put on hold`, {
      description: `Reason: ${reason.trim()}`,
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

  const displayTasks = useMemo<TaskItem[]>(
    () => MOCK_TASKS.filter(task => !deletedTaskIds.has(task.id)).map(task => ({
      ...task,
      status: statusOverrides[task.id] ?? task.status,
    })),
    [deletedTaskIds, statusOverrides],
  );
  const selectedTasks = displayTasks.filter(task => selectedIds.has(task.id));
  const hasArchivedSelected = selectedTasks.some(task => task.status === 'Archived');
  const allSelectedOnHold = selectedTasks.length > 0
    && selectedTasks.every(task => task.status === 'On Hold');

  /* ad-hoc task dialog */
  const [adHocOpen, setAdHocOpen] = useState(false);

  /* filter drawer */
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [pendingFilters,   setPendingFilters]    = useState<TaskFilterState>(EMPTY_TASK_FILTERS);
  const [appliedFilters,   setAppliedFilters]    = useState<TaskFilterState>(EMPTY_TASK_FILTERS);
  const filterActiveCount = countActiveTaskFilters(appliedFilters);
  const filteredTasksForCounts = useMemo(() => {
    const activeIds = new Set(orgDepts.filter(d => d.status === 'Active').map(d => d.id));
    const rDeptIds = appliedFilters.departments.filter(id => activeIds.has(id));
    return filterTasksByAppliedFilters(displayTasks, 'All', search, appliedFilters, rDeptIds);
  }, [displayTasks, search, appliedFilters, orgDepts]);
  const statusCounts = STATUSES.reduce<Record<StatusView, number>>((counts, { value }) => {
    counts[value] = filteredTasksForCounts.filter(task => matchesStatusView(task, value)).length;
    return counts;
  }, {} as Record<StatusView, number>);

  /* reset page + selection whenever filters change */
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, status, sortKey, sortDir, appliedFilters]);

  /* filtered + sorted list */
  const tasks = useMemo(() => {
    const activeIds = new Set(orgDepts.filter(d => d.status === 'Active').map(d => d.id));
    const rDeptIds = appliedFilters.departments.filter(id => activeIds.has(id));
    const list = filterTasksByAppliedFilters(displayTasks, status, search, appliedFilters, rDeptIds);

    // sort
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
  }, [search, status, sortKey, sortDir, appliedFilters, displayTasks, orgDepts]);

  const totalPages = Math.max(1, Math.ceil(tasks.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const activeFilterChips: ActiveFilterChip[] = [];
  const taskArrayChip = (
    key: keyof Pick<TaskFilterState, 'taskNames' | 'frequencies' | 'clients' | 'projectNames' | 'departments' | 'services' | 'assignees' | 'tags'>,
    label: string,
  ) => {
    const values = appliedFilters[key];
    if (values.length === 0) return;
    values.forEach(value => activeFilterChips.push({
      key: makeActiveFilterChipKey(key, value),
      label,
      value,
    }));
  };
  taskArrayChip('taskNames', 'Task');
  taskArrayChip('frequencies', 'Frequency');
  taskArrayChip('clients', 'Client');
  taskArrayChip('projectNames', 'Project');
  const deptIdToName = Object.fromEntries(orgDepts.map(d => [d.id, d.name]));
  appliedFilters.departments.forEach(deptId => {
    const name = deptIdToName[deptId] ?? deptId;
    activeFilterChips.push({ key: makeActiveFilterChipKey('departments', deptId), label: 'Department', value: name });
  });
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
    const { filterKey, value } = parseActiveFilterChipKey(key);
    const arrayKeys = ['taskNames', 'frequencies', 'clients', 'projectNames', 'departments', 'services', 'assignees', 'tags'] as const;
    const next = { ...appliedFilters };
    if ((arrayKeys as readonly string[]).includes(filterKey)) {
      const arrayKey = filterKey as typeof arrayKeys[number];
      next[arrayKey] = value === null
        ? []
        : appliedFilters[arrayKey].filter(option => option !== value);
    } else if (filterKey === 'dueDateFilter') {
      next.dueDateFilter = 'All dates';
      next.dueDateStart = '';
      next.dueDateEnd = '';
    } else if (filterKey === 'dueDateStart' || filterKey === 'dueDateEnd') {
      next[filterKey] = '';
    }
    setAppliedFilters(next);
    setPendingFilters(next);
    setPage(1);
  }

  return (
    <div className="min-h-screen bg-white px-4 pt-5 pb-10 sm:px-6 sm:pt-6">

      {/* ── Ad-hoc task dialog ── */}
      <AdHocTaskDialog open={adHocOpen} onClose={() => setAdHocOpen(false)} />

      {/* ── Page header ── */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">Tasks</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            View and manage tasks assigned to you across all projects.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdHocOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-brand/90 active:scale-[0.98]"
        >
          + Ad Hoc Task
        </button>
      </div>

      {/* ── Status tabs ── */}
      <div className="-mx-4 mb-4 sm:-mx-6">
        <Tabs value={status} onValueChange={v => { setStatus(v as StatusView); setPage(1); }}>
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-gray-200 bg-transparent p-0 px-4 sm:px-6 overflow-x-auto flex-nowrap scrollbar-none">
            {STATUSES.filter(({ value }) => value !== 'Not Started').map(({ value, label }) => (
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

        {/* Spacer */}
        <div className="hidden flex-1 sm:block" />

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2">

          {/* ── Download ── */}
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

          {/* ── Filters button ── */}
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

          {/* ── Columns ── */}
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
                        visibleColumns.size < TASK_COLUMN_OPTIONS.length
                          ? 'border-brand text-brand hover:bg-orange-50/50'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <Columns3
                        size={13}
                        className={visibleColumns.size < TASK_COLUMN_OPTIONS.length ? 'text-brand' : 'text-gray-500'}
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
                    visibleColumns.size === TASK_COLUMN_OPTIONS.length
                      ? 'bg-orange-50 text-brand'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  Select All
                  {visibleColumns.size === TASK_COLUMN_OPTIONS.length && (
                    <Check size={14} className="flex-shrink-0 text-brand" />
                  )}
                </button>
                <div className="my-1 border-t border-gray-100" />
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
                {taskColumnOrder.map(key => {
                  const option = TASK_COLUMN_OPTIONS.find(o => o.key === key);
                  if (!option) return null;
                  const { label } = option;
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

      {/* ── Urgency summary cards (hidden when All Status) ── */}
      {(() => {
        const urgency = buildTaskUrgencyCards(status, MOCK_TASKS);
        if (!urgency) return null;
        const { cards, scheme } = urgency;
        const StatusIcon = TASK_STATUS_ICONS[status as keyof typeof TASK_STATUS_ICONS] ?? TriangleAlert;
        return (
          <div
            className={cn(
              'mt-5 grid gap-3',
              cards.length === 1 && 'grid-cols-1',
              cards.length === 2 && 'grid-cols-2',
              cards.length === 3 && 'grid-cols-3',
              cards.length >= 4 && 'grid-cols-4',
            )}
          >
            {cards.map((card, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-4 py-4',
                  scheme.bg, scheme.border,
                )}
              >
                <span className={cn(
                  'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/70',
                  scheme.icon,
                )}>
                  <StatusIcon size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-gray-700">
                    {card.label}
                  </span>
                  {card.note && (
                    <span className="mt-0.5 block truncate text-[11px] text-gray-400">
                      {card.note}
                    </span>
                  )}
                </div>
                <span className={cn('flex-shrink-0 text-[26px] font-bold leading-none', scheme.count)}>
                  {card.count}
                </span>
              </div>
            ))}
          </div>
        );
      })()}

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
            icon={CheckSquare}
            title="No tasks yet"
            description="Tasks assigned to you will appear here. Once your team starts assigning work, you'll see everything in one place."
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
              onDelete={openDeleteTask}
              onHold={task => {
                setHoldTasks([task]);
                setHoldDrawerOpen(true);
              }}
              onChangeAssignee={setReassignTask}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={handleSort}
              visibleColumns={visibleColumns}
              columnOrder={taskColumnOrder}
              onColumnReorder={setTaskColumnOrder}
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
        onApply={() => { setAppliedFilters(pendingFilters); }}
        onReset={() => { setPendingFilters(EMPTY_TASK_FILTERS); setAppliedFilters(EMPTY_TASK_FILTERS); }}
        storageKey="finanshels-tasks-filters"
        onApplyDirect={f => { setAppliedFilters(f); setPendingFilters(f); }}
      />

      {/* ── Task selection action bar ── */}
      <TaskBulkActionBar
        count={selectedIds.size}
        onHold={() => {
          if (allSelectedOnHold) setResumeDialogOpen(true);
          else {
            setHoldTasks(selectedTasks);
            setHoldDrawerOpen(true);
          }
        }}
        showOnHold={!hasArchivedSelected}
        showResume={allSelectedOnHold && !hasArchivedSelected}
        onReassign={() => setReassignDrawerOpen(true)}
        onChangeStatus={() => setChangeStatusDrawerOpen(true)}
        onEditDeadline={() => setEditDeadlineOpen(true)}
        onDelete={openDeleteSelectedTasks}
        onClear={clearSelection}
      />

      {/* ── Confirm resuming selected tasks ── */}
      <Dialog
        open={resumeDialogOpen}
        onOpenChange={open => {
          if (!open) {
            setResumeDialogOpen(false);
            setHoldResumeReason('');
          }
        }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              'bg-orange-50',
            )}>
              <PlayCircle size={20} className="text-brand" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              {`Resume ${selectedIds.size === 1 ? 'Task' : 'Tasks'}`}
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to resume{' '}
              <span className="font-medium text-gray-700">
                {selectedIds.size} selected {selectedIds.size === 1 ? 'task' : 'tasks'}
              </span>
              ? They will return to In Progress.
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
              placeholder="Why are these tasks being resumed?"
              className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-900 placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setResumeDialogOpen(false);
                setHoldResumeReason('');
              }}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleResumeConfirmed}
              disabled={!holdResumeReason.trim()}
              className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Resume
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hold tasks drawer ── */}
      <TaskReasonDrawer
        open={holdDrawerOpen}
        onClose={() => {
          setHoldDrawerOpen(false);
          setHoldTasks([]);
        }}
        tasks={holdTasks}
        mode="hold"
        onConfirm={handleHoldConfirmed}
      />

      {/* ── Delete task drawer ── */}
      <TaskReasonDrawer
        open={deleteTasks.length > 0}
        onClose={() => setDeleteTasks([])}
        tasks={deleteTasks}
        mode="delete"
        onConfirm={handleDeleteTasks}
      />

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
          const noun  = count === 1 ? 'task' : 'tasks';
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
