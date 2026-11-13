export type VisitStatus = 'OPEN' | 'CLOSED' | 'REVIEW' | 'VOID';
export type GoalStatus = 'MET' | 'PENDING' | 'MISSED' | 'NOT_REQUIRED';
export type MemberIdentifier = string | number;
export interface AttendanceVisitDto {
  id: string; memberId: MemberIdentifier; checkedInAt: string; checkedOutAt: string | null;
  status: VisitStatus; source: string; seconds: number; needsReview: boolean;
}
export interface AttendanceMemberDto {
  id: MemberIdentifier; name: string; email: string | null; area: string;
  requiredSeconds: number; completedSeconds: number; remainingSeconds: number;
  justifiedSeconds?: number;
  percentage: number; status: GoalStatus; missedWeeks: number;
  isMonthly?: boolean;
  openVisit: AttendanceVisitDto | null; pendingReviews: number; visits: AttendanceVisitDto[];
}
export interface AttendanceReport {
  serverNow: string;
  week: { key: string; sunday: string; start: string; end: string; isCurrent: boolean; isClosed: boolean };
  members: AttendanceMemberDto[];
  summary: { requiredMembers: number; met: number; pending: number; missed: number; review: number; inLab: number; completedSeconds: number };
  trackingStartedAt: string;
}
export interface ScanResult {
  action: 'IN' | 'OUT'; registeredAt: string; duplicate: boolean; visit: AttendanceVisitDto;
}
