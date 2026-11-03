import { db as institutionalDb } from './institutional/db';
import { publishInstitutionalSite } from './institutional/publish';

/**
 * Automatic Translation Service (PT -> EN, FR) for Institutional Member and Project fields.
 *
 * Strategy:
 * 1. Primary (high quality, fast): Google AI Studio Gemini API (`GEMINI_API_KEY` or `GEMINI_API`) using `gemini-flash-lite-latest`.
 * 2. Fallback (free without key or card): MyMemory Translation REST API (`https://api.mymemory.translated.net/get`).
 * 3. Daily Backup Recovery: If Gemini experiences congestion (HTTP 429 / 503) during member approvals or edits,
 *    the daily cron maintenance (`/api/cron/maintenance`) or manual trigger scans all records with empty EN/FR fields
 *    and completes the translations safely with rate pacing.
 */

export interface TranslatedFields {
  bioEn?: string | null;
  bioFr?: string | null;
  roleEn?: string | null;
  roleFr?: string | null;
  courseEn?: string | null;
  courseFr?: string | null;
}

export interface TranslatedProjectFields {
  nameEn?: string | null;
  nameFr?: string | null;
  taglineEn?: string | null;
  taglineFr?: string | null;
  descriptionEn?: string | null;
  descriptionFr?: string | null;
}

export function getGeminiApiKey(): string | undefined {
  return (process.env.GEMINI_API_KEY || process.env.GEMINI_API)?.trim() || undefined;
}

const CANDIDATE_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-2.5-flash-lite',
  'gemini-3.8-flash',
];

export async function translateMemberFieldsPtToEnFr(input: {
  bio?: string | null;
  role?: string | null;
  course?: string | null;
}): Promise<TranslatedFields> {
  const result: TranslatedFields = {};
  const hasBio = typeof input.bio === 'string';
  const hasRole = typeof input.role === 'string';
  const hasCourse = typeof input.course === 'string';

  if (!hasBio && !hasRole && !hasCourse) return result;

  if (hasBio && !input.bio?.trim()) {
    result.bioEn = null;
    result.bioFr = null;
  }
  if (hasRole && !input.role?.trim()) {
    result.roleEn = null;
    result.roleFr = null;
  }
  if (hasCourse && !input.course?.trim()) {
    result.courseEn = null;
    result.courseFr = null;
  }

  const toTranslate: Record<string, string> = {};
  if (hasBio && input.bio?.trim()) toTranslate.bio = input.bio.trim();
  if (hasRole && input.role?.trim()) toTranslate.role = input.role.trim();
  if (hasCourse && input.course?.trim()) toTranslate.course = input.course.trim();

  if (Object.keys(toTranslate).length === 0) return result;

  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      const geminiResult = await translateWithGemini(geminiKey, toTranslate, 'member');
      if (geminiResult) return { ...result, ...geminiResult };
    } catch (error: any) {
      if (error?.status === 429 || error?.status === 503) {
        console.warn('Aviso: Gemini API temporariamente congestionada (429/503). Acionando fallback e agendando backup diário.');
      } else {
        console.warn('Aviso: falha na tradução via Gemini API, usando fallback:', error?.message || error);
      }
    }
  }

  // Fallback gratuito sem chave nem cartão (MyMemory REST API)
  try {
    const entries = Object.entries(toTranslate);
    for (const [field, text] of entries) {
      const [en, fr] = await Promise.all([
        translateWithMyMemory(text, 'pt-BR', 'en-US'),
        translateWithMyMemory(text, 'pt-BR', 'fr-FR'),
      ]);
      if (field === 'bio') {
        if (en) result.bioEn = en;
        if (fr) result.bioFr = fr;
      } else if (field === 'role') {
        if (en) result.roleEn = en;
        if (fr) result.roleFr = fr;
      } else if (field === 'course') {
        if (en) result.courseEn = en;
        if (fr) result.courseFr = fr;
      }
    }
  } catch (error) {
    console.warn('Aviso: falha na tradução automática de fallback:', error);
  }

  return result;
}

