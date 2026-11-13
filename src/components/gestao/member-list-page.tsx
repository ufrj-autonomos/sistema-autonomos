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

export async function MemberListPage({ mode = 'active' }: { mode?: 'active' | 'alumni' } = {}) {
  const user = await requirePageUser(true);
  const isAlumniMode = mode === 'alumni';
  const [records, platformMembers, preferences, projects] = await Promise.all([
    db.institutionalMember.findMany({
      where: { active: !isAlumniMode },
      include: { team: { select: { name: true } } },
      orderBy: isAlumniMode ? [{ leftYear: 'desc' }, { name: 'asc' }] : [{ name: 'asc' }],
    }),
    prisma.member.findMany({
      include: {
        attendancePeriods: true,
        attendanceVisits: true,
        attendanceJustifications: { where: { status: 'APPROVED' }, select: { weekStartsOn: true } },
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
    const missingProfileFields: string[] = [];
    if (!isAlumniMode) {
      if (!record.photo) missingProfileFields.push('Foto');
      if (!record.bio?.trim()) missingProfileFields.push('Biografia');
      if (!(record.course?.trim() || member?.course?.trim())) missingProfileFields.push('Curso');
      if (!member) {
        missingProfileFields.push('Conta vinculada / Dados internos');
      } else {
        if (!member.phone?.trim()) missingProfileFields.push('WhatsApp');
        if (!member.cpf?.trim()) missingProfileFields.push('CPF');
        if (!member.dre?.trim()) missingProfileFields.push('DRE');
        if (!member.birthDate) missingProfileFields.push('Data de nascimento');
        if (!member.profileCompletedAt && missingProfileFields.length === 0) {
          missingProfileFields.push('Confirmação inicial do perfil');
        }
      }
    }

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
      inactivatedAt: member?.inactivatedAt
        ? member.inactivatedAt.toISOString().slice(0, 10)
        : (record.leftYear ? `Ano ${record.leftYear}` : null),
      inactivationReason: member?.inactivationReason || null,
      isFemale: record.isFemale,
      projectNames,
      roleEn: record.roleEn,
      roleFr: record.roleFr,
      bioEn: record.bioEn,
      bioFr: record.bioFr,
      courseEn: record.courseEn,
      courseFr: record.courseFr,
      pendingChange,
      hasPlatformAccount: Boolean(member),
      profileCompletedAt: member?.profileCompletedAt ? member.profileCompletedAt.toISOString() : null,
      missingProfileFields,
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
              weekKey(), undefined, undefined, member.attendanceJustifications || []
            ).missedWeeks
          : null,
      },
    };
  });

  return <div className="min-w-0 space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          {isAlumniMode ? 'Ex-membros (Alumni)' : 'Integrantes'}{' '}
          <span className="ml-2 align-middle text-base font-normal tabular-nums text-muted-foreground">{rows.length}</span>
        </h1>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
          {isAlumniMode
            ? 'Diretório exclusivo de ex-integrantes da UFRJ Autônomos. Consulte histórico, cursos, anos de passagem e reative se necessário.'
            : 'Gerencie integrantes ativos em Perfil (dados da equipe), Dados (cadastro operacional privado) ou monte sua visualização personalizada.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {isAlumniMode ? (
          <Link href="/gestao/site/membros?tab=alumni" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Gerenciar exibição no site
          </Link>
        ) : (
          <Link href="/gestao/integrantes/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            <Plus className="h-4 w-4" />Novo integrante
          </Link>
        )}
      </div>
    </header>
    <MemberDirectory rows={rows} initialPreferences={initialMemberPreferences(preferences?.memberDirectoryPreferences)} mode={mode} />
  </div>;
}
