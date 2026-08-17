import { AppShell } from '@/components/AppShell';
import { OrgScreen } from '@/screens/organisation/OrgScreen';

export default function OrganisationPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Settings' },
        { label: 'Organisation' },
      ]}
    >
      <OrgScreen />
    </AppShell>
  );
}
