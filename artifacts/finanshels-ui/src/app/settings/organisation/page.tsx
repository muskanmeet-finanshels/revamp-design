import { AdminShell } from '@/screens/admin/AdminShell';
import { OrgScreen } from '@/screens/organisation/OrgScreen';

export default function OrganisationPage() {
  return (
    <AdminShell breadcrumbLabel="Organisation">
      <OrgScreen />
    </AdminShell>
  );
}
