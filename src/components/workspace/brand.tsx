import Link from 'next/link';
export function WorkspaceBrand({ href = '/', subtitle = 'Espaço da equipe' }: { href?: string; subtitle?: string }) {
  return <Link href={href} className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-ring">
    <span aria-hidden="true" className="relative block h-9 w-9 shrink-0"><img src="/images/logos/autonomos/symbol-dark.svg" alt="" width={36} height={36} className="brand-light h-9 w-9" /><img src="/images/logos/autonomos/symbol-white.svg" alt="" width={36} height={36} className="brand-dark h-9 w-9" /></span>
    <span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-tight">UFRJ Autônomos</span><span className="mt-0.5 block text-xs text-muted-foreground">{subtitle}</span></span>
  </Link>;
}
