'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Check, Home, Pencil, PlayCircle, Tag, Users2,
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

/* ── Tag badge colour maps (same as ProjectCard) ── */
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

/* ── Per-row tag state ── */
interface TagEntry { priority: PriorityValue; severity: SeverityValue }

export type ProjectSortKey =
  | 'project-name' | 'client-name' | 'department'
  | 'progress' | 'task-count' | 'due-date' | 'status';

export type ProjectColumnKey =
  | 'client'
  | 'department'
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
  { key: 'client',     label: 'Client' },
  { key: 'department', label: 'Department' },
  { key: 'accountManager', label: 'Account Manager' },
  { key: 'teamLead',   label: 'Team Lead' },
  { key: 'assignees',  label: 'Assignees' },
  { key: 'progress',   label: 'Progress' },
  { key: 'tasks',      label: 'Tasks' },
  { key: 'dueDate',    label: 'Due Date' },
  { key: 'status',     label: 'Status' },
  { key: 'tags',       label: 'Tags' },
  { key: 'resume',     label: 'Actions' },
];

/* Base weights are normalized against the columns currently visible. This
 * keeps the table full-width when the Columns menu hides one or more fields. */
const PROJECT_COLUMN_WEIGHTS: Record<ProjectColumnKey, number> = {
  client: 10,
  department: 11,
  accountManager: 12,
  teamLead: 9,
  assignees: 10,
  progress: 14,
  tasks: 13,
  dueDate: 18,
  status: 11,
  tags: 13,
  resume: 11,
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
  onResume:             (id: string) => void;
  disableAllSelection?: boolean;
}

function SortableHead({
  label, sortKey, currentKey, currentDir, onSort, className,
}: {
  label:      string;
  sortKey:     ProjectSortKey;
  currentKey:  ProjectSortKey | null;
  currentDir:  'asc' | 'desc';
  onSort:      (key: ProjectSortKey) => void;
  className?:  string;
}) {
  const active = currentKey === sortKey;

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={cn(
        'flex items-center gap-1 text-left text-[10px] font-semibold uppercase tracking-widest select-none transition-colors',
        active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700',
        className,
      )}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {active
        ? currentDir === 'asc'
          ? <ArrowUp size={11} className="text-brand" />
          : <ArrowDown size={11} className="text-brand" />
        : <ArrowUpDown size={11} className="opacity-40" />
      }
    </button>
  );
}

