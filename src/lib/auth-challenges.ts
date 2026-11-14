import { randomInt, timingSafeEqual } from 'node:crypto';
import { prisma } from './prisma';
import { hashVerificationCode } from './auth';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_TTL_MINUTES = 15;

export type OtpPurpose =
  | 'PASSWORD_RESET'
  | 'REGISTER_VERIFY'
  | 'PROFILE_PASSWORD_CHANGE'
  | 'PROFILE_EMAIL_CHANGE';

/**
 * Generates a fresh 6-digit verification code, invalidating prior active
 * challenges for the same email/member and purpose.
 */
export async function issueOtpChallenge(params: {
  memberId?: string | null;
  email: string;
  scopeKey: string;
  purpose: OtpPurpose;
  ttlMinutes?: number;
}): Promise<{ code: string; expiresAt: Date }> {
  const ttlMinutes = params.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const code = String(randomInt(100000, 1000000));
  const codeHash = hashVerificationCode(params.scopeKey, code);
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);
  const now = new Date();

  await prisma.$transaction([
    prisma.authChallenge.updateMany({
      where: {
        email: params.email,
        purpose: params.purpose,
        ...(params.memberId ? { memberId: params.memberId } : {}),
        consumedAt: null,
      },
      data: { consumedAt: now },
    }),
    prisma.authChallenge.create({
      data: {
        memberId: params.memberId ?? null,
        email: params.email,
        purpose: params.purpose,
        codeHash,
        expiresAt,
      },
    }),
  ]);

  return { code, expiresAt };
}

/**
 * Verifies a 6-digit OTP code using constant-time comparison and enforces a
 * maximum number of failed verification attempts.
 */
export async function verifyOtpChallenge(params: {
  memberId?: string | null;
  email: string;
  scopeKey: string;
  purpose: OtpPurpose;
  code: string;
  consume?: boolean;
  maxAttempts?: number;
}): Promise<
  | { ok: true; challengeId: string }
  | { ok: false; error: string }
> {
  const maxAttempts = params.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const cleanCode = params.code.trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return { ok: false, error: 'Informe o código de verificação de 6 dígitos.' };
  }

  const challenge = await prisma.authChallenge.findFirst({
    where: {
      email: params.email,
      purpose: params.purpose,
      ...(params.memberId !== undefined ? { memberId: params.memberId } : {}),
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!challenge || challenge.attempts >= maxAttempts) {
    return { ok: false, error: 'Código inválido ou expirado. Solicite um novo código.' };
  }

  const expectedHash = hashVerificationCode(params.scopeKey, cleanCode);
  const matches =
    expectedHash.length === challenge.codeHash.length &&
    timingSafeEqual(Buffer.from(expectedHash), Buffer.from(challenge.codeHash));

  if (!matches) {
    const nextAttempts = challenge.attempts + 1;
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts: nextAttempts,
        ...(nextAttempts >= maxAttempts ? { consumedAt: new Date() } : {}),
      },
    });
    return {
      ok: false,
      error: 'Código incorreto. Confira os 6 dígitos enviados para o e-mail.',
    };
  }

  if (params.consume !== false) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: new Date() },
    });
  }

  return { ok: true, challengeId: challenge.id };
}
