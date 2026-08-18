'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, ChevronDown, ChevronUp, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DrawerField, DrawerTextarea } from '@/components/ui/drawer-fields';

/* ── Team member options ── */
const TEAM_MEMBERS = [
  'Arjun Kumar', 'Aisha Mohammed', 'Ivan Xavier', 'Ali Tariq', 'David Kim',
  'Karim Tahir', 'Paulo Torres', 'Meera Nair', 'Mohammed Khan', 'Laura Nixon',
];

/* ── Task group mock data ── */
interface TaskItem  { id: string; title: string }
interface TaskGroup { id: string; label: string; tasks: TaskItem[] }

const TASK_GROUPS: TaskGroup[] = [
  {
    id: 'am', label: 'AM Only Tasks',
    tasks: [
      { id: 't1', title: 'Task 1 — AM Only Tasks sample' },
      { id: 't2', title: 'Task 2 — AM Only Tasks sample' },
      { id: 't3', title: 'Task 3 — AM Only Tasks sample' },
      { id: 't4', title: 'Task 4 — AM Only Tasks sample' },
    ],
  },
  {
    id: 'tl', label: 'TL Only Tasks',
    tasks: [
      { id: 't5', title: 'Task 1 — TL Only Tasks sample' },
      { id: 't6', title: 'Task 2 — TL Only Tasks sample' },
      { id: 't7', title: 'Task 3 — TL Only Tasks sample' },
    ],
  },
  {
    id: 'am-adhoc', label: 'AM Only Tasks (adhoc)',
    tasks: [
      { id: 't8', title: 'Task 1 — AM adhoc sample' },
      { id: 't9', title: 'Task 2 — AM adhoc sample' },
    ],
  },
  {
    id: 'any', label: 'Any Role Tasks',
    tasks: [
      { id: 't10', title: 'Task 1 — Any Role sample' },
      { id: 't11', title: 'Task 2 — Any Role sample' },
      { id: 't12', title: 'Task 3 — Any Role sample' },
      { id: 't13', title: 'Task 4 — Any Role sample' },
      { id: 't14', title: 'Task 5 — Any Role sample' },
    ],
  },
];

/* ── Avatar (initials) ── */
function Avatar({ name, color }: { name: string; color: string }) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className={cn(
      'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white',
      color,
    )}>
      {initials}
    </span>
  );
}

