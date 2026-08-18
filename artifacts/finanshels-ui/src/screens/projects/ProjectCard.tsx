'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Pencil, Tag, CalendarDays, PlayCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Project, ProjectStatus } from './mock-data';
import { getDateIndicator } from './date-utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
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

interface Props {
  project:              Project;
  isSelected:           boolean;
  onToggle:             () => void;
  onResume?:            () => void;
  disableAllSelection?: boolean;
}

export function ProjectCard({ project, isSelected, onToggle, onResume, disableAllSelection = false }: Props) {
  const router    = useRouter();
  const chip      = STATUS_CHIP[project.status];
  const indicator = getDateIndicator(project);
  const isSelectionDisabled = disableAllSelection || project.status === 'Completed' || project.status === 'Archived';

  const [priority, setPriority]           = useState<PriorityValue>('');
  const [severity, setSeverity]           = useState<SeverityValue>('');
  const [tagsOpen, setTagsOpen]           = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);

  const hasTags = Boolean(priority || severity);

  return (
    <div
      onClick={() => router.push(`/projects/${project.id}/tasks?from=grid`)}
      className={cn(
        'flex flex-col rounded-xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer',
        isSelected
          ? 'border-brand ring-2 ring-brand/15 hover:border-brand hover:ring-brand/25'
          : 'border-gray-200',
      )}
    >
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3">

        {/* ── Row 1: checkbox · title │ status chip ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">

            {/* Interactive checkbox */}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onToggle(); }}
              disabled={isSelectionDisabled}
              aria-label={isSelectionDisabled ? 'Completed or archived projects cannot be selected' : undefined}
              aria-checked={isSelected}
              role="checkbox"
              className={cn(
                'mt-[4px] flex h-[15px] w-[15px] flex-shrink-0 items-center justify-center rounded-[3px] border transition-colors',
                isSelectionDisabled
                  ? 'cursor-not-allowed border-gray-200 bg-gray-100 opacity-60'
                  : isSelected
                  ? 'border-brand bg-brand'
                  : 'border-gray-300 bg-white hover:border-brand/60',
              )}
            >
              {isSelected && <Check size={9} className="text-white" strokeWidth={3} />}
            </button>

            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block min-w-0 max-w-full truncate whitespace-nowrap text-[15px] font-semibold leading-snug text-gray-900">
                    {project.title}
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="rounded-md bg-[#082032] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-lg"
                >
                  {project.title}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className={cn(
            'flex-shrink-0 rounded-full px-2.5 py-[3px] text-[12px] font-medium leading-tight whitespace-nowrap',
            chip.cls,
          )}>
            {chip.label}
          </span>
        </div>

        {/* ── Team lead · assignee (avatars with name tooltips) ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] text-gray-500">Team Lead:</span>
            <AvatarGroup members={project.teamLeads} size={26} max={2} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[12.5px] text-gray-500">Assignee:</span>
            <AvatarGroup members={project.assignees} size={26} max={2} />
          </div>
        </div>

        {/* ── Progress row: % · bar · task count (single line) ── */}
        <div className="flex items-center gap-2">
          <span className="w-9 flex-shrink-0 text-[13px] font-semibold text-gray-900">
            {project.progress}%
          </span>
          <div className="h-[6px] min-w-0 flex-1 overflow-hidden rounded-full bg-gray-200">
            <div
              style={{ width: `${project.progress}%` }}
              className="h-full rounded-full bg-[#64748B] transition-all duration-300"
            />
          </div>
          <span className="flex-shrink-0 text-[12px] text-gray-600">
            {project.tasksCompleted}/{project.tasksTotal} Tasks
          </span>
        </div>

        {/* ── Row 6: due date + status indicator ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="flex-shrink-0 text-gray-400" />
            <span className="text-[13px] text-gray-700">{project.dueDate}</span>
          </div>
          {indicator && (
            <span className={cn(
              'whitespace-nowrap rounded-full px-2 py-[2px] text-[11px] font-medium',
              indicator.cls,
              indicator.cls === 'text-red-500'    && 'bg-red-50',
              indicator.cls === 'text-orange-500' && 'bg-orange-50',
              indicator.cls === 'text-emerald-600'&& 'bg-emerald-50',
              indicator.cls === 'text-amber-600'  && 'bg-amber-50',
            )}>
              {indicator.text}
            </span>
          )}
        </div>


      </div>

      {/* ── Footer ── */}
      <div className="flex flex-wrap items-center justify-between gap-y-2 px-4 py-3">
        <div className="flex items-center gap-2">
          {priority && (
            <span className={cn('rounded-md px-2 py-0.5 text-[12px] leading-tight', PRIORITY_BADGE[priority])}>
              {PRIORITY_SHORT[priority]}
            </span>
          )}
          {severity && (
            <span className={cn('rounded-md px-2 py-0.5 text-[12px] leading-tight', SEVERITY_BADGE[severity])}>
              {SEVERITY_SHORT[severity]}
            </span>
          )}
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={e => { e.stopPropagation(); setTagsOpen(true); }}
                  aria-label={hasTags ? 'Edit tags' : 'Add tags'}
                  className={cn(
                    'group flex items-center rounded-md border border-gray-200 text-[12.5px] font-medium text-gray-600 shadow-sm transition-colors hover:border-brand hover:text-brand',
                    hasTags
                      ? 'h-8 w-8 justify-center p-0'
                      : 'gap-1.5 px-3 py-1.5',
                  )}
                >
                  {hasTags
                    ? <Pencil size={11} className="text-gray-500 transition-colors group-hover:text-brand" />
                    : <Tag    size={11} className="text-gray-500 transition-colors group-hover:text-brand" />
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

        {onResume && (
          <button
            onClick={e => { e.stopPropagation(); setResumeDialogOpen(true); }}
            className="group flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[12.5px] font-medium text-gray-600 shadow-sm transition-colors hover:border-brand hover:text-brand"
          >
            <PlayCircle size={12} className="flex-shrink-0 text-gray-500 transition-colors group-hover:text-brand" />
            Resume
          </button>
        )}
      </div>

      {/* ── Resume confirmation dialog ── */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div onClick={e => e.stopPropagation()}>
      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="max-w-[400px] rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
              <PlayCircle size={20} className="text-brand" />
            </div>
            <DialogTitle className="text-[16px] font-semibold text-gray-900">
              Resume Project
            </DialogTitle>
            <DialogDescription className="text-[13.5px] text-gray-500 leading-relaxed">
              Are you sure you want to resume{' '}
              <span className="font-medium text-gray-700">{project.title}</span>?
              It will be moved back to <span className="font-medium text-emerald-700">Current</span>.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-2 gap-2 sm:gap-2">
            <button
              onClick={() => setResumeDialogOpen(false)}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setResumeDialogOpen(false);
                onResume?.();
                toast.success('Project resumed', {
                  description: `${project.title} is now active.`,
                  duration: 4000,
                });
              }}
              className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-brand-hover"
            >
              Yes, Resume
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AddTagsDialog
        open={tagsOpen}
        onClose={() => setTagsOpen(false)}
        onSave={(p, s) => { setPriority(p); setSeverity(s); }}
        projectTitle={project.title}
        initialPriority={priority}
        initialSeverity={severity}
      />
      </div>
    </div>
  );
}
