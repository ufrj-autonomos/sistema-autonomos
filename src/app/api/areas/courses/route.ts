import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { createAreaCourse } from '@/lib/areas/service';
import { areaHubErrorResponse } from '@/lib/areas/http';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/areas/courses', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    try {
      const created = await createAreaCourse(access.user, {
        scopeKey: body?.scopeKey,
        scopeMode: body?.scopeMode,
        title: body?.title,
        subtitle: body?.subtitle,
        description: body?.description,
        level: body?.level,
        durationHours: body?.durationHours,
        externalUrl: body?.externalUrl,
        initialModuleTitle: body?.initialModuleTitle,
        published: body?.published,
      });
      return NextResponse.json({ success: true, course: created }, { status: 201 });
    } catch (error) {
      return areaHubErrorResponse(error, 'Erro ao criar curso na área.');
    }
  });
}
