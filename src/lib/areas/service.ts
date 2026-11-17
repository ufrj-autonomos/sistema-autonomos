import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import type { SafeUser } from '@/lib/session';
import { extractEffectiveRoles, hasEffectiveRole, type SystemRole } from '@/lib/access-policy';
import {
  expandMemberScopeKeys,
  isOperationalActiveMember,
  normalizeMemberArea,
  normalizeMemberRole,
  rolesFromCargo,
} from '@/lib/member-fields';
import {
  CANONICAL_EVALUATION_SCOPES,
  makeScopeArea,
  parseScopeKey,
  teamNameFromSlug,
  teamSlugFromId,
} from '@/lib/evaluations/service';
import type { EvaluationScopeArea } from '@/lib/evaluations/types';
import type {
  AreaCourseDTO,
  AreaCourseSlotDTO,
  AreaMemberDTO,
  AreaSummaryCardDTO,
  AreasWorkspaceDTO,
  AreaTaskDTO,
  AreaTaskPriority,
  AreaTaskStatus,
} from './types';

export class AreaHubError extends Error {
  constructor(
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

export const AREA_TASK_STATUSES: readonly AreaTaskStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'REVIEW',
  'DONE',
];

export const AREA_TASK_PRIORITIES: readonly AreaTaskPriority[] = [
  'BAIXA',
  'MEDIA',
  'ALTA',
  'URGENTE',
];

const AREA_COURSE_SLOTS: Record<string, AreaCourseSlotDTO[]> = {
  Software: [
    {
      slotKey: 'sw-visao-autonomia',
      title: 'Visão Computacional & Navegação Autônoma',
      subtitle: 'OpenCV, YOLO, SLAM e planejamento de trajetórias',
      description:
        'Capacitação prática em detecção de alvos, estimação de pose, pipelines de câmera em ROS 2 e algoritmos de controle e missão.',
      level: 'Intermediário',
      durationHours: 12,
      suggestedModules: ['OpenCV & Calibração', 'Detecção com YOLO/ONNX', 'Nav2 & SLAM Toolbox'],
      area: 'Software',
    },
    {
      slotKey: 'sw-simulacao-controle',
      title: 'Simulação Gazebo, Controle PID & State Machines',
      subtitle: 'Gêmeo digital, PX4/ArduSub e Behavior Trees',
      description:
        'Montagem de mundos no Gazebo Harmonic, integração SITL, ajuste fino de malhas PID e árvores de comportamento para competições.',
      level: 'Intermediário',
      durationHours: 10,
      suggestedModules: ['URDF & SDF', 'Ponte ROS-Gazebo', 'BehaviorTree.CPP'],
      area: 'Software',
    },
  ],
  Mecânica: [
    {
      slotKey: 'mec-cad-onshape-solid',
      title: 'Modelagem CAD 3D & Desenho Técnico para Robótica',
      subtitle: 'Peças parametrizadas, montagens e tolerâncias de fabricação',
      description:
        'Boas práticas de modelagem paramétrica, montagens robustas, lista de materiais (BOM) e preparação de arquivos para corte CNC e impressão 3D.',
      level: 'Iniciante',
      durationHours: 10,
      suggestedModules: ['Esboços Paramétricos', 'Montagens & Mates', 'Detalhamento 2D & Corte Laser/CNC'],
      area: 'Mecânica',
    },
    {
      slotKey: 'mec-estrutural-vedacao',
      title: 'Análise Estrutural, Hidrodinâmica & Manufatura',
      subtitle: 'Simulação FEA, fibras compostas e estanqueidade',
      description:
        'Fundamentos de esforços estruturais em UAVs/AUVs, seleção de materiais leves, vedações com O-rings e testes de pressão/voo.',
      level: 'Intermediário',
      durationHours: 12,
      suggestedModules: ['Seleção de Materiais & Compostos', 'FEA Básico', 'Estanqueidade & Montagem Final'],
      area: 'Mecânica',
    },
  ],
  Eletrônica: [
    {
      slotKey: 'ele-pcb-kicad',
      title: 'Projeto de PCBs Profissionais com KiCad',
      subtitle: 'Esquemáticos, roteamento, potência e arquivos Gerber',
      description:
        'Fluxo completo do esquemático ao envio para fabricação de placas de distribuição de potência (PDB), sensores e interfaces embarcadas.',
      level: 'Iniciante',
      durationHours: 12,
      suggestedModules: ['Esquemáticos & Bibliotecas', 'Layout & Trilhas de Potência', 'Checklist DRC & Gerber'],
      area: 'Eletrônica',
    },
    {
      slotKey: 'ele-embarcados-potencia',
      title: 'Sistemas Embarcados, Baterias LiPo & Telemetria',
      subtitle: 'STM32/ESP32, barramentos CAN/I2C/SPI e segurança elétrica',
      description:
        'Dimensionamento de chicotes, proteção contra inversão/sobrecorrente, telemetria confiável e programação de microcontroladores.',
      level: 'Intermediário',
      durationHours: 10,
      suggestedModules: ['Segurança & Power Management', 'Protocolos CAN / UART / SPI', 'Diagnóstico & Bancada'],
      area: 'Eletrônica',
    },
  ],
  Gestão: [
    {
      slotKey: 'ges-onboarding-processos',
      title: 'Onboarding de Gente e Gestão & Cultura da Equipe',
      subtitle: 'Processos internos, recrutamento, feedbacks e rituais',
      description:
        'Guia completo de condução de processos seletivos, acompanhamento de presença, gestão disciplinar, 1:1s e documentação da equipe.',
      level: 'Iniciante',
      durationHours: 6,
      suggestedModules: ['Cultura & Estrutura', 'Recrutamento & PS', 'Avaliações & Clima'],
      area: 'Gestão',
    },
    {
      slotKey: 'ges-pm-financeiro',
      title: 'Gestão de Projetos, Captação & Prestação de Contas',
      subtitle: 'Cronogramas de competição, orçamento, Coppetec e patrocinadores',
      description:
        'Planejamento estratégico de ciclos, controle orçamentário, notas fiscais, reembolsos e relacionamento institucional com parceiros.',
      level: 'Intermediário',
      durationHours: 8,
      suggestedModules: ['Planejamento Ágil & OKRs', 'Fluxo Financeiro & Coppetec', 'Parcerias & Patrocínios'],
      area: 'Gestão',
    },
  ],
  Marketing: [
    {
      slotKey: 'mkt-identidade-conteudo',
      title: 'Identidade Visual, Branding & Produção de Conteúdo',
      subtitle: 'Manual da marca, design para redes e cobertura de testes',
      description:
        'Padrões visuais da UFRJ Autônomos, Harpia e Nautilus, edição de vídeos e fotografia de laboratório/campo e calendário editorial.',
      level: 'Iniciante',
      durationHours: 8,
      suggestedModules: ['Identidade Visual Autônomos', 'Foto & Vídeo em Campo', 'Social Media & Campanhas'],
      area: 'Marketing',
    },
    {
      slotKey: 'mkt-midia-eventos',
      title: 'Mídia Institucional, Site & Captação de Apoio',
      subtitle: 'Pitch decks, kits de patrocínio e comunicação de competições',
      description:
        'Estruturação de apresentações comerciais para empresas, cobertura em tempo real de competições nacionais/internacionais e imprensa.',
      level: 'Intermediário',
      durationHours: 6,
      suggestedModules: ['Media Kit & Pitch', 'Cobertura de Competições', 'Comunicação Institucional'],
      area: 'Marketing',
    },
  ],
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

export function extractYoutubeVideoId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    const v = url.searchParams.get('v');
    if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
    if (url.hostname.includes('youtu.be')) {
      const seg = url.pathname.replace(/^\/+/, '').split('/')[0];
      if (seg && /^[a-zA-Z0-9_-]{11}$/.test(seg)) return seg;
    }
    const embedMatch = url.pathname.match(/\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch?.[1]) return embedMatch[1];
  } catch {
    return null;
  }
  return null;
}

