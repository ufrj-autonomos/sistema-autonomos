import { randomInt } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { readAuthPayload } from '@/lib/auth-request';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, clientAddress } from '@/lib/rate-limit';
import { sendPasswordResetCodeEmail } from '@/lib/email';
import { hashVerificationCode } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const blockedIp = await checkRateLimit(`forgot-ip:${clientAddress(req)}`, 20, 15 * 60);
    if (blockedIp) return blockedIp;

    const payload = await readAuthPayload(req);
    if (payload.error) return payload.error;
    const { email } = payload.body;

    if (typeof email !== 'string' || !email.trim() || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: 'Informe um email válido.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const blockedEmail = await checkRateLimit(`forgot-email:${normalizedEmail}`, 5, 15 * 60);
    if (blockedEmail) return blockedEmail;

    const member = await prisma.member.findUnique({
      where: { email: normalizedEmail },
    });

    const genericSuccess = NextResponse.json(
      {
        success: true,
        message: 'Se este email estiver vinculado a um integrante ativo, um código de 6 dígitos foi enviado.',
      },
      { status: 200 }
    );

    if (!member || member.status === 'REJECTED' || member.status === 'SUSPENDED') {
      return genericSuccess;
    }

    const code = String(randomInt(100000, 1000000));
    const codeHash = hashVerificationCode(member.id, code);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.$transaction([
      prisma.authChallenge.updateMany({
        where: { memberId: member.id, purpose: 'PASSWORD_RESET', consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      prisma.authChallenge.create({
        data: {
          memberId: member.id,
          email: normalizedEmail,
          purpose: 'PASSWORD_RESET',
          codeHash,
          expiresAt,
        },
      }),
    ]);

    await sendPasswordResetCodeEmail({
      to: normalizedEmail,
      name: member.name,
      code,
      expiresInMinutes: 15,
    });

    return genericSuccess;
  } catch (error) {
    console.error('Erro em POST /api/auth/forgot-password:', error);
    return NextResponse.json(
      { error: 'Não foi possível enviar o código no momento. Tente novamente em instantes.' },
      { status: 500 }
    );
  }
}

