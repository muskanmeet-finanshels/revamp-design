import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { ProjectDetailScreen } from '@/screens/projects/ProjectDetailScreen';
import { MOCK_PROJECTS } from '@/screens/projects/mock-data';

interface Props {
  params: { id: string };
}

export function generateStaticParams() {
  return MOCK_PROJECTS.map((p) => ({ id: p.id }));
}

export default function ProjectDetailPage({ params }: Props) {
  const project = MOCK_PROJECTS.find((p) => p.id === params.id);
  if (!project) notFound();

  return (
    <AppShell
      breadcrumbs={[
        { label: 'Projects', href: '/projects' },
        { label: project.title },
      ]}
    >
      <ProjectDetailScreen project={project} />
    </AppShell>
  );
}
