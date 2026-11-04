import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { resolveMemberAreas } from '@/lib/member-fields';
import { db } from '@/lib/institutional/db';
import { memberSummary } from '@/lib/attendance/summary';
import { weekKey } from '@/lib/attendance/time';
import { initialMemberPreferences, type MemberDirectoryRow, type PendingProfileChangeDto } from '@/lib/member-directory';
import { MemberDirectory } from './member-directory';

export async function MemberListPage() {
  const user = await requirePageUser(true);
  const [records, platformMembers, preferences, projects] = await Promise.all([
    db.institutionalMember.findMany({ include: { team: { select: { name: true } } }, orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    prisma.member.findMany({
      include: {
        attendancePeriods: true,
        attendanceVisits: true,
        profileChanges: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    prisma.member.findUnique({ where: { id: user.id }, select: { memberDirectoryPreferences: true } }),
    db.project.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  const byInstId = new Map(
    platformMembers
      .filter((m) => typeof m.institutionalMemberId === 'number')
      .map((m) => [m.institutionalMemberId as number, m])
  );
  const projectById = new Map(projects.flatMap(project => [[String(project.id), project.name], [project.slug, project.name]] as [string, string][]));

  const rows: MemberDirectoryRow[] = records.map(record => {
    const member = byInstId.get(record.id);
    const pendingRaw = member?.profileChanges?.[0];
    const pendingChangesObj =
      pendingRaw && typeof pendingRaw.changes === 'object' && pendingRaw.changes !== null && !Array.isArray(pendingRaw.changes)
        ? (pendingRaw.changes as Record<string, string | boolean | null>)
        : null;

    const pendingChange: PendingProfileChangeDto | null =
      pendingRaw && pendingChangesObj && Object.keys(pendingChangesObj).length > 0
        ? {
            id: pendingRaw.id,
            memberId: member!.id,
            createdAt: pendingRaw.createdAt.toISOString(),
            updatedAt: pendingRaw.updatedAt.toISOString(),
            changes: pendingChangesObj,
          }
        : null;

    let projectNames = '';
    try {
      const ids: unknown = JSON.parse(record.projectIds || '[]');
      if (Array.isArray(ids)) projectNames = ids.filter(id => typeof id === 'number' || typeof id === 'string').map(id => projectById.get(String(id)) || `#${id}`).join(', ');
    } catch { /* Legacy malformed project lists do not prevent reading the roster. */ }

    const areas = resolveMemberAreas(record.area, member?.area);
    return {
      id: record.id,
      name: record.name,
      role: record.role,
      area: areas.site || '',
      age: record.age,
      teamId: record.teamId,
      teamName: record.team?.name || 'Autônomos / Geral',
      active: record.active,
      showOnSite: record.showOnSite,
      photo: record.photo,
      bio: record.bio,
      course: record.course,
      linkedin: record.linkedin,
      github: record.github,
      instagram: record.instagram,
      joinedYear: record.joinedYear,
      leftYear: record.leftYear,
      isFemale: record.isFemale,
      projectNames,
      roleEn: record.roleEn,
      roleFr: record.roleFr,
      bioEn: record.bioEn,
      bioFr: record.bioFr,
      courseEn: record.courseEn,
      courseFr: record.courseFr,
      pendingChange,
      internal: {
        name: member?.name || null,
        area: areas.internal,
        email: member?.email || null,
        phone: member?.phone || null,
        dre: member?.dre || null,
        cpf: member?.cpf || null,
        birthDate: member?.birthDate?.toISOString().slice(0, 10) || null,
        course: member?.course || null,
        academicPeriod: member?.academicPeriod || null,
        emergencyContactName: member?.emergencyContactName || null,
        emergencyContactPhone: member?.emergencyContactPhone || null,
        notes: member?.notes || null,
        missedWeeks: member
          ? memberSummary(
              { id: member.id, name: record.name, area: areas.internal || 'Não informada', email: member.email || null },
              member.attendancePeriods,
              member.attendanceVisits,
              weekKey()
            ).missedWeeks
          : null,
      },
    };
  });

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-3xl font-semibold text-foreground">Integrantes <span className="ml-2 align-middle text-base font-normal tabular-nums text-muted-foreground">{rows.length}</span></h1><p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">Consulte os dados do site, aprove edições enviadas pelos integrantes, organize o cadastro interno ou monte sua própria visualização.</p></div>
      <Link href="/gestao/integrantes/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"><Plus className="h-4 w-4" />Novo integrante</Link>
    </header>
    <MemberDirectory rows={rows} initialPreferences={initialMemberPreferences(preferences?.memberDirectoryPreferences)} />
  </div>;
}
