'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { isManagementPage } from '@/lib/management-navigation';

export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isManagementPage(pathname)) return children;
  return <><Navbar /><main className="flex flex-1 flex-col">{children}</main><Footer /></>;
}
