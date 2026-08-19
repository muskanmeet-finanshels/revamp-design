import { AppShell } from '@/components/AppShell';
import { EmployeeManagementScreen } from '@/screens/employee-management/EmployeeManagementScreen';

export default function EmployeeManagementPage() {
  return (
    <AppShell
      breadcrumbs={[
        { label: 'Admin' },
        { label: 'Employee Management' },
      ]}
    >
      <EmployeeManagementScreen />
    </AppShell>
  );
}