import { AppShell } from '@/components/AppShell';

export function AdminShell({ children, breadcrumbLabel }: { children: React.ReactNode, breadcrumbLabel: string }) {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Admin', href: '/settings/admin' },
        { label: breadcrumbLabel },
      ]}
    >
      <div className="flex h-full flex-col bg-white">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AppShell>
  );
}
