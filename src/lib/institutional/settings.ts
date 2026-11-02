import { db } from './db';
export async function getSiteSettings() {
  return await db.siteSettings.findUnique({ where: { id: 1 } }) || {
    id: 1, contactEmails: '', whatsappNumber: '', location: '', nautilusInstagram: null, nautilusLinkedin: null, nautilusEmail: null, nautilusFormLink: null,
    harpiaInstagram: null, harpiaLinkedin: null, harpiaEmail: null, harpiaFormLink: null, updatedAt: new Date(),
  };
}
