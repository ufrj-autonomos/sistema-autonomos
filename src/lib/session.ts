import { rememberActivityActor } from './activity/context';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { createSessionToken, verifySessionToken, SessionPayload } from './auth';
import { hasManagementAccess } from './access-policy';
import { prisma } from './prisma';

import { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './session-cookie';
export { SESSION_COOKIE_NAME, SESSION_MAX_AGE } from './session-cookie';
export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  status: true,
  avatar: true,
  area: true,
  teamId: true,
  institutionalMemberId: true,
  profileCompletedAt: true,
} as const;
export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: SESSION_MAX_AGE,
  path: '/',
};

export type TeamSlug = 'nautilus' | 'harpia' | 'autonomos';

export interface SafeUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  avatar?: string | null;
  area?: string | null;
  teamId?: number | null;
  teamSlug?: TeamSlug;
  institutionalMemberId?: number | null;
  profileCompletedAt?: Date | string | null;
}

export async function readSessionToken(req?: NextRequest) {
  if (req) return req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

// JWT identity alone never grants access: sessions, approval and roles are read live.
export async function getCurrentUser(req?: NextRequest): Promise<SafeUser | null> {
  const token = await readSessionToken(req);
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload?.sub || typeof payload.sid !== 'string') return null;
  const session = await prisma.session.findUnique({
    where: { sessionToken: payload.sid },
    include: { member: { select: safeUserSelect } },
  });
  const sessionAny = session as unknown as {
    memberId?: string;
    userId?: string;
    expiresAt: Date;
    member?: SafeUser | null;
    user?: SafeUser | null;
  } | null;
  if (!sessionAny || sessionAny.expiresAt <= new Date()) return null;
  const ownerId = sessionAny.memberId ?? sessionAny.userId;
  const member = sessionAny.member ?? sessionAny.user;
  if (!member || ownerId !== payload.sub) return null;
  if (member.status !== 'APPROVED') return null;
  const teamSlug: TeamSlug = member.teamId === 1 ? 'nautilus' : member.teamId === 2 ? 'harpia' : 'autonomos';
  const user: SafeUser = { ...member, email: member.email || '', teamSlug };
  rememberActivityActor(user);
  return user;
}

export async function getSession(): Promise<SessionPayload | null> {
  const user = await getCurrentUser();
  return user ? { ...user, sub: user.id, userId: user.id } : null;
}

export async function createUserSession(user: SafeUser) {
  const sid = randomUUID();
  const token = await createSessionToken({ sub: user.id, email: user.email, name: user.name, role: user.role, sid });
  await prisma.session.create({
    data: { sessionToken: sid, memberId: user.id, expiresAt: new Date(Date.now() + SESSION_MAX_AGE * 1000) },
  });
  return token;
}

export async function requirePageUser(managementOnly = false) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (managementOnly && !hasManagementAccess(user.role)) redirect('/');
  return user;
}

export async function authorizeApi(req: NextRequest, managementOnly = false) {
  const user = await getCurrentUser(req);
  if (!user) return { user: null, error: NextResponse.json({ error: 'Entre com uma conta aprovada para continuar.' }, { status: 401 }) };
  if (managementOnly && !hasManagementAccess(user.role)) return { user: null, error: NextResponse.json({ error: 'Acesso exclusivo para Gestão e Admin.' }, { status: 403 }) };
  return { user, error: null };
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, '', { ...sessionCookieOptions, maxAge: 0 });
}

export async function requireAdminPageUser() {
  const user = await requirePageUser();
  if (user.role !== 'ADMIN') redirect('/gestao');
  return user;
}
export async function authorizeAdminApi(req: NextRequest) {
  const access = await authorizeApi(req);
  if (access.error) return access;
  if (access.user.role !== 'ADMIN') return { user: null, error: NextResponse.json({ error: 'Acesso exclusivo para Admin.' }, { status: 403 }) };
  return access;
}
