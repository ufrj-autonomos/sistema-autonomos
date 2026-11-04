import { requirePageUser } from '@/lib/session';
import { getGestaoStats } from '@/lib/gestao';
import { DivisionsSection } from '@/components/gestao/divisions-section';
import { SectionHeader } from '@/components/gestao/section-header';
export const metadata = { title: 'Divisões — Gestão' };
export default async function DivisionsPage() {
  await requirePageUser(true);
  const data = await getGestaoStats();
  return <><SectionHeader title="Divisões" description="Conheça a estrutura de Harpia e Nautilus e consulte os projetos registrados na plataforma." />{data.divisions.length ? <DivisionsSection divisions={data.divisions} projects={data.projects} /> : <p className="py-10 text-sm text-muted-foreground">Nenhuma divisão cadastrada na plataforma.</p>}</>;
}
