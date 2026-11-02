import { requirePageUser } from '@/lib/session';
import { QrPoster } from '@/components/attendance/qr-poster';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'QR code do laboratório', robots: { index: false, follow: false } };
export default async function AttendanceQrPage() {
  await requirePageUser(true);
  return <QrPoster />;
}
