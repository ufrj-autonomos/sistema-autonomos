'use client';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme, type ThemePreference } from '@/contexts/theme-context';
export function ThemeToggle() {
  const { resolved, setPreference } = useTheme();
  return <button type="button" onClick={() => setPreference(resolved === 'dark' ? 'light' : 'dark')} className="workspace-icon-button" title={`Ativar tema ${resolved === 'dark' ? 'claro' : 'escuro'}`} aria-label={`Ativar tema ${resolved === 'dark' ? 'claro' : 'escuro'}`}>{resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>;
}
export function ThemeChoices() {
  const { preference, setPreference } = useTheme();
  return <fieldset className="min-w-0"><legend className="mb-2 text-xs font-medium text-muted-foreground">Aparência</legend><div className="flex gap-1 rounded-lg border border-border bg-background p-1">{([{ value: 'light', label: 'Claro', icon: Sun }, { value: 'dark', label: 'Escuro', icon: Moon }, { value: 'system', label: 'Sistema', icon: Monitor }] as const).map(({ value, label, icon: Icon }) => <label key={value} className={`relative flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 text-xs ${preference === value ? 'bg-primary font-medium text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}><input type="radio" name="workspace-theme" value={value} checked={preference === value} onChange={() => setPreference(value as ThemePreference)} className="peer sr-only" /><span className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring" /><Icon size={14} aria-hidden="true" />{label}</label>)}</div></fieldset>;
}