/* ── Shadcn-powered assign dropdown ── */
function AssignSelect({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        'h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[13px]',
        'focus:border-brand focus:ring-1 focus:ring-brand/20 focus:outline-none',
        'data-[placeholder]:text-gray-400',
        value ? 'text-gray-800' : 'text-gray-400',
      )}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-gray-200 shadow-lg">
        {TEAM_MEMBERS.map(m => (
          <SelectItem
            key={m}
            value={m}
            className="text-[13px] text-gray-700 focus:bg-orange-50 focus:text-brand rounded-lg"
          >
            {m}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ── Section label ── */
function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
      {children}
    </p>
  );
}

/* ── Props ── */
export interface SelectedProject { title: string; dueDate: string }

interface Props {
  open:      boolean;
  onClose:   () => void;
  count:     number;
  projects:  SelectedProject[];
  onConfirm: (reason: string) => void;
}

const PREVIEW_COUNT = 3;

export function BulkReassignDrawer({ open, onClose, count, projects, onConfirm }: Props) {
  const [mounted, setMounted] = useState(false);

  /* Step 1 */
  const [newAM, setNewAM] = useState('');
  const [newTL, setNewTL] = useState('');
  const [reason, setReason] = useState('');

  /* Step 2 */
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set(['am']));
  const [showAllGroup,  setShowAllGroup]  = useState<Set<string>>(new Set());
  const [taskAssignees, setTaskAssignees] = useState<Record<string, string>>({});

  /* Reassignment type */
  const [reassignType,   setReassignType]   = useState<'permanent' | 'temporary'>('permanent');

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  function toggleGroup(id: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    onConfirm(reason.trim());
    /* reset */
    setNewAM(''); setNewTL(''); setReason('');
    setExpanded(new Set(['am']));
    setShowAllGroup(new Set());
    setTaskAssignees({});
    setReassignType('permanent');
    onClose();
  }

  const canConfirm = Boolean((newAM || newTL) && reason.trim());

  /* count adhoc tasks without an assignee */
  const adhocGroup           = TASK_GROUPS.find(g => g.id === 'am-adhoc');
  const unassignedAdhocCount = adhocGroup
    ? adhocGroup.tasks.filter(t => !taskAssignees[t.id]).length
    : 0;

  const content = (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Panel — same dimensions as FilterDrawer / HoldProjectDrawer ── */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-[36rem]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* ── Header ── */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-[14px]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={17} />
            </button>
            <span className="text-[15px] font-semibold text-gray-900">Bulk Reassignment</span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canConfirm ? 'bg-brand hover:bg-brand-hover' : 'bg-orange-200 cursor-not-allowed',
            )}
          >
            Confirm Now
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">

            {/* ── Selected project summary ── */}
            {projects.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
                  {count} {count === 1 ? 'Project' : 'Projects'} Selected
                </p>
                <div className="max-h-[112px] space-y-2 overflow-y-auto pr-1">
                  {projects.map(project => (
                    <div key={`${project.title}-${project.dueDate}`} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-gray-900">
                        {project.title}
                      </span>
                      <span className="flex-shrink-0 text-[12px] text-gray-500">
                        Due {project.dueDate}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Step 1: Project Level Assignment ── */}
            <div className="space-y-3">
              <StepLabel>Step 1 — Project Level Assignment</StepLabel>

              {/* AM row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1.5 text-[12.5px] font-medium text-gray-700">Current AM</p>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3">
                    <Avatar name="Darlene Robertson" color="bg-[#C17A3E]" />
                    <span className="truncate text-[12.5px] text-gray-800">Darlene Robertson</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-medium text-gray-700">New AM</p>
                  <AssignSelect value={newAM} onChange={setNewAM} placeholder="Select AM..." />
                </div>
              </div>

              {/* TL row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1.5 text-[12.5px] font-medium text-gray-700">Current TL</p>
                  <div className="flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3">
                    <Avatar name="Courtney Henry" color="bg-[#2E6B5E]" />
                    <span className="truncate text-[12.5px] text-gray-800">Courtney Henry</span>
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-medium text-gray-700">New TL</p>
                  <AssignSelect value={newTL} onChange={setNewTL} placeholder="Select TL..." />
                </div>
              </div>
            </div>

            {/* ── Step 2: Task Level Assignment ── */}
            <div className="space-y-2">
              <StepLabel>Step 2 — Task Level Assignment</StepLabel>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {TASK_GROUPS.map((group, gi) => {
                  const isOpen    = expanded.has(group.id);
                  const showAll   = showAllGroup.has(group.id);
                  const visible   = showAll ? group.tasks : group.tasks.slice(0, PREVIEW_COUNT);
                  const remaining = group.tasks.length - PREVIEW_COUNT;

                  return (
                    <div key={group.id} className={cn(gi > 0 && 'border-t border-gray-100')}>

                      {/* Group header */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50/70"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-gray-900">{group.label}</span>
                          <span className="text-[12px] text-gray-400">{group.tasks.length} tasks</span>
                        </span>
                        {isOpen
                          ? <ChevronUp   size={15} className="flex-shrink-0 text-gray-400" />
                          : <ChevronDown size={15} className="flex-shrink-0 text-gray-400" />
                        }
                      </button>

                      {/* Task rows */}
                      {isOpen && (
                        <div className="border-t border-gray-100 bg-gray-50/40">
                          {visible.map((task, ti) => (
                            <div
                              key={task.id}
                              className={cn(
                                'flex items-center justify-between gap-3 px-4 py-2.5',
                                ti > 0 && 'border-t border-gray-100',
                              )}
                            >
                              <span className="min-w-0 truncate text-[12.5px] text-gray-700">
                                {task.title}
                              </span>
                              <div className="w-[140px] flex-shrink-0">
                                <Select
                                  value={taskAssignees[task.id] ?? ''}
                                  onValueChange={v => setTaskAssignees(prev => ({ ...prev, [task.id]: v }))}
                                >
                                  <SelectTrigger className={cn(
                                    'h-8 w-full rounded-lg border border-gray-200 bg-white px-2.5 text-[12px]',
                                    'focus:border-brand focus:ring-1 focus:ring-brand/20 focus:outline-none',
                                    taskAssignees[task.id] ? 'text-gray-800' : 'text-gray-400',
                                  )}>
                                    <SelectValue placeholder="Assign to..." />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-xl border border-gray-200 shadow-lg">
                                    {TEAM_MEMBERS.map(m => (
                                      <SelectItem
                                        key={m}
                                        value={m}
                                        className="text-[12px] text-gray-700 focus:bg-orange-50 focus:text-brand rounded-lg"
                                      >
                                        {m}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}

                          {!showAll && remaining > 0 && (
                            <div className="border-t border-gray-100 px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => setShowAllGroup(prev => new Set([...prev, group.id]))}
                                className="text-[12.5px] font-medium text-brand hover:underline underline-offset-2"
                              >
                                +{remaining} more tasks...
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Reassignment Type ── */}
            <div className="space-y-3">
              <StepLabel>Reassignment Type</StepLabel>

              {/* Permanent / Temporary — circular radio (mutually exclusive) */}
              <div className="flex items-center gap-5">
                {(['permanent', 'temporary'] as const).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setReassignType(type)}
                    className="flex items-center gap-2"
                  >
                    <span className={cn(
                      'flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                      reassignType === type ? 'border-brand bg-brand' : 'border-gray-300 bg-white',
                    )}>
                      {reassignType === type && (
                        <span className="h-[7px] w-[7px] rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-[13.5px] font-medium capitalize text-gray-800">{type}</span>
                  </button>
                ))}
              </div>

            </div>

            {/* ── Reason for Reassignment ── */}
            <DrawerField label="Reason for Reassignment" required>
              <DrawerTextarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Describe why the project(s) are being reassigned..."
                rows={4}
              />
            </DrawerField>

            {/* ── Info banners ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <Info size={15} className="flex-shrink-0 text-blue-500" strokeWidth={2} />
                <p className="text-[12.5px] text-blue-700">
                  1 completed task will be skipped and not reassigned.
                </p>
              </div>

              {unassignedAdhocCount > 0 && (
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle size={15} className="flex-shrink-0 text-amber-500" strokeWidth={2} />
                  <p className="text-[12.5px] text-amber-700">
                    {unassignedAdhocCount} adhoc {unassignedAdhocCount === 1 ? 'task has' : 'tasks have'} no assignee selected. They will remain unassigned.
                  </p>
                </div>
              )}
            </div>

          </div>
          <div className="h-4" />
        </div>
      </div>
    </>
  );

  if (!mounted) return null;
  return createPortal(content, document.body);
}