function sanitizeOptionalUrl(raw: unknown, fieldLabel: string): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw !== 'string') throw new AreaHubError(`URL inválida em ${fieldLabel}.`);
  const clean = raw.trim();
  if (!clean) return null;
  if (!/^https?:\/\//i.test(clean) && !clean.startsWith('/')) {
    throw new AreaHubError(`${fieldLabel} deve começar com https://, http:// ou /.`);
  }
  return clean.slice(0, 1000);
}

export async function resolveUserAreaScopeKeys(
  user: Pick<SafeUser, 'area' | 'teamId' | 'institutionalMemberId'>
): Promise<string[]> {
  let area = normalizeMemberArea(user.area);
  let teamId = user.teamId ?? null;

  if ((!area || teamId === null) && user.institutionalMemberId && process.env.INSTITUTIONAL_DATABASE_URL) {
    try {
      const inst = await institutionalDb.institutionalMember.findUnique({
        where: { id: user.institutionalMemberId },
        select: { area: true, teamId: true },
      });
      if (inst) {
        if (!area) area = normalizeMemberArea(inst.area);
        if (teamId === null && inst.teamId !== null) teamId = inst.teamId;
      }
    } catch {
      // Fallback para campos da sessão
    }
  }

  return expandMemberScopeKeys({ area, teamId });
}

export async function resolveUserAreaScopeKey(
  user: Pick<SafeUser, 'area' | 'teamId' | 'institutionalMemberId'>
): Promise<string | null> {
  const keys = await resolveUserAreaScopeKeys(user);
  return keys[0] ?? null;
}

export function resolveSelectedScope(
  requestedScopeKey?: string | null,
  userScopeKey?: string | null
): EvaluationScopeArea {
  if (requestedScopeKey) {
    const parsed = parseScopeKey(requestedScopeKey.trim());
    if (parsed) return makeScopeArea(parsed.teamId, parsed.area);
  }
  if (userScopeKey) {
    const parsed = parseScopeKey(userScopeKey);
    if (parsed) return makeScopeArea(parsed.teamId, parsed.area);
  }
  return CANONICAL_EVALUATION_SCOPES[0];
}

