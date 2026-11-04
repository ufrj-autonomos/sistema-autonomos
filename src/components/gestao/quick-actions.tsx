import Link from "next/link";
import { BookOpen, FolderGit2, FileText, ArrowRight, Sparkles } from "lucide-react";

export function QuickActions() {
  const actions = [
    { title: "Presença no Laboratório", description: "Acompanhe as duas horas semanais, os registros e as pendências dos membros.", href: "/gestao/presenca", icon: BookOpen, actionText: "Acompanhar Presença", accent: "border-border hover:border-border" },
    {
      title: "Acessar Plataforma de Ensino",
      description: "Navegue pelo currículo de 11 módulos e 108 lições com simulador Turtlesim e tópicos ROS 2 Jazzy.",
      href: "/ensino",
      icon: BookOpen,
      actionText: "Abrir Ensino",
      accent: "border-emerald-500/30 hover:border-emerald-500/60",
    },
    {
      title: "Gerenciar Projetos e Veículos",
      description: "Acompanhe cronogramas de voo de teste do Hexacóptero Harpia e testes de tanque do AUV Nautilus.",
      href: "#harpia",
      icon: FolderGit2,
      actionText: "Ver Projetos",
      accent: "border-purple-500/30 hover:border-purple-500/60",
    },
    {
      title: "Documentação Oficial ROS 2 Jazzy",
      description: "Consulte guias de arquitetura distribuída, DDS, nós inteligentes e launch files oficiais.",
      href: "https://docs.ros.org/en/jazzy/index.html",
      icon: FileText,
      actionText: "Abrir Docs",
      isExternal: true,
      accent: "border-blue-500/30 hover:border-blue-500/60",
    },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
          <span>ATALHOS OPERACIONAIS</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {actions.map((act, i) => {
          const Icon = act.icon;
          return (
            <Link
              key={i}
              href={act.href}
              target={act.isExternal ? "_blank" : undefined}
              rel={act.isExternal ? "noreferrer" : undefined}
              className={`group relative flex flex-col justify-between rounded-xl border ${act.accent} bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 blueprint-corners`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
                </div>

                <h3 className="mt-3 font-display font-bold text-base text-foreground">
                  {act.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {act.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border font-mono text-xs text-secondary-foreground font-semibold flex items-center justify-between">
                <span>{act.actionText}</span>
                {act.isExternal && <span className="text-[10px] text-muted-foreground">docs.ros.org</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
