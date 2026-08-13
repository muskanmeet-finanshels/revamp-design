'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, GripVertical,
  Home, Pencil, PlayCircle, Tag, Users2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Project, ProjectStatus } from './mock-data';
import { getDateIndicator } from './date-utils';
import { AvatarGroup } from './AvatarGroup';
import {
  AddTagsDialog,
  type PriorityValue,
  type SeverityValue,
} from './AddTagsDialog';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

/* ── Status chip ── */
const STATUS_CHIP: Record<ProjectStatus, { label: string; cls: string }> = {
  Current:   { label: 'Current',   cls: 'border border-emerald-200 bg-emerald-50 text-emerald-700' },
  Overdue:   { label: 'Overdue',   cls: 'border border-red-200 bg-red-50 text-red-600'             },
  'On Hold': { label: 'On Hold',   cls: 'border border-amber-200 bg-amber-50 text-amber-700'       },
  Completed: { label: 'Completed', cls: 'border border-teal-200 bg-teal-50 text-teal-700'          },
  Archived:  { label: 'Archived',  cls: 'border border-gray-200 bg-gray-100 text-gray-600'         },
};

/* ── Tag badge colour maps ── */
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
const PRIORITY_SHORT: Record<string, string> = { p0: 'P0', p1: 'P1', p2: 'P2', p3: 'P3' };
const SEVERITY_SHORT: Record<string, string> = { s1: 'S1', s2: 'S2' };

interface TagEntry { priority: PriorityValue; severity: SeverityValue }

export type ProjectSortKey =
  | 'project-name' | 'client-name' | 'department'
  | 'progress' | 'task-count' | 'due-date' | 'status';

export type ProjectColumnKey =
  | 'client'
  | 'department'
  | 'revenue'
  | 'accountManager'
  | 'teamLead'
  | 'assignees'
  | 'progress'
  | 'tasks'
  | 'dueDate'
  | 'status'
  | 'tags'
  | 'resume';

export const PROJECT_COLUMN_OPTIONS: Array<{ key: ProjectColumnKey; label: string }> = [
  { key: 'client',         label: 'Client' },
  { key: 'department',     label: 'Department' },
  { key: 'revenue',        label: 'Revenue' },
  { key: 'accountManager', label: 'Account Manager' },
  { key: 'teamLead',       label: 'Team Lead' },
  { key: 'assignees',      label: 'Assignees' },
  { key: 'progress',       label: 'Progress' },
  { key: 'tasks',          label: 'Tasks' },
  { key: 'dueDate',        label: 'Due Date' },
  { key: 'status',         label: 'Status' },
  { key: 'tags',           label: 'Tags' },
  { key: 'resume',         label: 'Actions' },
];

const COLUMN_LABEL: Record<ProjectColumnKey, string> = Object.fromEntries(
  PROJECT_COLUMN_OPTIONS.map(({ key, label }) => [key, label]),
) as Record<ProjectColumnKey, string>;

const SORT_KEY_MAP: Partial<Record<ProjectColumnKey, ProjectSortKey>> = {
  client:     'client-name',
  department: 'department',
  progress:   'progress',
  tasks:      'task-count',
  dueDate:    'due-date',
  status:     'status',
};

const PROJECT_COLUMN_WEIGHTS: Record<ProjectColumnKey, number> = {
  client: 10, department: 11, revenue: 11,
  accountManager: 12, teamLead: 9, assignees: 10,
  progress: 14, tasks: 13, dueDate: 18,
  status: 11, tags: 13, resume: 11,
};

interface Props {
  projects:             Project[];
  selectedIds:          Set<string>;
  onToggle:             (id: string) => void;
  onSelectAll:          () => void;
  sortKey:              ProjectSortKey | null;
  sortDir:              'asc' | 'desc';
  onSort:               (key: ProjectSortKey) => void;
  visibleColumns:       Set<ProjectColumnKey>;
  /** Current display order for all columns (visible or not) */
  columnOrder:          ProjectColumnKey[];
  /** Called when user finishes a drag-drop reorder */
  onColumnReorder:      (newOrder: ProjectColumnKey[]) => void;
  onResume:             (id: string) => void;
  disableAllSelection?: boolean;
}

