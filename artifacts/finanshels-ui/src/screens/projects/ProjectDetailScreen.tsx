'use client';

import Link from 'next/link';
import { ArrowLeft, CalendarDays, Tag, CheckCircle2, Clock, AlertCircle, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProjectDisplayName, type Project, type ProjectTask, type TaskStatus, type TaskPriority } from './mock-data';

// ─── Status / Priority helpers ──────────────────────────────────────────────

const STATUS_BADGE: Record<
  import('./mock-data').ProjectStatus,
  string
> = {
  Current: 'bg-orange-50 text-orange-600 border-orange-200',
  Overdue: 'bg-red-50 text-red-600 border-red-200',
  'On Hold': 'bg-blue-50 text-blue-600 border-blue-200',
  Completed: 'bg-green-50 text-green-700 border-green-200',
  Archived: 'bg-gray-100 text-gray-600 border-gray-200',
};

const PROGRESS_COLOR: Record<import('./mock-data').ProjectStatus, string> = {
  Current: 'bg-brand',
  Overdue: 'bg-red-500',
  'On Hold': 'bg-blue-400',
  Completed: 'bg-green-500',
  Archived: 'bg-gray-400',
};

const TASK_STATUS_STYLES: Record<TaskStatus, { badge: string; icon: React.ReactNode }> = {
  Completed: {
    badge: 'bg-green-50 text-green-700 border-green-200',
    icon: <CheckCircle2 size={12} className="text-green-500" />,
  },
  'In Progress': {
    badge: 'bg-orange-50 text-orange-600 border-orange-200',
    icon: <Clock size={12} className="text-orange-400" />,
  },
  Pending: {
    badge: 'bg-gray-100 text-gray-500 border-gray-200',
    icon: <Clock size={12} className="text-gray-400" />,
  },
  Blocked: {
    badge: 'bg-red-50 text-red-600 border-red-200',
    icon: <Ban size={12} className="text-red-400" />,
  },
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  High: 'bg-red-50 text-red-600 border-red-200',
  Medium: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  Low: 'bg-gray-100 text-gray-500 border-gray-200',
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Avatar({
  initials,
  color,
  size = 'md',
  name,
}: {
  initials: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  name?: string;
}) {
  const cls = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-7 w-7 text-[11px]',
    lg: 'h-9 w-9 text-[13px]',
  }[size];
  return (
    <div
      title={name}
      className={cn('flex items-center justify-center rounded-full font-semibold text-white ring-2 ring-white flex-shrink-0', cls)}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-[22px] font-bold text-foreground leading-tight">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TaskRow({ task }: { task: ProjectTask }) {
  const { badge, icon } = TASK_STATUS_STYLES[task.status];
  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[13px] text-foreground">{task.title}</span>
        </div>
      </td>
      <td className="py-3 px-3">
        <span
          className={cn(
            'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold',
            badge,
          )}
        >
          {task.status}
        </span>
      </td>
      <td className="py-3 px-3">
        <span
          className={cn(
            'inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-semibold',
            PRIORITY_STYLES[task.priority],
          )}
        >
          {task.priority}
        </span>
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1.5">
          <Avatar initials={task.assignee.initials} color={task.assignee.color} size="sm" name={task.assignee.name} />
          <span className="text-[12px] text-muted-foreground">{task.assignee.name ?? task.assignee.initials}</span>
        </div>
      </td>
      <td className="py-3 pl-3 pr-4">
        <div className="flex items-center gap-1 text-[12px] text-muted-foreground">
          <CalendarDays size={11} />
          {task.dueDate}
        </div>
      </td>
    </tr>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function ProjectDetailScreen({ project }: { project: Project }) {
  const tasks = project.tasks ?? [];
  const teamLead = project.teamLeads[0] ?? project.assignees[0] ?? {
    initials: project.client.name.slice(0, 2).toUpperCase(),
    name: project.client.name,
    color: project.client.color,
  };
  const serviceColor = project.serviceType.color ?? '#334756';
  const displayName = getProjectDisplayName(project);

  const byStatus = (s: TaskStatus) => tasks.filter((t) => t.status === s).length;
  const completedCount = byStatus('Completed');
  const inProgressCount = byStatus('In Progress');
  const pendingCount = byStatus('Pending');
  const blockedCount = byStatus('Blocked');

  const allTeam = [teamLead, ...project.assignees].filter(
    (m, i, arr) => arr.findIndex((x) => x.initials === m.initials && x.color === m.color) === i,
  );

  return (
    <div className="px-6 py-6">
      {/* Back link */}
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors mb-5"
      >
        <ArrowLeft size={13} />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-heading-xl text-foreground leading-tight">{displayName}</h1>
            <span
              className={cn(
                'rounded border px-2 py-0.5 text-[11px] font-semibold flex-shrink-0',
                STATUS_BADGE[project.status],
              )}
            >
              {project.status}
            </span>
          </div>
          {project.description && (
            <p className="mt-1 text-body-sm text-muted-foreground max-w-2xl">{project.description}</p>
          )}
        </div>
      </div>

      {/* Meta row: client · service · dates */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-muted-foreground">
        {/* Client */}
        <div className="flex items-center gap-1.5">
          <div
            className="flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white"
            style={{ backgroundColor: project.client.color }}
          >
            {project.client.name[0]}
          </div>
          <span>{project.client.name}</span>
        </div>
        <span className="text-gray-300">·</span>
        {/* Service */}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: serviceColor }} />
          <span>{project.serviceType.label}</span>
        </div>
        <span className="text-gray-300">·</span>
        {/* Dates */}
        {project.startDate && (
          <div className="flex items-center gap-1">
            <CalendarDays size={12} />
            <span>Started {project.startDate}</span>
          </div>
        )}
        {project.startDate && project.dueDate && <span className="text-gray-300">–</span>}
        <div className="flex items-center gap-1">
          <CalendarDays size={12} />
          <span>{project.dueDate}</span>
        </div>
      </div>

      {/* Tags */}
      {(project.tags?.length ?? 0) > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <Tag size={12} className="text-muted-foreground" />
          {project.tags?.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 bg-white px-2.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Two-column layout ── */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Left column — tasks table (2/3 width on lg) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Task stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Total Tasks" value={tasks.length} />
            <StatCard label="Completed" value={completedCount} sub={`${tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}% done`} />
            <StatCard label="In Progress" value={inProgressCount} />
            <StatCard label="Blocked" value={blockedCount} sub={blockedCount > 0 ? 'Needs attention' : undefined} />
          </div>

          {/* Tasks table */}
          <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-foreground">All Tasks ({tasks.length})</h2>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> {completedCount} done</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock size={11} className="text-orange-400" /> {inProgressCount} active</span>
                {blockedCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex items-center gap-1 text-red-500"><AlertCircle size={11} /> {blockedCount} blocked</span>
                  </>
                )}
              </div>
            </div>
            {tasks.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-muted-foreground">No tasks yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="py-2.5 pl-4 pr-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Task</th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Priority</th>
                      <th className="py-2.5 px-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Assignee</th>
                      <th className="py-2.5 pl-3 pr-4 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column — sidebar info (1/3 width on lg) */}
        <div className="space-y-4">

          {/* Progress */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-[13px] font-semibold text-foreground">Progress</h2>
            <div className="mt-3">
              <div className="flex items-center justify-between text-[12px] mb-1.5">
                <span className="font-semibold text-foreground">{project.progress}% complete</span>
                <span className="text-muted-foreground">{project.tasksCompleted}/{project.tasksTotal} tasks</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100">
                <div
                  className={cn('h-full rounded-full transition-all', PROGRESS_COLOR[project.status])}
                  style={{ width: `${project.progress}%` }}
                />
              </div>
            </div>
            {/* Per-status breakdown */}
            <div className="mt-4 space-y-2">
              {(
                [
                  { label: 'Completed', count: completedCount, color: 'bg-green-500' },
                  { label: 'In Progress', count: inProgressCount, color: 'bg-brand' },
                  { label: 'Pending', count: pendingCount, color: 'bg-gray-300' },
                  { label: 'Blocked', count: blockedCount, color: 'bg-red-400' },
                ] as const
              ).map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={cn('h-2 w-2 rounded-full flex-shrink-0', color)} />
                  <span className="flex-1 text-[12px] text-muted-foreground">{label}</span>
                  <span className="text-[12px] font-medium text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team */}
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <h2 className="text-[13px] font-semibold text-foreground mb-3">Team</h2>

            {/* Team lead */}
            <div className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Team Lead</p>
              <div className="flex items-center gap-2">
                <Avatar initials={teamLead.initials} color={teamLead.color} size="lg" name={teamLead.name} />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{teamLead.name}</p>
                  <p className="text-[11px] text-muted-foreground">Lead</p>
                </div>
              </div>
            </div>

            {/* Assignees */}
            {project.assignees.length > 0 && (
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Assignees</p>
                <div className="space-y-2">
                  {project.assignees.map((a, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Avatar initials={a.initials} color={a.color} size="md" name={a.name} />
                      <p className="text-[12px] text-foreground">{a.name ?? a.initials}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* All team avatars row */}
          {allTeam.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h2 className="text-[13px] font-semibold text-foreground mb-3">All Members</h2>
              <div className="flex flex-wrap gap-2">
                {allTeam.map((m, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <Avatar initials={m.initials} color={m.color} size="lg" name={m.name} />
                    <span className="text-[10px] text-muted-foreground">{m.name ?? m.initials}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
