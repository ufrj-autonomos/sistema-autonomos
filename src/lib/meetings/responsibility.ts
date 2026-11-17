import type { SafeUser } from '@/lib/session';
import { hasEffectiveRole } from '@/lib/access-policy';
import { normalizeMemberArea, rolesFromCargo } from '@/lib/member-fields';
type DirectoryOffice = { role: string; area: string | null; teamId: number | null };
/** Office determines responsibility; access role determines whether it can be exercised. */
export function meetingMinutesResponsibility(user: Pick<SafeUser, 'role' | 'roles' | 'area' | 'teamId'>, office: DirectoryOffice | null) {
  const isAdmin = hasEffectiveRole(user, 'ADMIN');
  const isCoordinator = hasEffectiveRole(user, 'COORDINATOR');
  if (!isAdmin && !isCoordinator) return null;
  if (office ? !rolesFromCargo(office.role, office.area).includes('COORDINATOR') : !isCoordinator) return null;
  const area = normalizeMemberArea(office ? office.area : user.area);
  if (!area) return null;
  const teamId = office ? office.teamId : user.teamId ?? null;
  if (!isAdmin && teamId !== (user.teamId ?? null)) return null;
  return { area, teamId };
}
