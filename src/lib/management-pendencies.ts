import { prisma } from '@/lib/prisma';
import { db as institutionalDb } from '@/lib/institutional/db';
import type { SafeUser } from '@/lib/session';
import { calculateDisciplinaryStatus } from '@/lib/disciplinary/service';
import { formatBRL } from '@/lib/finance/constants';
import { pendingMeetingMinutes } from '@/lib/meetings/service';
import {
  canAccessEvaluations,
  getPendingEvaluationsSummary,
} from '@/lib/evaluations/service';
import type { PendingEvaluationsSummaryDTO } from '@/lib/evaluations/types';
import {
  computeMissingProfileFields,
  isOperationalActiveMember,
  isProfessorAdvisor,
  resolveMemberAreas,
} from '@/lib/member-fields';

export type PendencyTone = 'rose' | 'amber' | 'violet' | 'blue';
export type PendencyKind = 'approval' | 'attention';

export interface ManagementPendencyPreviewItem {
  id: string;
  primary: string;
  secondary?: string;
  badge?: string;
  href?: string;
}

export interface ManagementPendencyQueue {
  key:
    | 'reimbursements'
    | 'feedback'
    | 'attendance'
    | 'accounts'
    | 'siteChanges'
    | 'emailChanges'
    | 'cashEntries'
    | 'meetingMinutes'
    | 'evaluations'
    | 'incompleteProfiles'
    | 'disciplinaryRisk'
    | 'assets';
  kind: PendencyKind;
  title: string;
  shortLabel: string;
  subtitle: string;
  count: number;
  href: string;
  ctaLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  tone: PendencyTone;
  items: ManagementPendencyPreviewItem[];
}

export interface ManagementPendenciesSummary {
  generatedAt: string;
  totalApprovals: number;
  totalAttention: number;
  totalAll: number;
  navBadges: Record<string, number>;
  queues: ManagementPendencyQueue[];
}

const FEEDBACK_CATEGORY_LABELS: Record<string, string> = {
  BUG: 'Bug',
  MELHORIA: 'Melhoria',
  IDEIA: 'Ideia',
  PROBLEMA_LAB: 'Lab',
  PROCESSO: 'Processo',
};

const FEEDBACK_PRIORITY_LABELS: Record<string, string> = {
  BAIXA: 'Baixa',
  MEDIA: 'Média',
  ALTA: 'Alta',
  CRITICA: 'Crítica',
};

const REIMBURSEMENT_STATUS_LABELS: Record<string, string> = {
  PENDENTE: 'Análise inicial',
  AGUARDANDO_REEMBOLSO: 'Aguardando pagamento',
  AGUARDANDO_NF: 'Falta NF',
  APROVADO: 'Aprovado p/ pagar',
};

const ASSET_STATUS_LABELS: Record<string, string> = {
  MANUTENCAO: 'Em manutenção',
  DEFEITO_PARCIAL: 'Defeito parcial',
  ESTRAGADO: 'Estragado',
};

function formatShortBrDate(value: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(value);
}

/**
 * Consolida todas as filas de aprovação, triagem e acompanhamento operacional da gestão
 * em uma única leitura paralela para a Home, Visão Geral e badges de navegação.
 */
