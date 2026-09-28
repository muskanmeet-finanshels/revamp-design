import type { Project } from './mock-data';
import { getProjectDisplayName } from './mock-data';
import { PROJECT_COLUMN_OPTIONS, type ProjectColumnKey } from './ProjectsTable';
import type { ProjectTagSelection } from './AddTagsDialog';

export type ProjectExportColumnKey =
  | 'project'
  | 'tasksCompleted'
  | 'tasksTotal'
  | Exclude<ProjectColumnKey, 'resume'>;

export const PROJECT_EXPORT_COLUMNS: Array<{ key: ProjectExportColumnKey; label: string }> = [
  { key: 'project', label: 'Project' },
  ...PROJECT_COLUMN_OPTIONS
    .filter((option): option is { key: Exclude<ProjectColumnKey, 'resume'>; label: string } => option.key !== 'resume')
    .map(option => ({
      ...option,
      label: option.key === 'progress' ? 'Progress (%)'
        : option.key === 'revenue' ? 'Revenue (AED)'
        : option.label,
    })),
  { key: 'tasksCompleted', label: 'Tasks Completed' },
  { key: 'tasksTotal', label: 'Tasks Total' },
];

export function projectExportValue(project: Project, key: ProjectExportColumnKey, tag?: ProjectTagSelection): string | number | undefined {
  switch (key) {
    case 'project': return getProjectDisplayName(project);
    case 'client': return project.client.name;
    case 'department': return project.serviceType.label;
    case 'service': return project.service;
    case 'serviceType': return project.serviceType.label;
    case 'accountManager': return project.accountManager?.name;
    case 'teamLead': return project.teamLeads.map(member => member.name).join(', ');
    case 'assignees': return project.assignees.map(member => member.name).join(', ');
    case 'progress': return project.progress;
    case 'tasks': return `${project.tasksCompleted}/${project.tasksTotal}`;
    case 'tasksCompleted': return project.tasksCompleted;
    case 'tasksTotal': return project.tasksTotal;
    case 'revenue': return project.revenue;
    case 'dueDate': return project.dueDate.replace(/^Due\s+/i, '');
    case 'status': return project.status;
    case 'tags': return tag
      ? [tag.priority.toUpperCase(), tag.severity.toUpperCase()].filter(Boolean).join(', ')
      : project.tags?.join(', ');
    case 'reassignNote': return localStorage.getItem(`fh_reassign_reason_${project.id}`) || project.reassignReason;
    case 'startDate': return project.startDate;
    case 'completedDate': return project.completedDate;
    case 'deliveryStatus': return project.deliveryStatus;
    case 'lastTaskCompleted': return project.lastTaskCompletedAt;
    case 'createdDate': return project.createdAt;
    case 'lastUpdated': return project.updatedAt;
  }
}