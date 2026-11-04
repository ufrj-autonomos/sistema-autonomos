import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import { db } from '../src/lib/institutional/db';
import { planMemberAreaRepairs } from '../src/lib/member-fields';
import { publishInstitutionalSite } from '../src/lib/institutional/publish';

loadEnvConfig(process.cwd());
async function main() {
  const [published, internal] = await Promise.all([
    db.institutionalMember.findMany({ select: { id: true, area: true } }),
    prisma.member.findMany({ select: { id: true, institutionalMemberId: true, area: true } }),
  ]);
  const plan = planMemberAreaRepairs(published, internal);
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'read-only', siteRepairs: plan.siteUpdates.length, internalRepairs: plan.internalUpdates.length }));
    return;
  }
  let siteRepairs = 0; let internalRepairs = 0;
  for (const patch of plan.siteUpdates) {
    const result = await db.institutionalMember.updateMany({ where: { id: patch.id, area: patch.from }, data: { area: patch.to } });
    siteRepairs += result.count;
  }
  for (const patch of plan.internalUpdates) {
    const result = await prisma.member.updateMany({ where: { id: patch.id, area: patch.from }, data: { area: patch.to } });
    internalRepairs += result.count;
  }
  const warning = siteRepairs ? await publishInstitutionalSite() : undefined;
  console.log(JSON.stringify({ mode: 'applied', siteRepairs, internalRepairs, warning }));
}
main().catch(() => { console.error('Não foi possível concluir a correção de áreas. Nenhuma área preenchida é substituída.'); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect(); await db.$disconnect(); });
