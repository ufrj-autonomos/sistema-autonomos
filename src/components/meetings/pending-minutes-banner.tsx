import Link from 'next/link';
import type { SafeUser } from '@/lib/session';
import { pendingMeetingMinutes } from '@/lib/meetings/service';
export async function PendingMinutesBanner({ user }: { user: SafeUser }) {
  const pending = await pendingMeetingMinutes(user).catch(() => null);
  if (!pending) return <p role="status" className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Não foi possível consultar as atas pendentes. <Link href="/reunioes" className="underline">Abrir reuniões</Link></p>;
  if (!pending.total) return null;
  return <section aria-label="Atas de reunião pendentes" className="rounded-xl border border-amber-600/30 bg-amber-500/5 p-5"><h2 className="font-semibold text-foreground">{pending.total} {pending.total === 1 ? 'reunião está sem ata' : 'reuniões estão sem ata'}</h2><p className="mt-2 text-sm text-muted-foreground">A chamada pode ser feita primeiro. Adicione as atas para que os membros acompanhem os assuntos e as decisões.</p><ul className="mt-3 divide-y divide-border">{pending.meetings.map(meeting => <li key={meeting.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{meeting.title} · {meeting.area} · {new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(meeting.date)}</span><Link href={`/reunioes?${new URLSearchParams({ period: meeting.period, area: `${meeting.area}-${meeting.teamId}`, meeting: meeting.id, ata: '1' })}`} className="inline-flex min-h-11 items-center rounded-lg border border-border bg-background px-3 font-medium hover:bg-accent">Adicionar ata</Link></li>)}</ul>{pending.total > pending.meetings.length && <Link href="/reunioes" className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Ver demais reuniões</Link>}</section>;
}
