import { ensureAttendanceEnrollment } from '../src/lib/attendance/enrollment';
import { loadEnvConfig } from '@next/env';
import { PrismaClient, Prisma } from '@prisma/client';

loadEnvConfig(process.cwd());
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) throw new Error('Uso: npm run db:bootstrap-admin -- email-da-conta');
  // Local operator recovery only: no public HTTP endpoint can bootstrap an administrator.
  await prisma.$transaction(async tx => {
    if (await tx.member.count({ where: { role: 'ADMIN', status: 'APPROVED' } })) {
      throw new Error('Já existe um administrador aprovado. Use a tela de gestão para alterar permissões.');
    }
    const user = await tx.member.findUnique({ where: { email } });
    if (!user) throw new Error('Cadastre essa conta na plataforma antes de promover o primeiro administrador.');
    const approved = await tx.member.update({ where: { id: user.id }, data: { role: 'ADMIN', status: 'APPROVED' } });
    await ensureAttendanceEnrollment(tx, approved);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  console.log('Primeiro administrador aprovado. Entre com a senha cadastrada.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => prisma.$disconnect());
