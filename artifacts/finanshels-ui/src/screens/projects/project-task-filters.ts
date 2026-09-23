import { makeActiveFilterChipKey, parseActiveFilterChipKey } from '../../components/active-filter-chip-key.ts';
import { MOCK_TASKS, type TaskItem } from '../tasks/mock-data.ts';
import {
  includesSelectedValue, matchesTaskFrequency, matchesTaskService, matchesTaskTag,
} from '../tasks/task-filter-matchers.ts';
import { getProjectDisplayName, type Project } from './mock-data.ts';
import type { TaskFilterState } from '../tasks/TaskFilterDrawer';

export type StatusView =
  | 'All' | 'Overdue' | 'Today' | 'Next 30 days'
  | 'Completed' | 'Upcoming' | 'On Hold' | 'Archived';

export const STATUSES: Array<{ value: StatusView; label: string }> = [
  { value: 'All', label: 'All Status' },
  { value: 'Overdue', label: 'Overdue' },
  { value: 'Today', label: 'Today' },
  { value: 'Next 30 days', label: 'Next 30 Days' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Upcoming', label: 'Upcoming' },
  { value: 'On Hold', label: 'On Hold' },
  { value: 'Archived', label: 'Archived' },
];

export function matchesStatusView(task: { status: string; dueDate: string }, view: StatusView): boolean {
  if (view === 'All') return true;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(task.dueDate); due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  switch (view) {
    case 'Overdue': return task.status !== 'Done' && task.status !== 'Archived' && days < 0;
    case 'Today': return days === 0 && task.status !== 'Done' && task.status !== 'Archived';
    case 'Next 30 days': return days >= 1 && days <= 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'Completed': return task.status === 'Done';
    case 'Upcoming': return days > 30 && task.status !== 'Done' && task.status !== 'Archived';
    case 'On Hold': return task.status === 'On Hold';
    case 'Archived': return task.status === 'Archived';
    default: return true;
  }
}

function projectDueDate(dueDate: string): string {
  const parsed = new Date(dueDate.replace(/^Due\s+/i, ''));
  return Number.isNaN(parsed.getTime()) ? '2026-12-31' : parsed.toISOString().slice(0, 10);
}

export function buildProjectTaskList(project: Project): TaskItem[] {
  const linkedTasks = MOCK_TASKS.filter(task =>
    task.projects.some(taskProject => taskProject.id === project.id),
  );
  const tasks = linkedTasks.slice(0, project.tasksTotal);
  const additionalCount = Math.max(0, project.tasksTotal - tasks.length);
  const linkedCompletedCount = tasks.filter(task => task.status === 'Done').length;
  const additionalCompletedCount = Math.max(
    0, Math.min(additionalCount, project.tasksCompleted - linkedCompletedCount),
  );
  const dueDate = projectDueDate(project.dueDate);
  const displayName = getProjectDisplayName(project);
  const assignee = project.assignees[0]
    ? { initials: project.assignees[0].initials, name: project.assignees[0].name }
    : null;

  for (let index = 0; index < additionalCount; index += 1) {
    tasks.push({
      id: `${project.id}-task-${index + 1}`,
      name: `${displayName} — Task ${index + 1}`,
      projects: [{
        id: project.id,
        title: displayName,
        clientName: project.client.name,
        clientColor: project.client.color,
      }],
      assignee,
      status: index < additionalCompletedCount ? 'Done' : 'To Do',
      priority: 'Medium',
      dueDate,
      timeSpentSeconds: 0,
      comments: 0,
    });
  }
  return tasks;
}

export function filterProjectTasks(
  taskList: TaskItem[],
  project: Project | undefined,
  search: string,
  filters: TaskFilterState,
  activeDepartmentIds: Set<string>,
): TaskItem[] {
  let list = taskList;
  const q = search.trim().toLowerCase();
  if (q) list = list.filter(task =>
    task.name.toLowerCase().includes(q) ||
    task.projects.some(p => getProjectDisplayName(p).toLowerCase().includes(q)) ||
    (task.assignee?.name ?? '').toLowerCase().includes(q),
  );
  if (filters.taskNames.length > 0) {
    list = list.filter(task => includesSelectedValue(
      filters.taskNames, [task.name, ...task.projects.map(getProjectDisplayName)],
    ));
  }
  if (filters.taskCategories?.length) {
    list = list.filter(task =>
      filters.taskCategories.some(category => matchesStatusView(task, category as StatusView)),
    );
  }
  if (filters.taskStatuses?.length) {
    list = list.filter(task => filters.taskStatuses.includes(task.status));
  }
  if (filters.frequencies.length > 0) {
    list = list.filter(task => filters.frequencies.some(frequency => matchesTaskFrequency(task, frequency)));
  }
  if (filters.clients.length > 0) {
    list = list.filter(task => task.projects.some(p => filters.clients.includes(p.clientName)));
  }
  if (filters.projectNames.length > 0) {
    list = list.filter(task => task.projects.some(p =>
      includesSelectedValue(filters.projectNames, [getProjectDisplayName(p)]),
    ));
  }
  if (filters.departments.length > 0) {
    list = list.filter(() => !!project &&
      filters.departments.includes(project.serviceType.departmentId) &&
      activeDepartmentIds.has(project.serviceType.departmentId),
    );
  }
  if (filters.services.length > 0) {
    list = list.filter(task => filters.services.some(service => matchesTaskService(task, service)));
  }
  if (filters.assignees.length > 0) {
    list = list.filter(task => filters.assignees.includes(task.assignee?.name ?? ''));
  }
  if (filters.tags.length > 0) {
    list = list.filter(task => filters.tags.some(tag => matchesTaskTag(task, tag)));
  }
  if (filters.dueDateFilter && filters.dueDateFilter !== 'All dates') {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    list = list.filter(task => {
      const due = new Date(task.dueDate);
      const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
      if (filters.dueDateFilter === 'Today') return days === 0;
      if (filters.dueDateFilter === 'This Week') return days >= 0 && days <= 7;
      if (filters.dueDateFilter === 'This Month') return days >= 0 && days <= 30;
      if (filters.dueDateFilter === 'Custom Date Range') {
        return (!filters.dueDateStart || task.dueDate >= filters.dueDateStart) &&
          (!filters.dueDateEnd || task.dueDate <= filters.dueDateEnd);
      }
      return true;
    });
  }
  return list;
}

export function getProjectTaskStatusCounts(tasks: TaskItem[]): Record<StatusView, number> {
  return STATUSES.reduce<Record<StatusView, number>>((counts, { value }) => {
    counts[value] = tasks.filter(task => matchesStatusView(task, value)).length;
    return counts;
  }, {} as Record<StatusView, number>);
}

export function removeProjectTaskFilter(filters: TaskFilterState, key: string): TaskFilterState {
  const { filterKey, value } = parseActiveFilterChipKey(key);
  const arrayKeys = ['taskCategories', 'taskStatuses', 'taskNames', 'frequencies', 'clients', 'projectNames', 'departments', 'services', 'assignees', 'tags'] as const;
  const next = { ...filters };
  if ((arrayKeys as readonly string[]).includes(filterKey)) {
    const arrayKey = filterKey as typeof arrayKeys[number];
    next[arrayKey] = value === null
      ? []
      : (filters[arrayKey] ?? []).filter(option => option !== value);
  } else if (filterKey === 'dueDateFilter') {
    next.dueDateFilter = 'All dates';
    next.dueDateStart = '';
    next.dueDateEnd = '';
  } else if (filterKey === 'dueDateStart' || filterKey === 'dueDateEnd') {
    next[filterKey] = '';
  }
  return next;
}