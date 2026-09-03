import { AppShell } from '@/components/AppShell';
import { PermissionsScreen } from '@/screens/people-permissions/PermissionsScreen';

export default function PermissionsPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Admin' },
        { label: 'Permissions' },
      ]}
    >
      <PermissionsScreen />
    </AppShell>
  );
}