export async function translateProjectFieldsPtToEnFr(input: {
  name?: string | null;
  tagline?: string | null;
  description?: string | null;
}): Promise<TranslatedProjectFields> {
  const result: TranslatedProjectFields = {};
  const toTranslate: Record<string, string> = {};

  if (input.name?.trim()) toTranslate.name = input.name.trim();
  if (input.tagline?.trim()) toTranslate.tagline = input.tagline.trim();
  if (input.description?.trim()) toTranslate.description = input.description.trim();

  if (Object.keys(toTranslate).length === 0) return result;

  const geminiKey = getGeminiApiKey();
  if (geminiKey) {
    try {
      const geminiResult = await translateWithGemini(geminiKey, toTranslate, 'project');
      if (geminiResult) return { ...result, ...geminiResult };
    } catch (error: any) {
      console.warn('Aviso: falha na tradução de projeto via Gemini API:', error?.message || error);
    }
  }

  // Fallback MyMemory
  try {
    for (const [field, text] of Object.entries(toTranslate)) {
      const [en, fr] = await Promise.all([
        translateWithMyMemory(text, 'pt-BR', 'en-US'),
        translateWithMyMemory(text, 'pt-BR', 'fr-FR'),
      ]);
      if (field === 'name') {
        if (en) result.nameEn = en;
        if (fr) result.nameFr = fr;
      } else if (field === 'tagline') {
        if (en) result.taglineEn = en;
        if (fr) result.taglineFr = fr;
      } else if (field === 'description') {
        if (en) result.descriptionEn = en;
        if (fr) result.descriptionFr = fr;
      }
    }
  } catch (error) {
    console.warn('Aviso: falha na tradução de projeto via fallback:', error);
  }

  return result;
}

async function translateWithGemini(
  apiKey: string,
  fields: Record<string, string>,
  type: 'member' | 'project'
): Promise<Record<string, string> | null> {
  const prompt = type === 'member'
    ? [
        'Translate the following Portuguese academic/robotics team member profile fields into English (En) and French (Fr).',
        'Return ONLY a valid JSON object with keys among: bioEn, bioFr, roleEn, roleFr, courseEn, courseFr.',
        'Keep proper nouns (UFRJ, Harpia, Nautilus, ROS 2, Jetson, Linux) intact.',
        `Input JSON: ${JSON.stringify(fields)}`,
      ].join('\n')
    : [
        'Translate the following Portuguese robotics project fields into English (En) and French (Fr).',
        'Return ONLY a valid JSON object with keys among: nameEn, nameFr, taglineEn, taglineFr, descriptionEn, descriptionFr.',
        'Keep proper nouns (UFRJ, Harpia, Nautilus, ROS 2, Jetson, PX4, LiDAR) intact.',
        `Input JSON: ${JSON.stringify(fields)}`,
      ].join('\n');

  for (const model of CANDIDATE_GEMINI_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (response.status === 429 || response.status === 503) {
        const error = new Error(`GEMINI_CONGESTION_${response.status}`);
        (error as any).status = response.status;
        throw error;
      }

      if (response.status === 404) {
        // Model not found on this account, try next candidate
        continue;
      }

      if (!response.ok) return null;

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof text !== 'string') return null;

      const parsed = JSON.parse(text) as Record<string, unknown>;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string' && v.trim()) {
          out[k] = v.trim();
        }
      }
      return out;
    } catch (err: any) {
      if (err?.status === 429 || err?.status === 503) {
        throw err;
      }
      // Continue to next model on network/timeout error
    }
  }

  return null;
}

async function translateWithMyMemory(text: string, source: string, target: string): Promise<string | null> {
  if (process.env.NODE_ENV === 'test') return null;
  const emailParam = process.env.EMAIL_FROM || process.env.SMTP_USER || '';
  const emailQuery = emailParam ? `&de=${encodeURIComponent(emailParam)}` : '';
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 490))}&langpair=${encodeURIComponent(`${source}|${target}`)}${emailQuery}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) return null;
  const data = await response.json();
  const translated = data?.responseData?.translatedText;
  if (typeof translated === 'string' && translated.trim() && !translated.includes('MYMEMORY WARNING')) {
    return translated.trim();
  }
  return null;
}

