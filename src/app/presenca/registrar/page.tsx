import { requirePageUser } from '@/lib/session';
import { ScanRegistration } from '@/components/attendance/scan-registration';
import { redirect } from 'next/navigation';
import { resolveScanAttempt } from '@/lib/attendance/scan-attempt';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Registrar presença', robots: { index: false, follow: false }, referrer: 'no-referrer' as const };
export default async function RegisterAttendancePage({ searchParams }: { searchParams: Promise<{ code?: string | string[]; requestId?: string | string[] }> }) {
  await requirePageUser();
  const attempt = resolveScanAttempt(await searchParams);
  if (attempt.redirectTo) redirect(attempt.redirectTo);
  return <ScanRegistration key={attempt.requestId} code={attempt.code} requestId={attempt.requestId} />;
}
