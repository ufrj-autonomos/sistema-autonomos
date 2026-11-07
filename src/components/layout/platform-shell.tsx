'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { isManagementPage } from '@/lib/management-navigation';
import { TeamAmbient } from '@/components/theme/team-ambient';

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isManagementPage(pathname)) {
    return (
      <>
        <TeamAmbient />
        {children}
      </>
    );
  }
  return (
    <>
      <TeamAmbient />
      <Navbar />
      <main className="flex flex-1 flex-col relative z-10">{children}</main>
      <Footer />
    </>
  );
}
