import assert from 'node:assert/strict';
import test from 'node:test';
import { makeActiveFilterChipKey } from '../../components/active-filter-chip-key.ts';
import { MOCK_PROJECTS, type Project } from './mock-data.ts';
import { MOCK_TASKS, type TaskItem } from '../tasks/mock-data.ts';
import {
  includesSelectedValue, matchesTaskFrequency, matchesTaskService, matchesTaskTag,
} from '../tasks/task-filter-matchers.ts';
import {
  buildProjectTaskList, filterProjectTasks, getProjectTaskStatusCounts,
  matchesStatusView, removeProjectTaskFilter,
} from './project-task-filters.ts';
import type { TaskFilterState } from '../tasks/TaskFilterDrawer';

const project: Project = {
  ...MOCK_PROJECTS[0],
  id: 'test-project',
  title: 'General Ledger',
  client: { name: 'Acme', color: '#000' },
  serviceType: { label: 'Accounting', departmentId: 'dept-1' },
};
const taskProject = { id: project.id, title: project.title, clientName: project.client.name, clientColor: '#000' };
const dateFromToday = (days: number) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const task = (id: string, name: string, status: TaskItem['status'], days = 0): TaskItem => ({
  id, name, projects: [taskProject], assignee: null, status,
  priority: 'Medium', dueDate: dateFromToday(days), timeSpentSeconds: 0, comments: 0,
});
const scopedTasks = [
  task('payroll', 'Monthly payroll reconciliation', 'To Do', -2),
  task('audit', 'Quarterly audit evidence', 'Done', -1),
  task('vat', 'Annual VAT return', 'In Progress', 10),
  task('onboarding', 'Employee onboarding', 'On Hold', 45),
];
const activeDepartments = new Set(['dept-1']);
const filters = (changes: Partial<TaskFilterState> = {}): TaskFilterState => ({
  taskCategories: [], taskStatuses: [], taskNames: [], frequencies: [],
  clients: [], projectNames: [], departments: [], services: [],
  assignees: [], tags: [], dueDateFilter: 'All dates', dueDateStart: '', dueDateEnd: '',
  ...changes,
});
const ids = (items: TaskItem[]) => items.map(item => item.id);
const filtered = (changes: Partial<TaskFilterState>, tasks = scopedTasks) =>
  filterProjectTasks(tasks, project, '', filters(changes), activeDepartments);

test('project task list contains linked tasks and only this project’s generated tasks', () => {
  const source = MOCK_PROJECTS.find(item => item.id === '1')!;
  const list = buildProjectTaskList(source);
  assert.equal(list.length, source.tasksTotal);
  assert.deepEqual(
    ids(list).filter(id => MOCK_TASKS.some(item => item.id === id)),
    ids(MOCK_TASKS.filter(item => item.projects.some(link => link.id === source.id))).slice(0, source.tasksTotal),
  );
  assert.ok(list.every(item => item.projects.some(link => link.id === source.id)));
  assert.ok(!list.some(item => item.id === 't2')); // Linked to a different project.
  assert.deepEqual(ids(filterProjectTasks(list, source, '', filters({ taskNames: ['Reconcile bank statements for Q3'] }), activeDepartments)), []);
  const secondProject = MOCK_PROJECTS.find(item => item.id === '2')!;
  assert.deepEqual(
    ids(filterProjectTasks(buildProjectTaskList(secondProject), secondProject, '', filters({ taskNames: ['Reconcile bank statements for Q3'] }), activeDepartments)),
    ['t2'],
  );
});

test('all five filters apply to the actual list built for a single project', () => {
  const source = MOCK_PROJECTS.find(item => item.id === '6')!;
  const list = buildProjectTaskList(source);
  const matching = filterProjectTasks(list, source, '', filters({
    taskNames: ['Review payroll entries'],
    frequencies: ['Monthly'],
    departments: [source.serviceType.departmentId],
    services: ['Accounting'],
    tags: ['Payroll'],
  }), new Set([source.serviceType.departmentId]));
  assert.deepEqual(ids(matching), ['t4']);
});

test('task name matches a task or its displayed project name, not a different project', () => {
  assert.deepEqual(ids(filtered({ taskNames: ['PAYROLL'] })), ['payroll']);
  assert.deepEqual(ids(filtered({ taskNames: ['Acme- General Ledger'] })), ids(scopedTasks));
  assert.deepEqual(ids(filtered({ taskNames: ['VAT'] })), ['vat']);
  assert.deepEqual(ids(filtered({ taskNames: ['missing'] })), []);
  assert.equal(includesSelectedValue(['payroll'], ['Monthly payroll reconciliation']), true);
  assert.equal(includesSelectedValue(['missing'], ['Monthly payroll reconciliation']), false);
});

