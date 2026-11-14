import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  NOTIFICATION_CATEGORIES,
  type NotificationAdminLogDTO,
  type NotificationCategoryKey,
  type NotificationFeedDTO,
  type NotificationItemDTO,
  type NotificationRuleDTO,
  type NotificationsAdminDashboardDTO,
} from './notifications-meta';

function getCategoryMeta(category: string) {
  return (
    NOTIFICATION_CATEGORIES[category as NotificationCategoryKey] ??
    NOTIFICATION_CATEGORIES.SYSTEM_ANNOUNCEMENT
  );
}

export async function isNotificationRuleEnabled(
  category: NotificationCategoryKey
): Promise<{ enabled: boolean; sendToManagement: boolean }> {
  const meta = getCategoryMeta(category);
  try {
    const rule = await prisma.notificationRule.findUnique({
      where: { category },
      select: { enabled: true, sendToManagement: true },
    });
    if (!rule) {
      return {
        enabled: meta.defaultEnabled,
        sendToManagement: meta.defaultSendToManagement,
      };
    }
    return {
      enabled: rule.enabled,
      sendToManagement: rule.sendToManagement,
    };
  } catch {
    return {
      enabled: meta.defaultEnabled,
      sendToManagement: meta.defaultSendToManagement,
    };
  }
}

export interface CreateNotificationInput {
  recipientId: string;
  category: NotificationCategoryKey;
  title: string;
  message: string;
  link?: string | null;
  actorName?: string | null;
  metadata?: Prisma.InputJsonValue;
  ignoreRule?: boolean;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<string | null> {
  if (!input.recipientId) return null;

  try {
    if (!input.ignoreRule) {
      const rule = await isNotificationRuleEnabled(input.category);
      if (!rule.enabled) return null;
    }

    const created = await prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        category: input.category,
        title: input.title.trim().slice(0, 160),
        message: input.message.trim().slice(0, 1000),
        link: input.link?.trim() || null,
        actorName: input.actorName?.trim() || null,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    console.error('[notifications] Failed to create notification:', err);
    return null;
  }
}

export async function notifyMany(input: {
  recipientIds: string[];
  category: NotificationCategoryKey;
  title: string;
  message: string;
  link?: string | null;
  actorName?: string | null;
  metadata?: Prisma.InputJsonValue;
  ignoreRule?: boolean;
}): Promise<number> {
  const uniqueIds = Array.from(new Set(input.recipientIds.filter(Boolean)));
  if (!uniqueIds.length) return 0;

  try {
    if (!input.ignoreRule) {
      const rule = await isNotificationRuleEnabled(input.category);
      if (!rule.enabled) return 0;
    }

    const res = await prisma.notification.createMany({
      data: uniqueIds.map(recipientId => ({
        recipientId,
        category: input.category,
        title: input.title.trim().slice(0, 160),
        message: input.message.trim().slice(0, 1000),
        link: input.link?.trim() || null,
        actorName: input.actorName?.trim() || null,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {}),
      })),
    });
    return res.count;
  } catch (err) {
    console.error('[notifications] Failed to create batch notifications:', err);
    return 0;
  }
}

export async function notifyManagementMembers(input: {
  category: NotificationCategoryKey;
  title: string;
  message: string;
  link?: string | null;
  actorName?: string | null;
  excludeMemberId?: string | null;
  metadata?: Prisma.InputJsonValue;
}): Promise<number> {
  try {
    const rule = await isNotificationRuleEnabled(input.category);
    if (!rule.enabled || !rule.sendToManagement) return 0;

    const managers = await prisma.member.findMany({
      where: {
        active: true,
        status: 'APPROVED',
        role: { in: ['ADMIN', 'MANAGEMENT'] },
        ...(input.excludeMemberId ? { id: { not: input.excludeMemberId } } : {}),
      },
      select: { id: true },
    });

    if (!managers.length) return 0;

    return notifyMany({
      recipientIds: managers.map(m => m.id),
      category: input.category,
      title: input.title,
      message: input.message,
      link: input.link,
      actorName: input.actorName,
      metadata: input.metadata,
      ignoreRule: true,
    });
  } catch (err) {
    console.error('[notifications] Failed to notify managers:', err);
    return 0;
  }
}

