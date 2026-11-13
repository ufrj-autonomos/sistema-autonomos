'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Box,
  Clock,
  Eye,
  FolderKanban,
  Image as ImageIcon,
  LayoutGrid,
  Mail,
  Settings,
  Shield,
  Trophy,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const SITE_NAV_ITEMS = [
  { href: '/gestao/site', label: 'Painel do Site', icon: LayoutGrid, exact: true },
  { href: '/gestao/site/membros', label: 'Exibição de Membros', icon: Eye },
  { href: '/gestao/site/timelineevent', label: 'História', icon: Clock },
  { href: '/gestao/site/galleryimage', label: 'Galeria de Fotos', icon: ImageIcon },
  { href: '/gestao/site/competition', label: 'Competições', icon: Trophy },
  { href: '/gestao/site/sponsor', label: 'Patrocinadores', icon: Briefcase },
  { href: '/gestao/projetos', label: 'Projetos', icon: FolderKanban },
  { href: '/gestao/site/team', label: 'Equipes', icon: Shield },
  { href: '/gestao/site/model3d', label: 'Modelos 3D', icon: Box },
  { href: '/gestao/site/mensagens', label: 'Mensagens', icon: Mail },
  { href: '/gestao/site/settings', label: 'Configurações', icon: Settings },
] as const;

export function SiteSubnav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação rápida do site institucional"
      className="mb-6 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-areas border-b border-border/70"
    >
      {SITE_NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const active =
          'exact' in item && item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap border',
              active
                ? 'border-primary/40 bg-primary text-primary-foreground shadow-2xs'
                : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
