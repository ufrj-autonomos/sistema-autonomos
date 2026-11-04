import type { ReactNode } from 'react';
export function SectionHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <header className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6"><div><h1 className="font-display text-3xl font-semibold text-foreground">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p></div>{action}</header>;
}
