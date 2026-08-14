import { AppShell } from '@/components/AppShell';
import { ProjectTasksScreen } from '@/screens/projects/ProjectTasksScreen';

/* required for output: 'export' — pre-render all 140 project task pages */
export function generateStaticParams() {
  return Array.from({ length: 140 }, (_, i) => ({ id: String(i + 1) }));
}

export default function ProjectTasksPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: 'Project Detail' },
      ]}
    >
      <ProjectTasksScreen />
    </AppShell>
  );
}