export async function getManagementPendencies(
  user?: SafeUser
): Promise<ManagementPendenciesSummary> {
  const effectiveUser: SafeUser = user ?? {
    id: 'system-admin',
    name: 'Admin',
    email: 'admin@autonomos',
    role: 'ADMIN',
    status: 'APPROVED',
    area: 'Gestão',
    avatar: null,
    profileCompletedAt: null,
    institutionalMemberId: null,
    teamId: null,
    teamSlug: 'autonomos',
  };

  const [
    reimbursementsCountRes,
    reimbursementsRowsRes,
    feedbackCountRes,
    feedbackRowsRes,
    justRowsRes,
    visitsReviewRowsRes,
    accountsRowsRes,
    siteChangesRowsRes,
    emailChangesRowsRes,
    cashEntriesCountRes,
    cashEntriesRowsRes,
    meetingMinutesRes,
    evaluationsPendingRes,
    activeMembersRes,
    instMembersRes,
    assetsCountRes,
    assetsRowsRes,
    warningsRes,
  ] = await Promise.allSettled([
    prisma.financialEntry.count({
      where: {
        isReimbursement: true,
        status: { in: ['PENDENTE', 'AGUARDANDO_REEMBOLSO', 'AGUARDANDO_NF', 'APROVADO'] },
      },
    }),
    prisma.financialEntry.findMany({
      where: {
        isReimbursement: true,
        status: { in: ['PENDENTE', 'AGUARDANDO_REEMBOLSO', 'AGUARDANDO_NF', 'APROVADO'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        code: true,
        title: true,
        requesterName: true,
        amountCents: true,
        status: true,
      },
    }),
    prisma.feedbackItem.count({
      where: {
        status: { notIn: ['APLICADA', 'ARQUIVADA'] },
        OR: [{ validity: 'PENDENTE' }, { status: 'RECEBIDA' }],
      },
    }),
    prisma.feedbackItem.findMany({
      where: {
        status: { notIn: ['APLICADA', 'ARQUIVADA'] },
        OR: [{ validity: 'PENDENTE' }, { status: 'RECEBIDA' }],
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: {
        id: true,
        code: true,
        title: true,
        category: true,
        priority: true,
        targetTeam: true,
        authorName: true,
      },
    }),
    prisma.attendanceJustification.findMany({
      where: { status: 'PENDING', member: { active: true } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reason: true,
        weekStartsOn: true,
        member: { select: { name: true, area: true, role: true, active: true, institutionalMemberId: true } },
      },
    }),
    prisma.attendanceVisit.findMany({
      where: { status: 'REVIEW', member: { active: true } },
      orderBy: { checkedInAt: 'desc' },
      select: {
        id: true,
        checkedInAt: true,
        member: { select: { name: true, area: true, role: true, active: true, institutionalMemberId: true } },
      },
    }),
    prisma.member.findMany({
      where: { status: 'PENDING', active: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, area: true, role: true, active: true, institutionalMemberId: true },
    }),
    prisma.memberProfileChange.findMany({
      where: { status: 'PENDING', member: { active: true } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        createdAt: true,
        member: { select: { name: true, area: true, role: true, active: true, institutionalMemberId: true } },
      },
    }),
    prisma.emailChangeRequest.findMany({
      where: { status: 'PENDING', member: { active: true } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        currentEmail: true,
        newEmail: true,
        member: { select: { name: true, area: true, role: true, active: true, institutionalMemberId: true } },
      },
    }),
    prisma.financialEntry.count({
      where: {
        isReimbursement: false,
        status: { in: ['PENDENTE', 'AGUARDANDO_NF'] },
      },
    }),
    prisma.financialEntry.findMany({
      where: {
        isReimbursement: false,
        status: { in: ['PENDENTE', 'AGUARDANDO_NF'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, code: true, title: true, amountCents: true, status: true },
    }),
    pendingMeetingMinutes(effectiveUser),
    canAccessEvaluations(effectiveUser.role)
      ? getPendingEvaluationsSummary(effectiveUser)
      : Promise.resolve<PendingEvaluationsSummaryDTO | null>(null),
    prisma.member.findMany({
      where: { active: true, status: 'APPROVED' },
      select: {
        id: true,
        institutionalMemberId: true,
        name: true,
        role: true,
        active: true,
        status: true,
        area: true,
        course: true,
        academicPeriod: true,
        phone: true,
        cpf: true,
        dre: true,
        birthDate: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        profileCompletedAt: true,
      },
      orderBy: { name: 'asc' },
    }),
    process.env.INSTITUTIONAL_DATABASE_URL
      ? institutionalDb.institutionalMember.findMany({
          select: { id: true, area: true, active: true, role: true },
        })
      : Promise.resolve([] as Array<{ id: number; area: string; active: boolean; role: string }>),
    prisma.inventoryAsset.count({
      where: {
        OR: [
          { acquisitionStatus: 'MANUTENCAO' },
          { condition: { in: ['DEFEITO_PARCIAL', 'ESTRAGADO'] } },
        ],
      },
    }),
    prisma.inventoryAsset.findMany({
      where: {
        OR: [
          { acquisitionStatus: 'MANUTENCAO' },
          { condition: { in: ['DEFEITO_PARCIAL', 'ESTRAGADO'] } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 4,
      select: {
        id: true,
        assetTag: true,
        name: true,
        condition: true,
        acquisitionStatus: true,
      },
    }),
    prisma.disciplinaryWarning.findMany({
      where: { member: { active: true, status: 'APPROVED' } },
      select: {
        memberId: true,
        type: true,
        member: {
          select: {
            id: true,
            name: true,
            area: true,
            role: true,
            active: true,
            status: true,
            institutionalMemberId: true,
          },
        },
      },
    }),
  ]);

  const instMap = new Map(
    (instMembersRes.status === 'fulfilled' ? instMembersRes.value : []).map((row) => [row.id, row])
  );
  const keepOperational = (
    member: {
      active?: boolean | null;
      role?: string | null;
      area?: string | null;
      status?: string | null;
      institutionalMemberId?: number | null;
    } | null
  ) => {
    if (!member) return false;
    const inst = member.institutionalMemberId ? instMap.get(member.institutionalMemberId) : undefined;
    return isOperationalActiveMember(member, inst);
  };

  const reimbursementsCount =
    reimbursementsCountRes.status === 'fulfilled' ? reimbursementsCountRes.value : 0;
  const reimbursementsRows =
    reimbursementsRowsRes.status === 'fulfilled' ? reimbursementsRowsRes.value : [];

  const feedbackCount = feedbackCountRes.status === 'fulfilled' ? feedbackCountRes.value : 0;
  const feedbackRows = feedbackRowsRes.status === 'fulfilled' ? feedbackRowsRes.value : [];

  const filteredJustRows = (justRowsRes.status === 'fulfilled' ? justRowsRes.value : []).filter(
    (j) => keepOperational(j.member)
  );
  const justCount = filteredJustRows.length;
  const justRows = filteredJustRows.slice(0, 4);

  const filteredVisitsReviewRows = (
    visitsReviewRowsRes.status === 'fulfilled' ? visitsReviewRowsRes.value : []
  ).filter((v) => keepOperational(v.member));
  const visitsReviewCount = filteredVisitsReviewRows.length;
  const visitsReviewRows = filteredVisitsReviewRows.slice(0, 4);
  const attendanceTotal = justCount + visitsReviewCount;

  const filteredAccountsRows = (
    accountsRowsRes.status === 'fulfilled' ? accountsRowsRes.value : []
  ).filter((a) => {
    const inst = a.institutionalMemberId ? instMap.get(a.institutionalMemberId) : undefined;
    return a.active && !isProfessorAdvisor(a) && !(inst && (!inst.active || isProfessorAdvisor(inst)));
  });
  const accountsCount = filteredAccountsRows.length;
  const accountsRows = filteredAccountsRows.slice(0, 4);

  const filteredSiteChangesRows = (
    siteChangesRowsRes.status === 'fulfilled' ? siteChangesRowsRes.value : []
  ).filter((s) => keepOperational(s.member));
  const siteChangesCount = filteredSiteChangesRows.length;
  const siteChangesRows = filteredSiteChangesRows.slice(0, 4);

  const filteredEmailChangesRows = (
    emailChangesRowsRes.status === 'fulfilled' ? emailChangesRowsRes.value : []
  ).filter((e) => keepOperational(e.member));
  const emailChangesCount = filteredEmailChangesRows.length;
  const emailChangesRows = filteredEmailChangesRows.slice(0, 4);

  const cashEntriesCount =
    cashEntriesCountRes.status === 'fulfilled' ? cashEntriesCountRes.value : 0;
  const cashEntriesRows =
    cashEntriesRowsRes.status === 'fulfilled' ? cashEntriesRowsRes.value : [];

  const meetingMinutes =
    meetingMinutesRes.status === 'fulfilled' ? meetingMinutesRes.value : { total: 0, meetings: [] };
  const evaluationsPending =
    evaluationsPendingRes.status === 'fulfilled' ? evaluationsPendingRes.value : null;

  const assetsCount = assetsCountRes.status === 'fulfilled' ? assetsCountRes.value : 0;
  const assetsRows = assetsRowsRes.status === 'fulfilled' ? assetsRowsRes.value : [];

  // Perfis operacionais incompletos (todos os campos operacionais obrigatórios)
  const incompleteItems: ManagementPendencyPreviewItem[] = [];
  let incompleteProfilesCount = 0;

  if (activeMembersRes.status === 'fulfilled') {
    for (const member of activeMembersRes.value) {
      const inst = member.institutionalMemberId
        ? instMap.get(member.institutionalMemberId)
        : undefined;
      if (!isOperationalActiveMember(member, inst)) continue;

      const resolvedArea = resolveMemberAreas(inst?.area, member.area).internal || member.area;
      const missing = computeMissingProfileFields({
        hasInternalAccount: true,
        area: resolvedArea,
        course: member.course,
        academicPeriod: member.academicPeriod,
        phone: member.phone,
        cpf: member.cpf,
        dre: member.dre,
        birthDate: member.birthDate,
        emergencyContactName: member.emergencyContactName,
        emergencyContactPhone: member.emergencyContactPhone,
        profileCompletedAt: member.profileCompletedAt,
      });

      if (missing.length > 0) {
        incompleteProfilesCount += 1;
        if (incompleteItems.length < 4) {
          incompleteItems.push({
            id: member.id,
            primary: member.name,
            secondary: `Falta: ${missing.slice(0, 3).join(', ')}${missing.length > 3 ? ` (+${missing.length - 3})` : ''}`,
            badge: `${missing.length} campo(s)`,
          });
        }
      }
    }
  }

  // Risco disciplinar (>= 2 advertências totais)
  const warningGroups = new Map<
    string,
    { name: string; area: string; avisos: number; direct: number }
  >();
  if (warningsRes.status === 'fulfilled') {
    for (const row of warningsRes.value) {
      const inst = row.member.institutionalMemberId
        ? instMap.get(row.member.institutionalMemberId)
        : undefined;
      if (!isOperationalActiveMember(row.member, inst)) continue;
      const prev = warningGroups.get(row.memberId) ?? {
        name: row.member.name,
        area: row.member.area,
        avisos: 0,
        direct: 0,
      };
      if (row.type === 'AVISO') prev.avisos += 1;
      else prev.direct += 1;
      warningGroups.set(row.memberId, prev);
    }
  }

  const disciplinaryRiskList: Array<{
    id: string;
    name: string;
    area: string;
    totalWarnings: number;
    statusLabel: string;
  }> = [];
  for (const [id, info] of warningGroups.entries()) {
    const calc = calculateDisciplinaryStatus(info.avisos, info.direct);
    if (calc.status === 'ALERTA' || calc.status === 'EXPULSAO') {
      disciplinaryRiskList.push({
        id,
        name: info.name,
        area: info.area,
        totalWarnings: calc.totalWarnings,
        statusLabel: calc.statusLabel,
      });
    }
  }
  disciplinaryRiskList.sort((a, b) => b.totalWarnings - a.totalWarnings);

  const attendancePreviewItems: ManagementPendencyPreviewItem[] = [
    ...justRows.map((j) => ({
      id: `just-${j.id}`,
      primary: j.member.name,
      secondary: `Justificativa (${j.reason}) · sem. ${formatShortBrDate(j.weekStartsOn)}`,
      badge: 'Justificativa',
    })),
    ...visitsReviewRows.map((v) => ({
      id: `visit-${v.id}`,
      primary: v.member.name,
      secondary: `Ponto em revisão · ${formatShortBrDate(v.checkedInAt)}`,
      badge: 'Ponto',
    })),
  ].slice(0, 4);

  const queues: ManagementPendencyQueue[] = [
    {
      key: 'reimbursements',
      kind: 'approval',
      title: 'Reembolsos para analisar / pagar',
      shortLabel: 'Reembolsos',
      subtitle: 'Solicitações financeiras aguardando aprovação, NF ou pagamento PIX.',
      count: reimbursementsCount,
      href: '/gestao/financeiro/reembolsos',
      ctaLabel: reimbursementsCount === 1 ? 'Analisar reembolso' : `Analisar ${reimbursementsCount} reembolsos`,
      tone: 'rose',
      items: reimbursementsRows.map((r) => ({
        id: r.id,
        primary: `${r.requesterName} · ${r.title}`,
        secondary: `${r.code} · ${REIMBURSEMENT_STATUS_LABELS[r.status] || r.status}`,
        badge: formatBRL(r.amountCents),
      })),
    },
    {
      key: 'feedback',
      kind: 'approval',
      title: 'Ideias & Bugs sem triagem',
      shortLabel: 'Ideias & Bugs',
      subtitle: 'Reportes recém-enviados aguardando avaliação e resposta à equipe.',
      count: feedbackCount,
      href: '/gestao/melhorias',
      ctaLabel: feedbackCount === 1 ? 'Avaliar item' : `Avaliar ${feedbackCount} itens`,
      tone: 'amber',
      items: feedbackRows.map((f) => ({
        id: f.id,
        primary: `${f.code} · ${f.title}`,
        secondary: `${FEEDBACK_CATEGORY_LABELS[f.category] || f.category} · ${f.targetTeam === 'MANAGEMENT' ? 'Gestão' : 'Tecnologia'} · ${f.authorName}`,
        badge: FEEDBACK_PRIORITY_LABELS[f.priority] || f.priority,
      })),
    },
    {
      key: 'attendance',
      kind: 'approval',
      title: 'Presença: justificativas & revisões',
      shortLabel: 'Presença no lab',
      subtitle: 'Pedidos de abono de horas semanais e registros de ponto para validar.',
      count: attendanceTotal,
      href: '/gestao/presenca',
      ctaLabel: 'Revisar presença',
      tone: 'amber',
      items: attendancePreviewItems,
    },
    {
      key: 'accounts',
      kind: 'approval',
      title: 'Contas aguardando aprovação',
      shortLabel: 'Contas e acessos',
      subtitle: 'Novos cadastros esperando liberação de acesso na plataforma.',
      count: accountsCount,
      href: '/gestao/contas',
      ctaLabel: accountsCount === 1 ? 'Aprovar conta' : `Aprovar ${accountsCount} contas`,
      tone: 'rose',
      items: accountsRows.map((a) => ({
        id: a.id,
        primary: a.name,
        secondary: `${a.area || 'Sem área'} · ${a.email || 'sem e-mail'}`,
        badge: 'Pendente',
      })),
    },
    {
      key: 'siteChanges',
      kind: 'approval',
      title: 'Alterações e fotos do site público',
      shortLabel: 'Site (Membros)',
      subtitle: 'Edições de perfil público enviadas pelos integrantes aguardando revisão.',
      count: siteChangesCount,
      href: '/gestao/site/membros#alteracoes-do-site',
      ctaLabel: 'Revisar alterações',
      tone: 'violet',
      items: siteChangesRows.map((s) => ({
        id: s.id,
        primary: s.member.name,
        secondary: `${s.member.area} · enviado em ${formatShortBrDate(s.createdAt)}`,
        badge: 'Vitrine',
      })),
    },
    {
      key: 'emailChanges',
      kind: 'approval',
      title: 'Solicitações de troca de e-mail',
      shortLabel: 'Troca de e-mail',
      subtitle: 'Pedidos de alteração de e-mail de login aguardando validação da gestão.',
      count: emailChangesCount,
      href: '/gestao/integrantes#trocas-de-email',
      ctaLabel: 'Validar trocas',
      tone: 'violet',
      items: emailChangesRows.map((e) => ({
        id: e.id,
        primary: e.member.name,
        secondary: `${e.currentEmail} → ${e.newEmail}`,
        badge: 'Segurança',
      })),
    },
    {
      key: 'cashEntries',
      kind: 'approval',
      title: 'Lançamentos de caixa pendentes',
      shortLabel: 'Livro Caixa',
      subtitle: 'Entradas e saídas aguardando confirmação ou nota fiscal no Livro Caixa.',
      count: cashEntriesCount,
      href: '/gestao/financeiro/caixa',
      ctaLabel: 'Conferir caixa',
      tone: 'amber',
      items: cashEntriesRows.map((c) => ({
        id: c.id,
        primary: `${c.code} · ${c.title}`,
        secondary: REIMBURSEMENT_STATUS_LABELS[c.status] || c.status,
        badge: formatBRL(c.amountCents),
      })),
    },
    {
      key: 'meetingMinutes',
      kind: 'approval',
      title: 'Atas de reunião pendentes',
      shortLabel: 'Atas de reunião',
      subtitle: 'Reuniões da sua responsabilidade que já aconteceram e ainda estão sem ata.',
      count: meetingMinutes.total,
      href: '/reunioes',
      ctaLabel: 'Escrever atas',
      tone: 'amber',
      items: meetingMinutes.meetings.slice(0, 4).map((m) => ({
        id: m.id,
        primary: m.title,
        secondary: `${m.area} · ${new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(m.date)}`,
        badge: 'Sem ata',
        href: `/reunioes?${new URLSearchParams({
          period: m.period,
          area: `${m.area}-${m.teamId}`,
          meeting: m.id,
          ata: '1',
        })}`,
      })),
    },
    ...(evaluationsPending
      ? [
          {
            key: 'evaluations' as const,
            kind: 'approval' as const,
            title: 'Avaliações mensais de membros pendentes',
            shortLabel: 'Avaliações do mês',
            subtitle:
              effectiveUser.role === 'COORDINATOR'
                ? `Membros da sua área ainda não avaliados em ${evaluationsPending.periodLabel}.`
                : `Membros ainda não avaliados pelos coordenadores em ${evaluationsPending.periodLabel}.`,
            count: evaluationsPending.pendingMembersCount,
            href: '/gestao/avaliacoes',
            ctaLabel:
              evaluationsPending.pendingMembersCount === 1
                ? 'Avaliar integrante'
                : `Avaliar ${evaluationsPending.pendingMembersCount} membros`,
            tone: 'amber' as const,
            items: evaluationsPending.pendingMembers.slice(0, 4).map((m) => ({
              id: m.id,
              primary: m.name,
              secondary: m.areaLabel,
              badge: evaluationsPending.periodLabel,
              href: '/gestao/avaliacoes',
            })),
          },
        ]
      : []),
    {
      key: 'incompleteProfiles',
      kind: 'attention',
      title: 'Perfis operacionais incompletos',
      shortLabel: 'Perfis incompletos',
      subtitle: 'Integrantes sem todos os dados operacionais obrigatórios preenchidos.',
      count: incompleteProfilesCount,
      href: '/gestao/integrantes',
      ctaLabel: 'Ver cadastros',
      secondaryHref: '/gestao/emails',
      secondaryLabel: 'Cobrar por e-mail',
      tone: 'blue',
      items: incompleteItems,
    },
    {
      key: 'disciplinaryRisk',
      kind: 'attention',
      title: 'Integrantes em risco disciplinar',
      shortLabel: 'Disciplinar',
      subtitle: 'Integrantes ativos com 2 ou mais advertências acumuladas.',
      count: disciplinaryRiskList.length,
      href: '/gestao/advertencias',
      ctaLabel: 'Abrir disciplinar',
      secondaryHref: '/gestao/emails',
      secondaryLabel: 'Enviar alerta',
      tone: 'rose',
      items: disciplinaryRiskList.slice(0, 4).map((d) => ({
        id: d.id,
        primary: d.name,
        secondary: `${d.area} · ${d.statusLabel}`,
        badge: `${d.totalWarnings}/3 adv.`,
      })),
    },
    {
      key: 'assets',
      kind: 'attention',
      title: 'Patrimônio em manutenção / avariado',
      shortLabel: 'Patrimônio',
      subtitle: 'Equipamentos marcados com defeito parcial, estragado ou em manutenção.',
      count: assetsCount,
      href: '/gestao/financeiro/patrimonio',
      ctaLabel: 'Ver patrimônio',
      tone: 'blue',
      items: assetsRows.map((a) => ({
        id: a.id,
        primary: `${a.assetTag} · ${a.name}`,
        secondary: ASSET_STATUS_LABELS[a.condition] || ASSET_STATUS_LABELS[a.acquisitionStatus] || 'Atenção',
        badge: ASSET_STATUS_LABELS[a.acquisitionStatus] || ASSET_STATUS_LABELS[a.condition] || 'Manutenção',
      })),
    },
  ];

  const totalApprovals = queues
    .filter((q) => q.kind === 'approval')
    .reduce((acc, q) => acc + q.count, 0);
  const totalAttention = queues
    .filter((q) => q.kind === 'attention')
    .reduce((acc, q) => acc + q.count, 0);
  const totalAll = totalApprovals + totalAttention;

  const navBadges: Record<string, number> = {};
  const setBadge = (href: string, count: number) => {
    if (count > 0) navBadges[href] = count;
  };

  setBadge('/gestao', totalApprovals);
  setBadge('/gestao/contas', accountsCount);
  setBadge('/gestao/integrantes', emailChangesCount + incompleteProfilesCount);
  setBadge('/gestao/presenca', attendanceTotal);
  setBadge('/gestao/advertencias', disciplinaryRiskList.length);
  if (evaluationsPending) {
    setBadge('/gestao/avaliacoes', evaluationsPending.pendingMembersCount);
  }
  setBadge('/gestao/financeiro/reembolsos', reimbursementsCount);
  setBadge('/gestao/financeiro/caixa', cashEntriesCount);
  setBadge('/gestao/financeiro/patrimonio', assetsCount);
  setBadge('/gestao/site/membros', siteChangesCount);
  setBadge('/gestao/melhorias', feedbackCount);

  return {
    generatedAt: new Date().toISOString(),
    totalApprovals,
    totalAttention,
    totalAll,
    navBadges,
    queues,
  };
}
