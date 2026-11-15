export type EvaluationTeamSlug = 'harpia' | 'nautilus' | 'autonomos';

export interface EvaluationScopeArea {
  scopeKey: string;
  teamId: number | null;
  teamSlug: EvaluationTeamSlug;
  teamName: string;
  area: string;
  label: string;
}

export interface EvaluationPeriodOption {
  code: string;
  name: string;
  shortName?: string;
  isCurrent: boolean;
}

export interface PendingEvaluationMemberItem {
  id: string;
  name: string;
  areaLabel: string;
}

export interface PendingEvaluationsSummaryDTO {
  periodCode: string;
  periodLabel: string;
  pendingMembersCount: number;
  totalMembersCount: number;
  evaluatedMembersCount: number;
  pendingMembers: PendingEvaluationMemberItem[];
  pendingAreasCount: number;
  pendingCoordinatorsCount: number;
  scopeLabel: string | null;
}

export interface EvaluatedMemberRowDTO {
  memberId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  area: string;
  teamId: number | null;
  teamSlug: EvaluationTeamSlug;
  teamName: string;
  scopeKey: string;
  cargoLabel: string;
  systemRole: string;
  metrics: {
    labAdherencePct: number | null;
    labHoursMonth: number;
    meetingsPct: number | null;
    meetingsCount: number;
    warningsCount: number;
    avisosCount: number;
    disciplinaryLabel: string;
  };
  evaluation: {
    id: string;
    score: number;
    notes: string;
    evaluatorId: string | null;
    evaluatorName: string;
    updatedAt: string;
  } | null;
  isSelfMasked?: boolean;
}

export interface AreaEvaluationRowDTO {
  scopeKey: string;
  teamId: number | null;
  teamSlug: EvaluationTeamSlug;
  teamName: string;
  area: string;
  label: string;
  isUserArea: boolean;
  metrics: {
    activeMembersCount: number;
    labAdherencePct: number | null;
    meetingsPct: number | null;
    warningsCount: number;
    evaluatedMembersCount?: number;
    totalEvaluableMembersCount?: number;
    memberAvgScore?: number | null;
  };
  evaluation: {
    id: string;
    score: number;
    notes: string;
    evaluatorId: string | null;
    evaluatorName: string;
    updatedAt: string;
  } | null;
}

export interface CoordinatorEvaluationRowDTO {
  coordinatorId: string;
  name: string;
  email: string | null;
  avatar: string | null;
  area: string;
  teamId: number | null;
  teamSlug: EvaluationTeamSlug;
  teamName: string;
  scopeKey: string;
  cargoLabel: string;
  isSelf: boolean;
  metrics: {
    areaMembersTotal: number;
    areaMembersEvaluated: number;
    areaCoveragePct: number | null;
    labAdherencePct: number | null;
    meetingsPct: number | null;
    warningsCount: number;
  };
  evaluation: {
    id: string;
    score: number;
    notes: string;
    evaluatorId: string | null;
    evaluatorName: string;
    updatedAt: string;
  } | null;
}

export interface AdminEvaluationDashboardDTO {
  kpis: {
    memberAverage: number | null;
    memberEvaluatedCount: number;
    memberTotalCount: number;
    areaAverage: number | null;
    areaEvaluatedCount: number;
    areaTotalCount: number;
    coordinatorAverage: number | null;
    coordinatorEvaluatedCount: number;
    coordinatorTotalCount: number;
    topArea: { label: string; score: number } | null;
  };
  areaComparison: {
    scopeKey: string;
    label: string;
    shortLabel: string;
    teamSlug: EvaluationTeamSlug;
    areaScore: number | null;
    memberAvgScore: number | null;
    labAdherencePct: number | null;
    meetingsPct: number | null;
  }[];
  scoreDistribution: {
    bucket: string;
    members: number;
    coordinators: number;
  }[];
  coverageByArea: {
    scopeKey: string;
    label: string;
    teamName: string;
    evaluated: number;
    total: number;
    pct: number;
    memberAvg: number | null;
    areaScore: number | null;
  }[];
  byCargoAverage: {
    cargo: string;
    avgScore: number;
    count: number;
  }[];
  monthlyTrend: {
    periodCode: string;
    periodLabel: string;
    memberAvg: number | null;
    areaAvg: number | null;
    coordinatorAvg: number | null;
    totalEvaluations: number;
  }[];
}

export interface EvaluationsWorkspaceDTO {
  viewerRole: 'ADMIN' | 'COORDINATOR';
  isAdmin: boolean;
  coordinatorScope: EvaluationScopeArea | null;
  periods: EvaluationPeriodOption[];
  selectedPeriod: string;
  scopes: EvaluationScopeArea[];
  members: EvaluatedMemberRowDTO[];
  areas: AreaEvaluationRowDTO[];
  coordinators: CoordinatorEvaluationRowDTO[];
  dashboard: AdminEvaluationDashboardDTO | null;
}

export interface HomeAreaScoreItemDTO {
  scopeKey: string;
  teamId: number | null;
  teamSlug: EvaluationTeamSlug;
  teamName: string;
  area: string;
  label: string;
  score: number | null;
  notes: string | null;
  updatedAt: string | null;
  isUserArea: boolean;
}

export interface HomeAreaEvaluationsDTO {
  currentPeriodCode: string;
  periods: EvaluationPeriodOption[];
  userScopeKey: string | null;
  evaluationsByPeriod: Record<string, HomeAreaScoreItemDTO[]>;
}
