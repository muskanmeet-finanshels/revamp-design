import { AppShell } from '@/components/AppShell';
import { UsersScreen } from '@/screens/users/UsersScreen';

export default function UsersPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Admin' },
        { label: 'User Management' },
      ]}
    >
      <UsersScreen />
    </AppShell>
  );
}
