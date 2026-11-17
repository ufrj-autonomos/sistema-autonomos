import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { createAreaTask } from '@/lib/areas/service';
import { areaHubErrorResponse } from '@/lib/areas/http';

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/areas/tasks', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    try {
      const created = await createAreaTask(access.user, {
        scopeKey: body?.scopeKey,
        title: body?.title,
        description: body?.description,
        priority: body?.priority,
        dueDate: body?.dueDate,
        referenceUrl: body?.referenceUrl,
        assigneeIds: body?.assigneeIds,
      });
      return NextResponse.json({ success: true, task: created }, { status: 201 });
    } catch (error) {
      return areaHubErrorResponse(error, 'Erro ao criar tarefa na área.');
    }
  });
}
