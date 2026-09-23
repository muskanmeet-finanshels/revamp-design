import assert from 'node:assert/strict';
import test from 'node:test';
import { getProjectDisplayName, MOCK_PROJECTS } from '../projects/mock-data.ts';
import type { TaskFilterState } from './TaskFilterDrawer';
import type { TaskItem, TaskProject } from './mock-data';
import {
  filterTasksByAppliedFilters, getGlobalTaskStatusCounts, type StatusView,
} from './global-task-filters.ts';

const project = (id: string): TaskProject => {
  const source = MOCK_PROJECTS.find(item => item.id === id);
  assert.ok(source, `fixture project ${id} exists`);
  return { id, title: source.title, clientName: source.client.name, clientColor: source.client.color };
};
const accounting = project('1');
const finance = project('2');
const audit = project('14');
const dateFromToday = (days: number): string => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const task = (id: string, name: string, status: TaskItem['status'], projects: TaskProject[], days: number): TaskItem => ({
  id, name, status, projects, dueDate: dateFromToday(days),
  assignee: { initials: 'AN', name: 'Alex Noor' }, priority: 'Medium', timeSpentSeconds: 0, comments: 0,
});
const tasks = [
  task('shared', 'Monthly payroll reconciliation', 'To Do', [accounting, finance], -2),
  task('finance', 'Quarterly budget forecast', 'In Progress', [finance], 10),
  task('audit', 'Annual audit evidence', 'Done', [audit], -1),
  task('accounting', 'Prepare VAT invoices', 'On Hold', [accounting], 45),
  task('archived', 'Old registration', 'Archived', [audit], -20),
];
const filters = (changes: Partial<TaskFilterState> = {}): TaskFilterState => ({
  taskCategories: [], taskStatuses: [], taskNames: [], frequencies: [],
  clients: [], projectNames: [], departments: [], services: [],
  assignees: [], tags: [], dueDateFilter: 'All dates', dueDateStart: '', dueDateEnd: '',
  ...changes,
});
const ids = (items: TaskItem[]): string[] => items.map(item => item.id);
const filtered = (changes: Partial<TaskFilterState>, status: StatusView = 'All', search = '', departments: string[] = []) =>
  filterTasksByAppliedFilters(tasks, status, search, filters(changes), departments);

test('search, project, client and department match any linked project without duplicating a task', () => {
  assert.deepEqual(ids(filtered({}, 'All', `  ${getProjectDisplayName(finance).toUpperCase()}  `)), ['shared', 'finance']);
  assert.deepEqual(ids(filtered({ taskNames: [getProjectDisplayName(finance)] })), ['shared', 'finance']);
  assert.deepEqual(ids(filtered({ projectNames: [getProjectDisplayName(accounting), getProjectDisplayName(finance)] })), ['shared', 'finance', 'accounting']);
  assert.deepEqual(ids(filtered({ projectNames: [getProjectDisplayName(finance)] })), ['shared', 'finance']);
  assert.deepEqual(ids(filtered({ clients: [finance.clientName] })), ['shared', 'finance']);
  assert.deepEqual(ids(filtered({ departments: ['dept-2'] }, 'All', '', ['dept-2'])), ['shared', 'finance']);
  assert.deepEqual(ids(filtered({ departments: ['dept-2'] }, 'All', '', [])), []);
  assert.deepEqual(ids(filtered({ departments: ['dept-1'] }, 'All', '', ['dept-1'])), ['shared', 'accounting']);
});

test('multi-select ORs within a field and combines fields with search and status', () => {
  assert.deepEqual(ids(filtered({
    taskNames: ['payroll', 'forecast'], frequencies: ['Monthly', 'Quarterly'],
    projectNames: [getProjectDisplayName(finance)],
  })), ['shared', 'finance']);
  const selected = {
    taskNames: ['payroll', 'forecast'], frequencies: ['Monthly', 'Quarterly'],
    projectNames: [getProjectDisplayName(finance)], departments: ['dept-2'],
    services: ['Accounting', 'Finance'], tags: ['Payroll'],
    assignees: ['Alex Noor'], clients: [finance.clientName],
  };
  assert.deepEqual(ids(filtered(selected, 'All', '', ['dept-2'])), ['shared']);
  assert.deepEqual(ids(filtered({ ...selected, tags: ['Payroll', 'Audit'] }, 'All', '  MONTHLY  ', ['dept-2'])), ['shared']);
  assert.deepEqual(ids(filtered({ ...selected, taskStatuses: ['In Progress'] }, 'All', '', ['dept-2'])), []);
  assert.deepEqual(ids(filtered({ taskCategories: ['Overdue', 'Completed'], taskStatuses: ['To Do', 'Done'] })), ['shared', 'audit']);
  assert.deepEqual(ids(filtered({ ...selected, services: ['Audit'] }, 'All', '', ['dept-2'])), []);
});

test('status counts use the filtered cross-project task list before selecting a tab', () => {
  const all = getGlobalTaskStatusCounts(filtered({}));
  assert.deepEqual(all, {
    All: 5, 'Not Started': 1, Overdue: 1, Today: 0, 'Next 30 days': 1,
    Completed: 1, Upcoming: 1, 'On Hold': 1, Archived: 1,
  });
  const financeTasks = filtered({ projectNames: [getProjectDisplayName(finance)] });
  const counts = getGlobalTaskStatusCounts(financeTasks);
  assert.equal(counts.All, 2); // The shared task counts once, despite its two project links.
  assert.equal(counts.Overdue, 1);
  assert.equal(counts['Next 30 days'], 1);
  assert.deepEqual(ids(filterTasksByAppliedFilters(tasks, 'Overdue', '', filters({ projectNames: [getProjectDisplayName(finance)] }), [])), ['shared']);
  const combined = filtered({
    projectNames: [getProjectDisplayName(finance)], tags: ['Payroll', 'Audit'],
    taskStatuses: ['To Do', 'Done'],
  }, 'All', ' PAYROLL ');
  assert.equal(getGlobalTaskStatusCounts(combined).All, 1);
  assert.equal(getGlobalTaskStatusCounts(combined).Overdue, 1);

  const changed = tasks.map(item => item.id === 'shared' ? { ...item, status: 'Done' as const } : item);
  const selected = filterTasksByAppliedFilters(changed, 'All', '', filters({ clients: [finance.clientName] }), []);
  const updated = getGlobalTaskStatusCounts(selected);
  assert.equal(updated.All, 2);
  assert.equal(updated.Completed, 1);
  assert.equal(updated.Overdue, 0);
  assert.equal(updated['Not Started'], 0);
  assert.equal(getGlobalTaskStatusCounts(filtered({ taskStatuses: ['To Do'] })).All, 1);
  assert.equal(getGlobalTaskStatusCounts(filtered({ tags: ['Audit'] })).Completed, 1);
});