export function getProjectDisplayName(project: {
  title: string;
  client?: { name?: string } | null;
  clientName?: string | null;
}): string {
  const clientName = (project.client?.name ?? project.clientName ?? '').trim();
  const rawTitle = project.title.trim();
  if (!clientName) return rawTitle;

  const escapedClientName = clientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const titleWithoutClientPrefix = rawTitle.replace(
    new RegExp(`^${escapedClientName}\\s*[-–—:]\\s*`, 'i'),
    '',
  );

  return `${clientName}- ${titleWithoutClientPrefix}`;
}