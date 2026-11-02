import { readAuthPayload } from '@/lib/auth-request';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { createUserSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '@/lib/session';
import { checkRateLimit, clientAddress, resetRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const blockedAddress = await checkRateLimit(`login-ip:${clientAddress(req)}`, 50, 15 * 60);
    if (blockedAddress) return blockedAddress;
    const payload = await readAuthPayload(req);
    if (payload.error) return payload.error;
    const body = payload.body;
    const { email, password } = body;

    if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || !email.trim() || !password || Buffer.byteLength(password, 'utf8') > 72) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const blockedAccount = await checkRateLimit(`login-account:${normalizedEmail}`, 10, 15 * 60);
    if (blockedAccount) return blockedAccount;
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    if (user.status !== 'APPROVED') {
      const messages = {
        PENDING: 'Sua conta aguarda aprovação de um administrador.',
        REJECTED: 'Seu cadastro não foi aprovado. Entre em contato com a administração.',
        SUSPENDED: 'Sua conta está suspensa. Entre em contato com a administração.',
      };
      return NextResponse.json({ error: messages[user.status], status: user.status }, { status: 403 });
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
    };

    await resetRateLimit(`login-account:${normalizedEmail}`);
    const token = await createUserSession(safeUser);

    const response = NextResponse.json(
      { success: true, user: safeUser },
      { status: 200 }
    );

    response.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return response;
  } catch (error) {
    console.error('Erro no login (/api/auth/login):', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar login.' },
      { status: 500 }
    );
  }
}
