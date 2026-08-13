'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft, ChevronDown, ChevronUp,
  AlertTriangle, Info, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { DrawerField, DrawerTextarea } from '@/components/ui/drawer-fields';
import { type TaskItem } from './mock-data';

/* ── Team members ─────────────────────────────────────────────────────── */

const TEAM_MEMBERS = [
  'Mohammed Khan', 'Tariq Ibrahim', 'Ali Tariq',   'Tina Patel',
  'Sarah Nasser',  'Nadia Saleh',   'Priya Nair',  'Qasim Ahmed',
  'Yousef Mansour','Thomas Wright', 'Bilal Ebrahim','Grace Hassan',
  'Elena Flores',  'Omar Mansour',  'Karen Simmons',
];

/* ── Avatar chip ─────────────────────────────────────────────────────── */

function AvatarChip({ name, initials }: { name: string; initials: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand text-[9px] font-bold text-white">
        {initials}
      </span>
      <span className="text-[12.5px] font-medium text-gray-800">{name}</span>
    </span>
  );
}

/* ── Assign dropdown ──────────────────────────────────────────────────── */

function AssignSelect({
  value,
  onChange,
  placeholder = 'Select assignee...',
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        'h-9 rounded-xl border border-gray-200 bg-white px-3 text-[12.5px]',
        'focus:border-brand focus:ring-1 focus:ring-brand/20 focus:outline-none',
        value ? 'text-gray-800' : 'text-gray-400',
        className,
      )}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border border-gray-200 shadow-lg">
        {TEAM_MEMBERS.map(m => (
          <SelectItem
            key={m} value={m}
            className="text-[13px] text-gray-700 focus:bg-orange-50 focus:text-brand rounded-lg"
          >
            {m}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ── Section label (matches Projects StepLabel) ───────────────────────── */

function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
      {children}
    </p>
  );
}

/* ── Props ────────────────────────────────────────────────────────────── */

interface Props {
  open:          boolean;
  onClose:       () => void;
  selectedTasks: TaskItem[];
  onConfirm:     () => void;
  mode?:         'bulk' | 'single';
  department?:   string;
}

function SingleTaskReassignFields({
  task,
  newAssignee,
  onAssigneeChange,
  note,
  onNoteChange,
  department,
}: {
  task: TaskItem;
  newAssignee: string;
  onAssigneeChange: (value: string) => void;
  note: string;
  onNoteChange: (value: string) => void;
  department: string;
}) {
  return (
    <div className="space-y-6">
      <DrawerField label="Current Assignee">
        <input
          type="text"
          value={task.assignee?.name ?? 'Unassigned'}
          disabled
          readOnly
          className="h-11 w-full rounded-xl border border-gray-200 bg-white px-3.5 text-[13px] font-medium text-gray-700 outline-none disabled:cursor-not-allowed disabled:opacity-100"
        />
      </DrawerField>

      <DrawerField
        label="Select New Assignee"
        hint={`Only Team Members from the ${department} department can be assigned to this task.`}
      >
        <AssignSelect
          value={newAssignee}
          onChange={onAssigneeChange}
          placeholder="Choose an assignee..."
          className="h-11 w-full rounded-xl border-gray-200 px-3.5 text-[13px] data-[state=open]:border-brand"
        />
      </DrawerField>

      <DrawerField label="Note">
        <DrawerTextarea
          value={note}
          onChange={event => onNoteChange(event.target.value)}
          placeholder="Reason for reassignment..."
          rows={5}
        />
      </DrawerField>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────────────────── */

export function TaskReassignDrawer({
  open,
  onClose,
  selectedTasks,
  onConfirm,
  mode = 'bulk',
  department = 'Finops',
}: Props) {
  const [mounted, setMounted] = useState(false);

  /* task section expand */
  const [taskSectionOpen, setTaskSectionOpen] = useState(true);

  /* per-task new assignees */
  const [newAssignees, setNewAssignees] = useState<Record<string, string>>({});

  /* reassignment type */
  const [reassignType, setReassignType] = useState<'permanent' | 'temporary' | ''>('');

  /* note */
  const [note, setNote] = useState('');

  useEffect(() => { setMounted(true); }, []);

  /* lock scroll */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* reset on open */
  useEffect(() => {
    if (open) {
      setTaskSectionOpen(true);
      setNewAssignees({});
      setReassignType('');
      setNote('');
    }
  }, [open]);

  const count = selectedTasks.length;
  const isSingleTask = mode === 'single';
  const singleTask = selectedTasks[0];

  /* how many tasks have no new assignee selected */
  const unassignedCount = selectedTasks.filter(t => !newAssignees[t.id]).length;
  const canConfirm = isSingleTask
    ? Boolean(singleTask && newAssignees[singleTask.id])
    : Boolean(reassignType) && selectedTasks.length > 0 && unassignedCount === 0;

  function handleConfirm() {
    onConfirm();
    onClose();
  }

  if (!mounted) return null;

  const content = (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      />

      {/* Panel */}
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
            <span className="text-[15px] font-semibold text-gray-900">
              {isSingleTask ? 'Change Assignee' : 'Bulk Task Reassignment'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={cn(
              'rounded-lg px-4 py-[7px] text-[13px] font-semibold text-white transition-colors',
              canConfirm
                ? 'bg-brand hover:bg-brand-hover'
                : 'cursor-not-allowed bg-orange-200',
            )}
          >
            Confirm Now
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-5 px-5 py-5">
            {isSingleTask && singleTask ? (
              <SingleTaskReassignFields
                task={singleTask}
                newAssignee={newAssignees[singleTask.id] ?? ''}
                onAssigneeChange={value =>
                  setNewAssignees(prev => ({ ...prev, [singleTask.id]: value }))
                }
                note={note}
                onNoteChange={setNote}
                department={department}
              />
            ) : (
              <>

            {/* ── Selected tasks summary card ── */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-gray-500">
                {count} {count === 1 ? 'Task' : 'Tasks'} Selected
              </p>
              <div className="max-h-[112px] space-y-2 overflow-y-auto pr-1">
                {selectedTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-2">
                    <Users size={13} className="flex-shrink-0 text-brand" />
                    <span className="min-w-0 truncate text-[13.5px] font-semibold text-gray-900">
                      {task.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Task Level Assignment ── */}
            <div className="space-y-2">
              <StepLabel>Task Level Assignment</StepLabel>

              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                {/* Section header */}
                <button
                  type="button"
                  onClick={() => setTaskSectionOpen(v => !v)}
                  className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50/70"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-gray-900">Any Role Tasks</span>
                    <span className="text-[12px] text-gray-400">{count} {count === 1 ? 'task' : 'tasks'}</span>
                  </span>
                  {taskSectionOpen
                    ? <ChevronUp   size={15} className="flex-shrink-0 text-gray-400" />
                    : <ChevronDown size={15} className="flex-shrink-0 text-gray-400" />}
                </button>

                {/* Task rows */}
                {taskSectionOpen && (
                  <div className="border-t border-gray-100 bg-gray-50/40">
                    {selectedTasks.map((task, i) => {
                      const assignee = task.assignee;
                      return (
                        <div
                          key={task.id}
                          className={cn(
                            'flex items-center justify-between gap-3 px-4 py-2.5',
                            i > 0 && 'border-t border-gray-100',
                          )}
                        >
                          {/* Task name + current assignee */}
                          <div className="min-w-0 flex-1">
                            <p className="mb-1 truncate text-[12.5px] font-medium text-gray-700">
                              {task.name}
                            </p>
                            {assignee
                              ? <AvatarChip name={assignee.name} initials={assignee.initials} />
                              : <span className="text-[12px] italic text-gray-400">Unassigned</span>}
                          </div>

                          {/* New assignee dropdown */}
                          <div className="w-[160px] flex-shrink-0">
                            <AssignSelect
                              value={newAssignees[task.id] ?? ''}
                              onChange={v => setNewAssignees(prev => ({ ...prev, [task.id]: v }))}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Reassignment Type ── */}
            <div className="space-y-3">
              <StepLabel>Reassignment Type</StepLabel>

              {/* Permanent / Temporary — horizontal inline radios */}
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

            {/* ── Note ── */}
            <div className="space-y-2">
              <StepLabel>Note</StepLabel>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Reason for reassignment..."
                rows={3}
                className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-[13px] text-gray-800 placeholder:text-gray-400 outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand/20"
              />
            </div>

            {/* ── Info banners ── */}
            <div className="space-y-2">
              <div className="flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <Info size={15} className="flex-shrink-0 text-blue-500" strokeWidth={2} />
                <p className="text-[12.5px] text-blue-700">
                  Completed tasks will be skipped and not reassigned.
                </p>
              </div>

              {unassignedCount > 0 && (
                <div className="flex items-center gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <AlertTriangle size={15} className="flex-shrink-0 text-amber-500" strokeWidth={2} />
                  <p className="text-[12.5px] text-amber-700">
                    {unassignedCount} {unassignedCount === 1 ? 'task has' : 'tasks have'} no new assignee selected. {unassignedCount === 1 ? 'It' : 'They'} will remain unchanged.
                  </p>
                </div>
              )}
            </div>

              </>
            )}

          </div>
          <div className="h-4" />
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
