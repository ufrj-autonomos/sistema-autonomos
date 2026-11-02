'use client';
import { createContext, useContext, type ReactNode } from 'react';
const SiteOrigin = createContext('https://ufrjautonomos.com');
export function InstitutionalSiteProvider({ origin, children }: { origin: string; children: ReactNode }) { return <SiteOrigin.Provider value={origin}>{children}</SiteOrigin.Provider>; }
export function useInstitutionalAsset() {
  const origin = useContext(SiteOrigin);
  return (value: string) => value.startsWith('/') ? new URL(value, origin).toString() : value;
}