function isTestEnvironment(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    Boolean(process.env.NEXT_PUBLIC_APP_URL?.includes('example.invalid')) ||
    Boolean(process.env.npm_lifecycle_event?.includes('test'))
  );
}

/**
 * Daily Backup Routine: Scans all active institutional members with missing English or French translations
 * and translates their pending fields using Gemini (with rate pacing) and MyMemory fallback.
 */
export async function syncMissingMemberTranslations(options: {
  maxItems?: number;
  delayMs?: number;
} = {}): Promise<{ updatedCount: number; pendingCount: number }> {
  if (!process.env.INSTITUTIONAL_DATABASE_URL || isTestEnvironment()) {
    return { updatedCount: 0, pendingCount: 0 };
  }

  const maxItems = options.maxItems ?? 35;
  const delayMs = options.delayMs ?? 1000;

  const allMembers = await institutionalDb.institutionalMember.findMany({
    where: { active: true },
    orderBy: { id: 'asc' },
  });

  const missingMembers = allMembers.filter((m) => {
    const bioMissing = Boolean(m.bio?.trim()) && (!m.bioEn?.trim() || !m.bioFr?.trim());
    const roleMissing = Boolean(m.role?.trim()) && (!m.roleEn?.trim() || !m.roleFr?.trim());
    const courseMissing = Boolean(m.course?.trim()) && (!m.courseEn?.trim() || !m.courseFr?.trim());
    return bioMissing || roleMissing || courseMissing;
  });

  if (missingMembers.length === 0) {
    return { updatedCount: 0, pendingCount: 0 };
  }

  let updatedCount = 0;
  const slice = missingMembers.slice(0, maxItems);

  for (const member of slice) {
    const toTranslate: { bio?: string; role?: string; course?: string } = {};
    if (member.bio?.trim() && (!member.bioEn?.trim() || !member.bioFr?.trim())) {
      toTranslate.bio = member.bio.trim();
    }
    if (member.role?.trim() && (!member.roleEn?.trim() || !member.roleFr?.trim())) {
      toTranslate.role = member.role.trim();
    }
    if (member.course?.trim() && (!member.courseEn?.trim() || !member.courseFr?.trim())) {
      toTranslate.course = member.course.trim();
    }

    if (Object.keys(toTranslate).length === 0) continue;

    try {
      const translated = await translateMemberFieldsPtToEnFr(toTranslate);
      const updateData: Record<string, string> = {};

      if (translated.bioEn && !member.bioEn?.trim()) updateData.bioEn = translated.bioEn;
      if (translated.bioFr && !member.bioFr?.trim()) updateData.bioFr = translated.bioFr;
      if (translated.roleEn && !member.roleEn?.trim()) updateData.roleEn = translated.roleEn;
      if (translated.roleFr && !member.roleFr?.trim()) updateData.roleFr = translated.roleFr;
      if (translated.courseEn && !member.courseEn?.trim()) updateData.courseEn = translated.courseEn;
      if (translated.courseFr && !member.courseFr?.trim()) updateData.courseFr = translated.courseFr;

      if (Object.keys(updateData).length > 0) {
        await institutionalDb.institutionalMember.update({
          where: { id: member.id },
          data: updateData,
        });
        updatedCount++;
      }
    } catch (err: any) {
      if (err?.status === 429 || err?.status === 503) {
        console.warn('Gemini API atingiu limite de requisições ou demanda alta. O lote restante será concluído no próximo ciclo diário.');
        break;
      }
      console.warn(`Aviso ao traduzir integrante ${member.name} (${member.id}):`, err?.message || err);
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (updatedCount > 0) {
    await publishInstitutionalSite();
  }

  return { updatedCount, pendingCount: missingMembers.length - updatedCount };
}

/**
 * Daily Backup Routine: Scans institutional projects with missing English or French translations.
 */
export async function syncMissingProjectTranslations(options: {
  maxItems?: number;
  delayMs?: number;
} = {}): Promise<{ updatedCount: number; pendingCount: number }> {
  if (!process.env.INSTITUTIONAL_DATABASE_URL || isTestEnvironment()) {
    return { updatedCount: 0, pendingCount: 0 };
  }

  const maxItems = options.maxItems ?? 10;
  const delayMs = options.delayMs ?? 1000;

  const allProjects = await institutionalDb.project.findMany({
    orderBy: { id: 'asc' },
  });

  const missingProjects = allProjects.filter((p) => {
    const nameMissing = Boolean(p.name?.trim()) && (!p.nameEn?.trim() || !p.nameFr?.trim());
    const taglineMissing = Boolean(p.tagline?.trim()) && (!p.taglineEn?.trim() || !p.taglineFr?.trim());
    const descMissing = Boolean(p.description?.trim()) && (!p.descriptionEn?.trim() || !p.descriptionFr?.trim());
    return nameMissing || taglineMissing || descMissing;
  });

  if (missingProjects.length === 0) {
    return { updatedCount: 0, pendingCount: 0 };
  }

  let updatedCount = 0;
  const slice = missingProjects.slice(0, maxItems);

  for (const project of slice) {
    const toTranslate: { name?: string; tagline?: string; description?: string } = {};
    if (project.name?.trim() && (!project.nameEn?.trim() || !project.nameFr?.trim())) {
      toTranslate.name = project.name.trim();
    }
    if (project.tagline?.trim() && (!project.taglineEn?.trim() || !project.taglineFr?.trim())) {
      toTranslate.tagline = project.tagline.trim();
    }
    if (project.description?.trim() && (!project.descriptionEn?.trim() || !project.descriptionFr?.trim())) {
      toTranslate.description = project.description.trim();
    }

    if (Object.keys(toTranslate).length === 0) continue;

    try {
      const translated = await translateProjectFieldsPtToEnFr(toTranslate);
      const updateData: Record<string, string> = {};

      if (translated.nameEn && !project.nameEn?.trim()) updateData.nameEn = translated.nameEn;
      if (translated.nameFr && !project.nameFr?.trim()) updateData.nameFr = translated.nameFr;
      if (translated.taglineEn && !project.taglineEn?.trim()) updateData.taglineEn = translated.taglineEn;
      if (translated.taglineFr && !project.taglineFr?.trim()) updateData.taglineFr = translated.taglineFr;
      if (translated.descriptionEn && !project.descriptionEn?.trim()) updateData.descriptionEn = translated.descriptionEn;
      if (translated.descriptionFr && !project.descriptionFr?.trim()) updateData.descriptionFr = translated.descriptionFr;

      if (Object.keys(updateData).length > 0) {
        await institutionalDb.project.update({
          where: { id: project.id },
          data: updateData,
        });
        updatedCount++;
      }
    } catch (err: any) {
      if (err?.status === 429 || err?.status === 503) {
        console.warn('Gemini API atingiu cota limite ao traduzir projetos. O restante será concluído no próximo ciclo diário.');
        break;
      }
      console.warn(`Aviso ao traduzir projeto ${project.name} (${project.id}):`, err?.message || err);
    }

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (updatedCount > 0) {
    await publishInstitutionalSite();
  }

  return { updatedCount, pendingCount: missingProjects.length - updatedCount };
}

/**
 * Runs both member and project backup translation synchronizations.
 */
export async function syncAllMissingTranslations(options: {
  delayMs?: number;
} = {}): Promise<{
  updatedMembers: number;
  pendingMembers: number;
  updatedProjects: number;
  pendingProjects: number;
}> {
  const members = await syncMissingMemberTranslations(options);
  const projects = await syncMissingProjectTranslations(options);
  return {
    updatedMembers: members.updatedCount,
    pendingMembers: members.pendingCount,
    updatedProjects: projects.updatedCount,
    pendingProjects: projects.pendingCount,
  };
}

