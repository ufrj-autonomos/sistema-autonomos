'use server';

import { activityTarget } from '@/lib/activity/context';
import { traceServerAction } from '@/lib/activity/server';
import { requirePageUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/institutional/db';
import { publishInstitutionalSite } from '@/lib/institutional/publish';
import { institutionalFailure, InstitutionalError } from '@/lib/institutional/records';
const keys = ['contactEmails','whatsappNumber','location','nautilusInstagram','nautilusLinkedin','nautilusEmail','nautilusFormLink','harpiaInstagram','harpiaLinkedin','harpiaEmail','harpiaFormLink'] as const;
export async function updateSiteSettings(formData: FormData): Promise<{ success: boolean; error?: string; warning?: string }> {
  return traceServerAction("updateSiteSettings", async () => {
  await requirePageUser(true);
  activityTarget('/gestao/site/settings');
  try {
    if ([...formData.keys()].some(key => !keys.includes(key as typeof keys[number]) && !key.startsWith('$ACTION_'))) throw new InstitutionalError('Campo inválido.');
    const data = Object.fromEntries(keys.map(key => {
      const value = formData.get(key) ?? '';
      if (typeof value !== 'string' || value.length > 2000) throw new InstitutionalError('Configuração inválida.');
      if (/Instagram|Linkedin|FormLink/.test(key) && value && value !== '#' && !/^https:\/\//i.test(value)) throw new InstitutionalError('Use URLs HTTPS nas redes sociais e formulários.');
      return [key, value.trim()];
    })) as Record<typeof keys[number], string>;
    if (!data.contactEmails || data.contactEmails.split(',').some(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))) throw new InstitutionalError('Informe e-mails de contato válidos, separados por vírgula.');
    await db.siteSettings.upsert({ where: { id: 1 }, update: data, create: { id: 1, ...data } });
    revalidatePath('/gestao/site/settings');
    return { success: true, warning: await publishInstitutionalSite() };
  } catch (error) { return { success: false, error: institutionalFailure(error) }; }

  });
}
