'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ActiveFilterChips,
  makeActiveFilterChipKey,
  parseActiveFilterChipKey,
  type ActiveFilterChip,
} from '@/components/ActiveFilterChips';
import {
  Search, Download, SlidersHorizontal, LayoutGrid, AlignJustify, Columns3, Trash2,
  TriangleAlert, Clock3, CheckCircle2, PauseCircle, CalendarDays, CalendarClock,
  Archive, X, ChevronDown, ArrowUp, ArrowDown, Check, ArrowUpDown,
  FolderOpen, SearchX, PlayCircle,
} from 'lucide-react';
import { Empty } from '@/components/ui/empty';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { getProjectDisplayName, MOCK_PROJECTS, type Project, type ProjectStatus } from './mock-data';
import { ProjectCard } from './ProjectCard';
import {
  ProjectsTable,
  PROJECT_COLUMN_OPTIONS,
  type ProjectColumnKey,
  type ProjectSortKey,
} from './ProjectsTable';
import { ProjectsPagination } from './ProjectsPagination';
import {
  FilterDrawer,
  EMPTY_FILTERS,
  REVENUE_NO_FILTER,
  countActiveFilters,
  isRevenueFilterComplete,
  type FilterState,
} from './FilterDrawer';
import { BulkActionBar } from './BulkActionBar';
import { HoldProjectDrawer } from './HoldProjectDrawer';
import { BulkReassignDrawer } from './BulkReassignDrawer';
import { EditDeadlineDrawer } from './EditDeadlineDrawer';
import { DeleteProjectDrawer, type DeleteProjectItem } from './DeleteProjectDrawer';
import { dayDiff, parseDueDate } from './date-utils';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { useOrgContext } from '@/contexts/OrgContext';

const PROJECT_COLUMN_ORDER_STORAGE_KEY = 'fh_projects_column_order';

function normalizeProjectColumnOrder(value: unknown): ProjectColumnKey[] | null {
  if (!Array.isArray(value)) return null;

  const availableKeys = new Set(PROJECT_COLUMN_OPTIONS.map(({ key }) => key));
  const storedKeys = value.filter(
    (key): key is ProjectColumnKey =>
      typeof key === 'string' && availableKeys.has(key as ProjectColumnKey),
  );
  const uniqueKeys = [...new Set(storedKeys)];
  const missingKeys = PROJECT_COLUMN_OPTIONS
    .map(({ key }) => key)
    .filter(key => !uniqueKeys.includes(key));

  return [...uniqueKeys, ...missingKeys];
}

/* ─────────────────────────────── constants ──────────────────────────────── */

/* ── Status color schemes (urgency cards only — never used in the dropdown) ── */
const STATUS_SCHEMES = {
  Overdue:      {
    bg: 'bg-red-50',     border: 'border-red-100',    count: 'text-red-500',    icon: 'text-red-400',
  },
  Current:      {
    bg: 'bg-blue-50',    border: 'border-blue-100',   count: 'text-blue-500',   icon: 'text-blue-400',
  },
  Completed:    {
    bg: 'bg-green-50',   border: 'border-green-100',  count: 'text-green-500',  icon: 'text-green-400',
  },
  'On Hold':    {
    bg: 'bg-amber-50',   border: 'border-amber-100',  count: 'text-amber-500',  icon: 'text-amber-400',
  },
  'Next Month': {
    bg: 'bg-sky-50',     border: 'border-sky-100',    count: 'text-sky-500',    icon: 'text-sky-400',
  },
  Upcoming:     {
    bg: 'bg-violet-50',  border: 'border-violet-100', count: 'text-violet-500', icon: 'text-violet-400',
  },
  Archived:     {
    bg: 'bg-gray-100',   border: 'border-gray-200',   count: 'text-gray-500',   icon: 'text-gray-400',
  },
} as const;

const STATUS_ICONS = {
  Overdue: TriangleAlert,
  Current: Clock3,
  Completed: CheckCircle2,
  'On Hold': PauseCircle,
  'Next Month': CalendarDays,
  Upcoming: CalendarClock,
  Archived: Archive,
} as const;

type UrgencyCard = { label: string; note?: string; count: number; urgencyLevel: 1 | 2 | 3 | 4 };

const STANDARD_URGENCY_RANGES = [
  { min: 1, max: 10, label: '1–10' },
  { min: 11, max: 30, label: '10–30' },
  { min: 31, max: 60, label: '30–60' },
  { min: 61, max: Infinity, label: '60+' },
] as const;

function daysUntilDue(project: Project): number | null {
  const due = parseDueDate(project.dueDate);
  if (!due) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dayDiff(today, due);
}

function daysUntilStart(project: Project): number | null {
  const start = project.startDate ? new Date(project.startDate) : parseDueDate(project.dueDate);
  if (!start || isNaN(start.getTime())) return null;
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dayDiff(today, start);
}

function daysOnHold(project: Project): number | null {
  if (!project.holdDate) return null;
  const heldSince = new Date(`${project.holdDate}T00:00:00`);
  if (isNaN(heldSince.getTime())) return null;
  heldSince.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((today.getTime() - heldSince.getTime()) / 86_400_000));
}

function completedLateDays(project: Project): number {
  if (!project.completedDate) return 0;
  const due = parseDueDate(project.dueDate);
  if (!due) return 0;
  const completed = new Date(project.completedDate);
  completed.setHours(0, 0, 0, 0);
  return Math.max(dayDiff(due, completed), 0);
}