test('frequency, service and tag options use the shared matchers on project tasks', () => {
  assert.deepEqual(ids(filtered({ frequencies: ['Monthly'] })), ['payroll']);
  assert.deepEqual(ids(filtered({ frequencies: ['Quarterly'] })), ['audit']);
  assert.deepEqual(ids(filtered({ frequencies: ['Annually'] })), ['vat']);
  assert.deepEqual(ids(filtered({ frequencies: ['Weekly'] })), []);
  assert.deepEqual(ids(filtered({ services: ['Accounting'] })), ['payroll', 'vat']);
  assert.deepEqual(ids(filtered({ services: ['Audit'] })), ['audit']);
  assert.deepEqual(ids(filtered({ services: ['IT'] })), []);
  assert.deepEqual(ids(filtered({ tags: ['Payroll'] })), ['payroll']);
  assert.deepEqual(ids(filtered({ tags: ['Audit'] })), ['audit']);
  assert.deepEqual(ids(filtered({ tags: ['Tax Filing'] })), ['vat']);
  assert.equal(matchesTaskFrequency(scopedTasks[0], 'Monthly'), true);
  assert.equal(matchesTaskService(scopedTasks[1], 'Audit'), true);
  assert.equal(matchesTaskTag(scopedTasks[2], 'Tax Filing'), true);
  assert.equal(matchesTaskTag(scopedTasks[0], 'Unknown'), false);
});

test('department requires the project department to be selected and active', () => {
  assert.deepEqual(ids(filtered({ departments: ['dept-1'] })), ids(scopedTasks));
  assert.deepEqual(ids(filtered({ departments: ['dept-2'] })), []);
  assert.deepEqual(filterProjectTasks(scopedTasks, project, '', filters({ departments: ['dept-1'] }), new Set()), []);
  assert.deepEqual(filterProjectTasks(scopedTasks, undefined, '', filters({ departments: ['dept-1'] }), activeDepartments), []);
});

test('combined filters intersect across fields and OR within a field', () => {
  const combined = filters({
    taskNames: ['payroll', 'audit'], frequencies: ['Monthly', 'Quarterly'],
    departments: ['dept-1'], services: ['Accounting'], tags: ['Payroll', 'Audit'],
  });
  assert.deepEqual(ids(filterProjectTasks(scopedTasks, project, '', combined, activeDepartments)), ['payroll']);
  assert.deepEqual(ids(filterProjectTasks(scopedTasks, project, '', { ...combined, services: ['Audit'] }, activeDepartments)), ['audit']);
  assert.deepEqual(ids(filterProjectTasks(scopedTasks, project, '  QUARTERLY  ', { ...combined, services: ['Audit'] }, activeDepartments)), ['audit']);
});

test('removing one chip keeps other selections and recalculates results', () => {
  const applied = filters({ taskNames: ['payroll', 'audit'], tags: ['Payroll', 'Audit'], departments: ['dept-1'] });
  const withoutPayroll = removeProjectTaskFilter(applied, makeActiveFilterChipKey('taskNames', 'payroll'));
  assert.deepEqual(withoutPayroll.taskNames, ['audit']);
  assert.deepEqual(applied.taskNames, ['payroll', 'audit']);
  assert.deepEqual(ids(filtered(withoutPayroll)), ['audit']);
  const withoutAuditTag = removeProjectTaskFilter(withoutPayroll, makeActiveFilterChipKey('tags', 'Audit'));
  assert.deepEqual(withoutAuditTag.tags, ['Payroll']);
  assert.deepEqual(withoutAuditTag.departments, ['dept-1']);
  assert.deepEqual(ids(filtered(withoutAuditTag)), []);
  const withoutAuditName = removeProjectTaskFilter(withoutAuditTag, makeActiveFilterChipKey('taskNames', 'audit'));
  assert.deepEqual(ids(filtered(withoutAuditName)), ['payroll']);
  assert.deepEqual(removeProjectTaskFilter(applied, makeActiveFilterChipKey('departments', 'dept-1')).departments, []);
});

test('tab counts follow filters, status overrides and removed chips, independent of the selected tab', () => {
  const all = getProjectTaskStatusCounts(scopedTasks);
  assert.equal(all.All, 4);
  assert.equal(all.Overdue, 1);
  assert.equal(all.Completed, 1);
  assert.equal(all['On Hold'], 1);
  assert.equal(all['Next 30 days'], 1);
  assert.equal(all.Upcoming, 1);
  assert.equal(all.Archived, 0);

  const active = filters({ tags: ['Payroll', 'Audit'] });
  const matching = filterProjectTasks(scopedTasks, project, '', active, activeDepartments);
  assert.equal(getProjectTaskStatusCounts(matching).All, 2);
  assert.equal(getProjectTaskStatusCounts(matching).Completed, 1);
  assert.deepEqual(ids(matching.filter(item => matchesStatusView(item, 'Completed'))), ['audit']);

  const overridden = scopedTasks.map(item => item.id === 'payroll' ? { ...item, status: 'Done' as const } : item);
  const changed = getProjectTaskStatusCounts(filterProjectTasks(overridden, project, '', active, activeDepartments));
  assert.equal(changed.All, 2);
  assert.equal(changed.Completed, 2);
  assert.equal(changed.Overdue, 0);

  const oneTag = removeProjectTaskFilter(active, makeActiveFilterChipKey('tags', 'Audit'));
  const oneCount = getProjectTaskStatusCounts(filterProjectTasks(overridden, project, '', oneTag, activeDepartments));
  assert.equal(oneCount.All, 1);
  assert.equal(oneCount.Completed, 1);
  const statusFiltered = getProjectTaskStatusCounts(filterProjectTasks(overridden, project, '', filters({ taskStatuses: ['To Do'] }), activeDepartments));
  assert.equal(statusFiltered.All, 0);
});