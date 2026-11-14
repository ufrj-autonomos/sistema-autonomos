import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { issueOtpChallenge } from '@/lib/auth-challenges';
import { sendSecurityVerificationCodeEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { authorizeApi } from '@/lib/session';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/profile/security/email/send-code', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const blocked = await checkRateLimit(`profile-email-code:${access.user.id}`, 5, 15 * 60);
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

      const { newEmail } = body as { newEmail?: unknown };
      if (
        typeof newEmail !== 'string' ||
        !newEmail.trim() ||
        newEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())
      ) {
        return NextResponse.json({ error: 'Informe um novo e-mail válido.' }, { status: 400 });
      }

      const normalizedNewEmail = newEmail.toLowerCase().trim();
      const member = await prisma.member.findUnique({
        where: { id: access.user.id },
        select: { id: true, name: true, email: true },
      });

      if (!member) {
        return NextResponse.json({ error: 'Integrante não encontrado.' }, { status: 404 });
      }

      if (member.email?.toLowerCase().trim() === normalizedNewEmail) {
        return NextResponse.json(
          { error: 'O novo e-mail precisa ser diferente do e-mail atual.' },
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

      const pendingOther = await prisma.emailChangeRequest.findFirst({
        where: {
          newEmail: normalizedNewEmail,
          status: 'PENDING',
          memberId: { not: member.id },
        },
        select: { id: true },
      });
      if (pendingOther) {
        return NextResponse.json(
          { error: 'Já existe uma solicitação pendente de outro integrante para este e-mail.' },
          { status: 409 }
        );
      }

      const { code } = await issueOtpChallenge({
        memberId: member.id,
        email: normalizedNewEmail,
        scopeKey: `${member.id}:${normalizedNewEmail}`,
        purpose: 'PROFILE_EMAIL_CHANGE',
        ttlMinutes: 15,
      });

      const dispatch = await sendSecurityVerificationCodeEmail({
        purpose: 'PROFILE_EMAIL_CHANGE',
        to: normalizedNewEmail,
        targetEmail: normalizedNewEmail,
        name: member.name,
        code,
        expiresInMinutes: 15,
      });

      if (!dispatch.sent && !dispatch.skipped) {
        return NextResponse.json(
          { error: 'Não foi possível enviar o código de verificação para o novo e-mail.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Código de 6 dígitos enviado para ${normalizedNewEmail}. Confirme-o abaixo para encaminhar a solicitação à Gestão.`,
      });
    } catch (error) {
      console.error('Erro em POST /api/profile/security/email/send-code:', error);
      return NextResponse.json(
        { error: 'Não foi possível enviar o código agora. Tente novamente.' },
        { status: 500 }
      );
    }
  });
}