function buildUrgencyCards(
  status: StatusOption,
  projects: Project[],
): { cards: UrgencyCard[]; scheme: (typeof STATUS_SCHEMES)[keyof typeof STATUS_SCHEMES] } | null {
  if (status === 'All' || status === 'Archived') return null;

  const scheme = STATUS_SCHEMES[status as keyof typeof STATUS_SCHEMES]
    ?? STATUS_SCHEMES.Current;

  const relevant = status === 'Next Month' || status === 'Upcoming'
    ? projects.filter(p => !['Archived', 'Completed', 'Overdue'].includes(p.status))
    : projects.filter(p => p.status === (status as ProjectStatus));

  let cards: UrgencyCard[];

  if (status === 'On Hold') {
    // longer on hold = more urgent: index 0 → level 1, index 3 → level 4
    cards = STANDARD_URGENCY_RANGES.map((range, i) => ({
      urgencyLevel: (i + 1) as 1 | 2 | 3 | 4,
      count: relevant.filter(p => {
        const days = daysOnHold(p);
        return days !== null && days >= range.min && days <= range.max;
      }).length,
      label: `${range.label} days on hold`,
    }));
  } else if (status === 'Overdue') {
    // longer overdue = more urgent: index 0 → level 1, index 3 → level 4
    cards = STANDARD_URGENCY_RANGES.map((range, i) => ({
      urgencyLevel: (i + 1) as 1 | 2 | 3 | 4,
      count: relevant.filter(p => {
        const days = daysUntilDue(p);
        const overdueDays = days === null ? null : Math.max(-days, 1);
        return overdueDays !== null && overdueDays >= range.min && overdueDays <= range.max;
      }).length,
      label: `${range.label} days overdue`,
    }));
  } else if (status === 'Completed') {
    // more late = more urgent: on-time = level 1, 30+ late = level 4
    cards = [
      { urgencyLevel: 1, count: relevant.filter(p => completedLateDays(p) === 0).length,                                        label: 'On time'         },
      { urgencyLevel: 2, count: relevant.filter(p => completedLateDays(p) >= 1  && completedLateDays(p) <= 10).length,          label: '1–10 days late'  },
      { urgencyLevel: 3, count: relevant.filter(p => completedLateDays(p) >= 11 && completedLateDays(p) <= 30).length,          label: '10–30 days late' },
      { urgencyLevel: 4, count: relevant.filter(p => completedLateDays(p) >= 31).length,                                        label: '30+ days late'   },
    ] as UrgencyCard[];
  } else if (status === 'Next Month') {
    const nextMonthRanges = [
      { min: 0,  max: 3,  label: 'Due in 0–3 days'   },
      { min: 4,  max: 10, label: 'Due in 3–10 days'  },
      { min: 11, max: 20, label: 'Due in 10–20 days' },
      { min: 21, max: 30, label: 'Due in 20–30 days' },
    ];
    // Keep every status ordered from the lowest range to the highest range.
    cards = nextMonthRanges.map((range, i) => ({
      urgencyLevel: (i + 1) as 1 | 2 | 3 | 4,
      count: relevant.filter(p => {
        const days = daysUntilDue(p);
        return days !== null && days >= range.min && days <= range.max;
      }).length,
      label: range.label,
    }));
  } else if (status === 'Upcoming') {
    // Keep every status ordered from the lowest range to the highest range.
    cards = STANDARD_URGENCY_RANGES.map((range, i) => ({
      urgencyLevel: (i + 1) as 1 | 2 | 3 | 4,
      count: relevant.filter(p => {
        const days = daysUntilStart(p);
        return days !== null && days >= range.min && days <= range.max;
      }).length,
      label: `Starts in ${range.label} days`,
    }));
  } else {
    // Keep every status ordered from the lowest range to the highest range.
    cards = STANDARD_URGENCY_RANGES.map((range, i) => ({
      urgencyLevel: (i + 1) as 1 | 2 | 3 | 4,
      count: relevant.filter(p => {
        const days = daysUntilDue(p);
        return days !== null && days >= range.min && days <= range.max;
      }).length,
      label: `Due in ${range.label} days`,
    }));
  }

  return { cards, scheme };
}

type StatusOption = ProjectStatus | 'All' | 'Next Month' | 'Upcoming' | 'Archived';
const STATUSES: Array<{ value: StatusOption; label: string }> = [
  { value: 'All',        label: 'All Status' },
  { value: 'Overdue',    label: 'Overdue'    },
  { value: 'Current',    label: 'Current'    },
  { value: 'Next Month', label: 'Next Month' },
  { value: 'Upcoming',   label: 'Upcoming'   },
  { value: 'Completed',  label: 'Completed'  },
  { value: 'On Hold',    label: 'On Hold'    },
  { value: 'Archived',   label: 'Archived'   },
];

function matchesStatusTab(project: Project, status: StatusOption): boolean {
  return (
    (status === 'All' && project.status !== 'Archived') ||
    status === 'Next Month' ||
    status === 'Upcoming' ||
    status === 'Archived' ||
    project.status === status
  );
}

type SortByOption = ProjectSortKey;

const SORT_OPTIONS: Array<{ value: SortByOption; label: string }> = [
  { value: 'project-name', label: 'Project Name' },
  { value: 'department',   label: 'Department'   },
  { value: 'progress',     label: 'Progress'     },
  { value: 'task-count',   label: 'Task Count'   },
  { value: 'due-date',     label: 'Due Date'     },
  { value: 'status',       label: 'Status'       },
];

