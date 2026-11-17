import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { deleteAreaTask, updateAreaTask } from '@/lib/areas/service';
import { areaHubErrorResponse } from '@/lib/areas/http';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'PATCH /api/areas/tasks/[id]', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
    }

    try {
      const { id } = await context.params;
      const updated = await updateAreaTask(access.user, id, body || {});
      return NextResponse.json({ success: true, task: updated });
    } catch (error) {
      return areaHubErrorResponse(error, 'Erro ao atualizar tarefa da área.');
    }
  });
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return traceApi(req, 'DELETE /api/areas/tasks/[id]', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const { id } = await context.params;
      await deleteAreaTask(access.user, id);
      return NextResponse.json({ success: true });
    } catch (error) {
      return areaHubErrorResponse(error, 'Erro ao excluir tarefa da área.');
    }
  });
}
