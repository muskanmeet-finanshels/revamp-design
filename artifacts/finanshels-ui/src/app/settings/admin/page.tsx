import { AppShell } from '@/components/AppShell';
import { PeoplePermissionsScreen } from '@/screens/people-permissions/PeoplePermissionsScreen';

export default function AdminPage() {
  return (
    <AppShell breadcrumbs={[{ label: 'Settings' }, { label: 'Admin' }]}>
      <PeoplePermissionsScreen />
    </AppShell>
  );
}