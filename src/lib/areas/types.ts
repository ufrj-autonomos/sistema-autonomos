import type { EvaluationScopeArea, EvaluationTeamSlug } from '@/lib/evaluations/types';

export type AreaTaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
export type AreaTaskPriority = 'BAIXA' | 'MEDIA' | 'ALTA' | 'URGENTE';

export interface AreaMemberDTO {
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
  cargoLabel: string;
  systemRoles: string[];
  isCoordinator: boolean;
  openTasksCount: number;
}

export interface AreaTaskAssigneeDTO {
  id: string;
  memberId: string;
  memberName: string;
}

export interface AreaTaskDTO {
  id: string;
  scopeKey: string;
  teamId: number | null;
  area: string;
  title: string;
  description: string;
  status: AreaTaskStatus;
  priority: AreaTaskPriority;
  dueDate: string | null;
  referenceUrl: string | null;
  handoffNotes: string;
  deliveryUrl: string | null;
  createdById: string | null;
  createdByName: string;
  updatedByName: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignments: AreaTaskAssigneeDTO[];
  canEditTask: boolean;
  canUpdateProgress: boolean;
}

export interface AreaCourseLessonDTO {
  id: string;
  moduleId: string;
  slug: string;
  title: string;
  orderIndex: number;
  lessonType: string;
  videoStatus: string;
  youtubeVideoId: string | null;
  summary: string | null;
  rosDocsUrl: string | null;
}

export interface AreaCourseModuleDTO {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lessons: AreaCourseLessonDTO[];
}

export interface AreaCourseDTO {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  badge: string | null;
  level: string;
  durationHours: number;
  published: boolean;
  scopeKey: string | null;
  area: string | null;
  teamId: number | null;
  externalUrl: string | null;
  isSharedAcrossDivisions: boolean;
  totalLessons: number;
  firstLessonSlug: string | null;
  userProgressPct: number;
  completedLessonsCount: number;
  modules: AreaCourseModuleDTO[];
  canManageCourse: boolean;
}

export interface AreaCourseSlotDTO {
  slotKey: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  durationHours: number;
  suggestedModules: string[];
  area: string;
}

export interface AreaSummaryCardDTO extends EvaluationScopeArea {
  isUserArea: boolean;
  activeMembersCount: number;
  openTasksCount: number;
  coursesCount: number;
  latestAreaScore: {
    score: number;
    periodCode: string;
    notes: string;
  } | null;
}

export interface AreasWorkspaceDTO {
  workspaceMode: 'member' | 'coordinator' | 'management';
  userScopeKey: string | null;
  selectedScope: EvaluationScopeArea;
  scopes: AreaSummaryCardDTO[];
  canManageSelectedArea: boolean;
  canUpdateTasksInSelectedArea: boolean;
  isAdmin: boolean;
  teamSlug: EvaluationTeamSlug;
  members: AreaMemberDTO[];
  tasks: AreaTaskDTO[];
  courses: AreaCourseDTO[];
  recommendedSlots: AreaCourseSlotDTO[];
  stats: {
    totalMembers: number;
    coordinatorsCount: number;
    todoCount: number;
    inProgressCount: number;
    reviewCount: number;
    doneCount: number;
    coursesCount: number;
    latestScore: {
      score: number;
      periodCode: string;
      notes: string;
    } | null;
  };
}
