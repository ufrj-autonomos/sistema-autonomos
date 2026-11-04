import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import type { LogFilters } from './input';
export async function activityLogs(filters: LogFilters, now = new Date()) {
  const where: Prisma.ActivityLogWhereInput = {
    ...(filters.kind ? { kind: filters.kind } : {}),
    ...(filters.outcome ? { outcome: filters.outcome } : {}),
    ...(filters.days ? { createdAt: { gte: new Date(now.getTime() - filters.days * 86400000) } } : {}),
    ...(filters.q ? { OR: ['actorName', 'action', 'path', 'control'].map(field => ({ [field]: { contains: filters.q, mode: 'insensitive' } })) } : {}),
  };
  const [rows, total, started] = await Promise.all([
    prisma.activityLog.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}) }),
    prisma.activityLog.count({ where }),
    prisma.activityLog.aggregate({ _min: { createdAt: true } }),
  ]);
  const items = rows.slice(0, 50).map(row => ({ ...row, createdAt: row.createdAt.toISOString() }));
  return { items, total, nextCursor: rows.length > 50 ? items.at(-1)!.id : null, startedAt: started._min.createdAt?.toISOString() || null };
}
export type ActivityLogResult = Awaited<ReturnType<typeof activityLogs>>;
