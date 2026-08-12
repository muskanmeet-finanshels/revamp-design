import { AppShell } from '@/components/AppShell';
import { ProjectsScreen } from '@/screens/projects';

export default function ProjectsPage() {
  return (
    <AppShell breadcrumbs={[{ label: 'Projects' }]}>
      <ProjectsScreen />
    </AppShell>
  );
}
