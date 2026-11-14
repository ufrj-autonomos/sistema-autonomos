import { requirePageUser } from '@/lib/session';
import { getEmailCenterData } from '@/lib/email-center';
import { getEmailLogsDashboard } from '@/lib/email-logs';
import { SectionHeader } from '@/components/gestao/section-header';
import { EmailCenterClient } from '@/components/gestao/email-center-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Central de E-mails — Gestão' };

export default async function EmailsPage() {
  await requirePageUser(true);
  const [centerData, emailLogs] = await Promise.all([
    getEmailCenterData(),
    getEmailLogsDashboard({ limit: 80 }),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Central de E-mails & Automações"
        description="Gerencie disparos automáticos, envie alertas por situação (horas, perfil incompleto, reuniões, disciplinar), crie comunicados com IA e reenvie e-mails do histórico."
      />
      <EmailCenterClient initialCenter={centerData} initialLogs={emailLogs} />
    </div>
  );
}
