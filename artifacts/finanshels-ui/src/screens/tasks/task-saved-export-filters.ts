import { getProjectDisplayName, MOCK_PROJECTS } from '../projects/mock-data';
import {
  EMPTY_TASK_FILTERS, TASK_FILTER_OPTIONS, type SavedTaskFilter, type TaskFilterState,
} from './TaskFilterDrawer';

export const CURRENT_VIEW = 'current-view';
export const ALL_STATUS = 'all-status';
const projectNames = new Map(MOCK_PROJECTS.flatMap(project => [
  [project.title, getProjectDisplayName(project)],
  [getProjectDisplayName(project), getProjectDisplayName(project)],
]));

export function readSavedTaskFilters(): SavedTaskFilter[] {
  const parsed: unknown = JSON.parse(localStorage.getItem('finanshels-tasks-filters') ?? '[]');
  if (!Array.isArray(parsed)) throw new Error('Invalid saved filters');
  const ids = new Set<string>();
  return parsed.map(entry => {
    if (!entry || typeof entry !== 'object'
      || typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)
      || entry.id === CURRENT_VIEW || entry.id === ALL_STATUS
      || typeof entry.name !== 'string' || !entry.name.trim()
      || !entry.filters || typeof entry.filters !== 'object' || Array.isArray(entry.filters)) {
      throw new Error('Invalid saved filter');
    }
    ids.add(entry.id);
    const filters = Object.fromEntries(Object.entries(EMPTY_TASK_FILTERS).map(([key, fallback]) => {
      const value: unknown = entry.filters[key];
      if (value === undefined) return [key, Array.isArray(fallback) ? [] : fallback];
      if (Array.isArray(fallback)) {
        if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
          throw new Error('Invalid saved filter field');
        }
        return [key, [...value]];
      }
      if (typeof value !== 'string') throw new Error('Invalid saved filter field');
      if ((key === 'dueDateStart' || key === 'dueDateEnd') && value
        && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value)))) {
        throw new Error('Invalid saved date');
      }
      return [key, value];
    })) as unknown as TaskFilterState;
    filters.projectNames = filters.projectNames.map(value => projectNames.get(value) ?? value);
    return {
      id: entry.id, name: entry.name, filters,
      createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : 0,
      isDefault: entry.isDefault === true,
    };
  });
}

export function sameTaskFilters(left: TaskFilterState, right: TaskFilterState): boolean {
  return (Object.keys(EMPTY_TASK_FILTERS) as Array<keyof TaskFilterState>).every(key => {
    const a = left[key];
    const b = right[key];
    return Array.isArray(a) && Array.isArray(b)
      ? JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
      : a === b;
  });
}

export function sanitizeSavedTaskFilter(filters: TaskFilterState, activeDepartmentIds: string[]) {
  const sanitized = { ...filters };
  const removedByField: Record<string, number> = {};
  const fields: Array<{
    key: Exclude<keyof TaskFilterState, 'dueDateFilter' | 'dueDateStart' | 'dueDateEnd'>;
    label: string;
    options: readonly string[];
  }> = [
    { key: 'taskCategories', label: 'Task Category', options: TASK_FILTER_OPTIONS.taskCategories },
    { key: 'taskStatuses', label: 'Task Status', options: TASK_FILTER_OPTIONS.taskStatuses },
    { key: 'taskNames', label: 'Task Name', options: TASK_FILTER_OPTIONS.taskNames },
    { key: 'frequencies', label: 'Frequency', options: TASK_FILTER_OPTIONS.frequencies },
    { key: 'clients', label: 'Client', options: TASK_FILTER_OPTIONS.clients },
    { key: 'projectNames', label: 'Project', options: TASK_FILTER_OPTIONS.projectNames },
    { key: 'departments', label: 'Department', options: activeDepartmentIds },
    { key: 'services', label: 'Service', options: TASK_FILTER_OPTIONS.services },
    { key: 'assignees', label: 'Assignee', options: TASK_FILTER_OPTIONS.assignees },
    { key: 'tags', label: 'Tags', options: TASK_FILTER_OPTIONS.tags },
  ];
  for (const { key, label, options } of fields) {
    const stored = key === 'projectNames'
      ? filters[key].map(value => projectNames.get(value) ?? value)
      : filters[key];
    sanitized[key] = stored.filter(value => options.includes(value));
    if (sanitized[key].length < stored.length) {
      removedByField[label] = stored.length - sanitized[key].length;
    }
  }
  if (!(TASK_FILTER_OPTIONS.dueDatePresets as readonly string[]).includes(filters.dueDateFilter)) {
    removedByField['Due Date'] = 1;
    sanitized.dueDateFilter = 'All dates';
    sanitized.dueDateStart = '';
    sanitized.dueDateEnd = '';
  }
  return { sanitized, removedByField };
}