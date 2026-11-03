import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import { privateData } from '@/lib/directory-validation';
import { syncMemberAgeToInstitutional } from '@/lib/birthdays';
import { publishInstitutionalSite } from '@/lib/institutional/publish';

const SITE_PROPOSED_KEYS = [
  'name',
  'bio',
  'photo',
  'course',
  'linkedin',
  'github',
  'instagram',
  'isFemale',
] as const;

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
          area: member.area || siteProfile?.area || '',
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
        cpf: typeof input.cpf === 'string' ? input.cpf : '',
        notes: member.notes || '',
        userId: member.id,
        name: typeof input.name === 'string' ? input.name : member.name,
        area: typeof input.area === 'string' ? input.area : member.area || '',
        phone: typeof input.phone === 'string' ? input.phone : '',
        dre: typeof input.dre === 'string' ? input.dre : '',
        birthDate: typeof input.birthDate === 'string' ? input.birthDate : '',
        course: typeof input.course === 'string' ? input.course : '',
        academicPeriod: typeof input.academicPeriod === 'string' ? input.academicPeriod : '',
        emergencyContactName: typeof input.emergencyContactName === 'string' ? input.emergencyContactName : '',
        emergencyContactPhone: typeof input.emergencyContactPhone === 'string' ? input.emergencyContactPhone : '',
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

    // Validate site-facing fields
    const siteChanges: Record<string, string | boolean | null> = {};
    const siteTextLimits: Record<string, [string, number]> = {
      name: ['nome de exibição', 200],
      bio: ['biografia', 2000],
      photo: ['foto', 500],
      course: ['curso', 200],
      linkedin: ['LinkedIn', 300],
      github: ['GitHub', 300],
      instagram: ['Instagram', 300],
    };

    for (const [key, [label, limit]] of Object.entries(siteTextLimits)) {
      if (!(key in input)) continue;
      const val = input[key];
      if (val !== null && val !== undefined) {
        if (typeof val !== 'string' || val.length > limit || val.includes('\0')) {
          return NextResponse.json({ error: `Confira o campo ${label}.` }, { status: 400 });
        }
        const trimmed = val.trim();
        if (['photo', 'linkedin', 'github', 'instagram'].includes(key) && trimmed && !/^(https?:\/\/|\/)/i.test(trimmed)) {
          return NextResponse.json({ error: `Informe um link válido (https://...) no campo ${label}.` }, { status: 400 });
        }
        siteChanges[key] = trimmed || null;
      }
    }

    if ('isFemale' in input) {
      if (typeof input.isFemale !== 'boolean') {
        return NextResponse.json({ error: 'Valor inválido para adaptação de cargo no feminino.' }, { status: 400 });
      }
      siteChanges.isFemale = input.isFemale;
    }

    // Compare against current InstitutionalMember so we only queue real differences for management approval
    let currentSite: Record<string, unknown> | null = null;
    if (member.institutionalMemberId && process.env.INSTITUTIONAL_DATABASE_URL) {
      currentSite = await institutionalDb.institutionalMember.findUnique({
        where: { id: member.institutionalMemberId },
      });
    }

    const diffForApproval: Record<string, string | boolean | null> = {};
    if (currentSite) {
      for (const key of SITE_PROPOSED_KEYS) {
        if (!(key in siteChanges)) continue;
        const proposed = siteChanges[key];
        const existing = (currentSite[key] ?? null) as string | boolean | null;
        if (proposed !== existing && !(proposed === null && existing === '')) {
          diffForApproval[key] = proposed;
        }
      }
    } else {
      for (const key of SITE_PROPOSED_KEYS) {
        if (key in siteChanges && siteChanges[key] !== null && siteChanges[key] !== '') {
          diffForApproval[key] = siteChanges[key];
        }
      }
    }

    const now = new Date();
    const { userId: _unusedUserId, notes: _unusedNotes, ...internalFields } = validatedInternal;

    const updatedMember = await prisma.$transaction(async (tx) => {
      const saved = await tx.member.update({
        where: { id: member.id },
        data: {
          ...internalFields,
          name: internalFields.name || member.name,
          area: internalFields.area || member.area || 'Não informada',
          avatar: typeof siteChanges.photo === 'string' ? siteChanges.photo : member.avatar,
          profileCompletedAt: member.profileCompletedAt ?? now,
        },
      });

      const existingPending = member.profileChanges[0];
      if (Object.keys(diffForApproval).length > 0) {
        const mergedChanges = {
          ...(existingPending && typeof existingPending.changes === 'object' && existingPending.changes !== null
            ? (existingPending.changes as Record<string, unknown>)
            : {}),
          ...diffForApproval,
        };
        if (existingPending) {
          await tx.memberProfileChange.update({
            where: { id: existingPending.id },
            data: { changes: mergedChanges as any },
          });
        } else {
          await tx.memberProfileChange.create({
            data: {
              memberId: member.id,
              institutionalMemberId: member.institutionalMemberId ?? 0,
              status: 'PENDING',
              changes: mergedChanges as any,
            },
          });
        }
      }

      return saved;
    });

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

