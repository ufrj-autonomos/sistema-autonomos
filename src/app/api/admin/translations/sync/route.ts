import { traceApi } from '@/lib/activity/server';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { db as institutionalDb } from '@/lib/institutional/db';
import { syncAllMissingTranslations, getGeminiApiKey } from '@/lib/translation';

export async function GET(req: NextRequest) {
  return traceApi(req, "GET /api/admin/translations/sync", async () => {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    if (!process.env.INSTITUTIONAL_DATABASE_URL) {
      return NextResponse.json({ error: 'Banco institucional não configurado.' }, { status: 503 });
    }

    const [members, projects] = await Promise.all([
      institutionalDb.institutionalMember.findMany({ where: { active: true }, orderBy: { id: 'asc' } }),
      institutionalDb.project.findMany({ orderBy: { id: 'asc' } }),
    ]);

    const pendingMembers = members.filter((m) => {
      const bioMissing = Boolean(m.bio?.trim()) && (!m.bioEn?.trim() || !m.bioFr?.trim());
      const roleMissing = Boolean(m.role?.trim()) && (!m.roleEn?.trim() || !m.roleFr?.trim());
      const courseMissing = Boolean(m.course?.trim()) && (!m.courseEn?.trim() || !m.courseFr?.trim());
      return bioMissing || roleMissing || courseMissing;
    });

    const pendingProjects = projects.filter((p) => {
      const nameMissing = Boolean(p.name?.trim()) && (!p.nameEn?.trim() || !p.nameFr?.trim());
      const taglineMissing = Boolean(p.tagline?.trim()) && (!p.taglineEn?.trim() || !p.taglineFr?.trim());
      const descMissing = Boolean(p.description?.trim()) && (!p.descriptionEn?.trim() || !p.descriptionFr?.trim());
      return nameMissing || taglineMissing || descMissing;
    });

    return NextResponse.json({
      hasGeminiApiKey: Boolean(getGeminiApiKey()),
      pendingMembersCount: pendingMembers.length,
      pendingProjectsCount: pendingProjects.length,
      pendingMembers: pendingMembers.map(m => ({ id: m.id, name: m.name })),
      pendingProjects: pendingProjects.map(p => ({ id: p.id, name: p.name })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Erro em GET /api/admin/translations/sync:', error);
    return NextResponse.json({ error: 'Não foi possível consultar pendências de tradução.' }, { status: 500 });
  }

  });
}

export async function POST(req: NextRequest) {
  return traceApi(req, "POST /api/admin/translations/sync", async () => {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    const result = await syncAllMissingTranslations({ delayMs: 1200 });

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${result.updatedMembers} integrante(s) e ${result.updatedProjects} projeto(s) traduzidos.`,
      ...result,
    });
  } catch (error) {
    console.error('Erro em POST /api/admin/translations/sync:', error);
    return NextResponse.json({ error: 'Erro ao executar sincronização de traduções.' }, { status: 500 });
  }

  });
}

