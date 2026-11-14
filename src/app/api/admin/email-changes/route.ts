import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { sendEmailChangeStatusEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { authorizeApi } from '@/lib/session';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/admin/email-changes', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const requests = await prisma.emailChangeRequest.findMany({
        where: { status: 'PENDING' },
        include: {
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              area: true,
              institutionalMemberId: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json(
        {
          requests: requests.map((item) => ({
            id: item.id,
            memberId: item.memberId,
            memberName: item.member.name,
            memberArea: item.member.area,
            institutionalMemberId: item.member.institutionalMemberId,
            currentEmail: item.currentEmail || item.member.email || '',
            newEmail: item.newEmail,
            createdAt: item.createdAt.toISOString(),
          })),
        },
        { headers: { 'Cache-Control': 'private, no-store' } }
      );
    } catch (error) {
      console.error('Erro em GET /api/admin/email-changes:', error);
      return NextResponse.json(
        { error: 'Não foi possível listar as solicitações de alteração de e-mail.' },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/admin/email-changes', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
      }

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
      }

      const { requestId, action, reviewNotes } = body as {
        requestId?: unknown;
        action?: unknown;
        reviewNotes?: unknown;
      };

      if (
        typeof requestId !== 'string' ||
        !requestId.trim() ||
        !['APPROVE', 'REJECT'].includes(String(action))
      ) {
        return NextResponse.json(
          { error: 'Informe o identificador da solicitação e a ação (APPROVE ou REJECT).' },
          { status: 400 }
        );
      }

      const cleanNotes =
        typeof reviewNotes === 'string' && reviewNotes.trim()
          ? reviewNotes.trim().slice(0, 500)
          : null;

      type ReviewTxResult =
        | { ok: false; errorResponse: NextResponse }
        | {
            ok: true;
            approved: boolean;
            memberName: string;
            previousEmail: string;
            newEmail: string;
            notifyTo: string;
          };

      const result: ReviewTxResult = await prisma.$transaction(async (tx): Promise<ReviewTxResult> => {
        const ref = await tx.emailChangeRequest.findUnique({
          where: { id: requestId },
          select: { memberId: true },
        });
        if (!ref) {
          return {
            ok: false,
            errorResponse: NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 }),
          };
        }

        await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${ref.memberId} FOR UPDATE`;
        await tx.$queryRaw`SELECT id FROM "EmailChangeRequest" WHERE id = ${requestId} FOR UPDATE`;

        const pending = await tx.emailChangeRequest.findUnique({
          where: { id: requestId },
          include: { member: true },
        });

        if (!pending || pending.status !== 'PENDING') {
          return {
            ok: false,
            errorResponse: NextResponse.json(
              { error: 'Solicitação não encontrada ou já processada.' },
              { status: 404 }
            ),
          };
        }

        const now = new Date();
        if (action === 'REJECT') {
          await tx.emailChangeRequest.update({
            where: { id: pending.id },
            data: {
              status: 'REJECTED',
              reviewedById: access.user.id,
              reviewedAt: now,
              reviewNote: cleanNotes,
            },
          });

          return {
            ok: true,
            approved: false,
            memberName: pending.member.name,
            previousEmail: pending.currentEmail || pending.member.email || '',
            newEmail: pending.newEmail,
            notifyTo: pending.currentEmail || pending.member.email || pending.newEmail,
          };
        }

        const conflict = await tx.member.findFirst({
          where: { email: pending.newEmail, id: { not: pending.memberId } },
          select: { id: true },
        });
        if (conflict) {
          return {
            ok: false,
            errorResponse: NextResponse.json(
              { error: 'Este novo e-mail já está em uso por outro integrante.' },
              { status: 409 }
            ),
          };
        }

        await tx.member.update({
          where: { id: pending.memberId },
          data: { email: pending.newEmail },
        });

        await tx.emailChangeRequest.update({
          where: { id: pending.id },
          data: {
            status: 'APPROVED',
            reviewedById: access.user.id,
            reviewedAt: now,
            reviewNote: cleanNotes,
          },
        });

        return {
          ok: true,
          approved: true,
          memberName: pending.member.name,
          previousEmail: pending.currentEmail || pending.member.email || '',
          newEmail: pending.newEmail,
          notifyTo: pending.newEmail,
        };
      });

      if (!result.ok) return result.errorResponse;

      await sendEmailChangeStatusEmail(result.notifyTo, {
        recipientName: result.memberName,
        previousEmail: result.previousEmail,
        newEmail: result.newEmail,
        approved: result.approved,
        reviewNotes: cleanNotes,
      });

      return NextResponse.json({
        success: true,
        status: result.approved ? 'APPROVED' : 'REJECTED',
        message: result.approved
          ? `E-mail de ${result.memberName} atualizado para ${result.newEmail}.`
          : `Solicitação de alteração de e-mail de ${result.memberName} recusada.`,
      });
    } catch (error) {
      console.error('Erro em POST /api/admin/email-changes:', error);
      return NextResponse.json(
        { error: 'Erro ao processar solicitação de alteração de e-mail.' },
        { status: 500 }
      );
    }
  });
}
