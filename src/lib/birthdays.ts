import { prisma } from './prisma';
import { db as institutionalDb } from './institutional/db';
import { publishInstitutionalSite } from './institutional/publish';

export function calculateAgeFromBirthDate(birthDate: Date | string | null | undefined, now = new Date()): number | null {
  if (!birthDate) return null;
  const iso = typeof birthDate === 'string' ? birthDate.slice(0, 10) : birthDate.toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [by, bm, bd] = iso.split('-').map(Number);

  const todayIso = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(now);
  const [ty, tm, td] = todayIso.split('-').map(Number);

  let age = ty - by;
  if (tm < bm || (tm === bm && td < bd)) {
    age -= 1;
  }
  return age >= 0 && age <= 125 ? age : null;
}

export async function syncMemberAgeToInstitutional(
  institutionalMemberId: number | null | undefined,
  birthDate: Date | string | null | undefined,
  now = new Date()
): Promise<boolean> {
  if (!institutionalMemberId || !process.env.INSTITUTIONAL_DATABASE_URL) return false;
  const age = calculateAgeFromBirthDate(birthDate, now);
  if (age === null) return false;

  const current = await institutionalDb.institutionalMember.findUnique({
    where: { id: institutionalMemberId },
    select: { id: true, age: true },
  });
  if (!current || current.age === age) return false;

  await institutionalDb.institutionalMember.update({
    where: { id: institutionalMemberId },
    data: { age },
  });
  return true;
}

export async function syncAllMemberBirthdays(now = new Date()): Promise<{ updatedCount: number }> {
  if (!process.env.INSTITUTIONAL_DATABASE_URL) return { updatedCount: 0 };

  const membersWithBirthDate = await prisma.member.findMany({
    where: {
      birthDate: { not: null },
      institutionalMemberId: { not: null },
    },
    select: {
      institutionalMemberId: true,
      birthDate: true,
    },
  });

  if (membersWithBirthDate.length === 0) return { updatedCount: 0 };

  const instIds = membersWithBirthDate
    .map((m) => m.institutionalMemberId)
    .filter((id): id is number => typeof id === 'number');

  const instMembers = await institutionalDb.institutionalMember.findMany({
    where: { id: { in: instIds } },
    select: { id: true, age: true },
  });
  const currentAgeById = new Map(instMembers.map((m) => [m.id, m.age]));

  let updatedCount = 0;
  for (const member of membersWithBirthDate) {
    const instId = member.institutionalMemberId;
    if (!instId || !member.birthDate) continue;
    const expectedAge = calculateAgeFromBirthDate(member.birthDate, now);
    if (expectedAge !== null && currentAgeById.get(instId) !== expectedAge) {
      await institutionalDb.institutionalMember.update({
        where: { id: instId },
        data: { age: expectedAge },
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await publishInstitutionalSite();
  }

  return { updatedCount };
}

