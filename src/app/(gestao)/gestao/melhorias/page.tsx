import { requirePageUser } from '@/lib/session';
import { getFeedbackDashboardData } from '@/lib/feedback/service';
import { FeedbackTriageClient } from '@/components/gestao/feedback-triage-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ideias, Bugs & Melhorias — Gestão' };

export default async function FeedbackTriagePage() {
  const user = await requirePageUser(true);
  const initialData = await getFeedbackDashboardData(user, 'management');
  return <FeedbackTriageClient initialData={initialData} />;
}
