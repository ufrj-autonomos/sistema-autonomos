import { MemberListPage } from '@/components/gestao/member-list-page';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Ex-membros (Alumni) — Gestão' };

export default async function ExMembrosPage() {
  return <MemberListPage mode="alumni" />;
}
