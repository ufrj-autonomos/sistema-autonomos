import { requirePageUser } from '@/lib/session';
import { ScanRegistration } from '@/components/attendance/scan-registration';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Registrar presença', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function RegisterAttendancePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  await requirePageUser();
  const { code } = await searchParams;
  return <ScanRegistration code={typeof code === 'string' ? code : ''} />;
}
