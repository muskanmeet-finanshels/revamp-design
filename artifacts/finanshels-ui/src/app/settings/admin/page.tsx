import { AdminShell } from '@/screens/admin/AdminShell';
import { AdminOverview } from '@/screens/admin/AdminOverview';

export default function AdminPage() {
  return (
    <AdminShell breadcrumbLabel="Overview">
      <AdminOverview />
    </AdminShell>
  );
}
