import { AdminShell } from '@/screens/admin/AdminShell';
import { RolesScreen } from '@/screens/roles/RolesScreen';

export default function RolesPage() {
  return (
    <AdminShell breadcrumbLabel="Role Management">
      <RolesScreen />
    </AdminShell>
  );
}
