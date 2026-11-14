import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import {
  deleteUserNotification,
  listUserNotifications,
  markNotificationsRead,
} from '@/lib/notifications';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/notifications', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const limitParam = Number(req.nextUrl.searchParams.get('limit') || '30');
      const data = await listUserNotifications(
        access.user.id,
        Number.isFinite(limitParam) ? limitParam : 30
      );
      return NextResponse.json(data);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      return NextResponse.json(
        { error: 'Não foi possível carregar suas notificações.' },
        { status: 500 }
      );
    }
  });
}

export async function PATCH(req: NextRequest) {
  return traceApi(req, 'PATCH /api/notifications', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const body = await req.json().catch(() => ({}));
      const markAll = Boolean(body?.markAll);
      const notificationId =
        typeof body?.notificationId === 'string' ? body.notificationId.trim() : undefined;

      if (!markAll && !notificationId) {
        return NextResponse.json(
          { error: 'Informe notificationId ou markAll=true.' },
          { status: 400 }
        );
      }

      const result = await markNotificationsRead(access.user.id, {
        markAll,
        notificationId,
      });
      return NextResponse.json({ success: true, ...result });
    } catch (error) {
      console.error('Erro ao atualizar notificações:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar status da notificação.' },
        { status: 500 }
      );
    }
  });
}

export async function DELETE(req: NextRequest) {
  return traceApi(req, 'DELETE /api/notifications', async () => {
    const access = await authorizeApi(req, false);
    if (access.error) return access.error;

    try {
      const id = req.nextUrl.searchParams.get('id')?.trim();
      if (!id) {
        return NextResponse.json({ error: 'ID não informado.' }, { status: 400 });
      }
      await deleteUserNotification(access.user.id, id);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
      return NextResponse.json(
        { error: 'Erro ao remover notificação.' },
        { status: 500 }
      );
    }
  });
}
