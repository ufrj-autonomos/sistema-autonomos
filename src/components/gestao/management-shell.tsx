'use client';
import type { ReactNode } from 'react';
import type { SafeUser } from '@/lib/session';
import { AppShell } from '@/components/workspace/app-shell';
export function ManagementShell({ children, initialUser }: { children: ReactNode; initialUser: SafeUser }) {
  return <AppShell management initialUser={initialUser}>{children}</AppShell>;
}
