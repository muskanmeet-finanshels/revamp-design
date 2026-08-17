import { AppShell } from '@/components/AppShell';
import { PermissionsScreen } from '@/screens/people-permissions/PermissionsScreen';

export default function PermissionsPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Settings' },
        { label: 'Permissions' },
      ]}
    >
      <PermissionsScreen />
    </AppShell>
  );
}