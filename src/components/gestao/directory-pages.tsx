import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Plus, ArrowLeft } from 'lucide-react';
import { requirePageUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { db } from '@/lib/institutional/db';
import { adminModels } from '@/lib/institutional/admin-config';
import { directoryPath } from '@/lib/institutional/routes';
import { memberPrivateDetails } from '@/lib/directory';
import { DataTable } from '@/components/institutional/data-table';
import { DirectoryEditor } from './directory-editor';
import { SectionHeader } from './section-header';
import { MemberListPage } from './member-list-page';

type DirectoryTable = 'member' | 'project';

export async function DirectoryListPage({ table }: { table: DirectoryTable }) {
  if (table === 'member') return <MemberListPage />;
  await requirePageUser(true);
  const config = adminModels.project;
  const records = await db.project.findMany({ include: { team: true }, orderBy: [{ year: 'desc' }, { name: 'asc' }] });
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <SectionHeader title={config.name} description="Projetos da equipe, informações internas e controle de exibição no site." />
      <Link href={`${directoryPath(table)}/new`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-100 px-4 text-sm font-medium text-zinc-950 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"><Plus className="h-4 w-4" />Novo projeto</Link>
    </div>
    <p className="text-sm text-zinc-400">{records.length} projetos cadastrados. Os dados públicos são compartilhados com o site institucional.</p>
    <div className="overflow-hidden rounded-xl border border-zinc-800"><DataTable config={config} data={JSON.parse(JSON.stringify(records))} tableSlug={table} /></div>
  </div>;
}

export async function DirectoryFormPage({ table, id, initialView }: { table: DirectoryTable; id: string; initialView?: string }) {
  await requirePageUser(true);
  const isNew = id === 'new';
  if (!isNew && !/^[1-9]\d*$/.test(id)) notFound();
  const record = isNew ? null : table === 'member'
    ? await db.institutionalMember.findUnique({ where: { id: Number(id) } })
    : await db.project.findUnique({ where: { id: Number(id) } });
  if (!isNew && !record) notFound();
  const teams = await db.team.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  const config = { ...adminModels[table], fields: adminModels[table].fields.map(field => field.name === 'teamId' ? {
    ...field, options: [...(table === 'member' ? [{ label: 'Autônomos / Geral', value: '' }] : []), ...teams.map(team => ({ label: team.name, value: team.id }))],
  } : field) };
  const projectsList = table === 'member' ? await db.project.findMany({ select: { id: true, slug: true, name: true, teamId: true } }) : [];
  const models = table === 'project' ? await db.model3D.findMany({ orderBy: { name: 'asc' } }) : [];
  const details = isNew ? null : table === 'member' ? await memberPrivateDetails(Number(id)) : await prisma.projectDetails.findUnique({ where: { institutionalProjectId: Number(id) } });
  const accounts = table === 'member' && !isNew ? await prisma.member.findMany({
    where: {
      OR: [
        { status: 'APPROVED', institutionalMemberId: null },
        { institutionalMemberId: Number(id) },
      ],
    },
    select: { id: true, name: true, email: true, status: true, institutionalMemberId: true },
    orderBy: { name: 'asc' },
  }) : [];
  const accountOptions = accounts
    .filter(account => !account.institutionalMemberId || account.institutionalMemberId === Number(id))
    .map(account => ({
      id: account.id,
      label: `${account.name}${account.email ? ` — ${account.email}` : ' (sem email)'}${account.status !== 'APPROVED' ? ' (acesso suspenso)' : ''}`,
    }));
  const initialData = record || { showOnSite: false, ...(table === 'member' ? { active: true } : { importance: 5 }) };
  return <div className="max-w-5xl space-y-6">
    <Link href={directoryPath(table)} className="inline-flex min-h-11 items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100"><ArrowLeft className="h-4 w-4" />Voltar para {config.name.toLowerCase()}</Link>
    <SectionHeader title={isNew ? (table === 'member' ? 'Novo integrante' : 'Novo projeto') : record!.name} description="Edite os dados compartilhados com o site e as informações exclusivas da gestão." />
    <DirectoryEditor table={table} config={config} id={isNew ? null : Number(id)} initialData={JSON.parse(JSON.stringify(initialData))} projectsList={projectsList} relationsData={{ model3dId: JSON.parse(JSON.stringify(models)) }} details={JSON.parse(JSON.stringify(details))} accounts={accountOptions} initialTab={initialView === 'internal' ? 'private' : 'shared'} />
  </div>;
}
