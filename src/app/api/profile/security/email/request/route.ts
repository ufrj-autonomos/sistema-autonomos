import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { verifyOtpChallenge } from '@/lib/auth-challenges';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { authorizeApi } from '@/lib/session';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/profile/security/email/request', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const blocked = await checkRateLimit(`profile-email-confirm:${access.user.id}`, 10, 15 * 60);
      if (blocked) return blocked;

      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return NextResponse.json({ error: 'Formato JSON inválido.' }, { status: 400 });
      }

      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
      }

      const { newEmail, code } = body as { newEmail?: unknown; code?: unknown };
      if (
        typeof newEmail !== 'string' ||
        !newEmail.trim() ||
        newEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim()) ||
        typeof code !== 'string' ||
        !/^\d{6}$/.test(code.trim())
      ) {
        return NextResponse.json(
          { error: 'Informe o novo e-mail válido e o código de 6 dígitos.' },
          { status: 400 }
        );
      }

      const normalizedNewEmail = newEmail.toLowerCase().trim();
      const member = await prisma.member.findUnique({
        where: { id: access.user.id },
        select: { id: true, email: true },
      });

      if (!member) {
        return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 });
      }

      if (member.email?.toLowerCase().trim() === normalizedNewEmail) {
        return NextResponse.json(
          { error: 'O novo e-mail precisa ser diferente do atual.' },
          { status: 400 }
        );
      }

      const existingOwner = await prisma.member.findFirst({
        where: { email: normalizedNewEmail, id: { not: member.id } },
        select: { id: true },
      });
      if (existingOwner) {
        return NextResponse.json(
          { error: 'Este e-mail já está vinculado a outro integrante.' },
          { status: 409 }
        );
      }

      const verified = await verifyOtpChallenge({
        memberId: member.id,
        email: normalizedNewEmail,
        scopeKey: `${member.id}:${normalizedNewEmail}`,
        purpose: 'PROFILE_EMAIL_CHANGE',
        code: code.trim(),
        consume: false,
      });

      if (!verified.ok) {
        return NextResponse.json({ error: verified.error }, { status: 400 });
      }

      const now = new Date();
      const created = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Member" WHERE id = ${member.id} FOR UPDATE`;

        await tx.authChallenge.update({
          where: { id: verified.challengeId },
          data: { consumedAt: now },
        });

        await tx.emailChangeRequest.updateMany({
          where: { memberId: member.id, status: 'PENDING' },
          data: {
            status: 'REJECTED',
            reviewedById: member.id,
            reviewedAt: now,
            reviewNote: 'Substituída por nova solicitação do integrante.',
          },
        });

        return tx.emailChangeRequest.create({
          data: {
            memberId: member.id,
            currentEmail: member.email || '',
            newEmail: normalizedNewEmail,
            status: 'PENDING',
          },
        });
      });

      await resetRateLimit(`profile-email-confirm:${access.user.id}`);

      return NextResponse.json({
        success: true,
        pendingEmailChange: {
          id: created.id,
          currentEmail: created.currentEmail,
          newEmail: created.newEmail,
          createdAt: created.createdAt.toISOString(),
        },
        message:
          'Novo e-mail validado com sucesso! Sua solicitação foi enviada para aprovação da Gestão na tela de Integrantes.',
      });
    } catch (error) {
      console.error('Erro em POST /api/profile/security/email/request:', error);
      return NextResponse.json(
        { error: 'Não foi possível registrar a solicitação de troca de e-mail.' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(req: NextRequest) {
  return traceApi(req, 'DELETE /api/profile/security/email/request', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const now = new Date();
      await prisma.emailChangeRequest.updateMany({
        where: { memberId: access.user.id, status: 'PENDING' },
        data: {
          status: 'REJECTED',
          reviewedById: access.user.id,
          reviewedAt: now,
          reviewNote: 'Solicitação cancelada pelo integrante.',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Solicitação de troca de e-mail cancelada.',
      });
    } catch (error) {
      console.error('Erro em DELETE /api/profile/security/email/request:', error);
      return NextResponse.json(
        { error: 'Não foi possível cancelar a solicitação.' },
        { status: 500 }
      );
    }
  });
}
