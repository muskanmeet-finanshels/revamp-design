import { AppShell } from '@/components/AppShell';
import { RolesScreen } from '@/screens/roles/RolesScreen';

export default function RolesPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Admin' },
        { label: 'Role Management' },
      ]}
    >
      <RolesScreen />
    </AppShell>
  );
}
