import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { hashPassword } from '@/lib/auth';
import { verifyOtpChallenge } from '@/lib/auth-challenges';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';
import { authorizeApi } from '@/lib/session';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/profile/security/password/confirm', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const blocked = await checkRateLimit(`profile-pw-confirm:${access.user.id}`, 10, 15 * 60);
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

      const { code, newPassword } = body as { code?: unknown; newPassword?: unknown };
      if (typeof code !== 'string' || !/^\d{6}$/.test(code.trim())) {
        return NextResponse.json(
          { error: 'Informe o código de confirmação de 6 dígitos.' },
          { status: 400 }
        );
      }

      if (
        typeof newPassword !== 'string' ||
        newPassword.length < 6 ||
        Buffer.byteLength(newPassword, 'utf8') > 72
      ) {
        return NextResponse.json(
          { error: 'A nova senha deve conter entre 6 caracteres e 72 bytes.' },
          { status: 400 }
        );
      }

      const member = await prisma.member.findUnique({
        where: { id: access.user.id },
        select: { id: true, email: true },
      });

      if (!member?.email) {
        return NextResponse.json(
          { error: 'Seu cadastro não possui um e-mail vinculado.' },
          { status: 400 }
        );
      }

      const normalizedEmail = member.email.toLowerCase().trim();
      const verified = await verifyOtpChallenge({
        memberId: member.id,
        email: normalizedEmail,
        scopeKey: member.id,
        purpose: 'PROFILE_PASSWORD_CHANGE',
        code: code.trim(),
        consume: true,
      });

      if (!verified.ok) {
        return NextResponse.json({ error: verified.error }, { status: 400 });
      }

      const passwordHash = await hashPassword(newPassword);
      const now = new Date();

      await prisma.memberCredential.upsert({
        where: { memberId: member.id },
        create: { memberId: member.id, passwordHash, passwordChangedAt: now },
        update: { passwordHash, passwordChangedAt: now },
      });

      await resetRateLimit(`profile-pw-confirm:${access.user.id}`);

      return NextResponse.json({
        success: true,
        message: 'Sua senha foi alterada com sucesso!',
      });
    } catch (error) {
      console.error('Erro em POST /api/profile/security/password/confirm:', error);
      return NextResponse.json(
        { error: 'Não foi possível atualizar a senha agora. Tente novamente.' },
        { status: 500 }
      );
    }
  });
}
