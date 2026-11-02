import { requirePageUser } from '@/lib/session';
import { weekKey } from '@/lib/attendance/time';
import { AttendanceDashboard } from '@/components/attendance/attendance-dashboard';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha presença' };
export default async function MyAttendancePage() {
  await requirePageUser();
  return <AttendanceDashboard initialWeek={weekKey()} />;
}
