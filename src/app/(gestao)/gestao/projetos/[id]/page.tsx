import { DirectoryFormPage } from '@/components/gestao/directory-pages';
export const metadata = { title: 'Projeto — Gestão' };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  return <DirectoryFormPage table="project" id={(await params).id} initialView={(await searchParams).view} />;
}
