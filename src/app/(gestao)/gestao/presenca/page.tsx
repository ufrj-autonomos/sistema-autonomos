import { requirePageUser } from '@/lib/session';
import { weekKey } from '@/lib/attendance/time';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Controle de presença' };
export default async function AttendanceManagementPage() {
  await requirePageUser(true);
  return <AttendanceDashboard initialWeek={weekKey()} admin />;
}
