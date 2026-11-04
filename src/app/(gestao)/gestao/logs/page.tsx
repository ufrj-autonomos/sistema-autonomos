import { requireAdminPageUser } from '@/lib/session';
import { ActivityLogViewer } from '@/components/activity/activity-log-viewer';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Logs de atividade — Admin' };
export default async function ActivityLogPage() {
  await requireAdminPageUser();
  return <div className="space-y-6"><header className="border-b border-border pb-6"><h1 className="font-display text-3xl font-semibold">Logs de atividade</h1><p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">Resumo das ações importantes: acessos, alterações de cadastro, publicações, imagens e presença. Acesso exclusivo de Admin.</p><p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">Ações iguais do mesmo usuário e cadastro são agrupadas em intervalos de até 5 minutos, com quantidade e resultado. Consultas automáticas não aparecem. Navegação fica disponível no filtro de tipo.</p></header><ActivityLogViewer /></div>;
}
