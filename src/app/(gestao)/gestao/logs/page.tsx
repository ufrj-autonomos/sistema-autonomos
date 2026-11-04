import { requireAdminPageUser } from '@/lib/session';
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Logs de atividade — Admin' };
export default async function ActivityLogPage() {
  await requireAdminPageUser();
  return <div className="space-y-6"><header className="border-b border-border pb-6"><h1 className="font-display text-3xl font-semibold">Logs de atividade</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Navegação, controles da interface, autenticação e ações no servidor. Acesso exclusivo de Admin.</p><p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">O histórico começa após a ativação desta coleta. Interações da interface são registradas como observadas; ações no servidor mostram o resultado. Conteúdos digitados, senhas e documentos não são coletados.</p></header><ActivityLogViewer /></div>;
}
