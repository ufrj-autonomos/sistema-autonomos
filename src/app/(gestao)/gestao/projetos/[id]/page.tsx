import { DirectoryFormPage } from '@/components/gestao/directory-pages';
export const metadata = { title: 'Projeto — Gestão' };
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DirectoryFormPage table="project" id={(await params).id} />;
}
