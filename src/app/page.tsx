import { AttendanceCard } from '@/components/attendance/attendance-card';
import { attendanceReport } from '@/lib/attendance/service';
import Link from 'next/link';
import { hasManagementAccess } from '@/lib/access-policy';
import { ArrowRight, BookOpen, ShieldCheck } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await requirePageUser();
  const courses = await prisma.course.findMany({ where: { published: true }, orderBy: { orderIndex: 'asc' }, select: {
      id: true, title: true, subtitle: true, level: true, durationHours: true,
      courseProgress: { where: { userId: user.id }, select: { percentage: true } },
      _count: { select: { modules: true } },
    } });

  const attendance = await attendanceReport(undefined, user.id).catch(() => null);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <h1 className="font-display text-3xl font-semibold text-zinc-100 sm:text-4xl">Olá, {user.name.split(' ')[0]}.</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">Este é o seu espaço na UFRJ Autônomos. Continue aprendendo sobre robótica.</p>
        </div>
        {hasManagementAccess(user.role) && <Link href="/gestao" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-300"><ShieldCheck className="h-4 w-4" />Abrir gestão</Link>}
      </header>

      <AttendanceCard initial={attendance} />

      <section aria-labelledby="courses-heading" className="py-10">
        <h2 id="courses-heading" className="font-display text-2xl font-semibold">Seus cursos</h2>
        <p className="mt-2 text-sm text-zinc-400">Seu progresso fica salvo para você continuar de onde parou.</p>
        <div className="mt-6 divide-y divide-white/10 border-y border-white/10">
          {courses.length === 0 && <p className="py-8 text-zinc-400">Nenhum curso publicado no momento. Volte em breve.</p>}
          {courses.map(course => {
            const progress = Math.round(course.courseProgress[0]?.percentage ?? 0);
            return <article key={course.id} className="flex flex-col gap-5 py-7 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="flex items-start gap-3 font-display text-xl font-medium"><BookOpen className="mt-1 h-5 w-5 shrink-0 text-zinc-400" />{course.title}</h3>
                {course.subtitle && <p className="mt-2 text-sm text-zinc-400">{course.subtitle}</p>}
                <p className="mt-3 text-sm text-zinc-400">{course.level} · {course._count.modules} módulos · {course.durationHours} horas</p>
                <p className="mt-2 text-sm text-zinc-300">{progress > 0 ? `${progress}% concluído` : 'Pronto para começar'}</p>
              </div>
              <Link href="/ensino" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-3 self-start rounded-lg bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-300">{progress > 0 ? 'Continuar curso' : 'Acessar curso'}<ArrowRight className="h-4 w-4" /></Link>
            </article>;
          })}
        </div>
      </section>

    </div>
  );
}
