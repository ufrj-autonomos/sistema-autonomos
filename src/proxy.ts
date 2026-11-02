import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken } from '@/lib/auth';
import { SESSION_COOKIE_NAME } from '@/lib/session-cookie';
import { isPublicPath } from '@/lib/access-policy';
import { allowedRequestOrigins } from '@/lib/environment';

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin');
    let sameOrigin = true;
    try { sameOrigin = !origin || allowedRequestOrigins().includes(new URL(origin).origin); } catch { sameOrigin = false; }
    if (!sameOrigin) {
      return NextResponse.json({ error: 'Origem da solicitação inválida.' }, { status: 403 });
    }
  }
  if (isPublicPath(pathname)) return NextResponse.next();
  try {
    // Proxy is an optimistic cookie/signature check only. Every protected page,
    // Server Action and API performs the live database/session/role authorization.
    // Native database engines must not be loaded by the separate routing function.
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const payload = token ? await verifySessionToken(token) : null;
    if (!payload || typeof payload.sub !== 'string' || !payload.sub || typeof payload.sid !== 'string' || !payload.sid) {
      if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'Autenticação necessária.' }, { status: 401 });
      const url = new URL('/login', req.url);
      url.searchParams.set('redirect', pathname + req.nextUrl.search);
      return NextResponse.redirect(url);
    }
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  } catch (error) {
    console.error('Falha ao verificar acesso:', error);
    return NextResponse.json({ error: 'Não foi possível verificar seu acesso. Tente novamente.' }, { status: 503 });
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|images/|favicon.ico|robots.txt|sitemap.xml).*)'],
};
