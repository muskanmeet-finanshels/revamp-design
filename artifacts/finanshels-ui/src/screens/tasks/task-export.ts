import type { TaskItem } from './mock-data';
import { getProjectDisplayName } from '../projects/mock-data';
import { TASK_COLUMN_OPTIONS, type TaskColumnKey, type TaskPriorityTag } from './TasksTable';

export type TaskExportColumnKey = 'task' | 'priority' | Exclude<TaskColumnKey, 'timer' | 'action'>;

export const TASK_EXPORT_COLUMNS: Array<{ key: TaskExportColumnKey; label: string }> = [
  { key: 'task', label: 'Task' },
  ...TASK_COLUMN_OPTIONS
    .filter((option): option is { key: Exclude<TaskColumnKey, 'timer' | 'action'>; label: string } =>
      option.key !== 'timer' && option.key !== 'action')
    .map(option => ({
      ...option,
      label: option.key === 'project' ? 'Projects'
        : option.key === 'timeSpent' ? 'Time Spent (seconds)'
        : option.label,
    })),
  { key: 'priority', label: 'Priority' },
];

export function taskExportValue(
  task: TaskItem,
  key: TaskExportColumnKey,
  tag?: TaskPriorityTag,
  commentCount?: number,
): string | number | undefined {
  switch (key) {
    case 'task': return task.name;
    case 'project': return task.projects.map(getProjectDisplayName).join(', ');
    case 'assignee': return task.assignee?.name;
    case 'reassignmentNote': return task.reassignmentNote;
    case 'dueDate': return task.dueDate;
    case 'status': return task.status;
    case 'timeSpent': return task.timeSpentSeconds;
    case 'comments': return commentCount ?? task.comments;
    case 'tags': return tag?.toUpperCase();
    case 'priority': return task.priority;
    case 'adhoc': return task.isAdHoc == null ? '' : task.isAdHoc ? 'Yes' : 'No';
    case 'frequency': return task.frequency;
    case 'createdDate': return task.createdAt;
    case 'lastUpdated': return task.updatedAt;
  }
}