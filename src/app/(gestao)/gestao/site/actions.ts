'use server';

import { traceServerAction } from '@/lib/activity/server';
import { activityTarget } from '@/lib/activity/context';
import { revalidatePath } from 'next/cache';
import { requirePageUser } from '@/lib/session';
import { getInstitutionalModel, recordData, institutionalFailure, InstitutionalError } from '@/lib/institutional/records';
import { publishInstitutionalSite } from '@/lib/institutional/publish';
import { directoryPath } from '@/lib/institutional/routes';
import { memberRoleTranslations, roleFromCargo } from '@/lib/member-fields';
import { storeInstitutionalImage } from '@/lib/institutional/image-upload';
import { prisma } from '@/lib/prisma';

async function changed(table: string) {
  revalidatePath('/gestao/site', 'layout');
  revalidatePath(`/gestao/site/${table.toLowerCase()}`);
  revalidatePath(directoryPath(table), 'page');
  revalidatePath(`${directoryPath(table)}/[id]`, 'page');
  revalidatePath('/gestao');
  revalidatePath('/gestao/divisoes');
  revalidatePath('/gestao/presenca');
  return { success: true, warning: await publishInstitutionalSite() };
}
export async function createRecord(table: string, data: unknown): Promise<{ success: boolean; error?: string; warning?: string }> {
  return traceServerAction("createRecord", async () => {
  await requirePageUser(true);
  try {
    const { model } = getInstitutionalModel(table);
    activityTarget(directoryPath(table));
    const parsed = recordData(table, data, true);
    if (['member', 'project'].includes(table) && !('showOnSite' in parsed)) parsed.showOnSite = false;
    if (table === 'member') {
      if (!parsed.joinedYear) {
        const now = new Date();
        const entryMonth = String(now.getMonth() + 1).padStart(2, '0');
        const entryYear = now.getFullYear();
        parsed.joinedYear = `${entryMonth}/${entryYear}`;
      }
      if (typeof parsed.role === 'string') Object.assign(parsed, memberRoleTranslations(parsed.role));
    }
    const created = await model.create({ data: parsed });
    activityTarget(`${directoryPath(table)}/${created.id}`);
    if (table === 'member' && created?.id) {
      await prisma.member.upsert({
        where: { institutionalMemberId: created.id },
        update: { name: created.name, area: created.area || null, course: created.course || null },
        create: {
          institutionalMemberId: created.id,
          name: created.name,
          area: created.area || null,
          course: created.course || null,
          role: 'MEMBER',
          status: 'APPROVED',
        },
      });
    }
    return await changed(table);
  } catch (error) { return { success: false, error: institutionalFailure(error) }; }

  });
}
export async function updateRecord(table: string, id: number, data: unknown): Promise<{ success: boolean; error?: string; warning?: string }> {
  return traceServerAction("updateRecord", async () => {
  await requirePageUser(true);
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new InstitutionalError('Registro inválido.');
    const { model } = getInstitutionalModel(table);
    activityTarget(`${directoryPath(table)}/${id}`);
    const parsed = recordData(table, data, false);
    const fields = Object.keys(parsed);
    if (fields.length === 1) activityTarget(`${directoryPath(table)}/${id}`, fields[0]);
    if (table === 'member' && typeof parsed.role === 'string') {
      const previous = await model.findUnique({ where: { id } });
      const translations = memberRoleTranslations(parsed.role);
      if (previous && translations && parsed.role !== previous.role) {
        for (const key of ['roleEn', 'roleFr'] as const) {
          if (!(key in parsed) || parsed[key] === previous[key]) parsed[key] = translations[key];
        }
      }
    }
    const updated = await model.update({ where: { id }, data: parsed });
    if (table === 'member' && updated) {
      const syncData: Record<string, unknown> = {};
      if ('name' in parsed && typeof parsed.name === 'string') syncData.name = parsed.name;
      if ('area' in parsed && (typeof parsed.area === 'string' || parsed.area === null)) syncData.area = parsed.area;
      if ('course' in parsed && (typeof parsed.course === 'string' || parsed.course === null)) syncData.course = parsed.course;
      if ('active' in parsed && typeof parsed.active === 'boolean') {
        syncData.active = parsed.active;
      }
      if ('teamId' in parsed) {
        syncData.teamId = parsed.teamId === '' || parsed.teamId === null ? null : Number(parsed.teamId);
      }
      if (
        ('role' in parsed && typeof parsed.role === 'string') ||
        ('area' in parsed && (typeof parsed.area === 'string' || parsed.area === null))
      ) {
        const targetMember = await prisma.member.findFirst({ where: { institutionalMemberId: id } });
        if (targetMember) {
          const instUpdated = updated as { role?: string | null; area?: string | null };
          const effectiveCargo =
            typeof parsed.role === 'string' ? parsed.role : (instUpdated.role ?? 'Membro');
          const effectiveArea =
            'area' in parsed && typeof parsed.area === 'string'
              ? parsed.area
              : 'area' in parsed && parsed.area === null
                ? null
                : (instUpdated.area ?? targetMember.area);
          const derivedRole = roleFromCargo(effectiveCargo, effectiveArea);
          if (derivedRole === 'ADMIN' || targetMember.role !== 'ADMIN') {
            syncData.role = derivedRole;
          }
        }
      }
      if (Object.keys(syncData).length > 0) {
        await prisma.member.updateMany({
          where: { institutionalMemberId: id },
          data: syncData,
        });
      }
    }
    return await changed(table);
  }
  catch (error) { return { success: false, error: institutionalFailure(error) }; }

  });
}
export async function deleteRecord(table: string, id: number): Promise<{ success: boolean; error?: string; warning?: string }> {
  return traceServerAction("deleteRecord", async () => {
  await requirePageUser(true);
  try {
    if (!Number.isSafeInteger(id) || id < 1) throw new InstitutionalError('Registro inválido.');
    const { model } = getInstitutionalModel(table);
    activityTarget(`${directoryPath(table)}/${id}`);
    await model.delete({ where: { id } });
    if (table === 'member') {
      await prisma.member.updateMany({ where: { institutionalMemberId: id }, data: { institutionalMemberId: null } });
    }
    return await changed(table);
  } catch (error) { return { success: false, error: institutionalFailure(error) }; }

  });
}
export async function uploadImageToSupabase(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  return traceServerAction("uploadImageToSupabase", async () => {
  const user = await requirePageUser(true);
  try {
    activityTarget('/gestao/site', 'image');
    return { success: true, url: await storeInstitutionalImage(formData.get('file'), { folder: 'content', actorId: user.id }) };
  } catch (error) { return { success: false, error: institutionalFailure(error) }; }

  });
}
