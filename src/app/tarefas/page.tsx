import { requirePageUser } from '@/lib/session';
import { getAreasWorkspace } from '@/lib/areas/service';
import { AreasWorkspaceClient } from '@/components/areas/areas-workspace-client';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tarefas — UFRJ Autônomos' };

export default async function TasksPage() {
  const user = await requirePageUser(false);
  const data = await getAreasWorkspace(user);
  return <AreasWorkspaceClient initialData={data} currentUserId={user.id} tasksOnly />;
}
