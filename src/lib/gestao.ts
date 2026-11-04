import { normalizeMemberArea } from '@/lib/member-fields';
import { prisma } from '@/lib/prisma';
import { db } from '@/lib/institutional/db';
import type { DivisionData, GestaoStatsResponse, MemberRecord, ProjectRecord } from '@/components/gestao/types';

export async function getGestaoStats(): Promise<GestaoStatsResponse> {
  const started = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const dbLatencyMs = Date.now() - started;
  const [teams, members, projects, totalUsers, totalStudents, course, totalLessons, totalExercises, availableVideos, pendingVideos, textOnlyLessons] = await Promise.all([
    db.team.findMany({ include: { members: true, projects: true } }),
    db.institutionalMember.findMany({ include: { team: true }, orderBy: [{ active: 'desc' }, { id: 'asc' }] }),
    db.project.findMany({ include: { team: true }, orderBy: { year: 'desc' } }),
    prisma.member.count(),
    prisma.member.count({ where: { status: 'APPROVED', courseProgress: { some: {} } } }),
    prisma.course.findUnique({ where: { slug: 'ros2-jazzy' }, include: { _count: { select: { modules: true } } } }),
    prisma.lesson.count(),
    prisma.exercise.count(),
    prisma.lesson.count({ where: { videoStatus: 'AVAILABLE' } }),
    prisma.lesson.count({ where: { videoStatus: 'PENDING' } }),
    prisma.lesson.count({ where: { videoStatus: 'TEXT_ONLY' } }),
  ]);
  const timestamp = new Date().toISOString();
  const divisions: DivisionData[] = teams.filter(team => ['harpia', 'nautilus'].includes(team.slug)).map(team => {
    const harpia = team.slug === 'harpia';
    return {
      slug: harpia ? 'harpia' : 'nautilus', name: team.name, fullName: harpia ? 'Divisão de Aeronaves Autônomas' : 'Divisão de Submarinos Autônomos',
      typeLabel: harpia ? 'Veículos aéreos' : 'Veículos subaquáticos', vehicleType: harpia ? 'UAV' : 'AUV', founded: team.founded,
      status: 'Telemetria não integrada', statusType: 'maintenance', statusBeaconColor: '#a1a1aa',
      summary: team.tags || 'Divisão registrada na plataforma.', competitions: [],
      specs: { frame: '', propulsion: '', sensors: [], computing: '', autopilot: '', softwareStack: [], batteryTelemetry: '' },
      stats: { membersCount: team.members.filter(member => member.active).length, projectsCount: team.projects.length, competitionsCount: 0 },
      accentColor: harpia
        ? { primary: '#8530B0', secondary: '#A346CC', glow: 'rgba(133, 48, 176, 0.25)', border: 'rgba(133, 48, 176, 0.35)', badgeBg: 'rgba(74, 8, 94, 0.40)' }
        : { primary: '#0154A0', secondary: '#387AEF', glow: 'rgba(56, 122, 239, 0.25)', border: 'rgba(56, 122, 239, 0.35)', badgeBg: 'rgba(2, 35, 67, 0.50)' },
    };
  });
  const directory: MemberRecord[] = members.map(member => {
    const division = member.team?.slug === 'harpia' ? 'harpia' : member.team?.slug === 'nautilus' ? 'nautilus' : 'geral';
    return {
      id: member.id, name: member.name, role: member.role,
      area: normalizeMemberArea(member.area) || 'Não informada',
      division, divisionLabel: division === 'harpia' ? 'Divisão Harpia' : division === 'nautilus' ? 'Divisão Nautilus' : 'Geral / Gestão',
      bio: member.bio, course: member.course, active: member.active, linkedin: member.linkedin, github: member.github,
    };
  });
  const registeredProjects: ProjectRecord[] = projects.filter(project => ['harpia', 'nautilus'].includes(project.team.slug)).map(project => ({
    id: project.id, slug: project.slug, name: project.name, tagline: project.tagline, description: project.description, status: project.status,
    year: project.year, division: project.team.slug as 'harpia' | 'nautilus', tags: project.tags.split(',').map(tag => tag.trim()).filter(Boolean),
  }));
  const databaseUrl = new URL(process.env.DATABASE_URL!);
  return {
    success: true, timestamp,
    kpis: {
      totalMembers: members.filter(member => member.active).length, totalMembersLabel: `${members.length} cadastrados no diretório`,
      activeProjects: projects.filter(project => /^(operacao|operacional|testes?|ativo|desenvolvimento)$/i.test(project.status) && !/inativo/i.test(project.status)).length,
      activeProjectsLabel: `${projects.length} projetos cadastrados`, totalStudents, totalStudentsLabel: `${totalUsers} contas registradas no sistema`,
      platformUptime: 'Não monitorado', platformStatus: 'online', dbLatencyMs,
    },
    divisions, members: directory, projects: registeredProjects,
    system: {
      database: { status: 'online', provider: 'PostgreSQL', host: 'Configurado no servidor', port: Number(databaseUrl.port || 5432), latencyMs: dbLatencyMs, pooled: databaseUrl.hostname.includes('pooler') || databaseUrl.searchParams.get('pgbouncer') === 'true' },
      auth: { status: 'online', engine: 'Sessões persistidas e JWT', algorithm: 'HS256', cookieName: 'autonomos_session', saltRounds: 10 },
      courses: { status: course ? 'online' : 'offline', courseSlug: course?.slug || '', courseTitle: course?.title || 'Nenhum curso cadastrado', modulesCount: course?._count.modules || 0, lessonsCount: totalLessons, exercisesCount: totalExercises, availableVideos, pendingVideos, textOnlyLessons },
    },
    operationalLogs: [
      { id: 'database-check', timestamp, level: 'SUCCESS', source: 'DB', message: `Conexão verificada nesta consulta em ${dbLatencyMs}ms.` },
      { id: 'catalog-check', timestamp, level: 'INFO', source: 'ENSINO', message: `${totalLessons} aulas, ${totalExercises} exercícios e ${availableVideos} vídeos disponíveis no banco.` },
    ],
  };
}
