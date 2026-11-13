import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db } from '@/lib/institutional/db';
import { resolveMemberAreas } from '@/lib/member-fields';
import type { PendingProfileChangeDto } from '@/lib/member-directory';
import { SiteMembersShowcase, type SiteMemberShowcaseRow } from '@/components/gestao/site-members-showcase';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Exibição de Membros no Site — Gestão' };

export default async function SiteMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePageUser(true);
  const params = await searchParams;
  const initialTab = params.tab === 'alumni' ? 'alumni' : params.tab === 'all' ? 'all' : 'active';

  const [records, platformMembers, projects] = await Promise.all([
    db.institutionalMember.findMany({
      include: { team: { select: { name: true } } },
      orderBy: [{ showOnSite: 'desc' }, { active: 'desc' }, { name: 'asc' }],
    }),
    prisma.member.findMany({
      where: { institutionalMemberId: { not: null } },
      include: {
        profileChanges: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    }),
    db.project.findMany({ select: { id: true, name: true, slug: true } }),
  ]);

  const byInstId = new Map(
    platformMembers
      .filter(m => typeof m.institutionalMemberId === 'number')
      .map(m => [m.institutionalMemberId as number, m])
  );
  const projectById = new Map(
    projects.flatMap(project => [
      [String(project.id), project.name],
      [project.slug, project.name],
    ] as [string, string][])
  );

  const rows: SiteMemberShowcaseRow[] = records.map(record => {
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
      if (Array.isArray(ids)) {
        projectNames = ids
          .filter(id => typeof id === 'number' || typeof id === 'string')
          .map(id => projectById.get(String(id)) || `#${id}`)
          .join(', ');
      }
    } catch { /* ignore malformed json */ }

    const areas = resolveMemberAreas(record.area, member?.area);

    const missingSiteFields: string[] = [];
    if (!record.photo) missingSiteFields.push('Foto');
    if (!record.bio?.trim()) missingSiteFields.push('Biografia');
    if (!(record.course?.trim() || member?.course?.trim())) missingSiteFields.push('Curso');
    if (!areas.site) missingSiteFields.push('Área');
    if (!record.joinedYear?.trim()) missingSiteFields.push('Data de entrada');
    if (!record.linkedin?.trim() && !record.github?.trim() && !record.instagram?.trim()) {
      missingSiteFields.push('Redes sociais');
    }

    const missingInternalFields: string[] = [];
    if (record.active) {
      if (!member) {
        missingInternalFields.push('Conta vinculada');
      } else {
        if (!member.phone?.trim()) missingInternalFields.push('WhatsApp');
        if (!member.cpf?.trim()) missingInternalFields.push('CPF');
        if (!member.dre?.trim()) missingInternalFields.push('DRE');
        if (!member.birthDate) missingInternalFields.push('Data de nascimento');
        if (!member.profileCompletedAt && missingInternalFields.length === 0) {
          missingInternalFields.push('Confirmação inicial');
        }
      }
    }

    return {
      id: record.id,
      name: record.name,
      role: record.role,
      roleEn: record.roleEn,
      roleFr: record.roleFr,
      area: areas.site || '',
      teamId: record.teamId,
      teamName: record.team?.name || 'Autônomos / Geral',
      active: record.active,
      showOnSite: record.showOnSite,
      isFemale: record.isFemale,
      photo: record.photo,
      bio: record.bio,
      bioEn: record.bioEn,
      bioFr: record.bioFr,
      course: record.course,
      courseEn: record.courseEn,
      courseFr: record.courseFr,
      linkedin: record.linkedin,
      github: record.github,
      instagram: record.instagram,
      joinedYear: record.joinedYear,
      leftYear: record.leftYear,
      projectNames,
      pendingChange,
      missingSiteFields,
      missingInternalFields,
    };
  });

  return <SiteMembersShowcase rows={rows} initialTab={initialTab} />;
}