function SortableHead({
  label, sortKey, currentKey, currentDir, onSort, className,
}: {
  label:      string;
  sortKey:    ProjectSortKey;
  currentKey: ProjectSortKey | null;
  currentDir: 'asc' | 'desc';
  onSort:     (key: ProjectSortKey) => void;
  className?: string;
}) {
  const active = currentKey === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 whitespace-nowrap text-left text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
        active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
        className,
      )}
      aria-label={`Sort by ${label}`}
    >
      <span className="whitespace-nowrap">{label}</span>
      {active
        ? currentDir === 'asc'
          ? <ArrowUp size={11} className="text-brand" />
          : <ArrowDown size={11} className="text-brand" />
        : <ArrowUpDown size={11} className="opacity-40" />}
    </button>
  );
}

export function ProjectsTable({
  projects, selectedIds, onToggle, onSelectAll,
  sortKey, sortDir, onSort,
  visibleColumns, columnOrder, onColumnReorder,
  onResume, disableAllSelection = false,
}: Props) {
  const router = useRouter();
  const [tags, setTags]   = useState<Record<string, TagEntry>>({});
  const [openId, setOpenId] = useState<string | null>(null);

  /* ── Drag-and-drop state ── */
  const dragKey  = useRef<ProjectColumnKey | null>(null);
  const [dropTarget, setDropTarget] = useState<ProjectColumnKey | null>(null);

  function getTag(id: string): TagEntry {
    return tags[id] ?? { priority: '', severity: '' };
  }
  function saveTag(id: string, priority: PriorityValue, severity: SeverityValue) {
    setTags(prev => ({ ...prev, [id]: { priority, severity } }));
  }

  /* ordered list of visible columns */
  const orderedVisible = columnOrder.filter(k => visibleColumns.has(k));

  const sortProps = { currentKey: sortKey, currentDir: sortDir, onSort };

  const selectColumnWeight  = 4;
  const projectColumnWeight = 22;
  const visibleColumnWeight = orderedVisible.reduce(
    (t, k) => t + PROJECT_COLUMN_WEIGHTS[k],
    selectColumnWeight + projectColumnWeight,
  );
  const colW = (weight: number) => `${(weight / visibleColumnWeight) * 100}%`;

  /* ── Drag handlers ── */
  function handleDragStart(key: ProjectColumnKey) {
    dragKey.current = key;
  }
  function handleDragOver(e: React.DragEvent, key: ProjectColumnKey) {
    e.preventDefault();
    if (dragKey.current && dragKey.current !== key) setDropTarget(key);
  }
  function handleDrop(key: ProjectColumnKey) {
    if (!dragKey.current || dragKey.current === key) {
      setDropTarget(null);
      return;
    }
    const from = dragKey.current;
    const next = [...columnOrder];
    const fromIdx = next.indexOf(from);
    const toIdx   = next.indexOf(key);
    next.splice(fromIdx, 1);
    next.splice(toIdx, 0, from);
    onColumnReorder(next);
    dragKey.current = null;
    setDropTarget(null);
  }
  function handleDragEnd() {
    dragKey.current = null;
    setDropTarget(null);
  }

  /* ── Header cell renderer ── */
  function renderHeader(key: ProjectColumnKey) {
    const isDrop    = dropTarget === key;
    const sortable  = SORT_KEY_MAP[key];
    const label     = COLUMN_LABEL[key];

    return (
      <TableHead
        key={key}
        draggable
        onDragStart={() => handleDragStart(key)}
        onDragOver={e => handleDragOver(e, key)}
        onDrop={() => handleDrop(key)}
        onDragEnd={handleDragEnd}
        className={cn(
          'group select-none transition-colors',
          isDrop && 'border-l-2 border-brand bg-orange-50/60',
        )}
      >
        <div className="flex min-w-max items-center gap-1.5">
          {sortable ? (
            <SortableHead label={label} sortKey={sortable} {...sortProps} />
          ) : (
            <span className="whitespace-nowrap text-[10px] font-semibold uppercase leading-tight tracking-widest text-gray-500">
              {label}
            </span>
          )}
          {/* Keep the handle after the label so it does not compete with sorting. */}
          <GripVertical
            size={13}
            aria-hidden="true"
            className="ml-auto flex-shrink-0 cursor-grab text-gray-300 opacity-60 transition-colors group-hover:text-brand group-hover:opacity-100 active:cursor-grabbing"
          />
        </div>
      </TableHead>
    );
  }

  /* ── Body cell renderer ── */
  function renderCell(key: ProjectColumnKey, p: Project) {
    const chip    = STATUS_CHIP[p.status];
    const dueParts = p.dueDate.replace(/^Due\s+/i, '');
    const tag     = getTag(p.id);
    const hasTags = Boolean(tag.priority || tag.severity);

    switch (key) {
      case 'client':
        return (
          <TableCell key={key} className="max-w-0 py-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Home size={12} className="flex-shrink-0 text-gray-400" />
              <span className="block min-w-0 truncate text-[12.5px] text-gray-700">{p.client.name}</span>
            </div>
          </TableCell>
        );
      case 'department':
        return (
          <TableCell key={key} className="max-w-0 py-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <Users2 size={12} className="flex-shrink-0 text-gray-400" />
              <span className="block min-w-0 truncate text-[12.5px] text-gray-700">{p.serviceType.label}</span>
            </div>
          </TableCell>
        );
      case 'revenue':
        return (
          <TableCell key={key} className="py-3">
            <span className="text-[12.5px] font-medium text-gray-700">
              {p.revenue != null ? `AED ${p.revenue.toLocaleString()}` : '—'}
            </span>
          </TableCell>
        );
      case 'accountManager':
        return (
          <TableCell key={key} className="py-3">
            <AvatarGroup members={p.accountManager ? [p.accountManager] : []} size={24} max={1} />
          </TableCell>
        );
      case 'teamLead':
        return (
          <TableCell key={key} className="py-3">
            <AvatarGroup members={p.teamLeads} size={24} max={2} />
          </TableCell>
        );
      case 'assignees':
        return (
          <TableCell key={key} className="py-3">
            <AvatarGroup members={p.assignees} size={24} max={2} />
          </TableCell>
        );
      case 'progress':
        return (
          <TableCell key={key} className="py-3">
            <div className="flex items-center gap-2.5">
              <div className="h-[6px] w-[100px] overflow-hidden rounded-full bg-gray-200">
                <div
                  style={{ width: `${p.progress}%` }}
                  className="h-full rounded-full bg-[#64748B] transition-all duration-300"
                />
              </div>
              <span className="w-8 flex-shrink-0 text-[12.5px] font-semibold text-gray-700">{p.progress}%</span>
            </div>
          </TableCell>
        );
      case 'tasks':
        return (
          <TableCell key={key} className="py-3">
            <span className="text-[12.5px] text-gray-700">{p.tasksCompleted}/{p.tasksTotal} Tasks</span>
          </TableCell>
        );
      case 'dueDate':
        return (
          <TableCell key={key} className="max-w-0 overflow-hidden py-3">
            {(() => {
              const ind = getDateIndicator(p);
              return (
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12.5px] text-gray-700">{dueParts}</span>
                  {ind && (
                    <span className={cn(
                      'w-fit rounded-full px-2 py-[2px] text-[11px] font-medium whitespace-nowrap',
                      ind.cls, ind.bg,
                    )}>
                      {ind.text}
                    </span>
                  )}
                </div>
              );
            })()}
          </TableCell>
        );
      case 'status':
        return (
          <TableCell key={key} className="max-w-0 overflow-hidden py-3">
            <span className={cn(
              'inline-flex rounded-full px-2.5 py-[3px] text-[11.5px] font-medium leading-tight whitespace-nowrap',
              chip.cls,
            )}>
              {chip.label}
            </span>
          </TableCell>
        );
      case 'tags':
        return (
          <TableCell key={key} className="py-3 pr-4">
            <div className="flex items-center gap-1.5">
              {tag.priority && (
                <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-normal leading-tight', PRIORITY_BADGE[tag.priority])}>
                  {PRIORITY_SHORT[tag.priority]}
                </span>
              )}
              {tag.severity && (
                <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-normal leading-tight', SEVERITY_BADGE[tag.severity])}>
                  {SEVERITY_SHORT[tag.severity]}
                </span>
              )}
              <TooltipProvider delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={e => { e.stopPropagation(); setOpenId(p.id); }}
                      aria-label={hasTags ? 'Edit tags' : 'Add tags'}
                      className={cn(
                        'group flex items-center rounded-md border border-gray-200 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-brand hover:text-brand whitespace-nowrap',
                        hasTags ? 'h-7 w-7 justify-center p-0' : 'gap-1 px-2.5 py-1',
                      )}
                    >
                      {hasTags
                        ? <Pencil size={10} className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-brand" />
                        : <Tag    size={10} className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-brand" />}
                      {!hasTags && 'Add Tags'}
                    </button>
                  </TooltipTrigger>
                  {hasTags && (
                    <TooltipContent side="top" sideOffset={6} className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg">
                      Edit Tag
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            </div>
          </TableCell>
        );
      case 'resume':
        return (
          <TableCell key={key} className="py-3 pr-4">
            {p.status === 'On Hold' && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onResume(p.id); }}
                className="group flex items-center gap-1.5 whitespace-nowrap rounded-md border border-gray-200 px-2.5 py-1.5 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-brand hover:text-brand"
              >
                <PlayCircle size={12} className="text-gray-500 transition-colors group-hover:text-brand" />
                Resume
              </button>
            )}
          </TableCell>
        );
      default:
        return null;
    }
  }

  return (
    <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <Table className="w-max min-w-[1500px] table-auto">
          <colgroup>
            <col style={{ width: colW(selectColumnWeight) }} />
            <col style={{ width: colW(projectColumnWeight) }} />
            {orderedVisible.map(k => (
              <col key={k} style={{ width: colW(PROJECT_COLUMN_WEIGHTS[k]) }} />
            ))}
          </colgroup>

          <TableHeader className="whitespace-nowrap">
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              {/* Select-all checkbox — fixed, not draggable */}
              <TableHead className="w-10 pl-4 text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                {(() => {
                  const selectable = disableAllSelection ? [] : projects.filter(
                    p => p.status !== 'Completed' && p.status !== 'Archived',
                  );
                  const allSel  = selectable.length > 0 && selectable.every(p => selectedIds.has(p.id));
                  const someSel = !allSel && selectable.some(p => selectedIds.has(p.id));
                  return (
                    <button
                      type="button"
                      onClick={onSelectAll}
                      disabled={selectable.length === 0}
                      aria-label={selectable.length === 0 ? 'No selectable projects' : allSel ? 'Deselect all' : 'Select all'}
                      className={cn(
                        'flex h-[13px] w-[13px] items-center justify-center rounded-[3px] border transition-colors',
                        selectable.length === 0
                          ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
                          : allSel  ? 'border-brand bg-brand'
                          : someSel ? 'border-brand bg-brand/20'
                          : 'border-gray-300 bg-white hover:border-brand/60',
                      )}
                    >
                      {allSel  && <Check size={8} className="text-white" strokeWidth={3} />}
                      {someSel && !allSel && <span className="block h-[2px] w-[7px] rounded-full bg-brand" />}
                    </button>
                  );
                })()}
              </TableHead>

              {/* Project — fixed, not draggable */}
              <TableHead className="w-[21%]">
                <SortableHead label="Project" sortKey="project-name" {...sortProps} />
              </TableHead>

              {/* Draggable column headers in user-specified order */}
              {orderedVisible.map(k => renderHeader(k))}
            </TableRow>
          </TableHeader>

          <TableBody className="whitespace-nowrap">
            {projects.map(p => {
              const isSelected = selectedIds.has(p.id);
              const isSelectionDisabled = disableAllSelection || p.status === 'Completed' || p.status === 'Archived';
              return (
                <TableRow
                  key={p.id}
                  onClick={() => router.push(`/projects/${p.id}/tasks?from=list`)}
                  className={cn(
                    'cursor-pointer border-b border-gray-100 transition-colors',
                    isSelected ? 'bg-brand/5 hover:bg-brand/8' : 'hover:bg-gray-50/70',
                  )}
                >
                  {/* Checkbox */}
                  <TableCell className="pl-4 py-3 w-10">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onToggle(p.id); }}
                      disabled={isSelectionDisabled}
                      aria-label={isSelectionDisabled ? 'Completed or archived projects cannot be selected' : undefined}
                      aria-checked={isSelected}
                      role="checkbox"
                      className={cn(
                        'flex h-[13px] w-[13px] flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors',
                        isSelectionDisabled
                          ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
                          : isSelected ? 'border-brand bg-brand'
                          : 'border-gray-300 bg-white hover:border-brand/60',
                      )}
                    >
                      {isSelected && <Check size={8} className="text-white" strokeWidth={3} />}
                    </button>
                  </TableCell>

                  {/* Project title — fixed */}
                  <TableCell className="max-w-0 py-3">
                    <span className="block max-w-full truncate whitespace-nowrap text-[13px] font-semibold leading-snug text-gray-900">
                      {p.title}
                    </span>
                  </TableCell>

                  {/* Data cells in user-specified order */}
                  {orderedVisible.map(k => renderCell(k, p))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* AddTagsDialog per project */}
      {projects.map(p => {
        const tag = getTag(p.id);
        return (
          <AddTagsDialog
            key={p.id}
            open={openId === p.id}
            onClose={() => setOpenId(null)}
            onSave={(priority, severity) => saveTag(p.id, priority, severity)}
            projectTitle={p.title}
            initialPriority={tag.priority}
            initialSeverity={tag.severity}
          />
        );
      })}
    </div>
  );
}
