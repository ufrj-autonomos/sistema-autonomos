import type { SafeUser } from '@/lib/session';
import { normalizeMemberArea, roleFromCargo } from '@/lib/member-fields';
type DirectoryOffice = { role: string; area: string | null; teamId: number | null };
/** Office determines responsibility; access role determines whether it can be exercised. */
export function meetingMinutesResponsibility(user: Pick<SafeUser, 'role' | 'area' | 'teamId'>, office: DirectoryOffice | null) {
  if (!['COORDINATOR', 'ADMIN'].includes(user.role)) return null;
  if (office ? roleFromCargo(office.role) !== 'COORDINATOR' : user.role !== 'COORDINATOR') return null;
  const area = normalizeMemberArea(office ? office.area : user.area);
  if (!area) return null;
  const teamId = office ? office.teamId : user.teamId ?? null;
  if (user.role !== 'ADMIN' && teamId !== (user.teamId ?? null)) return null;
  return { area, teamId };
}
