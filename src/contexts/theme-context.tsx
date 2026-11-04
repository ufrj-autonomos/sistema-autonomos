'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';

export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'autonomos:theme';
const ThemeContext = createContext<{ preference: ThemePreference; resolved: 'light' | 'dark'; setPreference: (value: ThemePreference) => void }>({ preference: 'system', resolved: 'light', setPreference: () => {} });

export const themeBootstrap = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');var t=(p==='dark'||p==='light')?p:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.remove('dark','light');document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t}catch(e){}})()`;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, updatePreference] = useState<ThemePreference>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');
  const apply = useCallback((value: ThemePreference) => {
    const theme = value === 'system' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : value;
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
    updatePreference(value);
    setResolved(theme);
  }, []);
  useEffect(() => {
    const read = () => { let value: string | null = null; try { value = localStorage.getItem(THEME_STORAGE_KEY); } catch {} apply(value === 'light' || value === 'dark' ? value : 'system'); };
    read();
    const query = matchMedia('(prefers-color-scheme: dark)');
    const syncStorage = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY || event.key === null) read(); };
    query.addEventListener('change', read);
    window.addEventListener('storage', syncStorage);
    return () => { query.removeEventListener('change', read); window.removeEventListener('storage', syncStorage); };
  }, [apply]);
  const setPreference = (value: ThemePreference) => { try { localStorage.setItem(THEME_STORAGE_KEY, value); } catch {} apply(value); };
  return <ThemeContext.Provider value={{ preference, resolved, setPreference }}>{children}<Toaster theme={resolved} richColors closeButton /></ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
