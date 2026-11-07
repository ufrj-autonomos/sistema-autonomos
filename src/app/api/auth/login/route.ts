import { traceApi } from '@/lib/activity/server';
import { readAuthPayload } from '@/lib/auth-request';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth';
import { createUserSession, SESSION_COOKIE_NAME, sessionCookieOptions, TeamSlug } from '@/lib/session';
import { checkRateLimit, clientAddress, resetRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/auth/login", async () => {
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
    const member = await prisma.member.findUnique({
      where: { email: normalizedEmail },
      include: { credential: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    const storedPasswordHash =
      member.credential?.passwordHash ??
      (member as unknown as { passwordHash?: string | null }).passwordHash ??
      null;

    if (!storedPasswordHash) {
      return NextResponse.json(
        {
          error: 'Você ainda não definiu sua senha. Utilize "Esqueci minha senha" para receber o código de primeiro acesso no seu email.',
          needsPasswordSetup: true,
        },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, storedPasswordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Credenciais inválidas.' },
        { status: 401 }
      );
    }

    if (member.status !== 'APPROVED') {
      const messages = {
        PENDING: 'Sua conta aguarda aprovação de um administrador.',
        REJECTED: 'Seu cadastro não foi aprovado. Entre em contato com a administração.',
        SUSPENDED: 'Sua conta está suspensa. Entre em contato com a administração.',
      };
      return NextResponse.json({ error: messages[member.status], status: member.status }, { status: 403 });
    }

    const teamSlug: TeamSlug = member.teamId === 1 ? 'nautilus' : member.teamId === 2 ? 'harpia' : 'autonomos';
    const safeUser = {
      id: member.id,
      email: member.email || normalizedEmail,
      name: member.name,
      role: member.role,
      status: member.status,
      avatar: member.avatar,
      area: member.area,
      teamId: member.teamId,
      teamSlug,
      institutionalMemberId: member.institutionalMemberId,
      profileCompletedAt: member.profileCompletedAt,
    };

    await resetRateLimit(`login-account:${normalizedEmail}`);
    const token = await createUserSession(safeUser);

    const response = NextResponse.json(
      {
        success: true,
        user: safeUser,
        firstLogin: !member.profileCompletedAt,
      },
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

  });
}
