import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { traceApi } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import {
  clearOldReadNotifications,
  getNotificationsAdminDashboard,
  sendAdminManualNotifications,
  updateNotificationRule,
} from '@/lib/notifications';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategoryKey,
} from '@/lib/notifications-meta';

export async function GET(req: NextRequest) {
  return traceApi(req, 'GET /api/gestao/notifications', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const dashboard = await getNotificationsAdminDashboard();
      return NextResponse.json(dashboard);
    } catch (error) {
      console.error('Erro em GET /api/gestao/notifications:', error);
      return NextResponse.json(
        { error: 'Erro ao carregar administração de notificações.' },
        { status: 500 }
      );
    }
  });
}

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/gestao/notifications', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    try {
      const body = await req.json();
      const action = body?.action;

      if (action === 'toggle_rule') {
        const category = String(body?.category || '') as NotificationCategoryKey;
        if (!(category in NOTIFICATION_CATEGORIES)) {
          return NextResponse.json(
            { error: 'Categoria de notificação inválida.' },
            { status: 400 }
          );
        }
        const rule = await updateNotificationRule({
          category,
          enabled: typeof body?.enabled === 'boolean' ? body.enabled : undefined,
          sendToManagement:
            typeof body?.sendToManagement === 'boolean' ? body.sendToManagement : undefined,
          actorId: access.user.id,
        });
        activityTarget('/gestao/sistema', `notification-rule:${category}`);
        return NextResponse.json({ success: true, rule });
      }

      if (action === 'send_manual') {
        const targetType = ['ALL', 'AREA', 'MEMBER', 'MANAGEMENT'].includes(
          body?.targetType
        )
          ? (body.targetType as 'ALL' | 'AREA' | 'MEMBER' | 'MANAGEMENT')
          : 'ALL';

        const result = await sendAdminManualNotifications({
          actorId: access.user.id,
          actorName: access.user.name,
          targetType,
          targetArea: typeof body?.targetArea === 'string' ? body.targetArea : undefined,
          targetMemberId:
            typeof body?.targetMemberId === 'string' ? body.targetMemberId : undefined,
          title: typeof body?.title === 'string' ? body.title : '',
          message: typeof body?.message === 'string' ? body.message : '',
          link: typeof body?.link === 'string' ? body.link : null,
        });
        activityTarget('/gestao/sistema', `notification-broadcast:${targetType}`);
        return NextResponse.json({ success: true, ...result });
      }

      if (action === 'cleanup_read') {
        const days = Number(body?.daysOld ?? 30);
        const deleted = await clearOldReadNotifications(
          Number.isFinite(days) ? days : 30
        );
        activityTarget('/gestao/sistema', 'notification-cleanup');
        return NextResponse.json({ success: true, deleted });
      }

      return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao processar solicitação.';
      return NextResponse.json({ error: message }, { status: 400 });
    }
  });
}
