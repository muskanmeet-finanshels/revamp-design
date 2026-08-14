'use client';

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, ChevronDown, ChevronUp, Plus,
  Clock, SearchX, ArrowLeft, Pencil, Check, GripVertical,
  ArrowDown, ArrowUp, ArrowUpDown, Trash2,
  MessageSquare,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/empty';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ProjectsPagination } from '@/screens/projects/ProjectsPagination';
import {
  DrawerField, DrawerInput, DrawerSelect, DrawerTextarea,
} from '@/components/ui/drawer-fields';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  MOCK_TIMESHEETS, MOCK_ATTENDANCE,
  type TimesheetRecord, type TimesheetStatus, type AttendanceStatus,
} from './mock-data';
import { MOCK_PROJECTS } from '@/screens/projects/mock-data';
import { MOCK_TASKS } from '@/screens/tasks/mock-data';
import { AttendanceCalendar } from './AttendanceCalendar';
import { toast } from 'sonner';

/* ── constants ── */
const DEFAULT_PAGE_SIZE = 10;

type StatusFilter = 'All' | TimesheetStatus;
const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'All',                    label: 'All Status'            },
  { value: 'Draft',                  label: 'Draft'                 },
  { value: 'Submitted',              label: 'Submitted'             },
  { value: 'Approved',               label: 'Approved'              },
  { value: 'Rejected',               label: 'Rejected'              },
  { value: 'Correction Required',    label: 'Correction Required'   },
  { value: 'Clarification Required', label: 'Clarification Required'},
];

type AttendanceFilter = 'All' | AttendanceStatus;
const ATTENDANCE_STATUS_OPTIONS: Array<{ value: AttendanceFilter; label: string }> = [
  { value: 'All',      label: 'All Status' },
  { value: 'Present',  label: 'Present'    },
  { value: 'Late',     label: 'Late'       },
  { value: 'Absent',   label: 'Absent'     },
  { value: 'Half Day', label: 'Half Day'   },
  { value: 'Remote',   label: 'Remote'     },
];

/* ── Status chip ── */
const STATUS_CHIP: Record<TimesheetStatus, { label: string; cls: string }> = {
  Draft:                  { label: 'Draft',                  cls: 'border border-gray-200    bg-gray-50     text-gray-600'    },
  Submitted:              { label: 'Submitted',              cls: 'border border-blue-200    bg-blue-50     text-blue-700'    },
  Approved:               { label: 'Approved',               cls: 'border border-emerald-200 bg-emerald-50  text-emerald-700' },
  Rejected:               { label: 'Rejected',               cls: 'border border-red-200     bg-red-50      text-red-600'     },
  'Correction Required':  { label: 'Correction Required',    cls: 'border border-amber-200   bg-amber-50    text-amber-700'   },
  'Clarification Required':{ label: 'Clarification Required', cls: 'border border-violet-200  bg-violet-50   text-violet-700'  },
};

const REJECTED_STATUS_OPTIONS: Array<{ status: TimesheetStatus; label: string }> = [
  { status: 'Approved',                label: 'Approve' },
  { status: 'Correction Required',     label: 'Correction Required' },
  { status: 'Clarification Required',  label: 'Clarification Required' },
  { status: 'Rejected',                label: 'Reject' },
];

const ATTENDANCE_CHIP: Record<AttendanceStatus, { label: string; cls: string }> = {
  Present:  { label: 'Present',  cls: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  Late:     { label: 'Late',     cls: 'border border-amber-200  bg-amber-50   text-amber-700'   },
  Absent:   { label: 'Absent',   cls: 'border border-red-200    bg-red-50     text-red-600'     },
  'Half Day':{ label: 'Half Day', cls: 'border border-orange-200 bg-orange-50  text-orange-700'  },
  Remote:   { label: 'Remote',   cls: 'border border-violet-200 bg-violet-50  text-violet-700'  },
};

type TimesheetSortKey =
  | 'name'
  | 'filingPeriod'
  | 'submittedOn'
  | 'totalHours'
  | 'approvedBy'
  | 'status';

type SortDirection = 'asc' | 'desc';

/* ── Timesheet drag-and-drop column order ── */
export type TimesheetColumnKey =
  | 'filingPeriod' | 'submittedOn' | 'totalHours' | 'approvedBy' | 'status' | 'action';

const TIMESHEET_COLUMN_OPTIONS: Array<{ key: TimesheetColumnKey; label: string; sortKey?: TimesheetSortKey }> = [
  { key: 'filingPeriod', label: 'Filing Period', sortKey: 'filingPeriod' },
  { key: 'submittedOn',  label: 'Submitted On',  sortKey: 'submittedOn' },
  { key: 'totalHours',   label: 'Total Hours',   sortKey: 'totalHours' },
  { key: 'approvedBy',   label: 'Approved By',   sortKey: 'approvedBy' },
  { key: 'status',       label: 'Status',         sortKey: 'status' },
  { key: 'action',       label: 'Action' },
];
const TS_COL_ORDER_KEY = 'fh_timesheets_column_order';

function normalizeTimesheetColumnOrder(value: unknown): TimesheetColumnKey[] | null {
  if (!Array.isArray(value)) return null;
  const available = new Set<TimesheetColumnKey>(TIMESHEET_COLUMN_OPTIONS.map(c => c.key));
  const valid = [...new Set((value as unknown[]).filter((k): k is TimesheetColumnKey =>
    typeof k === 'string' && available.has(k as TimesheetColumnKey),
  ))];
  const missing = TIMESHEET_COLUMN_OPTIONS.map(c => c.key).filter(k => !valid.includes(k));
  return valid.length ? [...valid, ...missing] : null;
}

function useTimesheetColumnOrder() {
  const [order, setOrder] = useState<TimesheetColumnKey[]>(
    () => TIMESHEET_COLUMN_OPTIONS.map(c => c.key),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(TS_COL_ORDER_KEY);
      if (stored) {
        const saved = normalizeTimesheetColumnOrder(JSON.parse(stored));
        if (saved) setOrder(saved);
      }
    } catch { /* ignore */ }
    setHydrated(true);

    function onStorage(e: StorageEvent) {
      if (e.key !== TS_COL_ORDER_KEY || !e.newValue) return;
      try {
        const saved = normalizeTimesheetColumnOrder(JSON.parse(e.newValue));
        if (saved) setOrder(saved);
      } catch { /* ignore */ }
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(TS_COL_ORDER_KEY, JSON.stringify(order)); } catch { /* ignore */ }
  }, [order, hydrated]);

  return [order, setOrder] as const;
}