export async function listUserNotifications(
  memberId: string,
  limit = 30
): Promise<NotificationFeedDTO> {
  const safeLimit = Math.min(Math.max(1, limit), 60);
  const [unreadCount, rows] = await Promise.all([
    prisma.notification.count({
      where: { recipientId: memberId, readAt: null },
    }),
    prisma.notification.findMany({
      where: { recipientId: memberId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    }),
  ]);

  const items: NotificationItemDTO[] = rows.map(row => {
    const meta = getCategoryMeta(row.category);
    return {
      id: row.id,
      category: meta.key,
      categoryLabel: meta.label,
      tone: meta.tone,
      title: row.title,
      message: row.message,
      link: row.link,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      actorName: row.actorName,
      createdAt: row.createdAt.toISOString(),
    };
  });

  return { unreadCount, items };
}

export async function markNotificationsRead(
  memberId: string,
  options: { notificationId?: string; markAll?: boolean }
): Promise<{ updated: number; unreadCount: number }> {
  const now = new Date();
  let updated = 0;

  if (options.markAll) {
    const res = await prisma.notification.updateMany({
      where: { recipientId: memberId, readAt: null },
      data: { readAt: now },
    });
    updated = res.count;
  } else if (options.notificationId) {
    const res = await prisma.notification.updateMany({
      where: { id: options.notificationId, recipientId: memberId, readAt: null },
      data: { readAt: now },
    });
    updated = res.count;
  }

  const unreadCount = await prisma.notification.count({
    where: { recipientId: memberId, readAt: null },
  });

  return { updated, unreadCount };
}

export async function deleteUserNotification(
  memberId: string,
  notificationId: string
): Promise<boolean> {
  const res = await prisma.notification.deleteMany({
    where: { id: notificationId, recipientId: memberId },
  });
  return res.count > 0;
}

export async function getNotificationsAdminDashboard(): Promise<NotificationsAdminDashboardDTO> {
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    totalNotifications,
    unreadNotifications,
    last24hCount,
    dbRules,
    categoryCounts,
    unreadCounts,
    recentRows,
    members,
  ] = await Promise.all([
    prisma.notification.count(),
    prisma.notification.count({ where: { readAt: null } }),
    prisma.notification.count({ where: { createdAt: { gte: since24h } } }),
    prisma.notificationRule.findMany(),
    prisma.notification.groupBy({
      by: ['category'],
      _count: { _all: true },
    }),
    prisma.notification.groupBy({
      by: ['category'],
      where: { readAt: null },
      _count: { _all: true },
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 40,
      include: {
        recipient: { select: { id: true, name: true, area: true } },
      },
    }),
    prisma.member.findMany({
      where: { active: true, status: 'APPROVED' },
      select: { id: true, name: true, area: true, role: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  const ruleMap = new Map(dbRules.map(r => [r.category, r]));
  const totalMap = new Map(categoryCounts.map(c => [c.category, c._count._all]));
  const unreadMap = new Map(unreadCounts.map(c => [c.category, c._count._all]));

  const rules: NotificationRuleDTO[] = (
    Object.keys(NOTIFICATION_CATEGORIES) as NotificationCategoryKey[]
  ).map(key => {
    const meta = NOTIFICATION_CATEGORIES[key];
    const row = ruleMap.get(key);
    return {
      category: key,
      label: meta.label,
      description: meta.description,
      tone: meta.tone,
      enabled: row ? row.enabled : meta.defaultEnabled,
      sendToManagement: row ? row.sendToManagement : meta.defaultSendToManagement,
      supportsManagementToggle: meta.supportsManagementToggle,
      sentCount: totalMap.get(key) ?? 0,
      unreadCount: unreadMap.get(key) ?? 0,
      updatedAt: row ? row.updatedAt.toISOString() : null,
    };
  });

  const recentLogs: NotificationAdminLogDTO[] = recentRows.map(row => {
    const meta = getCategoryMeta(row.category);
    return {
      id: row.id,
      category: meta.key,
      categoryLabel: meta.label,
      recipientId: row.recipientId,
      recipientName: row.recipient.name,
      recipientArea: row.recipient.area,
      title: row.title,
      message: row.message,
      link: row.link,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      actorName: row.actorName,
      createdAt: row.createdAt.toISOString(),
    };
  });

  const areas = Array.from(new Set(members.map(m => m.area).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'pt-BR')
  );

  return {
    stats: {
      totalNotifications,
      unreadNotifications,
      last24hCount,
      activeRulesCount: rules.filter(r => r.enabled).length,
    },
    rules,
    recentLogs,
    members,
    areas,
  };
}

export async function updateNotificationRule(input: {
  category: NotificationCategoryKey;
  enabled?: boolean;
  sendToManagement?: boolean;
  actorId: string;
}) {
  const meta = NOTIFICATION_CATEGORIES[input.category];
  if (!meta) {
    throw new Error('Categoria de notificação inválida.');
  }

  const existing = await prisma.notificationRule.findUnique({
    where: { category: input.category },
  });

  const nextEnabled = input.enabled ?? existing?.enabled ?? meta.defaultEnabled;
  const nextSendToManagement = meta.supportsManagementToggle
    ? input.sendToManagement ?? existing?.sendToManagement ?? meta.defaultSendToManagement
    : false;

  return prisma.notificationRule.upsert({
    where: { category: input.category },
    create: {
      category: input.category,
      enabled: nextEnabled,
      sendToManagement: nextSendToManagement,
      updatedById: input.actorId,
    },
    update: {
      enabled: nextEnabled,
      sendToManagement: nextSendToManagement,
      updatedById: input.actorId,
    },
  });
}

export async function sendAdminManualNotifications(input: {
  actorId: string;
  actorName: string;
  targetType: 'ALL' | 'AREA' | 'MEMBER' | 'MANAGEMENT';
  targetArea?: string;
  targetMemberId?: string;
  title: string;
  message: string;
  link?: string | null;
}): Promise<{ sentCount: number }> {
  const title = input.title.trim();
  const message = input.message.trim();
  if (title.length < 3 || message.length < 4) {
    throw new Error('Informe título e mensagem válidos para a notificação.');
  }

  let recipientIds: string[] = [];

  if (input.targetType === 'MEMBER') {
    if (!input.targetMemberId) throw new Error('Selecione o integrante destinatário.');
    const member = await prisma.member.findFirst({
      where: { id: input.targetMemberId, active: true, status: 'APPROVED' },
      select: { id: true },
    });
    if (!member) throw new Error('Integrante destinatário não encontrado ou inativo.');
    recipientIds = [member.id];
  } else if (input.targetType === 'AREA') {
    if (!input.targetArea?.trim()) throw new Error('Selecione a área destinatária.');
    const members = await prisma.member.findMany({
      where: { active: true, status: 'APPROVED', area: input.targetArea.trim() },
      select: { id: true },
    });
    recipientIds = members.map(m => m.id);
  } else if (input.targetType === 'MANAGEMENT') {
    const members = await prisma.member.findMany({
      where: {
        active: true,
        status: 'APPROVED',
        role: { in: ['ADMIN', 'MANAGEMENT'] },
      },
      select: { id: true },
    });
    recipientIds = members.map(m => m.id);
  } else {
    const members = await prisma.member.findMany({
      where: { active: true, status: 'APPROVED' },
      select: { id: true },
    });
    recipientIds = members.map(m => m.id);
  }

  const sentCount = await notifyMany({
    recipientIds,
    category: 'SYSTEM_ANNOUNCEMENT',
    title,
    message,
    link: input.link?.trim() || null,
    actorName: input.actorName,
    ignoreRule: true,
    metadata: {
      manualBy: input.actorId,
      targetType: input.targetType,
      targetArea: input.targetArea ?? null,
    },
  });

  return { sentCount };
}

export async function clearOldReadNotifications(daysOld = 30): Promise<number> {
  const cutoff = new Date(Date.now() - Math.max(1, daysOld) * 24 * 60 * 60 * 1000);
  const res = await prisma.notification.deleteMany({
    where: {
      readAt: { not: null, lt: cutoff },
    },
  });
  return res.count;
}
