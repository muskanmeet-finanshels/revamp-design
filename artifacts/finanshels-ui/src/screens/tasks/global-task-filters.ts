import { getProjectDisplayName, MOCK_PROJECTS } from '../projects/mock-data.ts';
import type { TaskItem } from './mock-data';
import {
  includesSelectedValue, matchesTaskFrequency, matchesTaskService, matchesTaskTag,
} from './task-filter-matchers.ts';
import type { TaskFilterState } from './TaskFilterDrawer';

export type StatusView =
  | 'All' | 'Not Started' | 'Overdue' | 'Today' | 'Next 30 days'
  | 'Completed' | 'Upcoming' | 'On Hold' | 'Archived';

export const STATUSES: Array<{ value: StatusView; label: string }> = [
  { value: 'All', label: 'All Status' },
  { value: 'Not Started', label: 'Not Started' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Today', label: 'Today' },
  { value: 'Next 30 days', label: 'Next 30 Days' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Archived', label: 'Archived' },
];

export function matchesStatusView(task: { status: string; dueDate: string; timeSpentSeconds?: number }, view: StatusView): boolean {
  if (view === 'All') return true;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);

  switch (view) {
    case 'Not Started': return task.status === 'To Do' && (task.timeSpentSeconds ?? 0) === 0;
    case 'Overdue': return task.status !== 'Done' && task.status !== 'Completed' && task.status !== 'Archived' && days < 0;
    case 'Today': return days === 0 && task.status !== 'Archived';
    case 'Next 30 days': return days >= 1 && days <= 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'Completed': return task.status === 'Done';
    case 'Upcoming': return days > 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'On Hold': return task.status === 'On Hold';
    case 'Archived': return task.status === 'Archived';
    default: return true;
  }
}

const PROJECT_DEPT_MAP: Record<string, string> = Object.fromEntries(
  MOCK_PROJECTS.map(project => [project.id, project.serviceType.departmentId]),
);

export function filterTasksByAppliedFilters(
  taskList: TaskItem[],
  statusView: StatusView,
  searchValue: string,
  appliedFilters: TaskFilterState,
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
  if (appliedFilters.taskCategories?.length) {
    list = list.filter(task =>
      appliedFilters.taskCategories.some(category => matchesStatusView(task, category as StatusView)),
    );
  }
  if (appliedFilters.taskStatuses?.length) {
    list = list.filter(task => appliedFilters.taskStatuses.includes(task.status));
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
      task.projects.some(project => resolvedDeptIds.includes(PROJECT_DEPT_MAP[project.id] ?? '')),
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

export function getGlobalTaskStatusCounts(tasks: TaskItem[]): Record<StatusView, number> {
  return STATUSES.reduce<Record<StatusView, number>>((counts, { value }) => {
    counts[value] = tasks.filter(task => matchesStatusView(task, value)).length;
    return counts;
  }, {} as Record<StatusView, number>);
}