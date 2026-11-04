'use client';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/theme-context';
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const label = `Ativar modo ${theme === 'dark' ? 'claro' : 'escuro'}`;
  return <button id="theme-toggle" data-activity="theme" type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={label} title={label} className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">{theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}</button>;
}