export function ProjectsTable({
  projects,
  selectedIds,
  onToggle,
  onSelectAll,
  sortKey,
  sortDir,
  onSort,
  visibleColumns,
  onResume,
  disableAllSelection = false,
}: Props) {
  const router = useRouter();
  /* Map of projectId → saved tags */
  const [tags, setTags] = useState<Record<string, TagEntry>>({});
  /* Which project's dialog is open (null = none) */
  const [openId, setOpenId] = useState<string | null>(null);

  function getTag(id: string): TagEntry {
    return tags[id] ?? { priority: '', severity: '' };
  }

  function saveTag(id: string, priority: PriorityValue, severity: SeverityValue) {
    setTags(prev => ({ ...prev, [id]: { priority, severity } }));
  }

  const sortProps = { currentKey: sortKey, currentDir: sortDir, onSort };
  const selectColumnWeight = 4;
  const projectColumnWeight = 22;
  const visibleColumnWeight = PROJECT_COLUMN_OPTIONS.reduce(
    (total, { key }) => total + (visibleColumns.has(key) ? PROJECT_COLUMN_WEIGHTS[key] : 0),
    selectColumnWeight + projectColumnWeight,
  );
  const columnWidth = (weight: number) => `${(weight / visibleColumnWeight) * 100}%`;

  return (
    <div className="mt-3 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
        <Table className="w-full min-w-[1500px] table-fixed">
          <colgroup>
            <col style={{ width: columnWidth(selectColumnWeight) }} />
            <col style={{ width: columnWidth(projectColumnWeight) }} />
            {PROJECT_COLUMN_OPTIONS
              .filter(({ key }) => visibleColumns.has(key))
              .map(({ key }) => (
                <col key={key} style={{ width: columnWidth(PROJECT_COLUMN_WEIGHTS[key]) }} />
              ))}
          </colgroup>
          <TableHeader className="whitespace-nowrap">
            <TableRow className="border-b border-gray-200 bg-gray-50 hover:bg-gray-50">
              {/* ── Select-all checkbox ── */}
              <TableHead className="w-10 pl-4 text-[10px] font-semibold uppercase tracking-widest text-gray-700">
                {(() => {
                  const selectableProjects = disableAllSelection ? [] : projects.filter(
                    p => p.status !== 'Completed' && p.status !== 'Archived',
                  );
                  const allSelected  = selectableProjects.length > 0 && selectableProjects.every(p => selectedIds.has(p.id));
                  const someSelected = !allSelected && selectableProjects.some(p => selectedIds.has(p.id));
                  return (
                    <button
                      type="button"
                      onClick={onSelectAll}
                      disabled={selectableProjects.length === 0}
                      aria-label={
                        selectableProjects.length === 0
                          ? 'No selectable projects'
                          : allSelected
                            ? 'Deselect all'
                            : 'Select all'
                      }
                      className={cn(
                        'flex h-[13px] w-[13px] items-center justify-center rounded-[3px] border transition-colors',
                        selectableProjects.length === 0
                          ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
                          : allSelected
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
              <TableHead className="w-[21%]"><SortableHead label="Project" sortKey="project-name" {...sortProps} /></TableHead>
              {visibleColumns.has('client') && (
                <TableHead className="w-[9%]"><SortableHead label="Client" sortKey="client-name" {...sortProps} /></TableHead>
              )}
              {visibleColumns.has('department') && (
                <TableHead className="w-[10%]"><SortableHead label="Department" sortKey="department" {...sortProps} /></TableHead>
              )}
              {visibleColumns.has('accountManager') && (
                <TableHead className="w-[11%] whitespace-nowrap text-[10px] font-semibold leading-tight tracking-widest text-gray-700">Account Manager</TableHead>
              )}
              {visibleColumns.has('teamLead') && (
                <TableHead className="w-[8%] text-[10px] font-semibold uppercase tracking-widest text-gray-700">Team Lead</TableHead>
              )}
              {visibleColumns.has('assignees') && (
                <TableHead className="w-[9%] text-[10px] font-semibold uppercase tracking-widest text-gray-700">Assignees</TableHead>
              )}
              {visibleColumns.has('progress') && (
                <TableHead className="w-[13%]"><SortableHead label="Progress" sortKey="progress" {...sortProps} /></TableHead>
              )}
              {visibleColumns.has('tasks') && (
                <TableHead className="w-[10%]"><SortableHead label="Tasks" sortKey="task-count" {...sortProps} /></TableHead>
              )}
              {visibleColumns.has('dueDate') && (
                <TableHead className="w-[8%]"><SortableHead label="Due Date" sortKey="due-date" {...sortProps} /></TableHead>
              )}
              {visibleColumns.has('status') && (
                <TableHead className="w-[8%]"><SortableHead label="Status" sortKey="status" {...sortProps} /></TableHead>
              )}
              {visibleColumns.has('tags') && (
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-700">Tags</TableHead>
              )}
              {visibleColumns.has('resume') && (
                <TableHead className="text-[10px] font-semibold uppercase tracking-widest text-gray-700">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>

          <TableBody className="whitespace-nowrap">

            {projects.map(p => {
              const chip   = STATUS_CHIP[p.status];
              const dueParts = p.dueDate.replace(/^Due\s+/i, '');
              const tag    = getTag(p.id);
              const hasTags = Boolean(tag.priority || tag.severity);

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
                          : isSelected
                          ? 'border-brand bg-brand'
                          : 'border-gray-300 bg-white hover:border-brand/60',
                      )}
                    >
                      {isSelected && <Check size={8} className="text-white" strokeWidth={3} />}
                    </button>
                  </TableCell>

                  {/* Project */}
                  <TableCell className="max-w-0 py-3">
                    <span className="block max-w-full truncate whitespace-nowrap text-[13px] font-semibold leading-snug text-gray-900">
                      {p.title}
                    </span>
                  </TableCell>

                  {/* Client */}
                  {visibleColumns.has('client') && (
                    <TableCell className="max-w-0 py-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Home size={12} className="flex-shrink-0 text-gray-400" />
                        <span className="block min-w-0 truncate text-[12.5px] text-gray-700">{p.client.name}</span>
                      </div>
                    </TableCell>
                  )}

                  {/* Department */}
                  {visibleColumns.has('department') && (
                    <TableCell className="max-w-0 py-3">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <Users2 size={12} className="flex-shrink-0 text-gray-400" />
                        <span className="block min-w-0 truncate text-[12.5px] text-gray-700">{p.serviceType.label}</span>
                      </div>
                    </TableCell>
                  )}

                  {/* Account Manager */}
                  {visibleColumns.has('accountManager') && (
                    <TableCell className="py-3">
                      <AvatarGroup
                        members={p.accountManager ? [p.accountManager] : []}
                        size={24}
                        max={1}
                      />
                    </TableCell>
                  )}

                  {/* Team Lead */}
                  {visibleColumns.has('teamLead') && (
                    <TableCell className="py-3">
                      <AvatarGroup members={p.teamLeads} size={24} max={2} />
                    </TableCell>
                  )}

                  {/* Assignees */}
                  {visibleColumns.has('assignees') && (
                    <TableCell className="py-3">
                      <AvatarGroup members={p.assignees} size={24} max={2} />
                    </TableCell>
                  )}

                  {/* Progress */}
                  {visibleColumns.has('progress') && (
                    <TableCell className="py-3">
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
                  )}

                  {/* Tasks */}
                  {visibleColumns.has('tasks') && (
                    <TableCell className="py-3">
                      <div>
                        <span className="text-[12.5px] text-gray-700">{p.tasksCompleted}/{p.tasksTotal} Tasks</span>
                      </div>
                    </TableCell>
                  )}

                  {/* Due Date */}
                  {visibleColumns.has('dueDate') && (
                    <TableCell className="max-w-0 overflow-hidden py-3">
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
                  )}

                  {/* Status */}
                  {visibleColumns.has('status') && (
                    <TableCell className="max-w-0 overflow-hidden py-3">
                      <span className={cn(
                        'inline-flex rounded-full px-2.5 py-[3px] text-[11.5px] font-medium leading-tight whitespace-nowrap',
                        chip.cls,
                      )}>
                        {chip.label}
                      </span>
                    </TableCell>
                  )}

                  {/* Add / Edit Tags */}
                  {visibleColumns.has('tags') && <TableCell className="py-3 pr-4">
                    <div className="flex items-center gap-1.5">
                      {/* Priority badge */}
                      {tag.priority && (
                        <span className={cn(
                          'rounded-md px-1.5 py-0.5 text-[11px] font-normal leading-tight',
                          PRIORITY_BADGE[tag.priority],
                        )}>
                          {PRIORITY_SHORT[tag.priority]}
                        </span>
                      )}
                      {/* Severity badge */}
                      {tag.severity && (
                        <span className={cn(
                          'rounded-md px-1.5 py-0.5 text-[11px] font-normal leading-tight',
                          SEVERITY_BADGE[tag.severity],
                        )}>
                          {SEVERITY_SHORT[tag.severity]}
                        </span>
                      )}
                      {/* Button */}
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={e => { e.stopPropagation(); setOpenId(p.id); }}
                              aria-label={hasTags ? 'Edit tags' : 'Add tags'}
                              className={cn(
                                'group flex items-center rounded-md border border-gray-200 text-[11.5px] font-medium text-gray-600 transition-colors hover:border-brand hover:text-brand whitespace-nowrap',
                                hasTags
                                  ? 'h-7 w-7 justify-center p-0'
                                  : 'gap-1 px-2.5 py-1',
                              )}
                            >
                              {hasTags
                                ? <Pencil size={10} className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-brand" />
                                : <Tag    size={10} className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-brand" />
                              }
                              {!hasTags && 'Add Tags'}
                            </button>
                          </TooltipTrigger>
                          {hasTags && (
                            <TooltipContent
                              side="top"
                              sideOffset={6}
                              className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                            >
                              Edit Tag
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>}

                  {/* Resume */}
                  {visibleColumns.has('resume') && (
                    <TableCell className="py-3 pr-4">
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
                  )}

                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── One dialog per project, only mounted when open ── */}
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
