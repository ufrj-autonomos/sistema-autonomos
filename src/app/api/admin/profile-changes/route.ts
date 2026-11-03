import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import { translateMemberFieldsPtToEnFr } from '@/lib/translation';
import { calculateAgeFromBirthDate } from '@/lib/birthdays';
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
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    const changes = await prisma.memberProfileChange.findMany({
      where: { status: 'PENDING' },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            institutionalMemberId: true,
            birthDate: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ changes }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro em GET /api/admin/profile-changes:', error);
    return NextResponse.json({ error: 'Não foi possível listar as alterações pendentes.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const { changeId, action, reviewNotes } = body as {
      changeId?: unknown;
      action?: unknown;
      reviewNotes?: unknown;
    };

    if (typeof changeId !== 'string' || !changeId.trim() || !['APPROVE', 'REJECT'].includes(String(action))) {
      return NextResponse.json({ error: 'Informe o identificador da solicitação e a ação (APPROVE ou REJECT).' }, { status: 400 });
    }

    const pending = await prisma.memberProfileChange.findUnique({
      where: { id: changeId },
      include: { member: true },
    });

    if (!pending || pending.status !== 'PENDING') {
      return NextResponse.json({ error: 'Solicitação não encontrada ou já processada.' }, { status: 404 });
    }

    const now = new Date();
    const cleanNotes = typeof reviewNotes === 'string' && reviewNotes.trim() ? reviewNotes.trim().slice(0, 1000) : null;

    if (action === 'REJECT') {
      await prisma.memberProfileChange.update({
        where: { id: pending.id },
        data: {
          status: 'REJECTED',
          reviewedById: access.user.id,
          reviewedAt: now,
          reviewNote: cleanNotes,
        },
      });
      return NextResponse.json({
        success: true,
        status: 'REJECTED',
        message: `Alterações de ${pending.member.name} recusadas.`,
      });
    }

    // APPROVE flow: apply validated changes to InstitutionalMember, auto-translate bio/course/role, update age, and publish
    const rawChanges = (pending.changes && typeof pending.changes === 'object' && !Array.isArray(pending.changes))
      ? (pending.changes as Record<string, unknown>)
      : {};

    const allowedUpdate: Record<string, unknown> = {};
    for (const key of SITE_PROPOSED_KEYS) {
      if (key in rawChanges) {
        allowedUpdate[key] = rawChanges[key];
      }
    }

    const translations = await translateMemberFieldsPtToEnFr({
      bio: typeof allowedUpdate.bio === 'string' ? allowedUpdate.bio : undefined,
      course: typeof allowedUpdate.course === 'string' ? allowedUpdate.course : undefined,
    });
    Object.assign(allowedUpdate, translations);

    const derivedAge = calculateAgeFromBirthDate(pending.member.birthDate, now);
    if (derivedAge !== null) {
      allowedUpdate.age = derivedAge;
    }

    let instId = pending.member.institutionalMemberId;
    if (process.env.INSTITUTIONAL_DATABASE_URL) {
      if (instId) {
        await institutionalDb.institutionalMember.update({
          where: { id: instId },
          data: allowedUpdate,
        });
      } else {
        const createdInst = await institutionalDb.institutionalMember.create({
          data: {
            name: typeof allowedUpdate.name === 'string' && allowedUpdate.name ? allowedUpdate.name : pending.member.name,
            role: 'Integrante',
            area: pending.member.area || 'Software',
            active: true,
            showOnSite: false,
            ...allowedUpdate,
          },
        });
        instId = createdInst.id;
        await prisma.member.update({
          where: { id: pending.member.id },
          data: { institutionalMemberId: instId },
        });
      }
    }

    await prisma.memberProfileChange.update({
      where: { id: pending.id },
      data: {
        status: 'APPROVED',
        reviewedById: access.user.id,
        reviewedAt: now,
        reviewNote: cleanNotes,
      },
    });

    const warning = await publishInstitutionalSite();

    return NextResponse.json({
      success: true,
      status: 'APPROVED',
      warning,
      message: `Alterações de ${pending.member.name} aprovadas e aplicadas ao site institucional.`,
    });
  } catch (error) {
    console.error('Erro em POST /api/admin/profile-changes:', error);
    return NextResponse.json({ error: 'Não foi possível processar a revisão das alterações.' }, { status: 500 });
  }
}

