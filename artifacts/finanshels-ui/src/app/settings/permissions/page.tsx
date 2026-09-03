import { Suspense } from 'react';
import { AdminShell } from '@/screens/admin/AdminShell';
import { PermissionsScreen } from '@/screens/people-permissions/PermissionsScreen';

export default function PermissionsPage() {
  return (
    <AdminShell breadcrumbLabel="Permissions">
      <Suspense fallback={<div className="px-6 py-12 text-[13px] text-gray-500">Loading permissions…</div>}>
        <PermissionsScreen />
      </Suspense>
    </AdminShell>
  );
}
