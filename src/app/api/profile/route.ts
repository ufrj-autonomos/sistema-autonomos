import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { normalizeMemberArea, resolveMemberAreas } from '@/lib/member-fields';
import { SITE_PROFILE_FIELDS, validateSiteProfileChanges, profileChangeDiff } from '@/lib/site-profile-changes';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import { privateData } from '@/lib/directory-validation';
import { syncMemberAgeToInstitutional } from '@/lib/birthdays';
import { publishInstitutionalSite } from '@/lib/institutional/publish';

export async function GET(req: NextRequest) {
  try {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    const member = await prisma.member.findUnique({
      where: { id: access.user.id },
      include: {
        profileChanges: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 });
    }

    let siteProfile = null;
    if (member.institutionalMemberId && process.env.INSTITUTIONAL_DATABASE_URL) {
      siteProfile = await institutionalDb.institutionalMember.findUnique({
        where: { id: member.institutionalMemberId },
        include: { team: { select: { id: true, name: true } } },
      });
    }

    const pendingChange = member.profileChanges[0] || null;

    return NextResponse.json(
      {
        profile: {
          id: member.id,
          name: member.name,
          email: member.email || '',
          role: member.role,
          area: resolveMemberAreas(siteProfile?.area, member.area).internal || '',
          phone: member.phone || '',
          dre: member.dre || '',
          cpf: member.cpf || '',
          birthDate: member.birthDate ? member.birthDate.toISOString().slice(0, 10) : '',
          course: member.course || siteProfile?.course || '',
          academicPeriod: member.academicPeriod || '',
          emergencyContactName: member.emergencyContactName || '',
          emergencyContactPhone: member.emergencyContactPhone || '',
          profileCompletedAt: member.profileCompletedAt?.toISOString() || null,
          institutionalMemberId: member.institutionalMemberId,
        },
        siteProfile: siteProfile
          ? {
              id: siteProfile.id,
              name: siteProfile.name,
              role: siteProfile.role,
              area: siteProfile.area,
              bio: siteProfile.bio || '',
              photo: siteProfile.photo || '',
              course: siteProfile.course || '',
              linkedin: siteProfile.linkedin || '',
              github: siteProfile.github || '',
              instagram: siteProfile.instagram || '',
              isFemale: siteProfile.isFemale,
              joinedYear: siteProfile.joinedYear || '',
              teamName: siteProfile.team?.name || 'Autônomos / Geral',
              showOnSite: siteProfile.showOnSite,
            }
          : null,
        pendingChange: pendingChange
          ? {
              id: pendingChange.id,
              createdAt: pendingChange.createdAt.toISOString(),
              changes: pendingChange.changes,
            }
          : null,
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error) {
    console.error('Erro em GET /api/profile:', error);
    return NextResponse.json({ error: 'Não foi possível carregar seu perfil.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Formato JSON inválido.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const input = body as Record<string, unknown>;

    // Explicit security invariant: members can never change showOnSite via /api/profile
    if ('showOnSite' in input) {
      return NextResponse.json(
        { error: 'A exibição no site é controlada exclusivamente pela gestão.' },
        { status: 403 }
      );
    }

    const member = await prisma.member.findUnique({
      where: { id: access.user.id },
      include: {
        profileChanges: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 });
    }

    const validatedInternal = privateData(
      {
        cpf: 'cpf' in input ? input.cpf : member.cpf || '',
        notes: member.notes || '',
        userId: member.id,
        name: typeof input.name === 'string' ? input.name : member.name,
        area: 'area' in input ? input.area : member.area || '',
        phone: 'phone' in input ? input.phone : member.phone || '',
        dre: 'dre' in input ? input.dre : member.dre || '',
        birthDate: 'birthDate' in input ? input.birthDate : member.birthDate?.toISOString().slice(0, 10) || '',
        course: 'course' in input ? input.course : member.course || '',
        academicPeriod: 'academicPeriod' in input ? input.academicPeriod : member.academicPeriod || '',
        emergencyContactName: 'emergencyContactName' in input ? input.emergencyContactName : member.emergencyContactName || '',
        emergencyContactPhone: 'emergencyContactPhone' in input ? input.emergencyContactPhone : member.emergencyContactPhone || '',
      },
      true
    );

    if (!('cpf' in validatedInternal)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    // Validate required fields for profile completion (phone, course, dre, emergency contact)
    if (!validatedInternal.phone) {
      return NextResponse.json({ error: 'O telefone / WhatsApp é obrigatório.' }, { status: 400 });
    }
    if (!validatedInternal.course) {
      return NextResponse.json({ error: 'O curso é obrigatório.' }, { status: 400 });
    }
    if (!validatedInternal.dre) {
      return NextResponse.json({ error: 'O DRE é obrigatório.' }, { status: 400 });
    }
    if (!validatedInternal.emergencyContactName || !validatedInternal.emergencyContactPhone) {
      return NextResponse.json({ error: 'O nome e o telefone do contato de emergência são obrigatórios.' }, { status: 400 });
    }

    const siteChanges = validateSiteProfileChanges(Object.fromEntries(SITE_PROFILE_FIELDS.filter(field => field.key in input).map(field => [field.key, input[field.key]])));

    const now = new Date();
    const { userId: _unusedUserId, notes: _unusedNotes, ...internalFields } = validatedInternal;

    const { updatedMember, diffForApproval } = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${member.id} FOR UPDATE`;
      const latest = await tx.member.findUniqueOrThrow({ where: { id: member.id } });
      const existingPending = await tx.memberProfileChange.findFirst({ where: { memberId: member.id, status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
      const currentSite = latest.institutionalMemberId && process.env.INSTITUTIONAL_DATABASE_URL
        ? await institutionalDb.institutionalMember.findUnique({ where: { id: latest.institutionalMemberId } })
        : null;
      const priorChanges = existingPending ? validateSiteProfileChanges(existingPending.changes) : {};
      const diffForApproval = profileChangeDiff({ ...priorChanges, ...siteChanges }, currentSite);

      const saved = await tx.member.update({
        where: { id: member.id },
        data: {
          ...internalFields,
          name: internalFields.name || member.name,
          area: normalizeMemberArea(internalFields.area) || normalizeMemberArea(member.area) || 'Não informada',
          avatar: typeof siteChanges.photo === 'string' ? siteChanges.photo : member.avatar,
          profileCompletedAt: member.profileCompletedAt ?? now,
        },
      });

      if (Object.keys(diffForApproval).length > 0) {
        if (existingPending) {
          await tx.memberProfileChange.update({
            where: { id: existingPending.id },
            data: { changes: diffForApproval as any },
          });
        } else {
          await tx.memberProfileChange.create({
            data: {
              memberId: member.id,
              institutionalMemberId: latest.institutionalMemberId ?? 0,
              status: 'PENDING',
              changes: diffForApproval as any,
            },
          });
        }
      } else if (existingPending) {
        await tx.memberProfileChange.update({ where: { id: existingPending.id }, data: { status: 'REJECTED', reviewedAt: now, reviewedById: member.id, reviewNote: 'Solicitação retirada pelo integrante ao restaurar os valores atuais.' } });
      }

      return { updatedMember: saved, diffForApproval };
    }, { maxWait: 10000, timeout: 15000 });

    // Derive and update age from birthDate if birthDate is set
    if (updatedMember.institutionalMemberId && updatedMember.birthDate) {
      const ageUpdated = await syncMemberAgeToInstitutional(
        updatedMember.institutionalMemberId,
        updatedMember.birthDate,
        now
      );
      if (ageUpdated) {
        await publishInstitutionalSite();
      }
    }

    return NextResponse.json({
      success: true,
      pendingSiteApproval: Object.keys(diffForApproval).length > 0,
      pendingFields: Object.keys(diffForApproval),
      message:
        Object.keys(diffForApproval).length > 0
          ? 'Dados internos salvos! As alterações nos dados públicos do site foram enviadas para aprovação da gestão.'
          : 'Perfil atualizado com sucesso!',
    });
  } catch (error: any) {
    if (error instanceof Error && !('code' in error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { error: 'Este CPF ou DRE já está cadastrado em outro integrante.' },
        { status: 409 }
      );
    }
    console.error('Erro em PUT /api/profile:', error);
    return NextResponse.json({ error: 'Não foi possível salvar seu perfil.' }, { status: 500 });
  }
}

