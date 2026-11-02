import { DirectoryFormPage } from '@/components/gestao/directory-pages';
export const metadata = { title: 'Integrante — Gestão' };
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  return <DirectoryFormPage table="member" id={(await params).id} initialView={(await searchParams).view} />;
}
