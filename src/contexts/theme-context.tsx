'use client';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Toaster } from 'sonner';
import { savedTheme, THEME_STORAGE_KEY, type AppTheme } from '@/lib/theme';
const ThemeContext = createContext<{ theme: AppTheme; setTheme: (value: AppTheme) => void }>({ theme: 'dark', setTheme: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, updateTheme] = useState<AppTheme>('dark');
  const apply = useCallback((value: AppTheme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(value);
    document.documentElement.style.colorScheme = value;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'light' ? '#fafafa' : '#0a0a0b');
    updateTheme(value);
  }, []);
  useEffect(() => {
    const read = () => { let value: string | null = null; try { value = localStorage.getItem(THEME_STORAGE_KEY); } catch {} apply(savedTheme(value)); };
    read();
    const sync = (event: StorageEvent) => { if (event.key === THEME_STORAGE_KEY || event.key === null) read(); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [apply]);
  function setTheme(value: AppTheme) { try { localStorage.setItem(THEME_STORAGE_KEY, value); } catch {} apply(value); }
  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}<Toaster theme={theme} richColors closeButton /></ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
