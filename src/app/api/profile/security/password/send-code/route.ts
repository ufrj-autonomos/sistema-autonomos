import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { issueOtpChallenge } from '@/lib/auth-challenges';
import { sendSecurityVerificationCodeEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit } from '@/lib/rate-limit';
import { authorizeApi } from '@/lib/session';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/profile/security/password/send-code', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const blocked = await checkRateLimit(`profile-pw-code:${access.user.id}`, 5, 15 * 60);
      if (blocked) return blocked;

      const member = await prisma.member.findUnique({
        where: { id: access.user.id },
        select: { id: true, name: true, email: true },
      });

      if (!member?.email) {
        return NextResponse.json(
          { error: 'Seu cadastro ainda não possui um e-mail vinculado para receber o código.' },
          { status: 400 }
        );
      }

      const targetEmail = member.email.toLowerCase().trim();
      const { code } = await issueOtpChallenge({
        memberId: member.id,
        email: targetEmail,
        scopeKey: member.id,
        purpose: 'PROFILE_PASSWORD_CHANGE',
        ttlMinutes: 15,
      });

      const dispatch = await sendSecurityVerificationCodeEmail({
        purpose: 'PROFILE_PASSWORD_CHANGE',
        to: targetEmail,
        name: member.name,
        code,
        expiresInMinutes: 15,
      });

      if (!dispatch.sent && !dispatch.skipped) {
        return NextResponse.json(
          { error: 'Falha ao enviar código de confirmação para seu e-mail.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Código de 6 dígitos enviado para ${targetEmail}.`,
      });
    } catch (error) {
      console.error('Erro em POST /api/profile/security/password/send-code:', error);
      return NextResponse.json(
        { error: 'Não foi possível enviar o código agora. Tente novamente.' },
        { status: 500 }
      );
    }
  });
}
