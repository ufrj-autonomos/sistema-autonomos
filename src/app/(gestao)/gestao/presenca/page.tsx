import { requirePageUser } from '@/lib/session';
import { selectedWeek } from '@/lib/attendance/service';
import { weekKey } from '@/lib/attendance/time';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Controle de presença' };
export default async function AttendanceManagementPage({ searchParams }: { searchParams: Promise<{ week?: string | string[] }> }) {
  await requirePageUser(true);
  const params = await searchParams;
  const current = weekKey();
  let selected = current;
  try { selected = selectedWeek(typeof params.week === 'string' ? params.week : undefined); } catch { /* Invalid filters keep the current week. */ }
  return <AttendanceDashboard initialWeek={current} selectedWeek={selected} admin />;
}
