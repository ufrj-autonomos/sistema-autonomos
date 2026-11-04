import { ACTION_LABELS, API_ACTIVITY } from './catalog';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { LogFilters } from './input';
export async function activityLogs(filters: LogFilters, now = new Date()) {
  const matchingActions = Object.entries(ACTION_LABELS).filter(([, label]) => label.toLocaleLowerCase('pt-BR').includes(filters.q.toLocaleLowerCase('pt-BR'))).map(([action]) => action);
  const matchingLegacy = Object.entries(API_ACTIVITY).filter(([, action]) => matchingActions.includes(action)).map(([legacy]) => legacy);
  const where: Prisma.ActivityLogWhereInput = {
    AND: [{ OR: [{ kind: 'SERVER_ACTION' }, { action: { in: [...Object.values(API_ACTIVITY), ...Object.keys(API_ACTIVITY)] } }, { action: { in: ['ATTENDANCE_IN', 'ATTENDANCE_OUT'] } }, ...(filters.kind === 'PAGE_VIEW' || filters.kind === 'CONTROL_CHANGE' ? [{ kind: filters.kind }] : [])] }],
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.outcome ? { outcome: filters.outcome } : {}),
    ...(filters.days ? { lastOccurredAt: { gte: new Date(now.getTime() - filters.days * 86400000) } } : {}),
    ...(filters.q ? { OR: [...['actorName', 'action', 'path', 'targetPath'].map(field => ({ [field]: { contains: filters.q, mode: 'insensitive' } })), { action: { in: [...matchingActions, ...matchingLegacy] } }] } : {}),
  };
  const [rows, total, started, stats, failures, users] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: [{ lastOccurredAt: 'desc' }, { id: 'desc' }], take: 51, ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}) }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.aggregate({ _min: { createdAt: true } }),
    prisma.activityLog.aggregate({ where, _sum: { occurrences: true } }),
    prisma.activityLog.aggregate({ where: { AND: [where, { outcome: 'FAILURE' }] }, _sum: { occurrences: true } }),
    prisma.activityLog.groupBy({ by: ['actorId'], where: { AND: [where, { actorId: { not: null } }] } }),
  ]);
  const items = rows.slice(0, 50).map(row => ({ ...row, createdAt: row.createdAt.toISOString(), lastOccurredAt: row.lastOccurredAt.toISOString() }));
  return { items, total, summary: { actions: stats._sum.occurrences || 0, failures: failures._sum.occurrences || 0, users: users.length }, nextCursor: rows.length > 50 ? items.at(-1)!.id : null, startedAt: started._min.createdAt?.toISOString() || null };
}
export type ActivityLogResult = Awaited<ReturnType<typeof activityLogs>>;
