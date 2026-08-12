import { AppShell } from '@/components/AppShell';
import { TimesheetsScreen } from '@/screens/timesheets/TimesheetsScreen';

export default function TimesheetsPage() {
  return (
    <AppShell breadcrumbs={[{ label: 'Timesheets' }]}>
      <TimesheetsScreen />
    </AppShell>
  );
}
