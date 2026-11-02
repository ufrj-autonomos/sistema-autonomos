import { requirePageUser } from '@/lib/session';
import { db } from '@/lib/institutional/db';
export const metadata = { title: 'Mensagens do site — Gestão' };
export default async function InstitutionalMessages() {
  await requirePageUser(true);
  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  return <section><h1 className="font-display text-3xl font-semibold">Mensagens do site</h1><p className="mt-3 text-sm text-muted-foreground">As 100 mensagens mais recentes do formulário de contato. Acesso exclusivo da gestão.</p><div className="mt-6 divide-y divide-border border-y border-border">{messages.length ? messages.map(message => <article key={message.id} className="space-y-2 py-5"><h2 className="font-semibold">{message.subject}</h2><p className="break-words text-sm text-muted-foreground">{message.name} · {message.email} · {message.teamSlug} · {message.intent}</p><time className="block text-xs text-muted-foreground">{message.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</time><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.message}</p></article>) : <p className="py-8 text-sm text-muted-foreground">Nenhuma mensagem recebida.</p>}</div></section>;
}
