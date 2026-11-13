import { requirePageUser } from '@/lib/session';
import Link from "next/link";
import {
  Users,
  Rocket,
  Trophy,
  Clock,
  Image as ImageIcon,
  Briefcase,
  Plus,
  ArrowRight,
  Sparkles,
  FileText,
  CheckCircle2,
  Eye,
  Mail,
  Settings,
} from "lucide-react";
import { db } from "@/lib/institutional/db";

export default async function AdminDashboard() {
  await requirePageUser(true);
  const [
    visibleMembers,
    visibleAlumni,
    totalProjects,
    totalCompetitions,
    totalEvents,
    totalImages,
    totalSponsors,
    recentEvents,
    harpiaCounts,
    nautilusCounts,
    geralCounts,
  ] = await Promise.all([
    db.institutionalMember.count({ where: { active: true, showOnSite: true } }),
    db.institutionalMember.count({ where: { active: false, showOnSite: true } }),
    db.project.count(),
    db.competition.count(),
    db.timelineEvent.count(),
    db.galleryImage.count(),
    db.sponsor.count(),
    db.timelineEvent.findMany({
      take: 4,
      orderBy: { date: "desc" },
      select: { id: true, title: true, date: true, category: true, teamId: true },
    }),
    Promise.all([
      db.timelineEvent.count({ where: { teamId: 2 } }),
      db.galleryImage.count({ where: { teamId: 2 } }),
      db.competition.count({ where: { teamId: 2 } }),
      db.project.count({ where: { teamId: 2 } }),
    ]),
    Promise.all([
      db.timelineEvent.count({ where: { teamId: 1 } }),
      db.galleryImage.count({ where: { teamId: 1 } }),
      db.competition.count({ where: { teamId: 1 } }),
      db.project.count({ where: { teamId: 1 } }),
    ]),
    Promise.all([
      db.timelineEvent.count({ where: { teamId: null } }),
      db.sponsor.count({ where: { teamId: null } }),
      db.institutionalMember.count({ where: { teamId: null, showOnSite: true } }),
    ]),
  ]);

  const STATS = [
    {
      title: "Exibição de Membros",
      count: visibleMembers + visibleAlumni,
      sub: `${visibleMembers} ativos e ${visibleAlumni} alumni no site`,
      href: "/gestao/site/membros",
      icon: Eye,
      color: "from-emerald-500/20 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    },
    {
      title: "Eventos na História",
      count: totalEvents,
      sub: "Linha do tempo visual por equipe",
      href: "/gestao/site/timelineevent",
      icon: Clock,
      color: "from-purple-500/20 to-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-500/30",
    },
    {
      title: "Galeria de Fotos",
      count: totalImages,
      sub: "Álbuns visuais filtrados por divisão",
      href: "/gestao/site/galleryimage",
      icon: ImageIcon,
      color: "from-cyan-500/20 to-cyan-500/5 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    },
    {
      title: "Competições",
      count: totalCompetitions,
      sub: "Nacionais e Internacionais",
      href: "/gestao/site/competition",
      icon: Trophy,
      color: "from-amber-500/20 to-amber-500/5 text-amber-700 dark:text-amber-400 border-amber-500/30",
    },
    {
      title: "Patrocinadores",
      count: totalSponsors,
      sub: "Empresas e parceiros de fomento",
      href: "/gestao/site/sponsor",
      icon: Briefcase,
      color: "from-rose-500/20 to-rose-500/5 text-rose-700 dark:text-rose-400 border-rose-500/30",
    },
    {
      title: "Projetos Públicos",
      count: totalProjects,
      sub: "Robôs e sistemas expostos no site",
      href: "/gestao/projetos",
      icon: Rocket,
      color: "from-blue-500/20 to-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-500/30",
    },
  ];

  const TEAM_HUBS = [
    {
      name: "UFRJ Autônomos (Geral)",
      slug: "geral",
      desc: "Marcos institucionais do grupo, diretoria/capitania e patrocínios gerais.",
      accent: "border-emerald-500/30 bg-emerald-500/5",
      badge: "text-emerald-700 dark:text-emerald-300",
      links: [
        { label: `História (${geralCounts[0]})`, href: "/gestao/site/timelineevent?team=geral" },
        { label: `Patrocinadores (${geralCounts[1]})`, href: "/gestao/site/sponsor?team=geral" },
        { label: `Membros Gerais (${geralCounts[2]})`, href: "/gestao/site/membros" },
      ],
    },
    {
      name: "☁️ Divisão Harpia",
      slug: "harpia",
      desc: "Aeronaves autônomas: linha do tempo, galeria de voos, competições e drones.",
      accent: "border-purple-500/30 bg-purple-500/5",
      badge: "text-purple-700 dark:text-purple-300",
      links: [
        { label: `História (${harpiaCounts[0]})`, href: "/gestao/site/timelineevent?team=harpia" },
        { label: `Fotos (${harpiaCounts[1]})`, href: "/gestao/site/galleryimage?team=harpia" },
        { label: `Competições (${harpiaCounts[2]})`, href: "/gestao/site/competition?team=harpia" },
        { label: `Projetos (${harpiaCounts[3]})`, href: "/gestao/projetos" },
      ],
    },
    {
      name: "🌊 Divisão Nautilus",
      slug: "nautilus",
      desc: "Veículos subaquáticos (AUVs/ROVs): história, fotos de piscina/RoboSub e troféus.",
      accent: "border-sky-500/30 bg-sky-500/5",
      badge: "text-sky-700 dark:text-sky-300",
      links: [
        { label: `História (${nautilusCounts[0]})`, href: "/gestao/site/timelineevent?team=nautilus" },
        { label: `Fotos (${nautilusCounts[1]})`, href: "/gestao/site/galleryimage?team=nautilus" },
        { label: `Competições (${nautilusCounts[2]})`, href: "/gestao/site/competition?team=nautilus" },
        { label: `Projetos (${nautilusCounts[3]})`, href: "/gestao/projetos" },
      ],
    },
  ];

  return (
    <div className="max-w-7xl space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-card via-card/80 to-muted/20 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Central do Site Institucional</span>
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Conteúdo &amp; Vitrine Pública
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Navegue pelas abas acima para alternar rapidamente entre História, Galeria de Fotos, Competições, Patrocinadores e Exibição de Membros — tudo organizado por equipe.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Link
              href="/gestao/site/membros"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
            >
              <Eye className="h-4 w-4" />
              <span>Exibição de Membros</span>
            </Link>
            <Link
              href="/gestao/site/timelineevent/new"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Marco (.md)</span>
            </Link>
            <Link
              href="/gestao/site/galleryimage/new"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nova Foto</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Organização por Equipe / Divisão */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Explorar Conteúdo por Equipe
          </h2>
          <span className="font-mono text-xs text-muted-foreground">Acesso direto filtrado</span>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {TEAM_HUBS.map((hub) => (
            <div key={hub.slug} className={`rounded-xl border p-5 space-y-4 ${hub.accent}`}>
              <div>
                <h3 className={`font-display text-base font-semibold ${hub.badge}`}>{hub.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{hub.desc}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hub.links.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-background/85 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Real Stats Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Seções do Site Institucional
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <Link href="/gestao/site/mensagens" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Mail className="h-3.5 w-3.5" /> Mensagens
            </Link>
            <Link href="/gestao/site/settings" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
              <Settings className="h-3.5 w-3.5" /> Configurações Globais
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STATS.map((stat) => {
            const Icon = stat.icon;
            return (
              <Link
                key={stat.title}
                href={stat.href}
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
                  <span>Gerenciar</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Recent History & Markdown Guide */}
      <div className="grid gap-6 lg:grid-cols-2">
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
                Abrir timeline ({totalEvents})
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

        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 pb-4 border-b border-border">
            <FileText className="h-4 w-4 text-amber-700 dark:text-amber-400" />
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

            <div className="flex items-center gap-2 pt-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>No formulário de edição, você pode alternar entre "Escrever" e "Pré-visualizar ao vivo".</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
