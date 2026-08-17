import { AppShell } from '@/components/AppShell';
import { PeoplePermissionsScreen } from '@/screens/people-permissions/PeoplePermissionsScreen';

export default function PeoplePage() {
  return (
    <AppShell breadcrumbs={[{ label: 'Settings' }, { label: 'People & Permissions' }]}>
      <PeoplePermissionsScreen />
    </AppShell>
  );
}
