import { requirePageUser } from '@/lib/session';
import { getAreasWorkspace } from '@/lib/areas/service';
import { AreasWorkspaceClient } from '@/components/areas/areas-workspace-client';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Espaço das Áreas — UFRJ Autônomos',
  description: 'Passagem de tarefas, cursos por área e integrantes de cada divisão da equipe.',
};

export default async function AreasPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; tab?: string }>;
}) {
  const user = await requirePageUser(false);
  const params = await searchParams;
  const initialData = await getAreasWorkspace(user, params.scope);
  const initialTab =
    params.tab === 'courses' || params.tab === 'members' ? params.tab : 'tasks';

  return (
    <AreasWorkspaceClient
      initialData={initialData}
      currentUserId={user.id}
      initialTab={initialTab}
    />
  );
}
