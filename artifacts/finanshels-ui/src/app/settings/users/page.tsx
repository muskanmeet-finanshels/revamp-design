import { AdminShell } from '@/screens/admin/AdminShell';
import { UsersScreen } from '@/screens/users/UsersScreen';

export default function UsersPage() {
  return (
    <AdminShell breadcrumbLabel="User Management">
      <UsersScreen />
    </AdminShell>
  );
}
