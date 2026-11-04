import { traceApi } from '@/lib/activity/server';
import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { readAuthPayload } from '@/lib/auth-request';
import { prisma } from '@/lib/prisma';
import { hashPassword, hashVerificationCode } from '@/lib/auth';
import { checkRateLimit, clientAddress, resetRateLimit } from '@/lib/rate-limit';

const MAX_CHALLENGE_ATTEMPTS = 5;

export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/auth/reset-password", async () => {
  try {
    const blockedIp = await checkRateLimit(`reset-ip:${clientAddress(req)}`, 30, 15 * 60);
    if (blockedIp) return blockedIp;

    const payload = await readAuthPayload(req);
    if (payload.error) return payload.error;
    const { email, code, password } = payload.body;

    if (
      typeof email !== 'string' ||
      !email.trim() ||
      email.length > 254 ||
      typeof code !== 'string' ||
      !/^\d{6}$/.test(code.trim()) ||
      typeof password !== 'string'
    ) {
      return NextResponse.json(
        { error: 'Informe o email, o código de 6 dígitos e a nova senha.' },
        { status: 400 }
      );
    }

    if (password.length < 6 || Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json(
        { error: 'A senha deve conter no mínimo 6 caracteres e no máximo 72 bytes.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();
    const blockedAccount = await checkRateLimit(`reset-account:${normalizedEmail}`, 10, 15 * 60);
    if (blockedAccount) return blockedAccount;

    const member = await prisma.member.findUnique({
      where: { email: normalizedEmail },
    });

    if (!member || member.status === 'REJECTED' || member.status === 'SUSPENDED') {
      return NextResponse.json({ error: 'Código inválido ou expirado.' }, { status: 400 });
    }

    const challenge = await prisma.authChallenge.findFirst({
      where: {
        memberId: member.id,
        purpose: 'PASSWORD_RESET',
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge || challenge.attempts >= MAX_CHALLENGE_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Código inválido ou expirado. Solicite um novo código.' },
        { status: 400 }
      );
    }

    const expectedHash = hashVerificationCode(member.id, cleanCode);
    const matches =
      expectedHash.length === challenge.codeHash.length &&
      timingSafeEqual(Buffer.from(expectedHash), Buffer.from(challenge.codeHash));

    if (!matches) {
      const nextAttempts = challenge.attempts + 1;
      await prisma.authChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts: nextAttempts,
          ...(nextAttempts >= MAX_CHALLENGE_ATTEMPTS ? { consumedAt: new Date() } : {}),
        },
      });
      return NextResponse.json(
        { error: 'Código incorreto. Confira os dígitos enviados ao seu email.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const now = new Date();

    await prisma.$transaction([
      prisma.authChallenge.update({
        where: { id: challenge.id },
        data: { consumedAt: now },
      }),
      prisma.memberCredential.upsert({
        where: { memberId: member.id },
        create: { memberId: member.id, passwordHash, passwordChangedAt: now },
        update: { passwordHash, passwordChangedAt: now },
      }),
      // Revoke active sessions so any compromised session is terminated on password change
      prisma.session.deleteMany({
        where: { memberId: member.id },
      }),
    ]);

    await resetRateLimit(`reset-account:${normalizedEmail}`);
    await resetRateLimit(`login-account:${normalizedEmail}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Senha atualizada com sucesso! Agora você já pode entrar na plataforma.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erro em POST /api/auth/reset-password:', error);
    return NextResponse.json(
      { error: 'Erro interno ao redefinir a senha.' },
      { status: 500 }
    );
  }

  });
}

