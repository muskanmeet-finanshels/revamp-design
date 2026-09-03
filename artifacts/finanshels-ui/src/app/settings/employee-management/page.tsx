import { AdminShell } from '@/screens/admin/AdminShell';
import { EmployeeManagementScreen } from '@/screens/employee-management/EmployeeManagementScreen';

export default function EmployeeManagementPage() {
  return (
    <AdminShell breadcrumbLabel="Employee Groups">
      <EmployeeManagementScreen />
    </AdminShell>
  );
}
