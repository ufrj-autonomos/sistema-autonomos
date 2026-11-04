import Link from 'next/link';
import { ArrowRight, BookOpen, UserRound } from 'lucide-react';
import { AttendanceCard } from '@/components/attendance/attendance-card';
import { attendanceReport } from '@/lib/attendance/service';
import { prisma } from '@/lib/prisma';
import type { SafeUser } from '@/lib/session';

export async function MemberHome({ user }: { user: SafeUser }) {
  const [courseResult, attendance] = await Promise.allSettled([
    prisma.course.findMany({ where: { published: true }, orderBy: { orderIndex: 'asc' }, select: {
      id: true, title: true, subtitle: true, level: true, durationHours: true,
      courseProgress: { where: { memberId: user.id }, select: { percentage: true } },
      _count: { select: { modules: true } },
    } }), attendanceReport(undefined, user.id),
  ]);
  const courses = courseResult.status === 'fulfilled' ? courseResult.value : null;
  return <div className="mx-auto max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Olá, {user.name.split(' ')[0]}.</h1><p className="mt-2 text-sm text-muted-foreground">Acompanhe suas horas e continue de onde parou.</p></div><Link href="/perfil" className="workspace-secondary"><UserRound size={16} aria-hidden="true" />Meu perfil</Link></header>
    {!user.profileCompletedAt && <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5"><div className="max-w-xl"><h2 className="text-sm font-semibold">Vamos completar seu cadastro?</h2><p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">Adicione telefone, curso, DRE e contato de emergência para manter a equipe informada.</p></div><Link href="/perfil?welcome=1" className="workspace-primary">Completar perfil<ArrowRight size={16} aria-hidden="true" /></Link></div>}
    <AttendanceCard initial={attendance.status === 'fulfilled' ? attendance.value : null} />
    <section aria-labelledby="courses-heading" className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-5 sm:px-6"><div><h2 id="courses-heading" className="text-base font-semibold">Seu aprendizado</h2><p className="mt-1 text-sm text-muted-foreground">O progresso fica salvo entre uma visita e outra.</p></div><Link href="/ensino" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium hover:underline">Ver cursos<ArrowRight size={15} aria-hidden="true" /></Link></div><div className="divide-y divide-border px-5 sm:px-6">
      {courses ? courses.length ? courses.map(course => { const progress = Math.min(100, Math.max(0, Math.round(course.courseProgress[0]?.percentage ?? 0))); return <article key={course.id} className="flex flex-col gap-5 py-6 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><h3 className="flex items-center gap-3 text-base font-semibold"><BookOpen size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />{course.title}</h3>{course.subtitle && <p className="mt-2 text-sm text-muted-foreground">{course.subtitle}</p>}<p className="mt-2 text-xs text-muted-foreground">{course.level} · {course._count.modules} módulos · {course.durationHours} horas</p><div className="mt-4 flex max-w-sm items-center gap-3"><progress value={progress} max={100} aria-label={`Progresso em ${course.title}`} className="workspace-progress h-1.5 flex-1" /><span className="text-xs tabular-nums text-muted-foreground">{progress}%</span></div></div><Link href="/ensino" className="workspace-secondary self-start sm:self-center">{progress >= 100 ? 'Revisar curso' : progress > 0 ? 'Continuar curso' : 'Começar curso'}<ArrowRight size={16} aria-hidden="true" /></Link></article>; }) : <p className="py-8 text-sm text-muted-foreground">Os cursos publicados pela equipe aparecerão aqui.</p> : <p role="status" className="py-8 text-sm text-muted-foreground">Não foi possível carregar os cursos. <Link href="/ensino" className="underline underline-offset-4">Abrir ensino</Link> para tentar novamente.</p>}
    </div></section>
  </div>;
}