export async function canManageAreaScope(user: SafeUser, scopeKey: string): Promise<boolean> {
  if (hasEffectiveRole(user, 'ADMIN')) return true;
  if (!hasEffectiveRole(user, 'COORDINATOR')) return false;
  const userScopes = await resolveUserAreaScopeKeys(user);
  return userScopes.includes(scopeKey);
}

interface RosterIdentity {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  cargoLabel: string;
  systemRoles: SystemRole[];
  isCoordinator: boolean;
  area: string;
  teamId: number | null;
  scopeKey: string;
  scopeKeys: string[];
}

async function loadActiveAreaRoster(): Promise<RosterIdentity[]> {
  const [rawMembers, instRows] = await Promise.all([
    prisma.member.findMany({
      where: { active: true, status: 'APPROVED' },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        role: true,
        roles: true,
        area: true,
        teamId: true,
        active: true,
        status: true,
        institutionalMemberId: true,
      },
      orderBy: { name: 'asc' },
    }),
    process.env.INSTITUTIONAL_DATABASE_URL
      ? institutionalDb.institutionalMember
          .findMany({
            select: { id: true, role: true, area: true, teamId: true, active: true, photo: true },
          })
          .catch(() => [])
      : Promise.resolve([] as Array<{ id: number; role: string; area: string; teamId: number | null; active: boolean; photo: string | null }>),
  ]);

  const instById = new Map(instRows.map((r) => [r.id, r]));
  const result: RosterIdentity[] = [];

  for (const m of rawMembers) {
    const inst = m.institutionalMemberId ? instById.get(m.institutionalMemberId) : undefined;
    if (!isOperationalActiveMember(m, inst)) continue;

    const area = normalizeMemberArea(m.area) || normalizeMemberArea(inst?.area) || 'Não informada';
    const teamId = m.teamId ?? inst?.teamId ?? null;
    const scope = makeScopeArea(teamId, area);
    const instCargo = inst?.role ? normalizeMemberRole(inst.role) : null;
    const rolesFromInst = instCargo ? rolesFromCargo(instCargo, area) : [];
    const systemRoles = extractEffectiveRoles(m);
    const combinedRoles = extractEffectiveRoles([...systemRoles, ...rolesFromInst]);
    const isCoordinator = combinedRoles.includes('COORDINATOR');

    const cargoLabel =
      instCargo ||
      (combinedRoles.includes('ADMIN')
        ? 'Diretoria / Admin'
        : isCoordinator
          ? 'Coordenador'
          : combinedRoles.includes('MANAGEMENT')
            ? 'Gestão'
            : combinedRoles.includes('TRAINEE')
              ? 'Trainee'
              : 'Membro');

    result.push({
      id: m.id,
      name: m.name,
      email: m.email || null,
      avatar: m.avatar || inst?.photo?.trim() || null,
      cargoLabel,
      systemRoles: combinedRoles,
      isCoordinator,
      area: scope.area,
      teamId: scope.teamId,
      scopeKey: scope.scopeKey,
      scopeKeys: expandMemberScopeKeys({ area: scope.area, teamId: scope.teamId }),
    });
  }

  return result;
}

function isCourseRelevantToScope(
  course: { slug: string; scopeKey: string | null; area: string | null },
  scope: EvaluationScopeArea
): boolean {
  if (course.scopeKey === scope.scopeKey) return true;
  if (course.scopeKey === null && course.area && normalizeMemberArea(course.area) === scope.area) {
    return true;
  }
  if (course.slug === 'ros2-jazzy' && scope.area === 'Software') {
    return true;
  }
  return false;
}

