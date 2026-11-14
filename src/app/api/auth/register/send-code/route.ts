import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { readAuthPayload } from '@/lib/auth-request';
import { issueOtpChallenge } from '@/lib/auth-challenges';
import { sendSecurityVerificationCodeEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, clientAddress } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/auth/register/send-code', async () => {
    try {
      const blockedIp = await checkRateLimit(`register-code-ip:${clientAddress(req)}`, 20, 15 * 60);
      if (blockedIp) return blockedIp;

      const payload = await readAuthPayload(req);
      if (payload.error) return payload.error;
      const { email, name } = payload.body;

      if (typeof email !== 'string' || !email.trim() || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return NextResponse.json({ error: 'Informe um email válido.' }, { status: 400 });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const blockedEmail = await checkRateLimit(`register-code-email:${normalizedEmail}`, 5, 15 * 60);
      if (blockedEmail) return blockedEmail;

      const existingMember = await prisma.member.findUnique({
        where: { email: normalizedEmail },
        select: { id: true },
      });

      if (existingMember) {
        return NextResponse.json(
          {
            error:
              'Já existe uma conta vinculada a este email. Caso já seja integrante, utilize "Esqueci minha senha" na tela de login.',
          },
          { status: 409 }
        );
      }

      const recipientName =
        typeof name === 'string' && name.trim().length >= 2 ? name.trim().slice(0, 150) : 'Novo Integrante';

      const { code } = await issueOtpChallenge({
        memberId: null,
        email: normalizedEmail,
        scopeKey: `register:${normalizedEmail}`,
        purpose: 'REGISTER_VERIFY',
        ttlMinutes: 15,
      });

      const dispatch = await sendSecurityVerificationCodeEmail({
        purpose: 'REGISTER_VERIFY',
        to: normalizedEmail,
        name: recipientName,
        code,
        expiresInMinutes: 15,
      });

      if (!dispatch.sent && !dispatch.skipped) {
        return NextResponse.json(
          { error: 'Não foi possível enviar o código de validação para este e-mail. Confira o endereço e tente novamente.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Enviamos um código de 6 dígitos para o seu e-mail. Digite-o abaixo para validar seu cadastro.',
        },
        { status: 200 }
      );
    } catch (error) {
      console.error('Erro em POST /api/auth/register/send-code:', error);
      return NextResponse.json(
        { error: 'Não foi possível enviar o código de validação agora. Tente novamente.' },
        { status: 500 }
      );
    }
  });
}
