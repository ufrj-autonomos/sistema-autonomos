import { requirePageUser } from '@/lib/session';
import { getGestaoStats } from '@/lib/gestao';
import { getDivisionsDeepAnalytics } from '@/lib/platform-insights';
import { DivisionsSection } from '@/components/gestao/divisions-section';
import { SectionHeader } from '@/components/gestao/section-header';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Divisões — Gestão' };

export default async function DivisionsPage() {
  await requirePageUser(true);
  const [data, deepAnalytics] = await Promise.all([
    getGestaoStats(),
    getDivisionsDeepAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Divisões Robóticas (Harpia & Nautilus)"
        description="Análise comparativa de efetivo por área técnica, frequência em reuniões, quadro de liderança e portfólio de projetos de engenharia."
      />
      {data.divisions.length ? (
        <DivisionsSection
          divisions={data.divisions}
          projects={data.projects}
          deepAnalytics={deepAnalytics}
        />
      ) : (
        <p className="py-10 text-sm text-muted-foreground">
          Nenhuma divisão cadastrada na plataforma.
        </p>
      )}
    </div>
  );
}
