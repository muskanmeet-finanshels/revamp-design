import type { Metadata } from 'next';
import { AppShell } from '@/components/AppShell';
import { ReportsScreen } from '@/screens/reports/ReportsScreen';

export const metadata: Metadata = {
  title: 'Reports | Finanshels',
  description: 'Directory of financial reports and their availability. Reports are not connected to FinDelivery yet.',
  openGraph: {
    title: 'Reports | Finanshels',
    description: 'Directory of financial reports and their availability. Reports are not connected to FinDelivery yet.',
  },
};

export default function ReportsPage() {
  return (
    <AppShell breadcrumbs={[{ label: 'Reports' }]}>
      <ReportsScreen />
    </AppShell>
  );
}
