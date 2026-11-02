import { requirePageUser } from '@/lib/session';
import Link from "next/link";
import {
  Users,
  Rocket,
  Trophy,
  Clock,
  Image as ImageIcon,
  Briefcase,
  Layers,
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  CheckCircle2,
  Database,
  ExternalLink,
} from "lucide-react";
import { db } from "@/lib/institutional/db";

export default async function AdminDashboard() {
  await requirePageUser(true);
  // Fetch real counts from the database
  const [
    totalMembers,
    activeMembers,
    totalTeams,
    totalProjects,
    totalCompetitions,
    totalEvents,
    totalImages,
    totalSponsors,
    recentEvents,
  ] = await Promise.all([
    db.member.count(),
    db.member.count({ where: { active: true } }),
    db.team.count(),
    db.project.count(),
    db.competition.count(),
    db.timelineEvent.count(),
    db.galleryImage.count(),
    db.sponsor.count(),
    db.timelineEvent.findMany({
      take: 4,
      orderBy: { id: "desc" },
      select: { id: true, title: true, date: true, category: true, teamId: true },
    }),
  ]);

  const STATS = [
    {
      title: "Membros",
      count: totalMembers,
      sub: `${activeMembers} ativos no momento`,
      path: "member",
      icon: Users,
      color: "from-blue-500/20 to-blue-500/5 text-blue-400 border-blue-500/30",
    },
    {
      title: "Projetos",
      count: totalProjects,
      sub: "Veículos, subsistemas e P&D",
      path: "project",
      icon: Rocket,
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Eventos na História",
      count: totalEvents,
      sub: "Marcos históricos com suporte a .md",
      path: "timelineevent",
      icon: Clock,
      color: "from-purple-500/20 to-purple-500/5 text-purple-400 border-purple-500/30",
    },
    {
      title: "Competições",
      count: totalCompetitions,
      sub: "Nacionais e Internacionais",
      path: "competition",
      icon: Trophy,
      color: "from-amber-500/20 to-amber-500/5 text-amber-400 border-amber-500/30",
    },
    {
      title: "Patrocinadores",
      count: totalSponsors,
      sub: "Empresas e parceiros de fomento",
      path: "sponsor",
      icon: Briefcase,
      color: "from-rose-500/20 to-rose-500/5 text-rose-400 border-rose-500/30",
    },
    {
      title: "Galeria de Fotos",
      count: totalImages,
      sub: "Imagens públicas de alta resolução",
      path: "galleryimage",
      icon: ImageIcon,
      color: "from-cyan-500/20 to-cyan-500/5 text-cyan-400 border-cyan-500/30",
    },
  ];

  return (
    <div className="max-w-6xl space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card via-card/80 to-muted/20 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Painel de Controle Central</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Visão Geral do Sistema
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Gerencie membros, equipes, projetos de engenharia, fotos e marcos da história da UFRJ Autônomos. Suporte completo a formatação em Markdown (.md).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/gestao/site/timelineevent/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Evento (.md)</span>
            </Link>
            <Link
              href="/gestao/site/member/new"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Membro</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Real Stats Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Estatísticas do Banco de Dados
          </h2>
          <span className="font-mono text-xs text-muted-foreground">
            Sincronização em tempo real
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.path}
                href={`/gestao/site/${stat.path}`}
                className="group relative flex flex-col justify-between rounded-lg border border-border bg-card/60 p-5 transition-all duration-200 hover:border-hairline-strong hover:bg-card hover:-translate-y-0.5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                      {stat.title}
                    </span>
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg border bg-gradient-to-br ${stat.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>

                  <div className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
                    {stat.count}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.sub}</p>
                </div>

                <div className="mt-4 flex items-center gap-1 font-mono text-[11px] text-muted-foreground group-hover:text-primary transition-colors border-t border-border/40 pt-3">
                  <span>Gerenciar registros</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Recent History & Markdown Guide */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Events Card */}
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <h3 className="font-display text-base font-semibold text-foreground">
                  Últimos Eventos da História
                </h3>
              </div>
              <Link
                href="/gestao/site/timelineevent"
                className="font-mono text-xs text-primary hover:underline"
              >
                Ver todos ({totalEvents})
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {recentEvents.length > 0 ? (
                recentEvents.map((evt) => (
                  <Link
                    key={evt.id}
                    href={`/gestao/site/timelineevent/${evt.id}`}
                    className="flex items-center justify-between gap-3 p-3 rounded-md border border-border/50 bg-muted/20 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{evt.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-xs text-muted-foreground">{evt.date}</span>
                        <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                        <span className="font-mono text-[10px] uppercase text-primary/80">{evt.category}</span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Nenhum evento registrado ainda.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border">
            <Link
              href="/gestao/site/timelineevent/new"
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-card/60 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar Marco Histórico</span>
            </Link>
          </div>
        </div>

        {/* Markdown & Content Guide */}
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <FileText className="h-4 w-4 text-amber-400" />
            <h3 className="font-display text-base font-semibold text-foreground">
              Guia de Edição em Markdown (.md)
            </h3>
          </div>

          <div className="mt-4 space-y-3 text-xs text-muted-foreground">
            <p className="leading-relaxed">
              O campo <strong className="text-foreground">Detalhes Adicionais</strong> dos eventos da História e descrições técnicas aceitam formatação rica em Markdown:
            </p>

            <div className="space-y-2 rounded-md bg-muted/40 p-3 font-mono text-[11px] border border-border/50 text-foreground/90">
              <div className="flex items-center justify-between">
                <code>### Subtítulo</code>
                <span className="text-[10px] text-muted-foreground font-sans">Cria cabeçalho</span>
              </div>
              <div className="flex items-center justify-between">
                <code>**texto em negrito**</code>
                <span className="text-[10px] text-muted-foreground font-sans">Destaque forte</span>
              </div>
              <div className="flex items-center justify-between">
                <code>*texto em itálico*</code>
                <span className="text-[10px] text-muted-foreground font-sans">Ênfase sutil</span>
              </div>
              <div className="flex items-center justify-between">
                <code>- Item de lista</code>
                <span className="text-[10px] text-muted-foreground font-sans">Lista com marcadores</span>
              </div>
              <div className="flex items-center justify-between">
                <code>[Nome do Link](https://url.com)</code>
                <span className="text-[10px] text-muted-foreground font-sans">Link externo</span>
              </div>
              <div className="flex items-center justify-between">
                <code>&gt; Frase citada ou destaque</code>
                <span className="text-[10px] text-muted-foreground font-sans">Bloco de citação</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>No formulário de edição, você pode alternar entre "Escrever" e "Pré-visualizar ao vivo".</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
