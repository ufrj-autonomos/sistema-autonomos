import { DirectoryListPage } from '@/components/gestao/directory-pages';
export const metadata = { title: 'Integrantes — Gestão' };
export default async function MembersPage() {
  return <DirectoryListPage table="member" />;
}
