import { AppShell } from '@/components/AppShell';
import { TasksScreen } from '@/screens/tasks/TasksScreen';

export default function TasksPage() {
  return (
    <AppShell breadcrumbs={[{ label: 'Tasks' }]}>
      <TasksScreen />
    </AppShell>
  );
}