/* ─────────────────────────────── screen ────────────────────────────────── */

export function ProjectsScreen() {
  const { departments: orgDepts } = useOrgContext();
  const PAGE_SIZE_LIST = 20;
  const PAGE_SIZE_GRID = 90;
  /* filter state */
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusOption>('All');
  const [view,   setView]   = useState<'grid' | 'list'>('grid');
  const [gridPageSize, setGridPageSize] = useState(PAGE_SIZE_GRID);
  const [listPageSize, setListPageSize] = useState(PAGE_SIZE_LIST);
  const pageSize = view === 'grid' ? gridPageSize : listPageSize;
  const [visibleColumns, setVisibleColumns] = useState<Set<ProjectColumnKey>>(
    () => new Set(PROJECT_COLUMN_OPTIONS.map(({ key }) => key)),
  );
  const [columnOrder, setColumnOrder] = useState<ProjectColumnKey[]>(
    () => PROJECT_COLUMN_OPTIONS.map(({ key }) => key),
  );
  const [columnOrderHydrated, setColumnOrderHydrated] = useState(false);

  /* Persist the user's drag-and-drop order across refreshes and open tabs. */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROJECT_COLUMN_ORDER_STORAGE_KEY);
      if (stored) {
        const savedOrder = normalizeProjectColumnOrder(JSON.parse(stored));
        if (savedOrder) setColumnOrder(savedOrder);
      }
    } catch {
      /* Ignore malformed or unavailable browser storage. */
    }

    setColumnOrderHydrated(true);

    function handleColumnOrderStorage(event: StorageEvent) {
      if (event.key !== PROJECT_COLUMN_ORDER_STORAGE_KEY) return;

      if (!event.newValue) {
        setColumnOrder(PROJECT_COLUMN_OPTIONS.map(({ key }) => key));
        return;
      }

      try {
        const savedOrder = normalizeProjectColumnOrder(JSON.parse(event.newValue));
        if (savedOrder) setColumnOrder(savedOrder);
      } catch {
        /* Ignore malformed cross-tab updates. */
      }
    }

    window.addEventListener('storage', handleColumnOrderStorage);
    return () => window.removeEventListener('storage', handleColumnOrderStorage);
  }, []);

  useEffect(() => {
    if (!columnOrderHydrated) return;
    try {
      localStorage.setItem(
        PROJECT_COLUMN_ORDER_STORAGE_KEY,
        JSON.stringify(columnOrder),
      );
    } catch {
      /* Ignore unavailable browser storage. */
    }
  }, [columnOrder, columnOrderHydrated]);

  /* restore grid/list view from URL ?view= after mount */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('view') === 'list') setView('list');
  }, []);
  const [page, setPage] = useState(1);
  const handlePageSizeChange = (nextPageSize: number) => {
    if (view === 'grid') {
      setGridPageSize(nextPageSize);
    } else {
      setListPageSize(nextPageSize);
    }
    setPage(1);
  };

  /* sort – pending (staging) vs applied */
  const [sortOpen,        setSortOpen]        = useState(false);
  const [pendingSortBy,   setPendingSortBy]   = useState<SortByOption | null>(null);
  const [pendingSortOrder,setPendingSortOrder] = useState<'asc' | 'desc'>('asc');
  const [appliedSortBy,   setAppliedSortBy]   = useState<SortByOption | null>(null);
  const [appliedSortOrder,setAppliedSortOrder] = useState<'asc' | 'desc'>('asc');

  /* filter drawer */
  const [filterDrawerOpen,   setFilterDrawerOpen]   = useState(false);
  const [pendingFilters,     setPendingFilters]      = useState<FilterState>(EMPTY_FILTERS);
  const [appliedFilters,     setAppliedFilters]      = useState<FilterState>(EMPTY_FILTERS);
  const filterActiveCount = countActiveFilters(appliedFilters);

  /* bulk selection */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  function toggleSelect(id: string) {
    const project = MOCK_PROJECTS.find(p => p.id === id);
    if (project?.status === 'Completed' || project?.status === 'Archived') return;

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelectedIds(new Set()); }

  /* resume */
  const [resumedIds, setResumedIds] = useState<Set<string>>(new Set());
  function handleResume(id: string) {
    setResumedIds(prev => { const n = new Set(prev); n.add(id); return n; });
  }

  /* hold drawer */
  const [holdDrawerOpen, setHoldDrawerOpen] = useState(false);
  const [resumeDrawerOpen, setResumeDrawerOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [resumeTargetId, setResumeTargetId] = useState<string | null>(null);

  /* reassign drawer */
  const [reassignDrawerOpen, setReassignDrawerOpen] = useState(false);

  /* edit deadline drawer */
  const [editDeadlineOpen, setEditDeadlineOpen] = useState(false);
  /* projects with resume overrides applied */
  const displayProjects = MOCK_PROJECTS
    .filter(p => !deletedIds.has(p.id))
    .map(p =>
      p.status === 'On Hold' && resumedIds.has(p.id)
        ? { ...p, status: 'Current' as ProjectStatus }
        : p
    );

  const selectedProjectRecords = displayProjects.filter(p => selectedIds.has(p.id));
  const allSelectedOnHold = selectedProjectRecords.length > 0
    && selectedProjectRecords.every(p => p.status === 'On Hold');

  const selectedProjects = selectedProjectRecords
    .map(p => ({
      title: getProjectDisplayName(p),
      dueDate: p.dueDate.replace(/^Due\s+/i, ''),
    }));

  const sortIsActive = appliedSortBy !== null;

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [search, status, appliedSortBy, appliedSortOrder, appliedFilters]);

  function openSort() {
    setPendingSortBy(appliedSortBy);
    setPendingSortOrder(appliedSortOrder);
    setSortOpen(true);
  }
  function applySort() {
    setAppliedSortBy(pendingSortBy);
    setAppliedSortOrder(pendingSortOrder);
    setSortOpen(false);
  }
  function clearSort() {
    setPendingSortBy(null);
    setPendingSortOrder('asc');
    setAppliedSortBy(null);
    setAppliedSortOrder('asc');
  }

  function toggleColumn(column: ProjectColumnKey) {
    setVisibleColumns(prev => {
      const next = new Set(prev);
      if (next.has(column)) next.delete(column);
      else next.add(column);
      return next;
    });
  }

  function toggleAllColumns() {
    setVisibleColumns(prev =>
      prev.size === PROJECT_COLUMN_OPTIONS.length
        ? new Set<ProjectColumnKey>()
        : new Set(PROJECT_COLUMN_OPTIONS.map(({ key }) => key)),
    );
  }

  function handleHeaderSort(key: ProjectSortKey) {
    const nextOrder =
      appliedSortBy === key && appliedSortOrder === 'asc' ? 'desc' : 'asc';
    setAppliedSortBy(key);
    setAppliedSortOrder(nextOrder);
    setPendingSortBy(key);
    setPendingSortOrder(nextOrder);
  }

  /* derived data */
  const statusIsFiltered = status !== 'All';

  // Parse "Due DD Mon YYYY" → timestamp for date comparison
  function parseDue(dueDate: string): number {
    const clean = dueDate.replace(/^Due\s+/i, '');
    const d = new Date(clean);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }

  // Parse "Due DD Mon YYYY" → Date object
  function parseDueDate(dueDate: string): Date | null {
    const clean = dueDate.replace(/^Due\s+/i, '');
    const d = new Date(clean);
    return isNaN(d.getTime()) ? null : d;
  }

  const matchesProjectFilters = (p: Project, statusFilter: StatusOption): boolean => {
    const q = search.toLowerCase();

    /* status tab */
    const statusMatch = matchesStatusTab(p, statusFilter);

    /* search */
    const searchMatch =
      !q || p.title.toLowerCase().includes(q) || p.client.name.toLowerCase().includes(q);

    /* drawer filters */
    const af = appliedFilters;

    const activeDeptIdSet = new Set(orgDepts.filter(d => d.status === 'Active').map(d => d.id));
    const selectedDeptIds = af.departments.filter(id => activeDeptIdSet.has(id));
    const deptMatch   = af.departments.length === 0
      || (selectedDeptIds.length > 0 && selectedDeptIds.includes(p.serviceType.departmentId));
    const svcMatch    = af.services.length === 0    || af.services.includes(p.serviceType.label);
    const legacyRevenueRanges = Array.isArray(af.revenueRanges) ? af.revenueRanges : [];
    const revenueCondition = af.revenueCondition || legacyRevenueRanges[0] || REVENUE_NO_FILTER;
    const revenueTypeMatch = af.revenueType === 'Internal Revenue'
      ? p.invoiceType === 'bundled'
      : p.invoiceType === 'individual';
    const revenueConditionMatch = revenueCondition === REVENUE_NO_FILTER || (
      p.revenue != null
      && isRevenueFilterComplete(af)
      && (() => {
        const amount = Number(af.revenueValue);
        const maximum = Number(af.revenueValueTo);

        if (revenueCondition === 'Equals') return p.revenue === amount;
        if (revenueCondition === 'Not Equals') return p.revenue !== amount;
        if (revenueCondition === 'Greater Than') return p.revenue > amount;
        if (revenueCondition === 'Greater Than or Equal To') return p.revenue >= amount;
        if (revenueCondition === 'Less Than') return p.revenue < amount;
        if (revenueCondition === 'Less Than or Equal To') return p.revenue <= amount;
        if (revenueCondition === 'Between') return p.revenue >= amount && p.revenue <= maximum;

        /* Preserve older saved range filters while they are being migrated. */
        if (revenueCondition === 'AED 0–5,000') return p.revenue >= 0 && p.revenue <= 5000;
        if (revenueCondition === 'AED 5,001–10,000') return p.revenue >= 5001 && p.revenue <= 10000;
        if (revenueCondition === 'AED 10,001–15,000') return p.revenue >= 10001 && p.revenue <= 15000;
        if (revenueCondition === 'AED 15,001+') return p.revenue >= 15001;
        return true;
      })()
    );
    const revenueMatch = revenueCondition === REVENUE_NO_FILTER
      || (revenueTypeMatch && revenueConditionMatch);
    const clientMatch = af.clients.length === 0     || af.clients.includes(p.client.name);

    const allMembers  = [...p.teamLeads, ...p.assignees].map(m => m.name);
    const assigneeMatch = af.assignees.length === 0 || af.assignees.some(a => allMembers.includes(a));

    /* due-days filter — days until due date from today */
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = parseDueDate(p.dueDate);
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - today.getTime()) / 86_400_000)
      : null;

    const dueDaysMatch = af.dueDays.length === 0 || (() => {
      if (daysUntilDue === null) return true;
      return af.dueDays.some(range => {
        if (range === 'Today')     return daysUntilDue === 0;
        if (range === '1–7 Days')  return daysUntilDue >= 1 && daysUntilDue <= 7;
        if (range === '8–14 Days') return daysUntilDue >= 8 && daysUntilDue <= 14;
        if (range === '15–30 Days')return daysUntilDue >= 15 && daysUntilDue <= 30;
        if (range === '30–60 Days')return daysUntilDue >= 30 && daysUntilDue <= 60;
        if (range === '60+ Days')  return daysUntilDue > 60;
        return true;
      });
    })();

    const overdueDaysMatch = af.overdueDays.length === 0 || (() => {
      if (daysUntilDue === null || daysUntilDue >= 0) return true;
      const daysOver = Math.abs(daysUntilDue);
      return af.overdueDays.some(range => {
        if (range === '1–10 Days') return daysOver >= 1  && daysOver <= 10;
        if (range === '10–30 Days')return daysOver > 10  && daysOver <= 30;
        if (range === '30–60 Days')return daysOver > 30  && daysOver <= 60;
        if (range === '60+ Days')  return daysOver > 60;
        return true;
      });
    })();

    /* project timeline date filter */
    const periodMatch = (() => {
      const preset = af.dueDatePresets[0];
      if (preset === 'Today') return daysUntilDue === 0;
      if (preset === 'This Week') return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
      if (preset === 'This Month') return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 30;
      if (preset !== 'Custom Date Range' && !af.periodFrom && !af.periodTo) return true;
      if (!dueDate) return true;
      const from = af.periodFrom ? new Date(`${af.periodFrom}T00:00:00`) : null;
      const to   = af.periodTo   ? new Date(`${af.periodTo}T23:59:59`)   : null;
      if (from && dueDate < from) return false;
      if (to   && dueDate > to)   return false;
      return true;
    })();

    return statusMatch && searchMatch &&
      deptMatch && svcMatch && revenueMatch && clientMatch && assigneeMatch &&
      dueDaysMatch && overdueDaysMatch && periodMatch;
  };

  const filteredWithoutStatus = displayProjects.filter(p => matchesProjectFilters(p, 'All'));
  const statusCounts = STATUSES.reduce<Record<StatusOption, number>>((counts, { value }) => {
    counts[value] = filteredWithoutStatus.filter(project => matchesStatusTab(project, value)).length;
    return counts;
  }, {} as Record<StatusOption, number>);

  const filtered = displayProjects.filter(p => matchesProjectFilters(p, status));

  // Apply sort when active
  if (appliedSortBy) {
    const dir = appliedSortOrder === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      switch (appliedSortBy) {
        case 'project-name':
          return dir * a.title.localeCompare(b.title);
        case 'client-name':
          return dir * a.client.name.localeCompare(b.client.name);
        case 'department':
          return dir * a.serviceType.label.localeCompare(b.serviceType.label);
        case 'progress':
          return dir * (a.progress - b.progress);
        case 'task-count':
          return dir * (a.tasksTotal - b.tasksTotal);
        case 'due-date':
          return dir * (parseDue(a.dueDate) - parseDue(b.dueDate));
        case 'status':
          return dir * a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }

  const PAGE_SIZE = pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageProjects = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-white px-4 pt-5 pb-10 sm:px-6 sm:pt-6">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">Projects</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            Manage and track all your projects in one place
          </p>
        </div>
      </div>

      {/* ── Status tabs ── */}
      <div className="mt-5 -mx-4 sm:-mx-6">
        <Tabs value={status} onValueChange={v => { setStatus(v as StatusOption); setPage(1); }}>
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none bg-transparent p-0 border-b border-gray-200 px-4 sm:px-6 overflow-x-auto flex-nowrap scrollbar-none">
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
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">

        {/* Search — full width on mobile, fixed on desktop */}
        <div className="relative w-full sm:w-80">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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

        {/* Spacer — only on desktop */}
        <div className="hidden flex-1 sm:block" />

        {/* Filter controls — always in a row, wrap gracefully */}
        <div className="flex flex-wrap items-center gap-2">

        {/* ── Export + view toggle ── */}
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
        {/* ── Sort popover ── */}
        <Popover modal={false} open={sortOpen} onOpenChange={open => { if (open) openSort(); else setSortOpen(false); }}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                 'flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-[13px] font-medium transition-colors focus:outline-none',
                sortIsActive
                   ? 'border border-brand text-brand hover:bg-orange-50/50'
                   : 'border border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
              )}
            >
              <ArrowUpDown size={13} className={sortIsActive ? 'text-brand' : 'text-gray-500'} />
              Sort
            </button>
          </PopoverTrigger>

           <PopoverContent align="end" sideOffset={6} className="w-56 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">

            {/* ── Sort By header ── */}
            <div className="flex items-center justify-between px-1 pb-1 pt-0.5">
              <span className="text-[9.5px] font-bold uppercase tracking-widest text-gray-400">
                Sort By
              </span>
              {/* Clear only visible when a sort field is staged */}
              {pendingSortBy && (
                <button
                  onClick={clearSort}
                   className="text-[11.5px] font-semibold text-brand hover:text-brand/70 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Sort field options — plain rows, no dot */}
            <div className="space-y-0.5">
              {SORT_OPTIONS.map(({ value, label }) => {
                const isSelected = pendingSortBy === value;
                return (
                  <button
                    key={value}
                    onClick={() => setPendingSortBy(value)}
                    className={cn(
                       'flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors text-left outline-none',
                      isSelected
                        ? 'bg-orange-50 text-brand'
                        : 'text-gray-700 hover:bg-gray-100',
                    )}
                  >
                    {label}
                    {isSelected && <Check size={14} className="flex-shrink-0 text-brand" />}
                  </button>
                );
              })}
            </div>

            {/* ── Order section ── */}
            <div className="mt-1.5 border-t border-gray-100 pt-1.5">
              <div className="px-1 pb-1 text-[9.5px] font-bold uppercase tracking-widest text-gray-400">
                Order
              </div>
              <div className="space-y-0.5">
                {([
                  { value: 'asc'  as const, label: 'Ascending',  Icon: ArrowUp   },
                  { value: 'desc' as const, label: 'Descending', Icon: ArrowDown },
                ] as const).map(({ value, label, Icon }) => {
                  const isSelected = pendingSortOrder === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setPendingSortOrder(value)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-[7px] text-[13px] font-medium transition-colors outline-none',
                        isSelected
                          ? 'bg-orange-50 text-brand'
                          : 'text-gray-700 hover:bg-gray-100',
                      )}
                    >
                      <Icon size={12} className={isSelected ? 'text-brand' : 'text-gray-400'} />
                      {label}
                      {isSelected && <Check size={14} className="ml-auto flex-shrink-0 text-brand" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Cancel / Apply footer ── */}
            <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2">
              <button
                onClick={() => setSortOpen(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-[12.5px] font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applySort}
                disabled={!pendingSortBy}
                className={cn(
                  'flex-1 rounded-lg py-2 text-[12.5px] font-semibold transition-colors',
                  pendingSortBy
                    ? 'bg-brand text-white hover:bg-brand/90'
                    : 'cursor-not-allowed bg-orange-200 text-white',
                )}
              >
                Apply
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Filters */}
        <button
          onClick={() => {
            setPendingFilters(appliedFilters);
            setFilterDrawerOpen(true);
          }}
          className={cn(
            'relative flex h-9 items-center gap-1.5 rounded-lg border bg-white px-3 text-[13px] font-medium transition-colors focus:outline-none',
            filterActiveCount > 0
              ? 'border-brand text-brand hover:bg-orange-50/50'
              : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
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

        {view === 'list' && (
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
                        visibleColumns.size < PROJECT_COLUMN_OPTIONS.length
                          ? 'border-brand text-brand hover:bg-orange-50/50'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                      )}
                    >
                      <Columns3 size={13} className={visibleColumns.size < PROJECT_COLUMN_OPTIONS.length ? 'text-brand' : 'text-gray-500'} />
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
                    visibleColumns.size === PROJECT_COLUMN_OPTIONS.length
                      ? 'bg-orange-50 text-brand'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  Select All
                  {visibleColumns.size === PROJECT_COLUMN_OPTIONS.length && (
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
                  Project
                  <span className="ml-auto text-[10px] text-gray-400">Required</span>
                </button>
                {columnOrder.map(key => {
                  const col     = PROJECT_COLUMN_OPTIONS.find(c => c.key === key)!;
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
                      {col.label}
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>
          </TooltipProvider>
        )}

        {/* ── View toggle ── */}
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-0.5 rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setView('grid'); setPage(1); }}
                  aria-label="Grid View"
                  className={cn(
                    'flex h-7 w-8 items-center justify-center rounded-lg transition-colors',
                    view === 'grid'
                      ? 'bg-orange-50 text-brand'
                      : 'text-gray-400 hover:text-gray-600',
                  )}
                >
                  <LayoutGrid size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
              >
                Grid View
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => { setView('list'); setPage(1); }}
                  aria-label="List View"
                  className={cn(
                    'flex h-7 w-8 items-center justify-center rounded-lg transition-colors',
                    view === 'list'
                      ? 'bg-orange-50 text-brand'
                      : 'text-gray-700 hover:text-gray-800',
                  )}
                >
                  <AlignJustify size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="bottom"
                sideOffset={6}
                className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
              >
                List View
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        </div>{/* end filter controls */}
      </div>{/* end toolbar */}

      {/* ── Active filter chips ── */}
      {filterActiveCount > 0 && (() => {
        const af = appliedFilters;
        const chips: ActiveFilterChip[] = [];

        const arrayChip = (
          key: keyof Pick<FilterState, 'departments'|'services'|'dueDays'|'overdueDays'|'clients'|'assignees'|'tags'|'dueDatePresets'>,
          label: string,
        ) => {
          const vals = af[key] as string[];
          if (!vals.length) return;
          chips.push({
            key,
            label,
            value: vals.join(', '),
          });
        };

        const deptIdToName = Object.fromEntries(orgDepts.map(d => [d.id, d.name]));
        af.departments.forEach(deptId => {
          const name = deptIdToName[deptId] ?? deptId;
          chips.push({ key: makeActiveFilterChipKey('departments', deptId), label: 'Department', value: name });
        });
        arrayChip('services',       'Service');
        const revenueCondition = appliedFilters.revenueCondition
          || appliedFilters.revenueRanges?.[0]
          || REVENUE_NO_FILTER;
        if (revenueCondition !== REVENUE_NO_FILTER) {
          const revenueValue = appliedFilters.revenueValue?.trim();
          const revenueValueTo = appliedFilters.revenueValueTo?.trim();
          const amountLabel = revenueCondition === 'Between'
            ? `${revenueValue}–${revenueValueTo} AED`
            : revenueValue
              ? `${revenueValue} AED`
              : '';
          chips.push({
            key: 'revenueCondition',
            label: 'Revenue',
            value: `${appliedFilters.revenueType || 'Main Revenue'} · ${revenueCondition}${amountLabel ? ` (${amountLabel})` : ''}`,
          });
        }
        arrayChip('dueDays',        'Due Days');
        arrayChip('overdueDays',    'Overdue');
        arrayChip('clients',        'Client');
        arrayChip('assignees',      'Assignee');
        arrayChip('tags',           'Tags');
        arrayChip('dueDatePresets', 'Due Date');
        if (af.periodFrom) chips.push({ key: 'periodFrom', label: 'From', value: af.periodFrom });
        if (af.periodTo)   chips.push({ key: 'periodTo',   label: 'To',   value: af.periodTo });

        function removeChip(key: string) {
          const arrayKeys = ['departments','services','dueDays','overdueDays','clients','assignees','tags','dueDatePresets'] as const;
          const parsed = parseActiveFilterChipKey(key);
          if ((arrayKeys as readonly string[]).includes(parsed.filterKey)) {
            const arrayKey = parsed.filterKey as typeof arrayKeys[number];
            const next = {
              ...appliedFilters,
              [arrayKey]: parsed.value === null
                ? []
                : appliedFilters[arrayKey].filter(value => value !== parsed.value),
            };
            setAppliedFilters(next);
            setPendingFilters(next);
          } else if (parsed.filterKey === 'revenueCondition') {
            const next = {
              ...appliedFilters,
              revenueCondition: REVENUE_NO_FILTER,
              revenueValue: '',
              revenueValueTo: '',
              revenueRanges: [],
            };
            setAppliedFilters(next);
            setPendingFilters(next);
          } else {
            const next = { ...appliedFilters, [parsed.filterKey as 'periodFrom' | 'periodTo']: '' };
            setAppliedFilters(next);
            setPendingFilters(next);
          }
          setPage(1);
        }

        return (
          <ActiveFilterChips
            chips={chips}
            onRemove={removeChip}
            onClearAll={() => {
              setAppliedFilters(EMPTY_FILTERS);
              setPendingFilters(EMPTY_FILTERS);
              setPage(1);
            }}
          />
        );
      })()}

      {/* ── Urgency summary cards (hidden for All Status and Archived) ── */}
      {(() => {
        const urgency = buildUrgencyCards(status, MOCK_PROJECTS);
        if (!urgency) return null;
        const { cards, scheme } = urgency;
        const StatusIcon = STATUS_ICONS[status as keyof typeof STATUS_ICONS] ?? TriangleAlert;
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
                  scheme.bg,
                  scheme.border,
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

      {/* ── Project grid / table ── */}
      {filtered.length === 0 ? (
        /* ── Empty state ── */
        displayProjects.length === 0 ? (
          /* New user — no projects exist yet */
          <Empty
            icon={FolderOpen}
            title="No projects yet"
            description="Your projects will appear here once they have been created and assigned to you."
            className="mt-6"
          />
        ) : (
          /* Projects exist but filters/search returned nothing */
          <Empty
            icon={SearchX}
            title="No matching projects"
            description="Try adjusting your search or filters to find what you're looking for."
            className="mt-6"
          />
        )
      ) : view === 'list' ? (
        <ProjectsTable
          projects={pageProjects}
          selectedIds={selectedIds}
          visibleColumns={
            status === 'Completed'
              ? new Set([...visibleColumns].filter(c => c !== 'reassignNote'))
              : visibleColumns
          }
          columnOrder={columnOrder}
          onColumnReorder={setColumnOrder}
          onToggle={toggleSelect}
          sortKey={appliedSortBy}
          sortDir={appliedSortOrder}
          onSort={handleHeaderSort}
          disableAllSelection={status === 'Archived'}
          onResume={(id) => {
            setResumeTargetId(id);
            setResumeDialogOpen(true);
          }}
          onSelectAll={() => {
            const selectablePageProjects = pageProjects.filter(
              p => p.status !== 'Completed' && p.status !== 'Archived',
            );
            if (selectablePageProjects.length === 0) return;

            const allSelected = selectablePageProjects.every(p => selectedIds.has(p.id));
            if (allSelected) {
              // deselect all visible
              setSelectedIds(prev => {
                const next = new Set(prev);
                selectablePageProjects.forEach(p => next.delete(p.id));
                return next;
              });
            } else {
              // select all visible
              setSelectedIds(prev => {
                const next = new Set(prev);
                selectablePageProjects.forEach(p => next.add(p.id));
                return next;
              });
            }
          }}
        />
      ) : (
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageProjects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              isSelected={selectedIds.has(p.id)}
              onToggle={() => toggleSelect(p.id)}
              disableAllSelection={status === 'Archived'}
              onResume={p.status === 'On Hold' ? () => handleResume(p.id) : undefined}
            />
          ))}
        </div>
      )}
      <ProjectsPagination
        page={safePage}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        pageSizeOptions={view === 'grid' ? [12, 30, 60, 90] : [10, 12, 20, 50]}
      />

      {/* ── Filter drawer ── */}
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        pending={pendingFilters}
        onChange={setPendingFilters}
        onApply={() => {
          setAppliedFilters(pendingFilters);
          setPage(1);
        }}
        onApplyDirect={(f) => {
          setPendingFilters(f);
          setAppliedFilters(f);
          setPage(1);
        }}
        onReset={() => {
          setPendingFilters(EMPTY_FILTERS);
          setAppliedFilters(EMPTY_FILTERS);
          setPage(1);
        }}
        storageKey="finanshels-projects-filters"
      />

      {/* ── Bulk action bar ── */}
      <BulkActionBar
        count={selectedIds.size}
        onReassign={() => setReassignDrawerOpen(true)}
        onEditDeadline={() => setEditDeadlineOpen(true)}
        onHold={() => {
          if (allSelectedOnHold) {
            setResumeDrawerOpen(true);
          }
          else setHoldDrawerOpen(true);
        }}
        showResume={allSelectedOnHold}
        onDelete={() => setDeleteDialogOpen(true)}
        onClear={clearSelection}
      />

      {/* ── Delete project drawer ── */}
      <DeleteProjectDrawer
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        projects={selectedProjectRecords.map(p => ({
          title:        getProjectDisplayName(p),
          dueDate:      p.dueDate.replace(/^Due\s+/i, ''),
          clientName:   p.client.name,
          serviceOpted: p.serviceType.label,
        }))}
        onConfirm={(reason, _deleteAll) => {
          const count = selectedIds.size;
          if (reason.trim()) {
            [...selectedIds].forEach(id => {
              localStorage.setItem(`fh_delete_reason_${id}`, reason.trim());
            });
          }
          setDeletedIds(prev => new Set([...prev, ...selectedIds]));
          clearSelection();
          toast.success(`${count} ${count === 1 ? 'project' : 'projects'} deleted`, {
            description: 'The selected projects were removed successfully.',
            duration: 4000,
          });
        }}
      />

      {/* ── Bulk resume confirmation ── */}
      <Dialog
        open={resumeDialogOpen}
        onOpenChange={open => {
          setResumeDialogOpen(open);
          if (!open) setResumeTargetId(null);
        }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <PlayCircle size={20} className="text-brand" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Resume {resumeTargetId || selectedIds.size === 1 ? 'Project' : 'Projects'}
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to resume{' '}
              <span className="font-medium text-gray-700">
                {resumeTargetId
                  ? displayProjects.find(p => p.id === resumeTargetId)?.title ?? 'this project'
                  : `${selectedIds.size} ${selectedIds.size === 1 ? 'selected project' : 'selected projects'}`}
              </span>
              ? Work and tasks will become active again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                setResumeDialogOpen(false);
                setResumeTargetId(null);
              }}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const idsToResume = resumeTargetId ? [resumeTargetId] : [...selectedIds];
                const count = idsToResume.length;
                setResumedIds(prev => new Set([...prev, ...idsToResume]));
                setResumeDialogOpen(false);
                setResumeTargetId(null);
                clearSelection();
                toast.success(`${count} ${count === 1 ? 'project' : 'projects'} resumed`, {
                  description: 'The selected projects are active again.',
                  duration: 4000,
                });
              }}
              className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Resume
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reassign drawer ── */}
      <BulkReassignDrawer
        open={reassignDrawerOpen}
        onClose={() => setReassignDrawerOpen(false)}
        count={selectedIds.size}
        projects={selectedProjects}
        onConfirm={(reason) => {
          const n = selectedIds.size;
          if (reason) {
            [...selectedIds].forEach(id => {
              localStorage.setItem(`fh_reassign_reason_${id}`, reason);
            });
          }
          setReassignDrawerOpen(false);
          clearSelection();
          toast.success(`${n} ${n === 1 ? 'project' : 'projects'} reassigned`, {
            description: 'Team assignments have been updated successfully.',
            duration: 4000,
          });
        }}
      />

      {/* ── Hold project drawer ── */}
      <HoldProjectDrawer
        open={holdDrawerOpen}
        onClose={() => setHoldDrawerOpen(false)}
        count={selectedIds.size}
        onConfirm={(reason, _includeRecurring) => {
          const n = selectedIds.size;
          if (reason.trim()) {
            [...selectedIds].forEach(id => {
              localStorage.setItem(`fh_hold_reason_${id}`, reason.trim());
            });
          }
          setHoldDrawerOpen(false);
          clearSelection();
          toast.success(`${n} ${n === 1 ? 'project' : 'projects'} put on hold`, {
            description: 'All work and tasks have been paused.',
            duration: 4000,
          });
        }}
      />

      {/* ── Bulk resume project drawer ── */}
      <HoldProjectDrawer
        open={resumeDrawerOpen}
        onClose={() => setResumeDrawerOpen(false)}
        count={selectedIds.size}
        mode="resume"
        onConfirm={(_reason, _includeRecurring) => {
          const n = selectedIds.size;
          setResumedIds(prev => new Set([...prev, ...selectedIds]));
          setResumeDrawerOpen(false);
          clearSelection();
          toast.success(`${n} ${n === 1 ? 'project' : 'projects'} resumed`, {
            description: 'All work and tasks are active again.',
            duration: 4000,
          });
        }}
      />

      {/* ── Edit deadline drawer ── */}
      <EditDeadlineDrawer
        open={editDeadlineOpen}
        onClose={() => setEditDeadlineOpen(false)}
        count={selectedIds.size}
        projects={selectedProjects}
        onConfirm={() => {
          const n = selectedIds.size;
          clearSelection();
          toast.success(`${n} ${n === 1 ? 'project deadline' : 'project deadlines'} updated`, {
            description: 'The selected project deadlines have been changed.',
            duration: 4000,
          });
        }}
      />
    </div>
  );
}
