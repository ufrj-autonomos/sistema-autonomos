import { DirectoryFormPage } from '@/components/gestao/directory-pages';
export const metadata = { title: 'Integrante — Gestão' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DirectoryFormPage table="member" id={(await params).id} />;
}
