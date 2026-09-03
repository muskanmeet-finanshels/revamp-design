import { AppShell } from '@/components/AppShell';
import { OrgScreen } from '@/screens/organisation/OrgScreen';

export default function OrganisationPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Admin' },
        { label: 'Organisation' },
      ]}
    >
      <OrgScreen />
    </AppShell>
  );
}
