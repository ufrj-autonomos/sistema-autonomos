import { requirePageUser } from '@/lib/session';
import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  Layers,
  PlayCircle,
  CheckCircle,
  Video,
  FileText,
  Terminal,
  ExternalLink,
  ChevronDown,
  Award,
  Sparkles,
  Cpu,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { HarpiaMark, NautilusMark } from "@/components/brand/logo";

export const dynamic = "force-dynamic";

export default async function EnsinoCatalogPage() {
  await requirePageUser(false);
  // Busca dinâmica do curso no Supabase PostgreSQL
  const course = await prisma.course.findFirst({
    where: { slug: "ros2-jazzy" },
    include: {
      modules: {
        orderBy: { orderIndex: "asc" },
        include: {
          lessons: {
            orderBy: { orderIndex: "asc" },
            include: {
              exercises: {
                select: { id: true, title: true, points: true, type: true },
              },
            },
          },
        },
      },
    },
  });

  const modules = course?.modules || [];
  const allLessons = modules.flatMap((m) => m.lessons);

  // Métricas empíricas calculadas diretamente do banco
  const totalModules = modules.length;
  const totalLessons = allLessons.length;
  const availableVideos = allLessons.filter(
    (l) => l.videoStatus === "AVAILABLE"
  ).length;
  const pendingVideos = allLessons.filter(
    (l) => l.videoStatus === "PENDING"
  ).length;
  const textOnlyLessons = allLessons.filter(
    (l) => l.videoStatus === "TEXT_ONLY"
  ).length;
  const totalExercises = allLessons.reduce(
    (acc, l) => acc + l.exercises.length,
    0
  );
  const firstLessonSlug = allLessons[0]?.slug || "001-welcome";

  // Verificação de Progresso do Usuário para o Botão "Continuar de onde parou"
  const session = await getSession();
  let userProgress: {
    percentage: number;
    completedLessonsCount: number;
    lastLessonId: string | null;
  } | null = null;

  if (session?.sub && course?.id) {
    const prog = await prisma.courseProgress.findUnique({
      where: {
        userId_courseId: {
          userId: session.sub,
          courseId: course.id,
        },
      },
      select: {
        percentage: true,
        completedLessonsCount: true,
        lastLessonId: true,
      },
    });
    if (prog) {
      userProgress = prog;
    }
  }

  const progressPercent = userProgress ? Math.round(userProgress.percentage) : 0;
  const hasProgress = progressPercent > 0 || (userProgress?.completedLessonsCount || 0) > 0;

  let resumeLessonSlug = firstLessonSlug;
  let resumeLessonTitle = allLessons[0]?.title || "Welcome";
  let resumeLessonIndex = 1;

  if (userProgress?.lastLessonId) {
    const target = allLessons.find(
      (l) => l.id === userProgress.lastLessonId || l.slug === userProgress.lastLessonId
    );
    if (target) {
      resumeLessonSlug = target.slug;
      resumeLessonTitle = target.title;
      resumeLessonIndex = target.orderIndex;
    }
  }

  const techStack = [
    "ROS 2 Jazzy Jalisco",
    "Ubuntu 24.04 LTS (Noble)",
    "C++17 (rclcpp)",
    "Python 3.12 (rclpy)",
    "Colcon Build System",
    "FastDDS / CycloneDDS",
    "Launch XML & Python",
    "Turtlesim Simulator",
    "Gazebo Harmonic",
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex flex-col">
      {/* 1. Subsystem Top Bar */}
      <header className="border-b border-white/10 bg-[#0E0E11]/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white transition"
              title="Voltar ao portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Plataforma de Ensino • UFRJ Autônomos
              </span>
            </div>
          </div>

          <Link
            href={`/curso/${hasProgress ? resumeLessonSlug : firstLessonSlug}`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 text-zinc-950 font-semibold text-xs font-mono hover:bg-white transition shadow-sm"
          >
            <PlayCircle className="w-4 h-4" />
            <span>{hasProgress ? `Continuar (${progressPercent}%)` : "Começar Agora"}</span>
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 border-b border-white/10 bg-radial-vignette">
        {/* Glow de fundo */}
        <div className="pointer-events-none absolute -top-40 right-1/4 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-8">
          {/* Badges de Divisão e Versão */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-cyan-950/80 text-cyan-300 border border-cyan-800">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>ROS 2 JAZZY JALISCO • LTS 2024-2029</span>
            </span>

            {/* Divisão Harpia Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#1D062B]/80 text-[#C49ED9] border border-[#702191]/60">
              <HarpiaMark size={14} symbolType="eagle" />
              <span>Divisão Harpia (UAV)</span>
            </div>

            {/* Divisão Nautilus Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-[#0A1A2F]/80 text-[#93C5FD] border border-[#1E40AF]/60">
              <NautilusMark size={14} symbolType="auv" />
              <span>Divisão Nautilus (AUV)</span>
            </div>
          </div>

          {/* Título Principal & Descrição */}
          <div className="max-w-3xl space-y-4">
            <h1 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl tracking-tight text-white leading-tight">
              {course?.title || "ROS 2 Jazzy para Iniciantes"}
            </h1>
            <p className="text-base sm:text-lg text-zinc-300 leading-relaxed font-sans">
              {course?.description ||
                "Domine o middleware de robótica autônoma mais moderno do mundo. Construa pacotes profissionais em C++ e Python, gerencie tópicos pub/sub, servidores de serviços, parâmetros dinâmicos, launch files e desenvolva o projeto capstone com o simulador Turtlesim."}
            </p>
          </div>

          {/* Tech Stack Tags */}
          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Tecnologias & Ferramentas do Curso:
            </span>
            <div className="flex flex-wrap gap-2 pt-1">
              {techStack.map((tech) => (
                <span
                  key={tech}
                  className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-zinc-300"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>

          {/* Grid de Estatísticas Técnicas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
            <div className="p-4 rounded-xl bg-[#111114] border border-white/10 blueprint-corners">
              <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs font-mono">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Módulos</span>
              </div>
              <div className="text-2xl font-display font-bold text-white tabular">
                {totalModules}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Sequenciais</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-white/10 blueprint-corners">
              <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs font-mono">
                <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Total Aulas</span>
              </div>
              <div className="text-2xl font-display font-bold text-white tabular">
                {totalLessons}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Completas</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-white/10 blueprint-corners">
              <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs font-mono">
                <Video className="w-3.5 h-3.5 text-purple-400" />
                <span>Vídeos</span>
              </div>
              <div className="text-2xl font-display font-bold text-white tabular">
                {availableVideos}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Legendas PT-BR</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-white/10 blueprint-corners">
              <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs font-mono">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Em Produção</span>
              </div>
              <div className="text-2xl font-display font-bold text-white tabular">
                {pendingVideos}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Teoria disponível</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-white/10 blueprint-corners">
              <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs font-mono">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Tutoriais</span>
              </div>
              <div className="text-2xl font-display font-bold text-white tabular">
                {textOnlyLessons}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Leitura técnica</div>
            </div>

            <div className="p-4 rounded-xl bg-[#111114] border border-white/10 blueprint-corners">
              <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs font-mono">
                <Terminal className="w-3.5 h-3.5 text-pink-400" />
                <span>Exercícios</span>
              </div>
              <div className="text-2xl font-display font-bold text-white tabular">
                {totalExercises}
              </div>
              <div className="text-[11px] text-zinc-500 font-mono">Hands-on robótica</div>
            </div>
          </div>

          {/* Barra de Progresso Ativa no Hero (se o aluno já iniciou) */}
          {hasProgress && (
            <div className="p-4 sm:p-5 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 space-y-2.5 max-w-xl">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Progresso do Aluno
                </span>
                <span className="text-emerald-400 font-semibold tabular">
                  {progressPercent}% Concluído
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] font-mono text-zinc-400">
                Próxima aula sugerida:{" "}
                <span className="text-zinc-200">
                  #{String(resumeLessonIndex).padStart(3, "0")} — {resumeLessonTitle}
                </span>
              </p>
            </div>
          )}

          {/* Botões CTA Primários */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            {hasProgress ? (
              <Link
                href={`/curso/${resumeLessonSlug}`}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-semibold text-sm font-mono transition shadow-lg cursor-pointer"
              >
                <PlayCircle className="w-5 h-5 text-zinc-950" />
                <span>Continuar de onde parou ({progressPercent}%)</span>
              </Link>
            ) : (
              <Link
                href={`/curso/${firstLessonSlug}`}
                className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-sm font-mono transition shadow-lg cursor-pointer"
              >
                <PlayCircle className="w-5 h-5 text-cyan-600" />
                <span>Começar Agora (Aula #001)</span>
              </Link>
            )}

            <a
              href="#grade"
              className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-mono text-sm transition"
            >
              <span>Ver Grade Curricular</span>
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* 3. Pré-requisitos & Perfil Recomendado */}
      <section className="py-12 border-b border-white/10 bg-[#0C0C0E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-6 sm:p-8 rounded-2xl bg-[#111114] border border-white/10 blueprint-corners space-y-4">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="font-display font-bold text-lg text-white">
                Pré-requisitos e Ambiente Recomendado
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-zinc-300">
              <div className="space-y-1.5">
                <div className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-semibold">
                  1. Sistema Operacional
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Ubuntu 24.04 LTS (Noble Numbat) nativo, dual-boot ou máquina virtual
                  (WSL2 / VirtualBox) com aceleração 3D habilitada para simulação gráfica no
                  Turtlesim.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-mono text-xs uppercase tracking-wider text-purple-400 font-semibold">
                  2. Conhecimento Prévio
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Familiaridade com o terminal Linux (comandos bash básicos) e lógica de
                  programação em Python ou C++. Não é necessária experiência anterior com ROS.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="font-mono text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                  3. Hardware Recomendado
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Processador multi-core x86_64, mínimo de 4GB de RAM (8GB recomendado para
                  compilação com Colcon) e 15GB de espaço livre em disco para a distribuição
                  ROS 2 Desktop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Grade Curricular Completa (11 Módulos • 108 Aulas) */}
      <section id="grade" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="font-mono text-xs text-cyan-400 uppercase tracking-wider font-semibold mb-1">
              Estrutura Pedagógica Detalhada
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-white">
              Grade Curricular ({totalModules} Módulos • {totalLessons} Aulas)
            </h2>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-zinc-400">
            <span className="flex items-center gap-1.5">
              <PlayCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span>{availableVideos} Vídeos</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{pendingVideos} Em Gravação</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span>{totalExercises} Exercícios</span>
            </span>
          </div>
        </div>

        {/* Lista dos 11 Módulos com acordeom estilizado */}
        <div className="space-y-4">
          {modules.map((module) => {
            const moduleLessons = module.lessons;
            const moduleExercises = moduleLessons.flatMap((l) => l.exercises);

            return (
              <details
                key={module.id}
                className="group rounded-2xl border border-white/10 bg-[#111114] blueprint-corners overflow-hidden transition-all duration-200 open:border-white/20"
              >
                <summary className="p-5 sm:p-6 flex items-center justify-between cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors">
                  <div className="space-y-1.5 pr-4 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                        MÓDULO {String(module.orderIndex).padStart(2, "0")}
                      </span>
                      <span className="text-xs font-mono text-zinc-400">
                        {moduleLessons.length} {moduleLessons.length === 1 ? "aula" : "aulas"}
                      </span>
                      {moduleExercises.length > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                          <Terminal size={11} />
                          <span>{moduleExercises.length} exercícios</span>
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-lg sm:text-xl text-white">
                      {module.title}
                    </h3>

                    {module.description && (
                      <p className="text-xs sm:text-sm text-zinc-400 line-clamp-2 font-sans">
                        {module.description}
                      </p>
                    )}
                  </div>

                  <div className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 group-open:rotate-180 transition-transform duration-200 shrink-0">
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </summary>

                {/* Lista de Aulas do Módulo */}
                <div className="border-t border-white/10 bg-[#0A0A0C] divide-y divide-white/5 p-2 sm:p-4">
                  {moduleLessons.map((lesson) => {
                    const isText =
                      lesson.lessonType === "TEXT" ||
                      lesson.videoStatus === "TEXT_ONLY";
                    const isVideo =
                      !isText &&
                      lesson.videoStatus === "AVAILABLE" &&
                      Boolean(lesson.youtubeVideoId);
                    const isPending =
                      !isText &&
                      (lesson.videoStatus === "PENDING" ||
                        !lesson.youtubeVideoId);
                    const hasExercises = lesson.exercises && lesson.exercises.length > 0;

                    return (
                      <div
                        key={lesson.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-xs text-zinc-500 shrink-0">
                            #{String(lesson.orderIndex).padStart(3, "0")}
                          </span>

                          {isVideo ? (
                            <PlayCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                          ) : isPending ? (
                            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          )}

                          <Link
                            href={`/curso/${lesson.slug}`}
                            className="font-medium text-sm text-zinc-200 hover:text-white truncate"
                          >
                            {lesson.title}
                          </Link>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 text-xs font-mono">
                          {hasExercises && (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              {lesson.exercises.length} ex
                            </span>
                          )}

                          {isVideo ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Vídeo HD
                            </span>
                          ) : isPending ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Em Gravação
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30">
                              Texto
                            </span>
                          )}

                          <Link
                            href={`/curso/${lesson.slug}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition"
                          >
                            <span>Acessar</span>
                            <ExternalLink size={11} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}