function SortableHead({
  label,
  sortKey,
  currentKey,
  currentDirection,
  onSort,
  className,
}: {
  label: string;
  sortKey: TimesheetSortKey;
  currentKey: TimesheetSortKey | null;
  currentDirection: SortDirection;
  onSort: (key: TimesheetSortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}`}
      className={cn(
        'flex items-center gap-1 text-left text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
        active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
        className,
      )}
    >
      {label}
      {active
        ? currentDirection === 'asc'
          ? <ArrowUp size={11} className="text-brand" />
          : <ArrowDown size={11} className="text-brand" />
        : <ArrowUpDown size={11} className="opacity-40" />
      }
    </button>
  );
}

function compareTimesheets(
  a: typeof MOCK_TIMESHEETS[number],
  b: typeof MOCK_TIMESHEETS[number],
  key: TimesheetSortKey,
): number {
  if (key === 'totalHours') return a.totalHours - b.totalHours;

  if (key === 'submittedOn') {
    if (!a.submittedOn && !b.submittedOn) return 0;
    if (!a.submittedOn) return 1;
    if (!b.submittedOn) return -1;
    return a.submittedOn.localeCompare(b.submittedOn);
  }

  if (key === 'filingPeriod') {
    const aStart = Date.parse(a.filingPeriod.split('–')[0].trim());
    const bStart = Date.parse(b.filingPeriod.split('–')[0].trim());
    return aStart - bStart;
  }

  const aValue = key === 'approvedBy' ? (a.approvedBy ?? '') : a[key];
  const bValue = key === 'approvedBy' ? (b.approvedBy ?? '') : b[key];
  if (!aValue && !bValue) return 0;
  if (!aValue) return 1;
  if (!bValue) return -1;
  return String(aValue).localeCompare(String(bValue), undefined, { sensitivity: 'base' });
}

function sortTimesheets(
  records: typeof MOCK_TIMESHEETS,
  sortKey: TimesheetSortKey | null,
  sortDirection: SortDirection,
) {
  if (!sortKey) return records;
  return [...records].sort((a, b) => {
    const aEmpty = sortKey === 'submittedOn'
      ? !a.submittedOn
      : sortKey === 'approvedBy'
        ? !a.approvedBy
        : false;
    const bEmpty = sortKey === 'submittedOn'
      ? !b.submittedOn
      : sortKey === 'approvedBy'
        ? !b.approvedBy
        : false;
    if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;

    const result = compareTimesheets(a, b, sortKey);
    return sortDirection === 'asc' ? result : -result;
  });
}

/* ── Name cell ── */
function PersonName({ name }: { name: string }) {
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="block max-w-[180px] cursor-default truncate text-[13px] font-normal text-gray-900">
            {name}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
        >
          {name}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ── Add Timesheet drawer ── */
const DAY_TYPE_OPTIONS = [
  'Working Day',
  'Holiday',
  'Sick Leave',
  'Vacation',
  'Personal Leave',
  'Weekend',
] as const;

const TIME_ENTRY_WORK_TYPES = [
  'Client Work',
  'Internal Work',
] as const;

const TIMESHEET_CLIENTS = Array.from(
  new Set(MOCK_PROJECTS.map(project => project.client.name)),
).sort();

function SearchableDrawerSelect({
  placeholder,
  options,
  value,
  onChange,
  disabled = false,
  drawerOpen,
}: {
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  drawerOpen: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!drawerOpen) setOpen(false);
  }, [drawerOpen]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPanelStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const timer = window.setTimeout(() => searchRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(target) &&
        panelRef.current && !panelRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const visibleOptions = options.filter(option =>
    option.toLowerCase().includes(query.toLowerCase()),
  );
  const hasValue = Boolean(value);

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', ...panelStyle }}
      className="overflow-hidden overscroll-contain rounded-xl border border-gray-100 bg-white shadow-xl"
    >
      <div className="p-2 pb-1.5">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
          <Search size={13} className="flex-shrink-0 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search..."
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-800 outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-gray-600 transition-colors hover:bg-gray-300"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </div>

      <ul className="max-h-[220px] overflow-y-auto p-2 pt-1">
        {visibleOptions.length > 0 ? visibleOptions.map(option => {
          const selected = option === value;
          return (
            <li key={option}>
              <button
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                  setQuery('');
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors',
                  selected
                    ? 'bg-orange-50 font-medium text-brand'
                    : 'text-gray-800 hover:bg-gray-100',
                )}
              >
                {option}
                {selected && <Check size={13} className="flex-shrink-0 text-brand" strokeWidth={2.5} />}
              </button>
            </li>
          );
        }) : (
          <li className="px-3 py-3 text-center text-[12px] text-gray-400">No results</li>
        )}
      </ul>

      {hasValue && (
        <>
          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
              setQuery('');
            }}
            className="w-full px-3 py-2.5 text-left text-[13px] font-medium text-brand transition-colors hover:bg-orange-50/40"
          >
            Clear selection
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen(current => !current);
        }}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-xl border bg-white px-4 text-[13px] transition-colors focus:outline-none',
          disabled
            ? 'cursor-not-allowed border-gray-100 bg-gray-50'
            : open || hasValue
              ? 'border-brand'
              : 'border-gray-200 hover:border-gray-300',
        )}
      >
        <span className={cn(
          'truncate text-left',
          disabled ? 'text-gray-300' : hasValue ? 'text-gray-900' : 'text-gray-400',
        )}>
          {hasValue ? value : placeholder}
        </span>
        {open
          ? <ChevronUp size={15} className={cn('flex-shrink-0', disabled ? 'text-gray-300' : 'text-gray-500')} />
          : <ChevronDown size={15} className={cn('flex-shrink-0', disabled ? 'text-gray-200' : 'text-gray-400')} />}
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

/* ── TimeEntry ── */
interface TimeEntry {
  id:       string;
  date:     string;
  dayType:  string;
  duration: string;
  workType: string;
  client:   string;
  project:  string;
  task:     string;
  quantity: string;
  note:     string;
}
function makeEntryId() { return Math.random().toString(36).slice(2, 10); }

type TimesheetCommentRole = 'User' | 'Client' | 'Admin';

interface TimesheetComment {
  id: string;
  author: string;
  role: TimesheetCommentRole;
  initials: string;
  text: string;
  createdAt: string;
}

const COMMENT_ROLE_STYLES: Record<TimesheetCommentRole, string> = {
  User: 'border-blue-200 bg-blue-50 text-blue-700',
  Client: 'border-violet-200 bg-violet-50 text-violet-700',
  Admin: 'border-orange-200 bg-orange-50 text-orange-700',
};

const COMMENT_AVATAR_STYLES = [
  { bg: 'bg-blue-100', text: 'text-blue-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-600' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700' },
];

function commentAvatarStyle(author: string) {
  let hash = 0;
  for (let index = 0; index < author.length; index++) {
    hash = (hash * 31 + author.charCodeAt(index)) >>> 0;
  }
  return COMMENT_AVATAR_STYLES[hash % COMMENT_AVATAR_STYLES.length] ?? COMMENT_AVATAR_STYLES[0];
}

function formatCommentDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }) + `, ${date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })}`;
}

function seedTimesheetComments(record: TimesheetRecord): TimesheetComment[] {
  const submittedAt = record.submittedOn
    ? new Date(`${record.submittedOn}T09:15:00`)
    : new Date('2026-08-01T09:15:00');
  const clientName = ['Acme Corp', 'Northstar Holdings', 'Brightline Media', 'Vertex Systems'][
    record.id.charCodeAt(record.id.length - 1) % 4
  ] ?? 'Acme Corp';

  return [
    {
      id: `${record.id}-user-comment`,
      author: record.name,
      role: 'User',
      initials: record.name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      text: 'I have completed and submitted this timesheet for review.',
      createdAt: submittedAt.toISOString(),
    },
    {
      id: `${record.id}-client-comment`,
      author: clientName,
      role: 'Client',
      initials: clientName.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase(),
      text: 'Please check the client work entries and confirm the hours are allocated to the correct project.',
      createdAt: new Date(submittedAt.getTime() + 45 * 60 * 1000).toISOString(),
    },
    ...(record.status === 'Clarification Required' || record.status === 'Correction Required'
      ? [{
          id: `${record.id}-admin-comment`,
          author: 'Wade Warren',
          role: 'Admin' as const,
          initials: 'WW',
          text: record.status === 'Correction Required'
            ? 'Please update the highlighted entries before this timesheet is submitted again.'
            : 'Could you clarify the client work recorded on the last day of this filing period?',
          createdAt: new Date(submittedAt.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        }]
      : []),
  ];
}

function TimesheetCommentsSection({
  comments,
  onAdd,
  className,
  fullHeight = false,
  composerLabel = 'Add an admin comment…',
  statusOptions,
  onStatusChange,
}: {
  comments: TimesheetComment[];
  onAdd: (text: string) => void;
  className?: string;
  fullHeight?: boolean;
  composerLabel?: string;
  statusOptions?: Array<{ status: TimesheetStatus; label: string }>;
  onStatusChange?: (status: TimesheetStatus, comment: string) => void;
}) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TimesheetStatus | ''>('');

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || submitting || (statusOptions && !selectedStatus)) return;
    setSubmitting(true);
    window.setTimeout(() => {
      if (selectedStatus && onStatusChange) {
        onStatusChange(selectedStatus, trimmed);
        setSelectedStatus('');
      } else {
        onAdd(trimmed);
      }
      setText('');
      setSubmitting(false);
    }, 160);
  }

  return (
    <section className={cn(
      fullHeight ? 'flex h-full min-h-0 flex-col' : 'mt-7 border-t border-gray-100 pt-5',
      className,
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            <MessageSquare size={13} />
            Comments
          </p>
        </div>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-500">
          {comments.length}
        </span>
      </div>

      <div className={cn(
        fullHeight
          ? 'min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 pt-5'
          : 'mt-3 space-y-4',
      )}>
        {comments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-5 text-center">
            <p className="text-[12px] text-gray-400">No comments yet.</p>
          </div>
        ) : comments.map(comment => {
          const avatar = commentAvatarStyle(comment.author);
          return (
            <div key={comment.id} className="flex items-start gap-2.5">
              <div className={cn(
                'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full',
                avatar.bg,
              )}>
                <span className={cn('text-[10px] font-semibold', avatar.text)}>
                  {comment.initials}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[12.5px] font-semibold text-gray-900">{comment.author}</span>
                  <span className={cn(
                    'rounded-full border px-1.5 py-px text-[10px] font-semibold',
                    COMMENT_ROLE_STYLES[comment.role],
                  )}>
                    {comment.role}
                  </span>
                  <span className="text-[10.5px] text-gray-400">{formatCommentDate(comment.createdAt)}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700">
                  {comment.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex-shrink-0 rounded-xl border border-gray-200 bg-gray-50/60 p-3">
        <textarea
          value={text}
          onChange={event => setText(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) handleSubmit();
          }}
          placeholder={composerLabel}
          rows={2}
          className="w-full resize-none bg-transparent text-[13px] text-gray-800 outline-none placeholder:text-gray-400"
        />
        <div className={cn(
          'mt-2 flex items-center gap-2',
          statusOptions ? 'justify-end' : 'justify-between',
        )}>
          {!statusOptions && (
            <span className="shrink-0 text-[10.5px] text-gray-400">⌘ + Enter to submit</span>
          )}
          <div className="flex shrink-0 items-center gap-2">
            {statusOptions && onStatusChange && (
              <Select
                value={selectedStatus}
                disabled={submitting || !text.trim()}
                onValueChange={value => setSelectedStatus(value as TimesheetStatus)}
              >
                <SelectTrigger
                  aria-required="true"
                  aria-label="Change status (required)"
                  className="h-8 min-w-[150px] rounded-lg border border-gray-200 bg-white px-2.5 text-[12px] font-medium text-gray-700 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SelectValue placeholder="Change status *" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                  {statusOptions.map(option => (
                    <SelectItem
                      key={option.status}
                      value={option.status}
                      className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[12px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium"
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || submitting || Boolean(statusOptions && !selectedStatus)}
              className="flex h-8 min-w-[104px] shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-brand px-3 text-[12px] font-medium text-white transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? 'Adding…' : 'Add Comment'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AddTimesheetDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);

  /* entries list */
  const [entries, setEntries]           = useState<TimeEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null);
  const [deleteTimesheetOpen, setDeleteTimesheetOpen] = useState(false);
  const [submitApprovalOpen, setSubmitApprovalOpen] = useState(false);
  const [newEntryOpen, setNewEntryOpen] = useState(false);

  /* form */
  const [date, setDate]                 = useState('');
  const [dayType, setDayType]           = useState('');
  const [duration, setDuration]         = useState('');
  const [entryWorkType, setEntryWorkType] = useState('');
  const [client, setClient]             = useState('');
  const [project, setProject]           = useState('');
  const [task, setTask]                 = useState('');
  const [quantity, setQuantity]         = useState('');
  const [note, setNote]                 = useState('');
  const [timesheetComment, setTimesheetComment] = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function resetForm() {
    setDate(''); setDayType(''); setDuration(''); setEntryWorkType('');
    setClient(''); setProject(''); setTask(''); setQuantity(''); setNote('');
    setTimesheetComment('');
    setEditingEntry(null);
  }

  function resetEntryFields() {
    setDuration('');
    setEntryWorkType('');
    setClient('');
    setProject('');
    setTask('');
    setQuantity('');
    setNote('');
  }

  useEffect(() => {
    if (open) {
      resetForm();
      setEntries([]);
      setDeleteTarget(null);
      setDeleteTimesheetOpen(false);
      setSubmitApprovalOpen(false);
      setNewEntryOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const projectOptions = MOCK_PROJECTS
    .filter(item => !client || item.client.name === client)
    .map(item => item.title)
    .filter((item, index, items) => items.indexOf(item) === index)
    .sort();

  const taskOptions = MOCK_TASKS
    .filter(item => item.projects.some(itemProject =>
      (!client || itemProject.clientName === client) &&
      (!project || itemProject.title === project),
    ))
    .map(item => item.name)
    .filter((item, index, items) => items.indexOf(item) === index)
    .sort();

  const validDuration = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/.test(duration);

  function formatTimeDuration(digits: string): string {
    const d = digits.replace(/\D/g, '').slice(0, 6);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}:${d.slice(2)}`;
    return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4)}`;
  }

  function handleDurationChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, '');
    setDuration(formatTimeDuration(digits));
  }

  function handleDurationKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace') {
      event.preventDefault();
      const digits = duration.replace(/\D/g, '');
      setDuration(formatTimeDuration(digits.slice(0, -1)));
    }
  }

  function handleDurationPaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text');
    const digits = pasted.replace(/\D/g, '');
    setDuration(formatTimeDuration(digits));
  }
  const showTimeEntry = Boolean(date && dayType);
  const showEntryFields = showTimeEntry && (entries.length === 0 || newEntryOpen);
  const canAddEntry   = Boolean(date && dayType && validDuration && entryWorkType && client && project && task);
  const canUpdateEntry = Boolean(date && validDuration && entryWorkType && client && project && task);
  const sharedEntryDetailsLocked = entries.length > 0 && !newEntryOpen;

  /* ── entry CRUD ── */
  function handleAddNew() {
    if (!canAddEntry) return;
    const entry: TimeEntry = {
      id: makeEntryId(),
      date, dayType, duration, workType: entryWorkType,
      client, project, task, quantity, note,
    };
    setEntries(prev => [...prev, entry]);
    toast.success('Time entry added');
    resetEntryFields();
    setNewEntryOpen(false);
  }

  function handleOpenEditEntry(entry: TimeEntry) {
    setDate(entry.date);
    setDayType(entry.dayType);
    setDuration(entry.duration);
    setEntryWorkType(entry.workType);
    setClient(entry.client);
    setProject(entry.project);
    setTask(entry.task);
    setQuantity(entry.quantity);
    setNote(entry.note);
    setEditingEntry(entry);
    setNewEntryOpen(false);
  }

  function handleSaveEditEntry() {
    if (!editingEntry || !canUpdateEntry) return;
    const updated: TimeEntry = {
      ...editingEntry,
      date, dayType, duration, workType: entryWorkType,
      client, project, task, quantity, note,
    };
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    toast.success('Time entry updated');
    resetEntryFields();
    setEditingEntry(null);
  }

  function handleCancelEditEntry() {
    setDate(entries[0]?.date ?? '');
    setDayType(entries[0]?.dayType ?? '');
    resetEntryFields();
    setNewEntryOpen(false);
    setEditingEntry(null);
  }

  function handleCancelNew() {
    const sharedEntry = entries[0];
    if (sharedEntry) {
      setDate(sharedEntry.date);
      setDayType(sharedEntry.dayType);
      resetEntryFields();
      setNewEntryOpen(false);
    } else {
      resetForm();
      setNewEntryOpen(false);
    }
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
    if (editingEntry?.id === deleteTarget.id) {
      setEditingEntry(null);
      resetForm();
    }
    setDeleteTarget(null);
    toast.success('Time entry removed');
  }

  function handleSave() {
    if (entries.length === 0) return;
    setSubmitApprovalOpen(true);
  }

  function handleConfirmSubmit() {
    setSubmitApprovalOpen(false);
    toast.success(
      timesheetComment.trim()
        ? 'Timesheet submitted with comment for approval'
        : 'Timesheet submitted for approval',
    );
    onClose();
  }

  function handleConfirmDeleteTimesheet() {
    setEntries([]);
    resetForm();
    setNewEntryOpen(false);
    setDeleteTimesheetOpen(false);
    toast.success('Timesheet deleted');
    onClose();
  }

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={editingEntry ? undefined : onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Drawer panel */}
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {editingEntry ? (
          <>
            {/* Entry edit header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelEditEntry}
                  aria-label="Back to add timesheet"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <ArrowLeft size={17} />
                </button>
                <div>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-gray-400">
                    <button
                      type="button"
                      onClick={handleCancelEditEntry}
                      className="font-medium transition-colors hover:text-gray-600"
                    >
                      Add Timesheet
                    </button>
                    <span>/</span>
                    <span className="font-semibold text-gray-700">Edit Entry</span>
                  </div>
                  <p className="mt-px text-[12px] text-gray-500">
                    {date ? format(parseISO(date), 'dd MMM yyyy') : 'Choose a date'} · {dayType || 'Choose a day type'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveEditEntry}
                disabled={!canUpdateEntry}
                className={cn(
                  'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
                  canUpdateEntry ? 'bg-brand hover:bg-brand/90' : 'cursor-not-allowed bg-orange-200',
                )}
              >
                Update Entry
              </button>
            </div>

            {/* Entry edit form */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                <DrawerField label="Date" required hint="Choose the date this time entry applies to.">
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    placeholder="Select a date"
                  />
                </DrawerField>

                <DrawerField label="Day Type" required>
                  <Select value={dayType} onValueChange={setDayType}>
                    <SelectTrigger className={cn(
                      'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                      'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                      'data-[state=open]:border-brand',
                    )}>
                      <SelectValue placeholder="Select a day type…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                      {DAY_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}
                          className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DrawerField>

                <DrawerField label="Duration" required hint="Type digits — colons are added automatically, e.g. 08:30:00.">
                  <DrawerInput
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00:00"
                    value={duration}
                    onChange={handleDurationChange}
                    onKeyDown={handleDurationKeyDown}
                    onPaste={handleDurationPaste}
                    aria-invalid={Boolean(duration) && !validDuration}
                    maxLength={8}
                  />
                  {Boolean(duration) && !validDuration && (
                    <p className="text-[12px] text-red-500">Enter a full time, e.g. 08:30:00.</p>
                  )}
                </DrawerField>

                <DrawerField label="Work Type" required>
                  <Select value={entryWorkType} onValueChange={setEntryWorkType}>
                    <SelectTrigger className={cn(
                      'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                      'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                      'data-[state=open]:border-brand',
                    )}>
                      <SelectValue placeholder="Select a work type…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                      {TIME_ENTRY_WORK_TYPES.map(opt => (
                        <SelectItem key={opt} value={opt}
                          className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DrawerField>

                <DrawerField label="Client" required>
                  <SearchableDrawerSelect
                    placeholder="Select a client…"
                    options={TIMESHEET_CLIENTS}
                    value={client}
                    onChange={v => { setClient(v); setProject(''); setTask(''); }}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Project" required>
                  <SearchableDrawerSelect
                    placeholder={client ? 'Select a project…' : 'Select a client first…'}
                    options={projectOptions}
                    value={project}
                    onChange={v => { setProject(v); setTask(''); }}
                    disabled={!client}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Task" required>
                  <SearchableDrawerSelect
                    placeholder={project ? 'Select a task…' : 'Select a project first…'}
                    options={taskOptions}
                    value={task}
                    onChange={setTask}
                    disabled={!project}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Quantity" required>
                  <DrawerInput
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    placeholder="Enter quantity"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </DrawerField>

                <DrawerField label="Note">
                  <DrawerTextarea
                    rows={3}
                    placeholder="Add a note about this time entry…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </DrawerField>
              </div>
            </div>
          </>
        ) : (
          <>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close add timesheet drawer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">Add New Timesheet</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setDeleteTimesheetOpen(true)}
                      aria-label="Delete timesheet"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                    Delete
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={entries.length === 0}
              className={cn(
                'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
                entries.length > 0 ? 'bg-brand hover:bg-brand/90' : 'cursor-not-allowed bg-orange-200',
              )}
            >
              Submit for approval
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">

          {/* ── Entry cards ── */}
          {entries.length > 0 && (
            <div className="mb-6">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Added Entries
              </p>
              <div className="mt-2.5 max-h-[220px] space-y-2.5 overflow-y-auto pr-1">
                {entries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 transition-colors"
                  >
                    {/* Index badge */}
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                      {idx + 1}
                    </span>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-semibold text-gray-800">
                          {format(parseISO(entry.date), 'dd MMM yyyy')}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-500">
                          {entry.dayType}
                        </span>
                        <span className="ml-auto font-mono text-[13px] font-semibold text-gray-700">
                          {entry.duration}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-gray-500">
                        {entry.client} › {entry.project} › {entry.task}
                      </p>
                      {entry.note && (
                        <p className="mt-0.5 truncate text-[11px] italic text-gray-400">{entry.note}</p>
                      )}
                    </div>

                    {/* Edit / Delete */}
                  <TooltipProvider delayDuration={150}>
                    <div className="flex flex-shrink-0 items-center gap-0.5">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Edit"
                            onClick={() => handleOpenEditEntry(entry)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-brand"
                          >
                            <Pencil size={13} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                          Edit
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Delete"
                            onClick={() => setDeleteTarget(entry)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-red-500"
                          >
                            <Trash2 size={13} />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                          Delete
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Form fields ── */}
          <div className="space-y-5">
            <DrawerField label="Date" required hint="Choose the date this timesheet entry applies to.">
              <DatePicker
                value={date}
                onChange={setDate}
                max={format(new Date(), 'yyyy-MM-dd')}
                placeholder="Select a date"
                disabled={sharedEntryDetailsLocked}
              />
            </DrawerField>

            <DrawerField label="Day Type" required>
              <Select
                value={dayType}
                onValueChange={setDayType}
                disabled={sharedEntryDetailsLocked}
              >
                <SelectTrigger className={cn(
                  'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                  'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                  'data-[state=open]:border-brand',
                )}>
                  <SelectValue placeholder="Select a day type…" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                  {DAY_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}
                      className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </DrawerField>

            {showEntryFields && (
              <>
                <div className="border-t border-gray-100 pt-5">
                  <h3 className="text-[14px] font-semibold text-gray-900">Time Entry</h3>
                  <p className="mt-1 text-[12px] text-gray-500">Add the time spent and link it to a client task.</p>
                </div>

                <DrawerField label="Duration" required hint="Type digits — colons are added automatically, e.g. 08:30:00.">
                  <DrawerInput
                    type="text"
                    inputMode="numeric"
                    placeholder="00:00:00"
                    value={duration}
                    onChange={handleDurationChange}
                    onKeyDown={handleDurationKeyDown}
                    onPaste={handleDurationPaste}
                    aria-invalid={Boolean(duration) && !validDuration}
                    maxLength={8}
                  />
                  {Boolean(duration) && !validDuration && (
                    <p className="text-[12px] text-red-500">Enter a full time, e.g. 08:30:00.</p>
                  )}
                </DrawerField>

                <DrawerField label="Work Type" required>
                  <Select value={entryWorkType} onValueChange={setEntryWorkType}>
                    <SelectTrigger className={cn(
                      'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                      'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                      'data-[state=open]:border-brand',
                    )}>
                      <SelectValue placeholder="Select a work type…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                      {TIME_ENTRY_WORK_TYPES.map(opt => (
                        <SelectItem key={opt} value={opt}
                          className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DrawerField>

                <DrawerField label="Client" required>
                  <SearchableDrawerSelect
                    placeholder="Select a client…"
                    options={TIMESHEET_CLIENTS}
                    value={client}
                    onChange={v => { setClient(v); setProject(''); setTask(''); }}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Project" required>
                  <SearchableDrawerSelect
                    placeholder={client ? 'Select a project…' : 'Select a client first…'}
                    options={projectOptions}
                    value={project}
                    onChange={v => { setProject(v); setTask(''); }}
                    disabled={!client}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Task" required>
                  <SearchableDrawerSelect
                    placeholder={project ? 'Select a task…' : 'Select a project first…'}
                    options={taskOptions}
                    value={task}
                    onChange={setTask}
                    disabled={!project}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Quantity" required>
                  <DrawerInput
                    type="number" min="0" step="0.01" required placeholder="Enter quantity"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </DrawerField>

                <DrawerField label="Note">
                  <DrawerTextarea
                    rows={3}
                    placeholder="Add a note about this time entry…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </DrawerField>

              </>
            )}
          </div>

          {entries.length > 0 && (
            <div className="mt-6 border-t border-gray-100 pt-5">
              <DrawerField
                label="Comment"
                hint="Add a comment for the approver about this timesheet."
              >
                <DrawerTextarea
                  rows={3}
                  placeholder="Add a comment about this timesheet…"
                  value={timesheetComment}
                  onChange={e => setTimesheetComment(e.target.value)}
                />
              </DrawerField>
            </div>
          )}
        </div>
        {entries.length > 0 && !newEntryOpen ? (
          <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              onClick={() => {
                resetEntryFields();
                setNewEntryOpen(true);
              }}
              className="flex w-full items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand/90"
            >
              + Add Another Entry
            </button>
          </div>
        ) : showEntryFields && (
          <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2.5">
              {newEntryOpen && (
                <button
                  type="button"
                  onClick={handleCancelNew}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleAddNew}
                disabled={!canAddEntry}
                className={cn(
                  'flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-colors',
                  canAddEntry ? 'bg-brand hover:bg-brand/90' : 'cursor-not-allowed bg-orange-200',
                )}
              >
                Save Entry
              </button>
            </div>
          </div>
        )}
        </>
        )}
      </div>

      {/* ── Delete confirmation dialog ── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Delete Entry
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                {deleteTarget
                  ? `${format(parseISO(deleteTarget.date), 'dd MMM yyyy')} — ${deleteTarget.client} › ${deleteTarget.project}`
                  : 'this entry'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
              >
                Delete
              </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={submitApprovalOpen}
        onOpenChange={open => { if (!open) setSubmitApprovalOpen(false); }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-50">
              <Check size={20} className="text-brand" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Submit Timesheet for Approval
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to submit this timesheet for approval? You will not be able to edit it until it is reviewed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setSubmitApprovalOpen(false)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSubmit}
              className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand/90"
            >
              Submit for approval
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteTimesheetOpen}
        onOpenChange={open => { if (!open) setDeleteTimesheetOpen(false); }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Delete Timesheet
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to delete this timesheet? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeleteTimesheetOpen(false)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteTimesheet}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

/* ══════════════════════════════════════════
   Edit Timesheet drawer
   ══════════════════════════════════════════ */

/** Deterministically seed 2-3 mock time entries from a TimesheetRecord so the
 *  drawer opens pre-populated without a real API. */
function seedEntriesFromRecord(record: TimesheetRecord): TimeEntry[] {
  const clients = TIMESHEET_CLIENTS;
  const baseDate = record.submittedOn
    ? record.submittedOn
    : new Date().toISOString().slice(0, 10);

  // Use a simple hash of record.id to pick clients/projects/tasks
  const hash = record.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  function pickClient(offset: number) {
    return clients[(hash + offset) % clients.length] ?? clients[0] ?? '';
  }
  function pickProject(clientName: string, offset: number) {
    const opts = MOCK_PROJECTS
      .filter(p => p.client.name === clientName)
      .map(p => p.title)
      .filter((t, i, a) => a.indexOf(t) === i)
      .sort();
    return opts[(hash + offset) % Math.max(opts.length, 1)] ?? opts[0] ?? '';
  }
  function pickTask(clientName: string, projectTitle: string, offset: number) {
    const opts = MOCK_TASKS
      .filter(t => t.projects.some(p => p.clientName === clientName && p.title === projectTitle))
      .map(t => t.name)
      .filter((n, i, a) => a.indexOf(n) === i)
      .sort();
    if (opts.length === 0) {
      const all = MOCK_TASKS.map(t => t.name).filter((n, i, a) => a.indexOf(n) === i).sort();
      return all[(hash + offset) % Math.max(all.length, 1)] ?? 'General';
    }
    return opts[(hash + offset) % opts.length] ?? opts[0] ?? '';
  }

  const durations = ['08:00:00', '07:30:00', '06:45:00', '09:00:00', '05:00:00'];
  const dayTypes  = DAY_TYPE_OPTIONS as unknown as string[];
  const workTypes = TIME_ENTRY_WORK_TYPES as unknown as string[];
  const count     = (hash % 2) + 2; // 2 or 3 entries

  return Array.from({ length: count }, (_, i) => {
    const c = pickClient(i);
    const p = pickProject(c, i + 1);
    const t = pickTask(c, p, i + 2);
    // offset the date by i days back
    const d = new Date(baseDate);
    d.setDate(d.getDate() - i);
    return {
      id:       makeEntryId(),
      date:     d.toISOString().slice(0, 10),
      dayType:  dayTypes[(hash + i) % dayTypes.length] ?? 'Working Day',
      duration: durations[(hash + i) % durations.length] ?? '08:00:00',
      workType: workTypes[(hash + i) % workTypes.length] ?? 'Client Work',
      client:   c,
      project:  p,
      task:     t,
      quantity: '',
      note:     '',
    };
  });
}

function EditTimesheetDrawer({
  open,
  onClose,
  record,
}: {
  open: boolean;
  onClose: () => void;
  record: TimesheetRecord | null;
}) {
  const [mounted, setMounted] = useState(false);

  /* entries list */
  const [entries, setEntries]                         = useState<TimeEntry[]>([]);
  const [comments, setComments]                       = useState<TimesheetComment[]>([]);
  const [editTab, setEditTab]                         = useState<'entries' | 'comments'>('entries');
  const [localStatus, setLocalStatus]                 = useState<TimesheetStatus | null>(null);
  const [deleteTarget, setDeleteTarget]               = useState<TimeEntry | null>(null);
  const [deleteTimesheetOpen, setDeleteTimesheetOpen] = useState(false);
  const [newEntryOpen, setNewEntryOpen]               = useState(false);

  /* in-place entry-edit view */
  const [editingEntry, setEditingEntry] = useState<TimeEntry | null>(null);

  /* shared form state (used for both Add-new and Edit-entry views) */
  const [date, setDate]                   = useState('');
  const [dayType, setDayType]             = useState('');
  const [duration, setDuration]           = useState('');
  const [entryWorkType, setEntryWorkType] = useState('');
  const [client, setClient]               = useState('');
  const [project, setProject]             = useState('');
  const [task, setTask]                   = useState('');
  const [quantity, setQuantity]           = useState('');
  const [note, setNote]                   = useState('');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function resetForm() {
    setDate(''); setDayType(''); setDuration(''); setEntryWorkType('');
    setClient(''); setProject(''); setTask(''); setQuantity(''); setNote('');
  }

  function resetEntryFields() {
    setDuration(''); setEntryWorkType(''); setClient('');
    setProject(''); setTask(''); setQuantity(''); setNote('');
  }

  /* Seed entries when the drawer opens with a record */
  useEffect(() => {
    if (open && record) {
      const seeded = seedEntriesFromRecord(record);
      setEntries(seeded);
      setComments(seedTimesheetComments(record));
      setLocalStatus(record.status);
      if (seeded[0]) {
        setDate(seeded[0].date);
        setDayType(seeded[0].dayType);
      }
      setDeleteTarget(null);
      setDeleteTimesheetOpen(false);
      setNewEntryOpen(false);
      setEditingEntry(null);
      setEditTab('entries');
      resetEntryFields();
    }
    if (!open) {
      resetForm();
      setEntries([]);
      setComments([]);
      setLocalStatus(null);
      setDeleteTarget(null);
      setDeleteTimesheetOpen(false);
      setNewEntryOpen(false);
      setEditingEntry(null);
      setEditTab('entries');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id]);

  const projectOptions = MOCK_PROJECTS
    .filter(item => !client || item.client.name === client)
    .map(item => item.title)
    .filter((item, index, items) => items.indexOf(item) === index)
    .sort();

  const taskOptions = MOCK_TASKS
    .filter(item => item.projects.some(itemProject =>
      (!client || itemProject.clientName === client) &&
      (!project || itemProject.title === project),
    ))
    .map(item => item.name)
    .filter((item, index, items) => items.indexOf(item) === index)
    .sort();

  const validDuration = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/.test(duration);

  function formatTimeDuration(digits: string): string {
    const d = digits.replace(/\D/g, '').slice(0, 6);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}:${d.slice(2)}`;
    return `${d.slice(0, 2)}:${d.slice(2, 4)}:${d.slice(4)}`;
  }
  function handleDurationChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDuration(formatTimeDuration(e.target.value.replace(/\D/g, '')));
  }
  function handleDurationKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault();
      setDuration(formatTimeDuration(duration.replace(/\D/g, '').slice(0, -1)));
    }
  }
  function handleDurationPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    setDuration(formatTimeDuration(e.clipboardData.getData('text').replace(/\D/g, '')));
  }

  const showTimeEntry            = Boolean(date && dayType);
  const showEntryFields          = showTimeEntry && (entries.length === 0 || newEntryOpen);
  const canAddEntry              = Boolean(date && dayType && validDuration && entryWorkType && client && project && task);
  const canUpdateEntry           = Boolean(date && validDuration && entryWorkType && client && project && task);
  const sharedEntryDetailsLocked = entries.length > 0 && !newEntryOpen;

  /* ── entry CRUD ── */
  function handleAddNew() {
    if (!canAddEntry) return;
    const entry: TimeEntry = {
      id: makeEntryId(),
      date, dayType, duration, workType: entryWorkType,
      client, project, task, quantity, note,
    };
    setEntries(prev => [...prev, entry]);
    toast.success('Time entry added');
    resetEntryFields();
    setNewEntryOpen(false);
  }

  function handleCancelNew() {
    const sharedEntry = entries[0];
    if (sharedEntry) {
      setDate(sharedEntry.date);
      setDayType(sharedEntry.dayType);
    } else {
      resetForm();
    }
    resetEntryFields();
    setNewEntryOpen(false);
  }

  /* Open the in-place edit view for an existing entry */
  function handleOpenEditEntry(entry: TimeEntry) {
    setDate(entry.date);
    setDayType(entry.dayType);
    setDuration(entry.duration);
    setEntryWorkType(entry.workType);
    setClient(entry.client);
    setProject(entry.project);
    setTask(entry.task);
    setQuantity(entry.quantity);
    setNote(entry.note);
    setEditingEntry(entry);
    setNewEntryOpen(false);
  }

  function handleSaveEditEntry() {
    if (!editingEntry || !canUpdateEntry) return;
    const updated: TimeEntry = {
      ...editingEntry,
      date,
      duration, workType: entryWorkType,
      client, project, task, quantity, note,
    };
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
    toast.success('Time entry updated');
    resetEntryFields();
    setEditingEntry(null);
  }

  function handleCancelEditEntry() {
    if (editingEntry) {
      setDate(editingEntry.date);
      setDayType(editingEntry.dayType);
    }
    resetEntryFields();
    setEditingEntry(null);
  }

  function handleConfirmDelete() {
    if (!deleteTarget) return;
    setEntries(prev => prev.filter(e => e.id !== deleteTarget.id));
    setDeleteTarget(null);
    toast.success('Time entry removed');
  }

  function handleSaveChanges() {
    if (entries.length === 0) return;
    toast.success('Timesheet saved');
    onClose();
  }

  function handleAddComment(text: string) {
    setComments(prev => [...prev, {
      id: `${record?.id ?? 'timesheet'}-admin-${Date.now()}`,
      author: 'Wade Warren',
      role: 'Admin',
      initials: 'WW',
      text,
      createdAt: new Date().toISOString(),
    }]);
    toast.success('Admin comment added');
  }

  function handleChangeStatus(newStatus: TimesheetStatus, pendingComment?: string) {
    const prev = localStatus;
    setLocalStatus(newStatus);
    const actionLabel =
      newStatus === 'Approved'               ? 'Approved' :
      newStatus === 'Correction Required'    ? 'Marked as Correction Required' :
      newStatus === 'Clarification Required' ? 'Marked as Clarification Required' :
      'Rejected';
    // Auto-post comment with status change note
    const systemText = pendingComment?.trim()
      ? pendingComment.trim()
      : `Status changed from ${prev ?? 'Rejected'} → ${newStatus}.`;
    setComments(c => [...c, {
      id: `${record?.id ?? 'ts'}-status-${Date.now()}`,
      author: 'Wade Warren',
      role: 'Admin',
      initials: 'WW',
      text: systemText,
      createdAt: new Date().toISOString(),
    }]);
    toast.success(`Timesheet ${actionLabel}`);
  }

  function handleConfirmDeleteTimesheet() {
    setEntries([]);
    resetForm();
    setNewEntryOpen(false);
    setDeleteTimesheetOpen(false);
    toast.success('Timesheet deleted');
    onClose();
  }

  const statusChip = localStatus ? STATUS_CHIP[localStatus] : null;
  const entriesLocked = Boolean(localStatus && localStatus !== 'Draft');
  const canReviewStatus = localStatus === 'Rejected'
    || localStatus === 'Correction Required'
    || localStatus === 'Clarification Required';

  const content = (
    <>
      {/* Backdrop — clicking it closes the drawer only when not in entry-edit view */}
      <div
        onClick={editingEntry ? undefined : onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Drawer panel */}
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>

        {/* ══════════ ENTRY-EDIT VIEW ══════════ */}
        {editingEntry ? (
          <>
            {/* Breadcrumb header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCancelEditEntry}
                  aria-label="Back to timesheet"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <ArrowLeft size={17} />
                </button>
                <div>
                  <div className="flex items-center gap-1.5 text-[11.5px] text-gray-400">
                    <button
                      type="button"
                      onClick={handleCancelEditEntry}
                      className="font-medium transition-colors hover:text-gray-600"
                    >
                      Edit Timesheet
                    </button>
                    <span>/</span>
                    <span className="font-semibold text-gray-700">Edit Entry</span>
                  </div>
                  <p className="mt-px text-[12px] text-gray-500">
                    {date ? format(parseISO(date), 'dd MMM yyyy') : 'Choose a date'} · {editingEntry.dayType}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveEditEntry}
                disabled={!canUpdateEntry}
                className={cn(
                  'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
                  canUpdateEntry ? 'bg-brand hover:bg-brand/90' : 'cursor-not-allowed bg-orange-200',
                )}
              >
                Update Entry
              </button>
            </div>

            {/* Entry edit form */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-5">
                <DrawerField label="Date" required hint="Choose the date this time entry applies to.">
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    placeholder="Select a date"
                  />
                </DrawerField>

                <DrawerField label="Duration" required hint="Type digits — colons are added automatically, e.g. 08:30:00.">
                  <DrawerInput
                    type="text" inputMode="numeric" placeholder="00:00:00"
                    value={duration} maxLength={8}
                    onChange={handleDurationChange}
                    onKeyDown={handleDurationKeyDown}
                    onPaste={handleDurationPaste}
                    aria-invalid={Boolean(duration) && !validDuration}
                  />
                  {Boolean(duration) && !validDuration && (
                    <p className="text-[12px] text-red-500">Enter a full time, e.g. 08:30:00.</p>
                  )}
                </DrawerField>

                <DrawerField label="Work Type" required>
                  <Select value={entryWorkType} onValueChange={setEntryWorkType}>
                    <SelectTrigger className={cn(
                      'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                      'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                      'data-[state=open]:border-brand',
                    )}>
                      <SelectValue placeholder="Select a work type…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                      {TIME_ENTRY_WORK_TYPES.map(opt => (
                        <SelectItem key={opt} value={opt}
                          className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DrawerField>

                <DrawerField label="Client" required>
                  <SearchableDrawerSelect
                    placeholder="Select a client…"
                    options={TIMESHEET_CLIENTS}
                    value={client}
                    onChange={v => { setClient(v); setProject(''); setTask(''); }}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Project" required>
                  <SearchableDrawerSelect
                    placeholder={client ? 'Select a project…' : 'Select a client first…'}
                    options={projectOptions}
                    value={project}
                    onChange={v => { setProject(v); setTask(''); }}
                    disabled={!client}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Task" required>
                  <SearchableDrawerSelect
                    placeholder={project ? 'Select a task…' : 'Select a project first…'}
                    options={taskOptions}
                    value={task}
                    onChange={setTask}
                    disabled={!project}
                    drawerOpen={open}
                  />
                </DrawerField>

                <DrawerField label="Quantity" required>
                  <DrawerInput
                    type="number" min="0" step="0.01" required placeholder="Enter quantity"
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                  />
                </DrawerField>

                <DrawerField label="Note">
                  <DrawerTextarea
                    rows={3}
                    placeholder="Add a note about this time entry…"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                  />
                </DrawerField>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* ══════════ NORMAL TIMESHEET VIEW ══════════ */}
            {/* Header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close edit timesheet drawer"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
                >
                  <ArrowLeft size={17} />
                </button>
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900">Edit Timesheet</h2>
                  {record && (
                    <p className="mt-px text-[12px] text-gray-500">
                      {record.name}
                      {record.filingPeriod ? ` · ${record.filingPeriod}` : ''}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {statusChip && (
                  <span className={cn(
                    'inline-flex rounded-full px-2.5 py-[3px] text-[11.5px] font-medium whitespace-nowrap',
                    statusChip.cls,
                  )}>
                    {statusChip.label}
                  </span>
                )}
                {entries.length > 0 && (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setDeleteTimesheetOpen(true)}
                          aria-label="Delete timesheet"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition-colors hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                        Delete
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={entries.length === 0}
                  className={cn(
                    'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
                    entries.length > 0 ? 'bg-brand hover:bg-brand/90' : 'cursor-not-allowed bg-orange-200',
                  )}
                >
                  Update
                </button>
              </div>
            </div>

            <div className="flex flex-shrink-0 border-b border-gray-100 px-5">
              <button
                type="button"
                onClick={() => setEditTab('entries')}
                className={cn(
                  'relative flex items-center gap-2 px-1 py-3 text-[12.5px] font-medium transition-colors',
                  editTab === 'entries' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700',
                )}
              >
                <Clock size={13} />
                Entries
                {editTab === 'entries' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setEditTab('comments')}
                className={cn(
                  'relative ml-6 flex items-center gap-2 px-1 py-3 text-[12.5px] font-medium transition-colors',
                  editTab === 'comments' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-700',
                )}
              >
                <MessageSquare size={13} />
                Comments
                <span className="rounded-full bg-gray-100 px-1.5 py-px text-[10px] font-semibold text-gray-500">
                  {comments.length}
                </span>
                {editTab === 'comments' && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
                )}
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className={cn(editTab === 'entries' ? 'contents' : 'hidden')}>
                {entries.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                    Time Entries
                  </p>
                  <div className="mt-2.5 max-h-[220px] space-y-2.5 overflow-y-auto pr-1">
                    {entries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5 transition-colors"
                      >
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="text-[13px] font-semibold text-gray-800">
                              {format(parseISO(entry.date), 'dd MMM yyyy')}
                            </span>
                            <span className="rounded bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-500">
                              {entry.dayType}
                            </span>
                            <span className="ml-auto font-mono text-[13px] font-semibold text-gray-700">
                              {entry.duration}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[12px] text-gray-500">
                            {entry.client} › {entry.project} › {entry.task}
                          </p>
                          {entry.note && (
                            <p className="mt-0.5 truncate text-[11px] italic text-gray-400">{entry.note}</p>
                          )}
                        </div>
                        {!entriesLocked && (
                          <TooltipProvider delayDuration={150}>
                            <div className="flex flex-shrink-0 items-center gap-0.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label="Edit entry"
                                    onClick={() => handleOpenEditEntry(entry)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-brand"
                                  >
                                    <Pencil size={13} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                                  Edit
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    aria-label="Delete entry"
                                    onClick={() => setDeleteTarget(entry)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white hover:text-red-500"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                                  Delete
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TooltipProvider>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                )}

                <div className="space-y-5">
                <DrawerField label="Date" required hint="Choose the date this timesheet entry applies to.">
                  <DatePicker
                    value={date}
                    onChange={setDate}
                    max={format(new Date(), 'yyyy-MM-dd')}
                    placeholder="Select a date"
                    disabled={sharedEntryDetailsLocked}
                  />
                </DrawerField>

                <DrawerField label="Day Type" required>
                  <Select value={dayType} onValueChange={setDayType} disabled={sharedEntryDetailsLocked}>
                    <SelectTrigger className={cn(
                      'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                      'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                      'data-[state=open]:border-brand',
                    )}>
                      <SelectValue placeholder="Select a day type…" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                      {DAY_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}
                          className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </DrawerField>

                {showEntryFields && (
                  <>
                    <div className="border-t border-gray-100 pt-5">
                      <h3 className="text-[14px] font-semibold text-gray-900">New Time Entry</h3>
                      <p className="mt-1 text-[12px] text-gray-500">Add the time spent and link it to a client task.</p>
                    </div>

                    <DrawerField label="Duration" required hint="Type digits — colons are added automatically, e.g. 08:30:00.">
                      <DrawerInput
                        type="text" inputMode="numeric" placeholder="00:00:00"
                        value={duration} maxLength={8}
                        onChange={handleDurationChange}
                        onKeyDown={handleDurationKeyDown}
                        onPaste={handleDurationPaste}
                        aria-invalid={Boolean(duration) && !validDuration}
                      />
                      {Boolean(duration) && !validDuration && (
                        <p className="text-[12px] text-red-500">Enter a full time, e.g. 08:30:00.</p>
                      )}
                    </DrawerField>

                    <DrawerField label="Work Type" required>
                      <Select value={entryWorkType} onValueChange={setEntryWorkType}>
                        <SelectTrigger className={cn(
                          'h-11 w-full rounded-xl border border-gray-200 px-3.5 text-[13px] text-gray-800',
                          'focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20',
                          'data-[state=open]:border-brand',
                        )}>
                          <SelectValue placeholder="Select a work type…" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                          {TIME_ENTRY_WORK_TYPES.map(opt => (
                            <SelectItem key={opt} value={opt}
                              className="cursor-pointer rounded-lg py-2.5 pl-3 pr-8 text-[13px] text-gray-800 focus:bg-orange-50 focus:text-brand data-[state=checked]:font-medium">
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </DrawerField>

                    <DrawerField label="Client" required>
                      <SearchableDrawerSelect
                        placeholder="Select a client…"
                        options={TIMESHEET_CLIENTS}
                        value={client}
                        onChange={v => { setClient(v); setProject(''); setTask(''); }}
                        drawerOpen={open}
                      />
                    </DrawerField>

                    <DrawerField label="Project" required>
                      <SearchableDrawerSelect
                        placeholder={client ? 'Select a project…' : 'Select a client first…'}
                        options={projectOptions}
                        value={project}
                        onChange={v => { setProject(v); setTask(''); }}
                        disabled={!client}
                        drawerOpen={open}
                      />
                    </DrawerField>

                    <DrawerField label="Task" required>
                      <SearchableDrawerSelect
                        placeholder={project ? 'Select a task…' : 'Select a project first…'}
                        options={taskOptions}
                        value={task}
                        onChange={setTask}
                        disabled={!project}
                        drawerOpen={open}
                      />
                    </DrawerField>

                    <DrawerField label="Quantity" required>
                      <DrawerInput
                        type="number" min="0" step="0.01" required placeholder="Enter quantity"
                        value={quantity}
                        onChange={e => setQuantity(e.target.value)}
                      />
                    </DrawerField>

                    <DrawerField label="Note">
                      <DrawerTextarea
                        rows={3}
                        placeholder="Add a note about this time entry…"
                        value={note}
                        onChange={e => setNote(e.target.value)}
                      />
                    </DrawerField>
                  </>
                )}
                </div>
              </div>

              {editTab === 'comments' && record && (
                <div className="flex h-full min-h-0 flex-col">
                  <TimesheetCommentsSection
                    comments={comments}
                    onAdd={handleAddComment}
                    className="mt-0 border-t-0 pt-0"
                    fullHeight
                    composerLabel={canReviewStatus ? 'Add a comment (optional)…' : undefined}
                    statusOptions={canReviewStatus ? REJECTED_STATUS_OPTIONS : undefined}
                    onStatusChange={canReviewStatus ? handleChangeStatus : undefined}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            {editTab === 'entries' && showEntryFields && (
              <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4">
                <div className="flex items-center gap-2.5">
                  {newEntryOpen && (
                    <button
                      type="button"
                      onClick={handleCancelNew}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleAddNew}
                    disabled={!canAddEntry}
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-colors',
                      canAddEntry ? 'bg-brand hover:bg-brand/90' : 'cursor-not-allowed bg-orange-200',
                    )}
                  >
                    Save Entry
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete entry confirmation ── */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={o => { if (!o) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Delete Entry
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                {deleteTarget
                  ? `${format(parseISO(deleteTarget.date), 'dd MMM yyyy')} — ${deleteTarget.client} › ${deleteTarget.project}`
                  : 'this entry'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete timesheet confirmation ── */}
      <Dialog
        open={deleteTimesheetOpen}
        onOpenChange={o => { if (!o) setDeleteTimesheetOpen(false); }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Delete Timesheet
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                {record ? `${record.name} — ${record.filingPeriod}` : 'this timesheet'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeleteTimesheetOpen(false)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDeleteTimesheet}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

/* ══════════════════════════════════════════
   On Hold drawer
   ══════════════════════════════════════════ */
const HOLD_REASONS = [
  'Waiting on client information',
  'Pending document submission',
  'Awaiting manager approval',
  'Regulatory review in progress',
  'Other',
];

function TimesheetHoldDrawer({
  open, name, onClose, onConfirm,
}: { open: boolean; name: string; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason]   = useState('');
  const [note, setNote]       = useState('');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleConfirm() {
    onConfirm(reason);
    setReason(''); setNote('');
    onClose();
  }

  const content = (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">Put on Hold</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!reason}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              reason ? 'bg-brand hover:bg-brand/90' : 'bg-orange-200 cursor-not-allowed',
            )}
          >
            Confirm
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <p className="text-[13px] text-gray-500">
            You are putting <span className="font-semibold text-gray-800">{name}</span>'s timesheet on hold.
          </p>

          <DrawerField label="Reason for Hold" required>
            <DrawerSelect value={reason} onChange={e => setReason(e.target.value)}>
              <option value="" disabled>Select a reason…</option>
              {HOLD_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
            </DrawerSelect>
          </DrawerField>

          <DrawerField label="Additional Notes">
            <DrawerTextarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add any additional context (optional)…"
              rows={5}
            />
          </DrawerField>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

/* ══════════════════════════════════════════
   Change Assignee drawer
   ══════════════════════════════════════════ */
const TEAM_MEMBERS = [
  'Arjun Kumar', 'Aisha Mohammed', 'Ivan Xavier', 'Ali Tariq', 'David Kim',
  'Karim Tahir', 'Paulo Torres', 'Meera Nair', 'Mohammed Khan', 'Laura Nixon',
];

function TimesheetChangeAssigneeDrawer({
  open, name, onClose, onConfirm,
}: { open: boolean; name: string; onClose: () => void; onConfirm: (assignee: string) => void }) {
  const [mounted,  setMounted]  = useState(false);
  const [assignee, setAssignee] = useState('');
  const [note,     setNote]     = useState('');

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function handleConfirm() {
    onConfirm(assignee);
    setAssignee(''); setNote('');
    onClose();
  }

  const content = (
    <>
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">Change Assignee</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!assignee}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              assignee ? 'bg-brand hover:bg-brand/90' : 'bg-orange-200 cursor-not-allowed',
            )}
          >
            Reassign
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          <p className="text-[13px] text-gray-500">
            Reassigning timesheet for <span className="font-semibold text-gray-800">{name}</span>.
          </p>

          <DrawerField label="New Assignee" required>
            <DrawerSelect value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value="" disabled>Select a team member…</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </DrawerSelect>
          </DrawerField>

          <DrawerField label="Note to Assignee">
            <DrawerTextarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add a handover note (optional)…"
              rows={5}
            />
          </DrawerField>
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}

/* ── Checkbox helper (same pattern as FilterDrawer) ── */
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <span
      role="checkbox"
      aria-checked={checked}
      onClick={e => { e.preventDefault(); onChange(); }}
      className={cn(
        'flex h-4 w-4 flex-shrink-0 cursor-pointer items-center justify-center rounded border transition-colors',
        checked ? 'border-brand bg-brand' : 'border-gray-300 bg-white hover:border-brand/60',
      )}
    >
      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
    </span>
  );
}

/* ── Member options ── */
const MEMBER_OPTIONS = [
  'Aisha Khan', 'Marcus Johnson', 'Tina Patel', 'Daniel Kim', 'Natalie Suarez',
  'Victor Chen', 'Hana Müller', 'Oliver Tan', 'Priya Sharma', 'Kevin Wright',
  'Sara Noel', 'Andre Dupont', 'Mei Lin', "James O'Sullivan", 'Fatima Al-Rashid',
];

const FILTER_OPEN_EVENT = 'timesheets-filter-open';

function announceFilterOpen(filter: 'date' | 'status' | 'member') {
  document.dispatchEvent(new CustomEvent(FILTER_OPEN_EVENT, { detail: filter }));
}

/* ── MemberFilterDropdown ── */
function MemberFilterDropdown({
  selected, onChange,
}: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const searchRef  = useRef<HTMLInputElement>(null);

  const hasActive = selected.length > 0;
  const triggerLabel =
    selected.length === 0 ? 'All Members' :
    selected.length === 1 ? selected[0] :
    `${selected.length} selected`;

  function getPos(): CSSProperties {
    if (!triggerRef.current) return {};
    const r = triggerRef.current.getBoundingClientRect();
    return { top: r.bottom + 4, right: window.innerWidth - r.right, minWidth: Math.max(r.width, 220) };
  }

  useLayoutEffect(() => {
    if (!open) return;
    setPanelStyle(getPos());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const f = requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(f);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        panelRef.current   && !panelRef.current.contains(t)
      ) { setOpen(false); setQuery(''); }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    function handler(e: Event) {
      if ((e as CustomEvent<'date' | 'status' | 'member'>).detail !== 'member') {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener(FILTER_OPEN_EVENT, handler);
    return () => document.removeEventListener(FILTER_OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    function reposition() { setPanelStyle(getPos()); }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o]);
  }

  const visible = query
    ? MEMBER_OPTIONS.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : MEMBER_OPTIONS;

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', zIndex: 9999, ...panelStyle }}
      className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
    >
      {/* Search */}
      <div className="p-2 pb-1.5">
        <div className="flex h-9 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3">
          <Search size={13} className="flex-shrink-0 text-gray-400" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search members..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-gray-800 placeholder:text-gray-400 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="flex h-4 w-4 items-center justify-center rounded bg-gray-200 text-[10px] text-gray-600 hover:bg-gray-300 transition-colors"
            >✕</button>
          )}
        </div>
      </div>

      {/* Options */}
      <ul className="max-h-[220px] overflow-y-auto p-2 pt-1">
        {visible.length > 0
          ? visible.map(opt => {
              const isChecked = selected.includes(opt);
              return (
                <li key={opt}>
                  <label className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                    isChecked ? 'bg-orange-50' : 'hover:bg-gray-100',
                  )}>
                    <Checkbox checked={isChecked} onChange={() => toggle(opt)} />
                    <span className={cn(
                      'text-[13px] select-none',
                      isChecked ? 'font-medium text-brand' : 'text-gray-800',
                    )}>
                      {opt}
                    </span>
                  </label>
                </li>
              );
            })
          : <li className="px-3 py-3 text-center text-[12px] text-gray-400">No results</li>
        }
      </ul>

      {/* Clear footer */}
      {selected.length > 0 && (
        <>
          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => { onChange([]); setOpen(false); setQuery(''); }}
            className="w-full px-3 py-3 text-left text-[13px] font-medium text-brand hover:bg-orange-50/40 transition-colors"
          >
            Clear {selected.length} selected
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) announceFilterOpen('member');
          setOpen(v => !v);
          if (!open) setQuery('');
        }}
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg bg-white pl-3 pr-2.5 text-[13px] font-medium transition-colors focus:outline-none',
          hasActive
            ? 'border-2 border-brand text-brand hover:bg-orange-50/50'
            : 'border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
        )}
      >
        <span className="max-w-[140px] truncate">{triggerLabel}</span>
        {open
          ? <ChevronUp  size={14} className={hasActive ? 'text-brand' : 'text-gray-400'} />
          : <ChevronDown size={14} className={hasActive ? 'text-brand' : 'text-gray-400'} />
        }
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  );
}

