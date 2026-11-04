import { validateSiteProfileChanges } from '@/lib/site-profile-changes';
import { normalizeMemberArea } from '@/lib/member-fields';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import { translateMemberFieldsPtToEnFr } from '@/lib/translation';
import { calculateAgeFromBirthDate } from '@/lib/birthdays';
import { publishInstitutionalSite } from '@/lib/institutional/publish';

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

    const { changeId, action, reviewNotes, expectedUpdatedAt } = body as {
      changeId?: unknown;
      action?: unknown;
      reviewNotes?: unknown;
      expectedUpdatedAt?: unknown;
    };

    if (typeof changeId !== 'string' || !changeId.trim() || !['APPROVE', 'REJECT'].includes(String(action))) {
      return NextResponse.json({ error: 'Informe o identificador da solicitação e a ação (APPROVE ou REJECT).' }, { status: 400 });
    }

    if (action === 'APPROVE' && !process.env.INSTITUTIONAL_DATABASE_URL) return NextResponse.json({ error: 'O banco institucional está indisponível. A solicitação continua pendente.' }, { status: 503 });
    if (expectedUpdatedAt !== undefined && typeof expectedUpdatedAt !== 'string') return NextResponse.json({ error: 'Versão da solicitação inválida.' }, { status: 400 });

    return await prisma.$transaction(async tx => {
      // Use the same member -> request lock order as profile submission.
      const owner = await tx.memberProfileChange.findUnique({ where: { id: changeId }, select: { memberId: true } });
      if (!owner) return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
      await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${owner.memberId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "MemberProfileChange" WHERE id = ${changeId} FOR UPDATE`;
      const pending = await tx.memberProfileChange.findUnique({
        where: { id: changeId },
        include: { member: true },
      });

      if (!pending || pending.status !== 'PENDING') {
        return NextResponse.json({ error: 'Solicitação não encontrada ou já processada.' }, { status: 404 });
      }

      if (expectedUpdatedAt && expectedUpdatedAt !== pending.updatedAt.toISOString()) return NextResponse.json({ error: 'O integrante atualizou esta solicitação. Atualize a página e confira os novos valores antes de revisar.' }, { status: 409 });

      const now = new Date();
      const cleanNotes = typeof reviewNotes === 'string' && reviewNotes.trim() ? reviewNotes.trim().slice(0, 1000) : null;

      if (action === 'REJECT') {
        await tx.memberProfileChange.update({
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
      let allowedUpdate: Record<string, unknown>;
      try { allowedUpdate = { ...validateSiteProfileChanges(pending.changes) }; }
      catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Alterações inválidas.' }, { status: 400 }); }
      if (!Object.keys(allowedUpdate).length) return NextResponse.json({ error: 'Esta solicitação não contém alterações válidas.' }, { status: 400 });

      const translations = await translateMemberFieldsPtToEnFr({
        bio: 'bio' in allowedUpdate ? typeof allowedUpdate.bio === 'string' ? allowedUpdate.bio : '' : undefined,
        course: 'course' in allowedUpdate ? typeof allowedUpdate.course === 'string' ? allowedUpdate.course : '' : undefined,
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
              role: 'Membro',
              area: normalizeMemberArea(pending.member.area) || 'Não informada',
              active: true,
              showOnSite: false,
              ...allowedUpdate,
            },
          });
          instId = createdInst.id;
          await tx.member.update({
            where: { id: pending.member.id },
            data: { institutionalMemberId: instId },
          });
        }
      }

      await tx.memberProfileChange.update({
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
    }, { maxWait: 10000, timeout: 60000 });
  } catch (error) {
    console.error('Erro em POST /api/admin/profile-changes:', error);
    return NextResponse.json({ error: 'Não foi possível processar a revisão das alterações.' }, { status: 500 });
  }
}