export async function getAreasWorkspace(
  user: SafeUser,
  requestedScopeKey?: string | null
): Promise<AreasWorkspaceDTO> {
  const userScopeKeys = await resolveUserAreaScopeKeys(user);
  const userScopeKey = userScopeKeys[0] ?? null;
  const workspaceMode = hasEffectiveRole(user, ['ADMIN', 'MANAGEMENT'])
    ? 'management' : hasEffectiveRole(user, 'COORDINATOR') ? 'coordinator' : 'member';
  // Coordenação permanece nos seus vínculos, inclusive quando atua nas duas divisões.
  const allowedRequest = workspaceMode === 'management' || userScopeKeys.includes(requestedScopeKey ?? '')
    ? requestedScopeKey : null;
  const selectedScope = resolveSelectedScope(allowedRequest, userScopeKey);
  const isAdmin = hasEffectiveRole(user, 'ADMIN');
  const canManageSelected = await canManageAreaScope(user, selectedScope.scopeKey);
  const canUpdateTasksInSelectedArea =
    canManageSelected || userScopeKeys.includes(selectedScope.scopeKey);

  const [roster, allOpenTasks, selectedTasks, allCourses, userCourseProgress, latestAreaEvals] =
    await Promise.all([
      loadActiveAreaRoster(),
      prisma.areaTask.findMany({
        where: { status: { not: 'DONE' } },
        select: { id: true, scopeKey: true },
      }),
      prisma.areaTask.findMany({
        where: workspaceMode === 'management' || userScopeKeys.includes(selectedScope.scopeKey)
          ? { scopeKey: selectedScope.scopeKey }
          : { assignments: { some: { memberId: user.id } } },
        include: {
          assignments: { orderBy: { assignedAt: 'asc' } },
        },
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.course.findMany({
        include: {
          modules: {
            orderBy: { orderIndex: 'asc' },
            include: {
              lessons: {
                orderBy: { orderIndex: 'asc' },
                select: {
                  id: true,
                  moduleId: true,
                  slug: true,
                  title: true,
                  orderIndex: true,
                  lessonType: true,
                  videoStatus: true,
                  youtubeVideoId: true,
                  summary: true,
                  rosDocsUrl: true,
                },
              },
            },
          },
        },
        orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
      }),
      prisma.courseProgress.findMany({
        where: { memberId: user.id },
        select: { courseId: true, percentage: true, completedLessonsCount: true },
      }),
      prisma.areaEvaluation.findMany({
        orderBy: [{ periodCode: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

  const progressMap = new Map(userCourseProgress.map((p) => [p.courseId, p]));
  const latestScoreByScope = new Map<string, { score: number; periodCode: string; notes: string }>();
  for (const ev of latestAreaEvals) {
    if (!latestScoreByScope.has(ev.scopeKey)) {
      latestScoreByScope.set(ev.scopeKey, {
        score: ev.score,
        periodCode: ev.periodCode,
        notes: ev.notes,
      });
    }
  }

  const scopes: AreaSummaryCardDTO[] = CANONICAL_EVALUATION_SCOPES.map((s) => {
    const countMembers = roster.filter((m) => m.scopeKeys.includes(s.scopeKey)).length;
    const countOpenTasks = allOpenTasks.filter((t) => t.scopeKey === s.scopeKey).length;
    const countCourses = allCourses.filter(
      (c) =>
        (c.published || isAdmin || userScopeKeys.includes(s.scopeKey)) &&
        isCourseRelevantToScope(c, s)
    ).length;

    return {
      ...s,
      isUserArea: userScopeKeys.includes(s.scopeKey),
      activeMembersCount: countMembers,
      openTasksCount: countOpenTasks,
      coursesCount: countCourses,
      latestAreaScore: latestScoreByScope.get(s.scopeKey) ?? null,
    };
  });

  const openTaskCountByMember = new Map<string, number>();
  for (const t of selectedTasks) {
    if (t.status === 'DONE') continue;
    for (const a of t.assignments) {
      openTaskCountByMember.set(a.memberId, (openTaskCountByMember.get(a.memberId) ?? 0) + 1);
    }
  }

  const areaMembers: AreaMemberDTO[] = roster
    .filter((m) => m.scopeKeys.includes(selectedScope.scopeKey))
    .map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      avatar: m.avatar,
      cargoLabel: m.cargoLabel,
      systemRoles: m.systemRoles,
      isCoordinator: m.isCoordinator,
      openTasksCount: openTaskCountByMember.get(m.id) ?? 0,
    }))
    .sort((a, b) => {
      if (a.isCoordinator !== b.isCoordinator) return a.isCoordinator ? -1 : 1;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

  const tasksDTO: AreaTaskDTO[] = selectedTasks.map((t) => {
    const isAssigned = t.assignments.some((a) => a.memberId === user.id);
    return {
      id: t.id,
      scopeKey: t.scopeKey,
      teamId: t.teamId,
      area: t.area,
      title: t.title,
      description: t.description,
      status: (AREA_TASK_STATUSES.includes(t.status as AreaTaskStatus) ? t.status : 'TODO') as AreaTaskStatus,
      priority: (AREA_TASK_PRIORITIES.includes(t.priority as AreaTaskPriority) ? t.priority : 'MEDIA') as AreaTaskPriority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      referenceUrl: t.referenceUrl,
      handoffNotes: t.handoffNotes,
      deliveryUrl: t.deliveryUrl,
      createdById: t.createdById,
      createdByName: t.createdByName,
      updatedByName: t.updatedByName,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
      assignments: t.assignments.map((a) => ({
        id: a.id,
        memberId: a.memberId,
        memberName: a.memberName,
      })),
      canEditTask: canManageSelected,
      canUpdateProgress:
        canManageSelected || userScopeKeys.includes(selectedScope.scopeKey) || isAssigned,
    };
  });

  const scopedCourses: AreaCourseDTO[] = allCourses
    .filter((c) => isCourseRelevantToScope(c, selectedScope) && (c.published || canManageSelected))
    .map((c) => {
      const lessons = c.modules.flatMap((m) => m.lessons);
      const prog = progressMap.get(c.id);
      const isEditableByArea =
        canManageSelected &&
        (c.scopeKey === selectedScope.scopeKey ||
          (c.scopeKey === null && c.area === selectedScope.area && c.slug !== 'ros2-jazzy'));

      return {
        id: c.id,
        slug: c.slug,
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        badge: c.badge,
        level: c.level,
        durationHours: c.durationHours,
        published: c.published,
        scopeKey: c.scopeKey,
        area: c.area,
        teamId: c.teamId,
        externalUrl: c.externalUrl,
        isSharedAcrossDivisions: c.scopeKey === null,
        totalLessons: lessons.length,
        firstLessonSlug: lessons[0]?.slug ?? null,
        userProgressPct: Math.round(prog?.percentage ?? 0),
        completedLessonsCount: prog?.completedLessonsCount ?? 0,
        modules: c.modules.map((m) => ({
          id: m.id,
          title: m.title,
          description: m.description,
          orderIndex: m.orderIndex,
          lessons: m.lessons,
        })),
        canManageCourse: isAdmin || isEditableByArea,
      };
    });

  const existingTitleNorms = new Set(
    scopedCourses.map((c) => slugify(c.title))
  );
  const recommendedSlots = (AREA_COURSE_SLOTS[selectedScope.area] || []).filter(
    (slot) => !existingTitleNorms.has(slugify(slot.title))
  );

  return {
    workspaceMode,
    userScopeKey,
    selectedScope,
    scopes: workspaceMode === 'management' ? scopes : scopes.filter((s) => s.isUserArea),
    canManageSelectedArea: canManageSelected,
    canUpdateTasksInSelectedArea,
    isAdmin,
    teamSlug: teamSlugFromId(selectedScope.teamId),
    members: areaMembers,
    tasks: tasksDTO,
    courses: scopedCourses,
    recommendedSlots,
    stats: {
      totalMembers: areaMembers.length,
      coordinatorsCount: areaMembers.filter((m) => m.isCoordinator).length,
      todoCount: tasksDTO.filter((t) => t.status === 'TODO').length,
      inProgressCount: tasksDTO.filter((t) => t.status === 'IN_PROGRESS').length,
      reviewCount: tasksDTO.filter((t) => t.status === 'REVIEW').length,
      doneCount: tasksDTO.filter((t) => t.status === 'DONE').length,
      coursesCount: scopedCourses.length,
      latestScore: latestScoreByScope.get(selectedScope.scopeKey) ?? null,
    },
  };
}

export async function createAreaTask(
  user: SafeUser,
  input: {
    scopeKey: unknown;
    title: unknown;
    description?: unknown;
    priority?: unknown;
    dueDate?: unknown;
    referenceUrl?: unknown;
    assigneeIds?: unknown;
  }
) {
  const rawScope = typeof input.scopeKey === 'string' ? input.scopeKey.trim() : '';
  const parsed = parseScopeKey(rawScope);
  if (!parsed) throw new AreaHubError('Área/divisão inválida.');
  const canonical = makeScopeArea(parsed.teamId, parsed.area);

  if (!(await canManageAreaScope(user, canonical.scopeKey))) {
    throw new AreaHubError(
      `Apenas a coordenação de ${canonical.label} ou Administradores podem passar novas tarefas nesta área.`,
      403
    );
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 2 || title.length > 160) {
    throw new AreaHubError('Informe um título válido para a tarefa (2 a 160 caracteres).');
  }
  const description = typeof input.description === 'string' ? input.description.trim().slice(0, 4000) : '';
  const priority =
    typeof input.priority === 'string' && AREA_TASK_PRIORITIES.includes(input.priority as AreaTaskPriority)
      ? (input.priority as AreaTaskPriority)
      : 'MEDIA';
  const referenceUrl = sanitizeOptionalUrl(input.referenceUrl, 'Link de referência');

  let dueDate: Date | null = null;
  if (typeof input.dueDate === 'string' && input.dueDate.trim()) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate.trim())) {
      throw new AreaHubError('Prazo inválido. Use AAAA-MM-DD.');
    }
    dueDate = new Date(`${input.dueDate.trim()}T12:00:00Z`);
  }

  const rawAssignees = Array.isArray(input.assigneeIds)
    ? [...new Set(input.assigneeIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))]
    : [];

  const validAssignees = rawAssignees.length
    ? await prisma.member.findMany({
        where: { id: { in: rawAssignees }, active: true, status: 'APPROVED' },
        select: { id: true, name: true },
      })
    : [];

  const created = await prisma.areaTask.create({
    data: {
      scopeKey: canonical.scopeKey,
      teamId: canonical.teamId,
      area: canonical.area,
      title,
      description,
      priority,
      status: 'TODO',
      dueDate,
      referenceUrl,
      createdById: user.id,
      createdByName: user.name,
      assignments: {
        create: validAssignees.map((m) => ({
          memberId: m.id,
          memberName: m.name,
        })),
      },
    },
    include: { assignments: true },
  });

  return created;
}

export async function updateAreaTask(
  user: SafeUser,
  taskId: string,
  input: Record<string, unknown>
) {
  const existing = await prisma.areaTask.findUnique({
    where: { id: taskId },
    include: { assignments: true },
  });
  if (!existing) throw new AreaHubError('Tarefa não encontrada.', 404);

  const isManager = await canManageAreaScope(user, existing.scopeKey);
  const userScopes = await resolveUserAreaScopeKeys(user);
  const isAssigned = existing.assignments.some((a) => a.memberId === user.id);
  const isAreaMember = userScopes.includes(existing.scopeKey);

  if (!isManager && !isAreaMember && !isAssigned) {
    throw new AreaHubError('Você não tem permissão para atualizar tarefas desta área.', 403);
  }

  const managerOnlyFields = ['title', 'description', 'priority', 'dueDate', 'referenceUrl', 'assigneeIds'];
  if (!isManager && managerOnlyFields.some((f) => f in input)) {
    throw new AreaHubError('Apenas a coordenação da área ou Admin podem editar definições e responsáveis da tarefa.', 403);
  }

  const updateData: Record<string, unknown> = {
    updatedByName: user.name,
  };

  if (isManager) {
    if ('title' in input) {
      const title = typeof input.title === 'string' ? input.title.trim() : '';
      if (title.length < 2 || title.length > 160) {
        throw new AreaHubError('Título inválido.');
      }
      updateData.title = title;
    }
    if ('description' in input) {
      updateData.description = typeof input.description === 'string' ? input.description.trim().slice(0, 4000) : '';
    }
    if ('priority' in input) {
      if (!AREA_TASK_PRIORITIES.includes(input.priority as AreaTaskPriority)) {
        throw new AreaHubError('Prioridade inválida.');
      }
      updateData.priority = input.priority;
    }
    if ('dueDate' in input) {
      if (!input.dueDate) {
        updateData.dueDate = null;
      } else if (typeof input.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate.trim())) {
        updateData.dueDate = new Date(`${input.dueDate.trim()}T12:00:00Z`);
      } else {
        throw new AreaHubError('Prazo inválido.');
      }
    }
    if ('referenceUrl' in input) {
      updateData.referenceUrl = sanitizeOptionalUrl(input.referenceUrl, 'Link de referência');
    }
  }

  if ('status' in input) {
    if (!AREA_TASK_STATUSES.includes(input.status as AreaTaskStatus)) {
      throw new AreaHubError('Status inválido.');
    }
    updateData.status = input.status;
    updateData.completedAt = input.status === 'DONE' ? new Date() : null;
  }

  if ('handoffNotes' in input) {
    updateData.handoffNotes =
      typeof input.handoffNotes === 'string' ? input.handoffNotes.trim().slice(0, 4000) : '';
  }

  if ('deliveryUrl' in input) {
    updateData.deliveryUrl = sanitizeOptionalUrl(input.deliveryUrl, 'Link de entrega');
  }

  const assigneeIds =
    isManager && Array.isArray(input.assigneeIds)
      ? [...new Set(input.assigneeIds.filter((x): x is string => typeof x === 'string' && x.trim().length > 0))]
      : null;

  const updated = await prisma.$transaction(async (tx) => {
    if (assigneeIds !== null) {
      await tx.areaTaskAssignment.deleteMany({ where: { taskId } });
      if (assigneeIds.length > 0) {
        const members = await tx.member.findMany({
          where: { id: { in: assigneeIds }, active: true, status: 'APPROVED' },
          select: { id: true, name: true },
        });
        if (members.length > 0) {
          await tx.areaTaskAssignment.createMany({
            data: members.map((m) => ({ taskId, memberId: m.id, memberName: m.name })),
          });
        }
      }
    }
    return tx.areaTask.update({
      where: { id: taskId },
      data: updateData,
      include: { assignments: true },
    });
  });

  return updated;
}

export async function deleteAreaTask(user: SafeUser, taskId: string) {
  const existing = await prisma.areaTask.findUnique({ where: { id: taskId } });
  if (!existing) throw new AreaHubError('Tarefa não encontrada.', 404);
  if (!(await canManageAreaScope(user, existing.scopeKey))) {
    throw new AreaHubError('Apenas a coordenação desta área ou Admin podem remover tarefas.', 403);
  }
  await prisma.areaTask.delete({ where: { id: taskId } });
}

export async function createAreaCourse(
  user: SafeUser,
  input: {
    scopeKey: unknown;
    scopeMode?: unknown; // 'division' | 'macro'
    title: unknown;
    subtitle?: unknown;
    description: unknown;
    level?: unknown;
    durationHours?: unknown;
    externalUrl?: unknown;
    initialModuleTitle?: unknown;
    published?: unknown;
  }
) {
  const rawScope = typeof input.scopeKey === 'string' ? input.scopeKey.trim() : '';
  const parsed = parseScopeKey(rawScope);
  if (!parsed) throw new AreaHubError('Área/divisão inválida.');
  const canonical = makeScopeArea(parsed.teamId, parsed.area);

  if (!(await canManageAreaScope(user, canonical.scopeKey))) {
    throw new AreaHubError(
      `Apenas a coordenação de ${canonical.label} ou Administradores podem adicionar cursos aqui.`,
      403
    );
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 3 || title.length > 140) {
    throw new AreaHubError('Informe o nome do curso (3 a 140 caracteres).');
  }
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length < 5) {
    throw new AreaHubError('Informe uma descrição resumida para o curso.');
  }
  const subtitle = typeof input.subtitle === 'string' && input.subtitle.trim() ? input.subtitle.trim().slice(0, 200) : null;
  const level = typeof input.level === 'string' && input.level.trim() ? input.level.trim().slice(0, 40) : 'Iniciante';
  const durationNum = Number(input.durationHours ?? 6);
  const durationHours = Number.isFinite(durationNum) && durationNum > 0 ? Math.min(500, durationNum) : 6;
  const externalUrl = sanitizeOptionalUrl(input.externalUrl, 'Link externo do curso');
  const shareMacro = input.scopeMode === 'macro';

  const baseSlug = slugify(`${canonical.area}-${title}`) || `curso-${Date.now()}`;
  const existingCount = await prisma.course.count({ where: { slug: { startsWith: baseSlug } } });
  const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;

  const badge = shareMacro
    ? `${canonical.area} · Autônomos`
    : `${canonical.area} · ${teamNameFromSlug(canonical.teamSlug).replace('UFRJ ', '')}`;

  const initialModuleTitle =
    typeof input.initialModuleTitle === 'string' && input.initialModuleTitle.trim()
      ? input.initialModuleTitle.trim().slice(0, 120)
      : 'Módulo 1 · Introdução';

  const maxOrder = await prisma.course.aggregate({ _max: { orderIndex: true } });
  const nextOrder = (maxOrder._max.orderIndex ?? 1) + 1;

  const created = await prisma.course.create({
    data: {
      slug,
      title,
      subtitle,
      description,
      badge,
      level,
      durationHours,
      published: input.published === false ? false : true,
      orderIndex: nextOrder,
      scopeKey: shareMacro ? null : canonical.scopeKey,
      area: canonical.area,
      teamId: shareMacro ? null : canonical.teamId,
      externalUrl,
      createdById: user.id,
      modules: {
        create: [
          {
            slug: 'modulo-1',
            title: initialModuleTitle,
            orderIndex: 1,
          },
        ],
      },
    },
    include: { modules: { include: { lessons: true } } },
  });

  return created;
}

export async function updateAreaCourse(
  user: SafeUser,
  courseId: string,
  input: Record<string, unknown>
) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AreaHubError('Curso não encontrado.', 404);
  if (course.slug === 'ros2-jazzy' && !hasEffectiveRole(user, 'ADMIN')) {
    throw new AreaHubError('Apenas Administradores podem alterar configurações estruturais do curso ROS 2 Jazzy.', 403);
  }

  const targetScopeKey =
    course.scopeKey ||
    (course.area ? makeScopeArea(user.teamId ?? null, course.area).scopeKey : null);
  const canEdit =
    hasEffectiveRole(user, 'ADMIN') ||
    (targetScopeKey !== null && (await canManageAreaScope(user, targetScopeKey)));
  if (!canEdit) {
    throw new AreaHubError('Sem permissão para editar este curso.', 403);
  }

  const data: Record<string, unknown> = {};
  if (typeof input.title === 'string' && input.title.trim().length >= 3) data.title = input.title.trim();
  if ('subtitle' in input) data.subtitle = typeof input.subtitle === 'string' ? input.subtitle.trim() || null : null;
  if (typeof input.description === 'string' && input.description.trim()) data.description = input.description.trim();
  if (typeof input.level === 'string' && input.level.trim()) data.level = input.level.trim();
  if (typeof input.published === 'boolean') data.published = input.published;
  if ('durationHours' in input) {
    const num = Number(input.durationHours);
    if (Number.isFinite(num) && num > 0) data.durationHours = num;
  }
  if ('externalUrl' in input) data.externalUrl = sanitizeOptionalUrl(input.externalUrl, 'Link externo');

  return prisma.course.update({ where: { id: courseId }, data });
}

