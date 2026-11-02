import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db } from '@/lib/institutional/db';
import { memberSummary } from '@/lib/attendance/summary';
import { weekKey } from '@/lib/attendance/time';
import { initialMemberPreferences, type MemberDirectoryRow } from '@/lib/member-directory';
import { MemberDirectory } from './member-directory';

export async function MemberListPage() {
  const user = await requirePageUser(true);
  const [records, details, preferences, projects] = await Promise.all([
    db.member.findMany({ include: { team: { select: { name: true } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.memberDetails.findMany({ include: { member: { include: { user: { select: { email: true } }, attendancePeriods: true, attendanceVisits: true } } } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { memberDirectoryPreferences: true } }),
    db.project.findMany({ select: { id: true, name: true, slug: true } }),
  ]);
  const byId = new Map(details.map(detail => [detail.institutionalMemberId, detail]));
  const projectById = new Map(projects.flatMap(project => [[String(project.id), project.name], [project.slug, project.name]] as [string, string][]));
  const rows: MemberDirectoryRow[] = records.map(record => {
    const detail = byId.get(record.id);
    const member = detail?.member;
    let projectNames = '';
    try {
      const ids: unknown = JSON.parse(record.projectIds || '[]');
      if (Array.isArray(ids)) projectNames = ids.filter(id => typeof id === 'number' || typeof id === 'string').map(id => projectById.get(String(id)) || `#${id}`).join(', ');
    } catch { /* Legacy malformed project lists do not prevent reading the roster. */ }
    return {
      id: record.id, name: record.name, role: record.role, area: record.area, age: record.age,
      teamId: record.teamId, teamName: record.team?.name || 'Autônomos / Geral', active: record.active, showOnSite: record.showOnSite,
      photo: record.photo, bio: record.bio, course: record.course, linkedin: record.linkedin, github: record.github, instagram: record.instagram,
      joinedYear: record.joinedYear, leftYear: record.leftYear, isFemale: record.isFemale, projectNames,
      roleEn: record.roleEn, roleFr: record.roleFr, bioEn: record.bioEn, bioFr: record.bioFr, courseEn: record.courseEn, courseFr: record.courseFr,
      internal: {
        name: detail?.name || null, area: detail?.area || null, email: detail?.email || member?.user?.email || null,
        phone: detail?.phone || null, dre: detail?.dre || null, cpf: detail?.cpf || null,
        birthDate: detail?.birthDate?.toISOString().slice(0, 10) || null, course: detail?.course || null,
        academicPeriod: detail?.academicPeriod || null, emergencyContactName: detail?.emergencyContactName || null,
        emergencyContactPhone: detail?.emergencyContactPhone || null, notes: detail?.notes || null,
        missedWeeks: member ? memberSummary({ id: member.id, name: record.name, area: member.area, email: member.user?.email || null }, member.attendancePeriods, member.attendanceVisits, weekKey()).missedWeeks : null,
      },
    };
  });
  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-3xl font-semibold text-zinc-100">Integrantes <span className="ml-2 align-middle text-base font-normal tabular-nums text-zinc-400">{rows.length}</span></h1><p className="mt-2 max-w-prose text-sm leading-relaxed text-zinc-400">Consulte os dados do site, organize o cadastro interno ou monte sua própria visualização.</p></div>
      <Link href="/gestao/integrantes/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-950 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"><Plus className="h-4 w-4" />Novo integrante</Link>
    </header>
    <MemberDirectory rows={rows} initialPreferences={initialMemberPreferences(preferences?.memberDirectoryPreferences)} />
  </div>;
}
