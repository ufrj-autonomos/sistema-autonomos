import { prisma } from '../../src/lib/prisma';
// Unit fixtures must never attempt a real audit connection; database suites use PostgreSQL.
export const recordedActivity: any[] = [];
(prisma.activityLog as any).create = async ({ data }: any) => { recordedActivity.push(data); return { id: String(recordedActivity.length), ...data }; };
(prisma.activityLog as any).createMany = async ({ data }: any) => { recordedActivity.push(...data); return { count: data.length }; };

(prisma.activityLog as any).upsert = async ({ where, create, update }: any) => {
  const previous = recordedActivity.find(row => row.summaryKey === where.summaryKey);
  if (previous) { previous.occurrences += update.occurrences.increment; previous.lastOccurredAt = update.lastOccurredAt; return previous; }
  const row = { id: String(recordedActivity.length + 1), ...create }; recordedActivity.push(row); return row;
};