export async function deleteAreaCourse(user: SafeUser, courseId: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AreaHubError('Curso não encontrado.', 404);
  if (course.slug === 'ros2-jazzy') {
    throw new AreaHubError('O curso base ROS 2 Jazzy não pode ser removido.', 403);
  }
  const targetScopeKey =
    course.scopeKey ||
    (course.area ? makeScopeArea(user.teamId ?? null, course.area).scopeKey : null);
  const canDelete =
    hasEffectiveRole(user, 'ADMIN') ||
    (targetScopeKey !== null && (await canManageAreaScope(user, targetScopeKey)));
  if (!canDelete) {
    throw new AreaHubError('Sem permissão para excluir este curso.', 403);
  }
  await prisma.course.delete({ where: { id: courseId } });
}

export async function addLessonToAreaCourse(
  user: SafeUser,
  courseId: string,
  input: {
    moduleId?: unknown;
    newModuleTitle?: unknown;
    title: unknown;
    summary?: unknown;
    textContent?: unknown;
    youtubeUrl?: unknown;
    rosDocsUrl?: unknown;
  }
) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      modules: {
        orderBy: { orderIndex: 'asc' },
        include: { lessons: { orderBy: { orderIndex: 'asc' } } },
      },
    },
  });
  if (!course) throw new AreaHubError('Curso não encontrado.', 404);

  const targetScopeKey =
    course.scopeKey ||
    (course.area ? makeScopeArea(user.teamId ?? null, course.area).scopeKey : null);
  const canEdit =
    hasEffectiveRole(user, 'ADMIN') ||
    (course.slug !== 'ros2-jazzy' && targetScopeKey !== null && (await canManageAreaScope(user, targetScopeKey)));
  if (!canEdit) {
    throw new AreaHubError('Sem permissão para adicionar aulas a este curso.', 403);
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length < 2 || title.length > 160) {
    throw new AreaHubError('Informe o título da aula (2 a 160 caracteres).');
  }
  const summary = typeof input.summary === 'string' && input.summary.trim() ? input.summary.trim().slice(0, 600) : null;
  const textContent =
    typeof input.textContent === 'string' && input.textContent.trim()
      ? input.textContent.trim()
      : `# ${title}\n\n${summary || 'Material de estudo da área.'}`;
  const rosDocsUrl = sanitizeOptionalUrl(input.rosDocsUrl, 'Link de material/documentação');

  const rawYoutube = typeof input.youtubeUrl === 'string' ? input.youtubeUrl.trim() : '';
  let youtubeVideoId: string | null = null;
  if (rawYoutube) {
    youtubeVideoId = extractYoutubeVideoId(rawYoutube);
    if (!youtubeVideoId) {
      throw new AreaHubError('URL ou ID do YouTube inválido. Cole o link completo do vídeo ou os 11 caracteres do ID.');
    }
  }

  let targetModule =
    typeof input.moduleId === 'string' && input.moduleId.trim()
      ? course.modules.find((m) => m.id === input.moduleId)
      : undefined;

  if (!targetModule) {
    const newModTitle =
      typeof input.newModuleTitle === 'string' && input.newModuleTitle.trim()
        ? input.newModuleTitle.trim().slice(0, 120)
        : course.modules.length === 0
          ? 'Módulo 1 · Introdução'
          : `Módulo ${course.modules.length + 1}`;
    const nextModOrder = (course.modules.at(-1)?.orderIndex ?? 0) + 1;
    const createdMod = await prisma.module.create({
      data: {
        courseId: course.id,
        slug: `modulo-${nextModOrder}`,
        title: newModTitle,
        orderIndex: nextModOrder,
      },
      include: { lessons: true },
    });
    targetModule = createdMod;
  }

  const nextLessonOrder = (targetModule.lessons.at(-1)?.orderIndex ?? 0) + 1;
  const lessonSlugBase = `${course.slug.slice(0, 20)}-${targetModule.orderIndex}-${nextLessonOrder}-${slugify(title)}`.slice(0, 90);

  const createdLesson = await prisma.lesson.create({
    data: {
      moduleId: targetModule.id,
      slug: lessonSlugBase || `aula-${Date.now()}`,
      title,
      orderIndex: nextLessonOrder,
      lessonType: youtubeVideoId ? 'VIDEO' : 'TEXT',
      videoStatus: youtubeVideoId ? 'AVAILABLE' : 'TEXT_ONLY',
      youtubeVideoId,
      summary,
      textContent,
      rosDocsUrl,
    },
  });

  return createdLesson;
}

export async function deleteLessonFromAreaCourse(user: SafeUser, courseId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { module: { include: { course: true } } },
  });
  if (!lesson || lesson.module.courseId !== courseId) {
    throw new AreaHubError('Aula não encontrada.', 404);
  }
  const course = lesson.module.course;
  if (course.slug === 'ros2-jazzy' && !hasEffectiveRole(user, 'ADMIN')) {
    throw new AreaHubError('Sem permissão para excluir aulas do curso ROS 2 Jazzy.', 403);
  }
  const targetScopeKey =
    course.scopeKey ||
    (course.area ? makeScopeArea(user.teamId ?? null, course.area).scopeKey : null);
  const canEdit =
    hasEffectiveRole(user, 'ADMIN') ||
    (targetScopeKey !== null && (await canManageAreaScope(user, targetScopeKey)));
  if (!canEdit) {
    throw new AreaHubError('Sem permissão para excluir esta aula.', 403);
  }

  await prisma.lesson.delete({ where: { id: lessonId } });
}
