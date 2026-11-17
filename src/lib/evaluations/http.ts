import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import type { SafeUser } from '@/lib/session';
import { hasEffectiveRole } from '@/lib/access-policy';
import { EvaluationError, canAccessEvaluations } from './service';

export async function authorizeEvaluationsApi(
  req: NextRequest,
  options: { adminOnly?: boolean } = {}
): Promise<{ user: SafeUser; error: null } | { user: null; error: NextResponse }> {
  const access = await authorizeApi(req, true);
  if (access.error) return access;

  if (options.adminOnly && !hasEffectiveRole(access.user, 'ADMIN')) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Apenas administradores podem realizar esta ação.' },
        { status: 403 }
      ),
    };
  }

  if (!canAccessEvaluations(access.user)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Acesso restrito a coordenadores e administradores.' },
        { status: 403 }
      ),
    };
  }

  return access;
}

export function evaluationErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof EvaluationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error('[evaluations]', error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
