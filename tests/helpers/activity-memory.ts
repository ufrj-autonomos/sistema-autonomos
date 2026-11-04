import { prisma } from '../../src/lib/prisma';
// Unit fixtures must never attempt a real audit connection; database suites use PostgreSQL.
export const recordedActivity: any[] = [];
(prisma.activityLog as any).create = async ({ data }: any) => { recordedActivity.push(data); return { id: String(recordedActivity.length), ...data }; };
(prisma.activityLog as any).createMany = async ({ data }: any) => { recordedActivity.push(...data); return { count: data.length }; };