/* ── Status multi-select options (no "All" sentinel) ── */
const STATUS_FILTER_OPTIONS: string[] = [
  'Draft', 'Submitted', 'Approved', 'Rejected', 'Correction Required', 'Clarification Required',
];

/* ── StatusMultiSelectDropdown ── */
function StatusMultiSelectDropdown({
  selected, onChange,
}: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  const hasActive = selected.length > 0;
  const triggerLabel =
    selected.length === 0 ? 'All Status' :
    selected.length === 1 ? selected[0] :
    `${selected.length} selected`;

  function getPos(): CSSProperties {
    if (!triggerRef.current) return {};
    const r = triggerRef.current.getBoundingClientRect();
    return { top: r.bottom + 4, right: window.innerWidth - r.right, minWidth: Math.max(r.width, 220) };
  }

  useLayoutEffect(() => {
    if (!open) return;
    setPanelStyle(getPos());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (
        triggerRef.current && !triggerRef.current.contains(t) &&
        panelRef.current   && !panelRef.current.contains(t)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    function handler(e: Event) {
      if ((e as CustomEvent<'date' | 'status' | 'member'>).detail !== 'status') {
        setOpen(false);
      }
    }
    document.addEventListener(FILTER_OPEN_EVENT, handler);
    return () => document.removeEventListener(FILTER_OPEN_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    function reposition() { setPanelStyle(getPos()); }
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function toggle(o: string) {
    onChange(selected.includes(o) ? selected.filter(s => s !== o) : [...selected, o]);
  }

  const panel = open ? (
    <div
      ref={panelRef}
      style={{ position: 'fixed', zIndex: 9999, ...panelStyle }}
      className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl"
    >
      <ul className="p-2">
        {STATUS_FILTER_OPTIONS.map(opt => {
          const isChecked = selected.includes(opt);
          return (
            <li key={opt}>
              <label className={cn(
                'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                isChecked ? 'bg-orange-50' : 'hover:bg-gray-100',
              )}>
                <Checkbox checked={isChecked} onChange={() => toggle(opt)} />
                <span className={cn(
                  'text-[13px] select-none whitespace-nowrap',
                  isChecked ? 'font-medium text-brand' : 'text-gray-800',
                )}>{opt}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {selected.length > 0 && (
        <>
          <div className="border-t border-gray-100" />
          <button
            type="button"
            onClick={() => { onChange([]); setOpen(false); }}
            className="w-full px-3 py-3 text-left text-[13px] font-medium text-brand hover:bg-orange-50/40 transition-colors"
          >
            Clear {selected.length} selected
          </button>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!open) announceFilterOpen('status');
          setOpen(v => !v);
        }}
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg bg-white pl-3 pr-2.5 text-[13px] font-medium transition-colors focus:outline-none',
          hasActive
            ? 'border-2 border-brand text-brand hover:bg-orange-50/50'
            : 'border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
        )}
      >
        <span className="max-w-[160px] truncate">{triggerLabel}</span>
        {open
          ? <ChevronUp  size={14} className={hasActive ? 'text-brand' : 'text-gray-400'} />
          : <ChevronDown size={14} className={hasActive ? 'text-brand' : 'text-gray-400'} />
        }
      </button>
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  );
}

/* ── Date filter options ── */
type DateFilter = 'All' | 'Yesterday' | 'Last 7 days' | 'Last 30 days' | 'Last 90 days' | 'This month' | 'Last month' | 'This week' | 'This year';

const DATE_FILTER_OPTIONS: Array<{ value: DateFilter; label: string }> = [
  { value: 'All',        label: 'All Dates'   },
  { value: 'Yesterday',  label: 'Yesterday'   },
  { value: 'Last 7 days',  label: 'Last 7 days'  },
  { value: 'Last 30 days', label: 'Last 30 days' },
  { value: 'Last 90 days', label: 'Last 90 days' },
  { value: 'This month', label: 'This month'  },
  { value: 'Last month', label: 'Last month'  },
  { value: 'This week',  label: 'This week'   },
  { value: 'This year',  label: 'This year'   },
];

function matchesDateFilter(submittedOn: string, filter: DateFilter): boolean {
  if (filter === 'All' || !submittedOn) return filter === 'All';
  const d = new Date(submittedOn);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dDay  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffMs = today.getTime() - dDay.getTime();
  const diffDays = Math.round(diffMs / 86400000);
  switch (filter) {
    case 'Yesterday':    return diffDays === 1;
    case 'Last 7 days':  return diffDays >= 0 && diffDays < 7;
    case 'Last 30 days': return diffDays >= 0 && diffDays < 30;
    case 'Last 90 days': return diffDays >= 0 && diffDays < 90;
    case 'This month':
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    case 'Last month': {
      const lm = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
    }
    case 'This week': {
      const day = today.getDay(); // 0 Sun
      const monday = new Date(today); monday.setDate(today.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
      return dDay >= monday && dDay <= sunday;
    }
    case 'This year':
      return d.getFullYear() === today.getFullYear();
    default: return true;
  }
}

/* ══════════════════════════════════════════
   All Timesheets tab
   ══════════════════════════════════════════ */
function AllTimesheets() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [memberFilter, setMemberFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter]   = useState<DateFilter>('All');
  const [dateOpen, setDateOpen]       = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<TimesheetSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [columnOrder, setColumnOrder] = useTimesheetColumnOrder();
  const tsDragKey = useRef<TimesheetColumnKey | null>(null);
  const [tsDropTarget, setTsDropTarget] = useState<TimesheetColumnKey | null>(null);
  function tsDragStart(key: TimesheetColumnKey) { tsDragKey.current = key; }
  function tsDragOver(e: React.DragEvent, key: TimesheetColumnKey) {
    e.preventDefault();
    if (tsDragKey.current && tsDragKey.current !== key) setTsDropTarget(key);
  }
  function tsDrop(key: TimesheetColumnKey) {
    if (!tsDragKey.current || tsDragKey.current === key) { setTsDropTarget(null); return; }
    const from = tsDragKey.current;
    const next = [...columnOrder];
    const fromIdx = next.indexOf(from); const toIdx = next.indexOf(key);
    next.splice(fromIdx, 1); next.splice(toIdx, 0, from);
    setColumnOrder(next); tsDragKey.current = null; setTsDropTarget(null);
  }
  function tsDragEnd() { tsDragKey.current = null; setTsDropTarget(null); }

  /* local mutations (mock — no real API) */
  const [deletedIds, setDeletedIds]         = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget]     = useState<TimesheetRecord | null>(null);
  const [editTarget, setEditTarget]         = useState<TimesheetRecord | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [mounted, setMounted]               = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const activeDateLabel = DATE_FILTER_OPTIONS.find(o => o.value === dateFilter)?.label ?? 'All Dates';

  useEffect(() => {
    function handler(e: Event) {
      if ((e as CustomEvent<'date' | 'status' | 'member'>).detail !== 'date') {
        setDateOpen(false);
      }
    }
    document.addEventListener(FILTER_OPEN_EVENT, handler);
    return () => document.removeEventListener(FILTER_OPEN_EVENT, handler);
  }, []);

  const filtered = MOCK_TIMESHEETS.filter(ts => {
    if (deletedIds.has(ts.id)) return false;
    const status = ts.status;
    const q = search.toLowerCase();
    const matchSearch = !q || ts.name.toLowerCase().includes(q) || ts.filingPeriod.toLowerCase().includes(q);
    const matchStatus = statusFilter.length === 0 || statusFilter.includes(status);
    const matchMember = memberFilter.length === 0 || memberFilter.includes(ts.name);
    const matchDate   = matchesDateFilter(ts.submittedOn, dateFilter);
    return matchSearch && matchStatus && matchMember && matchDate;
  });

  const sorted = sortTimesheets(filtered, sortKey, sortDirection);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSearch(v: string) { setSearch(v); setPage(1); }
  function handleSort(key: TimesheetSortKey) {
    if (sortKey === key) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-[13px] placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
          />
          {search && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded bg-gray-200 hover:bg-gray-300 transition-colors"
            >
              <X size={11} className="text-gray-600" />
            </button>
          )}
        </div>

        <div className="hidden flex-1 sm:block" />

        {/* Date filter — single select */}
        <DropdownMenu
          modal={false}
          open={dateOpen}
          onOpenChange={open => {
            setDateOpen(open);
            if (open) announceFilterOpen('date');
          }}
        >
          <DropdownMenuTrigger asChild>
            <button className={cn(
              'flex h-9 items-center gap-2 rounded-lg bg-white pl-3 pr-2.5 text-[13px] font-medium transition-colors focus:outline-none',
              dateFilter !== 'All'
                ? 'border-2 border-brand text-brand hover:bg-orange-50/50'
                : 'border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50',
            )}>
              {activeDateLabel}
              <ChevronDown size={14} className={dateFilter !== 'All' ? 'text-brand' : 'text-gray-400'} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="w-44 rounded-xl border border-gray-100 bg-white p-2 shadow-xl">
            <DropdownMenuLabel className="px-1 pb-1 pt-0.5 text-[9.5px] font-bold uppercase tracking-widest text-gray-400">
              Date
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={dateFilter}
              onValueChange={v => { setDateFilter(v as DateFilter); setPage(1); }}
            >
              {DATE_FILTER_OPTIONS.map(({ value, label }) => {
                const isSelected = value === dateFilter;
                return (
                  <DropdownMenuRadioItem
                    key={value}
                    value={value}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-md px-3 py-[7px] text-[13px] font-medium outline-none transition-colors [&>span:first-child]:hidden',
                      isSelected ? 'bg-orange-50 text-brand' : 'text-gray-800 hover:bg-gray-100 data-[highlighted]:bg-gray-100',
                    )}
                  >
                    <span className="mr-2 flex h-[7px] w-[7px] flex-shrink-0 items-center justify-center">
                      {isSelected && <span className="h-[7px] w-[7px] rounded-full bg-brand" />}
                    </span>
                    {label}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Status multi-select dropdown */}
        <StatusMultiSelectDropdown
          selected={statusFilter}
          onChange={v => { setStatusFilter(v); setPage(1); }}
        />

        {/* Member multi-select dropdown */}
        <MemberFilterDropdown
          selected={memberFilter}
          onChange={v => { setMemberFilter(v); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="mt-3 min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table className="w-full min-w-[900px] table-auto">
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="pl-5 select-none">
                <div className="flex min-w-max items-center"><SortableHead label="Name" sortKey="name" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} /></div>
              </TableHead>
              {columnOrder.map(key => {
                const col = TIMESHEET_COLUMN_OPTIONS.find(c => c.key === key)!;
                const isDrop = tsDropTarget === key;
                return (
                  <TableHead key={key} draggable
                    onDragStart={() => tsDragStart(key)}
                    onDragOver={e => tsDragOver(e, key)}
                    onDrop={() => tsDrop(key)}
                    onDragEnd={tsDragEnd}
                    className={cn('group select-none transition-colors', isDrop && 'border-l-2 border-brand bg-orange-50/60')}
                  >
                    <div className="flex min-w-max items-center gap-1.5">
                      {col.sortKey ? (
                        <button type="button" onClick={() => handleSort(col.sortKey!)}
                          className={cn('flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
                            sortKey === col.sortKey ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
                          )}>
                          <span className="whitespace-nowrap">{col.label}</span>
                          {sortKey === col.sortKey
                            ? sortDirection === 'asc' ? <ArrowUp size={11} className="text-brand" /> : <ArrowDown size={11} className="text-brand" />
                            : <ArrowUpDown size={11} className="opacity-40" />}
                        </button>
                      ) : (
                        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-gray-500">{col.label}</span>
                      )}
                      <GripVertical size={13} aria-hidden="true"
                        className="ml-auto flex-shrink-0 cursor-grab text-gray-300 opacity-60 transition-colors group-hover:text-brand group-hover:opacity-100 active:cursor-grabbing" />
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-0">
                  <Empty
                    icon={SearchX}
                    title="No timesheets found"
                    description="Try adjusting your search or status filter."
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : pageItems.map(ts => {
              const status = ts.status;
              const chip = STATUS_CHIP[status];
              const submittedLabel = ts.submittedOn
                ? new Date(ts.submittedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
              return (
                <TableRow key={ts.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                  <TableCell className="pl-5 py-3.5"><PersonName name={ts.name} /></TableCell>
                  {columnOrder.map(key => {
                    switch (key) {
                      case 'filingPeriod': return <TableCell key={key} className="min-w-0 py-3.5"><span className="block truncate text-[13px] text-gray-700">{ts.filingPeriod}</span></TableCell>;
                      case 'submittedOn':  return <TableCell key={key} className="min-w-0 py-3.5"><span className="block truncate text-[13px] text-gray-700">{submittedLabel}</span></TableCell>;
                      case 'totalHours':  return <TableCell key={key} className="py-3.5"><span className="text-[13px] font-medium text-gray-900">{ts.totalHours > 0 ? `${ts.totalHours}h` : '—'}</span></TableCell>;
                      case 'approvedBy':  return <TableCell key={key} className="min-w-0 py-3.5"><span className="block truncate text-[13px] text-gray-700">{ts.approvedBy ?? '—'}</span></TableCell>;
                      case 'status':      return <TableCell key={key} className="py-3.5"><span className={cn('inline-flex rounded-full px-2.5 py-[3px] text-[11.5px] font-medium whitespace-nowrap', chip.cls)}>{chip.label}</span></TableCell>;
                      case 'action':      return (
                        <TableCell key={key} className="py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1.5">
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" aria-label="Edit" onClick={() => { setEditTarget(ts); setEditDrawerOpen(true); }}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"><Pencil size={13} /></button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" aria-label="Delete" onClick={() => setDeleteTarget(ts)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      );
                      default: return null;
                    }
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > pageSize && (
        <ProjectsPagination
          page={safePage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Delete Timesheet
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                {deleteTarget ? `${deleteTarget.name} — ${deleteTarget.filingPeriod}` : 'this timesheet'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!deleteTarget) return;
                setDeletedIds(prev => new Set([...prev, deleteTarget.id]));
                toast.success(`${deleteTarget.name}'s timesheet deleted`);
                setDeleteTarget(null);
              }}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit timesheet drawer */}
      <EditTimesheetDrawer
        open={editDrawerOpen}
        onClose={() => { setEditDrawerOpen(false); setEditTarget(null); }}
        record={editTarget}
      />
    </div>
  );
}

/* ══════════════════════════════════════════
   View Timesheet drawer (read-only, for approvers)
   ══════════════════════════════════════════ */
function parseDurationToMinutes(d: string): number {
  const parts = d.split(':').map(Number);
  return (parts[0] ?? 0) * 60 + (parts[1] ?? 0) + Math.round((parts[2] ?? 0) / 60);
}
/* ══════════════════════════════════════════
   Pending Actions tab
   ══════════════════════════════════════════ */
function PendingActions() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortKey, setSortKey] = useState<TimesheetSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [deletedIds, setDeletedIds]       = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget]   = useState<TimesheetRecord | null>(null);
  const [viewTarget, setViewTarget]       = useState<TimesheetRecord | null>(null);
  const [viewDrawerOpen, setViewDrawerOpen] = useState(false);
  const [mounted, setMounted]             = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const [columnOrder, setColumnOrder] = useTimesheetColumnOrder();
  const tsDragKey = useRef<TimesheetColumnKey | null>(null);
  const [tsDropTarget, setTsDropTarget] = useState<TimesheetColumnKey | null>(null);
  function tsDragStart(key: TimesheetColumnKey) { tsDragKey.current = key; }
  function tsDragOver(e: React.DragEvent, key: TimesheetColumnKey) {
    e.preventDefault();
    if (tsDragKey.current && tsDragKey.current !== key) setTsDropTarget(key);
  }
  function tsDrop(key: TimesheetColumnKey) {
    if (!tsDragKey.current || tsDragKey.current === key) { setTsDropTarget(null); return; }
    const from = tsDragKey.current;
    const next = [...columnOrder];
    const fromIdx = next.indexOf(from); const toIdx = next.indexOf(key);
    next.splice(fromIdx, 1); next.splice(toIdx, 0, from);
    setColumnOrder(next); tsDragKey.current = null; setTsDropTarget(null);
  }
  function tsDragEnd() { tsDragKey.current = null; setTsDropTarget(null); }

  function openView(ts: TimesheetRecord) {
    setViewTarget(ts);
    setViewDrawerOpen(true);
  }

  function handleApprove(ts: TimesheetRecord) {
    toast.success(`Approved ${ts.name}'s timesheet`);
  }

  function handleReject(ts: TimesheetRecord) {
    toast.error(`Rejected ${ts.name}'s timesheet`);
  }

  const pending = MOCK_TIMESHEETS.filter(ts =>
    !deletedIds.has(ts.id) &&
    (ts.status === 'Submitted' || ts.status === 'Correction Required' || ts.status === 'Clarification Required'),
  );

  const filtered = pending.filter(ts => {
    const q = search.toLowerCase();
    return !q || ts.name.toLowerCase().includes(q) || ts.filingPeriod.toLowerCase().includes(q);
  });

  const sorted = sortTimesheets(filtered, sortKey, sortDirection);
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageItems  = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSort(key: TimesheetSortKey) {
    if (sortKey === key) {
      setSortDirection(direction => direction === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-[13px] placeholder:text-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 transition"
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded bg-gray-200 hover:bg-gray-300 transition-colors">
              <X size={11} className="text-gray-600" />
            </button>
          )}
        </div>
        <div className="hidden flex-1 sm:block" />
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700">
          {pending.length} awaiting action
        </span>
      </div>

      {/* Table */}
      <div className="mt-3 min-w-0 max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table className="w-full min-w-[900px] table-auto">
          <TableHeader>
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              <TableHead className="pl-5 select-none">
                <div className="flex min-w-max items-center"><SortableHead label="Name" sortKey="name" currentKey={sortKey} currentDirection={sortDirection} onSort={handleSort} /></div>
              </TableHead>
              {columnOrder.map(key => {
                const col = TIMESHEET_COLUMN_OPTIONS.find(c => c.key === key)!;
                const isDrop = tsDropTarget === key;
                return (
                  <TableHead key={key} draggable
                    onDragStart={() => tsDragStart(key)}
                    onDragOver={e => tsDragOver(e, key)}
                    onDrop={() => tsDrop(key)}
                    onDragEnd={tsDragEnd}
                    className={cn('group select-none transition-colors', isDrop && 'border-l-2 border-brand bg-orange-50/60')}
                  >
                    <div className="flex min-w-max items-center gap-1.5">
                      {col.sortKey ? (
                        <button type="button" onClick={() => handleSort(col.sortKey!)}
                          className={cn('flex items-center gap-1 whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
                            sortKey === col.sortKey ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
                          )}>
                          <span className="whitespace-nowrap">{col.label}</span>
                          {sortKey === col.sortKey
                            ? sortDirection === 'asc' ? <ArrowUp size={11} className="text-brand" /> : <ArrowDown size={11} className="text-brand" />
                            : <ArrowUpDown size={11} className="opacity-40" />}
                        </button>
                      ) : (
                        <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-widest text-gray-500">{col.label}</span>
                      )}
                      <GripVertical size={13} aria-hidden="true"
                        className="ml-auto flex-shrink-0 cursor-grab text-gray-300 opacity-60 transition-colors group-hover:text-brand group-hover:opacity-100 active:cursor-grabbing" />
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-0">
                  <Empty
                    icon={Clock}
                    title="No pending timesheets"
                    description="All timesheets have been reviewed. Nothing is awaiting action."
                    className="py-16"
                  />
                </TableCell>
              </TableRow>
            ) : pageItems.map(ts => {
              const chip = STATUS_CHIP[ts.status];
              const submittedLabel = ts.submittedOn
                ? new Date(ts.submittedOn).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                : '—';
              return (
                <TableRow
                  key={ts.id}
                  onClick={() => openView(ts)}
                  className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors cursor-pointer"
                >
                  <TableCell className="pl-5 py-3.5"><PersonName name={ts.name} /></TableCell>
                  {columnOrder.map(key => {
                    switch (key) {
                      case 'filingPeriod': return <TableCell key={key} className="py-3.5"><span className="text-[13px] text-gray-700">{ts.filingPeriod}</span></TableCell>;
                      case 'submittedOn':  return <TableCell key={key} className="py-3.5"><span className="text-[13px] text-gray-700">{submittedLabel}</span></TableCell>;
                      case 'totalHours':  return <TableCell key={key} className="py-3.5"><span className="text-[13px] font-medium text-gray-900">{ts.totalHours > 0 ? `${ts.totalHours}h` : '—'}</span></TableCell>;
                      case 'approvedBy':  return <TableCell key={key} className="py-3.5"><span className="text-[13px] text-gray-700">{ts.approvedBy ?? '—'}</span></TableCell>;
                      case 'status':      return <TableCell key={key} className="py-3.5"><span className={cn('inline-flex rounded-full px-2.5 py-[3px] text-[11.5px] font-medium whitespace-nowrap', chip.cls)}>{chip.label}</span></TableCell>;
                      case 'action':      return (
                        <TableCell key={key} className="py-3.5 pr-4">
                          <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleApprove(ts)} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors">Approve</button>
                            <button onClick={() => handleReject(ts)} className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-100 transition-colors">Reject</button>
                            <TooltipProvider delayDuration={150}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button type="button" aria-label="Delete" onClick={() => setDeleteTarget(ts)}
                                    className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500"><Trash2 size={13} /></button>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">Delete</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      );
                      default: return null;
                    }
                  })}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {filtered.length > pageSize && (
        <ProjectsPagination
          page={safePage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={open => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
              <Trash2 size={20} className="text-red-500" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Delete Timesheet
            </DialogTitle>
            <DialogDescription className="text-[13.5px] leading-relaxed text-gray-500">
              Are you sure you want to delete{' '}
              <span className="font-medium text-gray-700">
                {deleteTarget ? `${deleteTarget.name} — ${deleteTarget.filingPeriod}` : 'this timesheet'}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              type="button"
              onClick={() => setDeleteTarget(null)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!deleteTarget) return;
                setDeletedIds(prev => new Set([...prev, deleteTarget.id]));
                toast.success(`${deleteTarget.name}'s timesheet deleted`);
                setDeleteTarget(null);
              }}
              className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-red-600"
            >
              Delete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View timesheet drawer */}
      <ViewTimesheetDrawer
        open={viewDrawerOpen}
        onClose={() => { setViewDrawerOpen(false); setViewTarget(null); }}
        record={viewTarget}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

/* ══════════════════════════════════════════
   Attendance tab
   ══════════════════════════════════════════ */
function AttendanceTab() {
  return <AttendanceCalendar records={MOCK_ATTENDANCE} />;
}

/* ══════════════════════════════════════════
   Main screen
   ══════════════════════════════════════════ */
export function TimesheetsScreen() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-white px-4 pt-5 pb-10 sm:px-6 sm:pt-6">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold leading-tight text-gray-900 sm:text-[22px]">Timesheets</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">Track, submit and approve employee timesheets</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-brand/90 transition-colors shadow-sm"
        >
          <Plus size={14} />
          Add Timesheet
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <Tabs defaultValue="all">
          {/* Line tabs — scrollable on small screens */}
          <TabsList className="flex h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-gray-200 bg-transparent p-0">
            <TabsTrigger
              value="all"
              className="relative flex-none rounded-none border-b-2 border-transparent px-2.5 py-3 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-gray-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px]"
            >
              All Timesheets
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="relative flex-none rounded-none border-b-2 border-transparent px-2.5 py-3 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-gray-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px]"
            >
              Pending Actions
              {(() => {
                const count = MOCK_TIMESHEETS.filter(ts => ts.status === 'Submitted' || ts.status === 'Correction Required' || ts.status === 'Clarification Required').length;
                return count > 0 ? (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">{count}</span>
                ) : null;
              })()}
            </TabsTrigger>
            <TabsTrigger
              value="attendance"
              className="relative flex-none rounded-none border-b-2 border-transparent px-2.5 py-3 text-[12px] font-medium text-gray-500 transition-colors hover:text-gray-800 data-[state=active]:border-brand data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-gray-900 data-[state=active]:shadow-none sm:px-4 sm:text-[13px]"
            >
              Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all"        className="mt-4"><AllTimesheets /></TabsContent>
          <TabsContent value="pending"    className="mt-4"><PendingActions /></TabsContent>
          <TabsContent value="attendance" className="mt-4"><AttendanceTab /></TabsContent>
        </Tabs>
      </div>

      <AddTimesheetDrawer open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}

function ViewTimesheetDrawer({
  open,
  onClose,
  record,
  onApprove,
  onReject,
}: {
  open: boolean;
  onClose: () => void;
  record: TimesheetRecord | null;
  onApprove: (ts: TimesheetRecord) => void;
  onReject: (ts: TimesheetRecord) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [comments, setComments] = useState<TimesheetComment[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    if (open && record) {
      setEntries(seedEntriesFromRecord(record));
      setComments(seedTimesheetComments(record));
    }
    if (!open) {
      setEntries([]);
      setComments([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record?.id]);

  const statusChip = record ? STATUS_CHIP[record.status] : null;

  const totalMins = entries.reduce((sum, e) => sum + parseDurationToMinutes(e.duration), 0);
  const totalHoursDisplay = `${Math.floor(totalMins / 60)}h ${String(totalMins % 60).padStart(2, '0')}m`;

  function handleAddComment(text: string) {
    setComments(prev => [...prev, {
      id: `${record?.id ?? 'timesheet'}-review-admin-${Date.now()}`,
      author: 'Wade Warren',
      role: 'Admin',
      initials: 'WW',
      text,
      createdAt: new Date().toISOString(),
    }]);
    toast.success('Admin comment added');
  }

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Drawer panel */}
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Close review drawer"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">Review Timesheet</h2>
              {record && (
                <p className="mt-px text-[12px] text-gray-500">
                  {record.name}
                  {record.filingPeriod ? ` · ${record.filingPeriod}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {statusChip && (
              <span className={cn(
                'inline-flex rounded-full px-2.5 py-[3px] text-[11.5px] font-medium whitespace-nowrap',
                statusChip.cls,
              )}>
                {statusChip.label}
              </span>
            )}
            {record && (
              <>
                <button
                  type="button"
                  onClick={() => { onReject(record); onClose(); }}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-[7px] text-[13px] font-semibold text-red-600 transition-colors hover:bg-red-100"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={() => { onApprove(record); onClose(); }}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-[7px] text-[13px] font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
                >
                  Approve
                </button>
              </>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {entries.length > 0 ? (
            <>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                Time Entries
              </p>
              <div className="mt-2.5 space-y-2.5">
                {entries.map((entry, idx) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/60 p-3.5"
                  >
                    <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-semibold text-gray-800">
                          {format(parseISO(entry.date), 'dd MMM yyyy')}
                        </span>
                        <span className="rounded bg-gray-100 px-1.5 py-px text-[11px] font-medium text-gray-500">
                          {entry.dayType}
                        </span>
                        <span className="ml-auto font-mono text-[13px] font-semibold text-gray-700">
                          {entry.duration}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-gray-500">
                        {entry.client} › {entry.project} › {entry.task}
                      </p>
                      {entry.note && (
                        <p className="mt-0.5 truncate text-[11px] italic text-gray-400">{entry.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-[13px] text-gray-400">No time entries recorded.</p>
            </div>
          )}

          {record && (
            <TimesheetCommentsSection
              comments={comments}
              onAdd={handleAddComment}
            />
          )}
        </div>

        {/* Footer — total hours */}
        {entries.length > 0 && (
          <div className="flex-shrink-0 border-t border-gray-100 px-5 py-4">
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
              <span className="text-[13px] font-semibold text-gray-700">Total Hours</span>
              <span className="font-mono text-[15px] font-bold text-gray-900">{totalHoursDisplay}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
