export type AppTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'autonomos:theme';
export const TEAM_THEME_STORAGE_KEY = 'autonomos:team';

export function savedTheme(value: string | null): AppTheme { return value === 'light' ? 'light' : 'dark'; }

export function getEffectiveTeamTheme(user?: { role?: string; teamSlug?: string | null } | null): 'harpia' | 'nautilus' | null {
  if (!user || user.role === 'ADMIN') return null;
  if (user.teamSlug === 'harpia') return 'harpia';
  if (user.teamSlug === 'nautilus') return 'nautilus';
  return null;
}

export function applyTeamTheme(team?: string | null) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('theme-harpia', 'theme-nautilus');
  if (team === 'harpia') {
    document.documentElement.classList.add('theme-harpia');
  } else if (team === 'nautilus') {
    document.documentElement.classList.add('theme-nautilus');
  }
}

// Default remains dark; a saved explicit choice is applied before the first paint.
export const themeBootstrap = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')==='light'?'light':'dark';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t;var tm=localStorage.getItem('${TEAM_THEME_STORAGE_KEY}');if(tm==='harpia'){document.documentElement.classList.add('theme-harpia')}else if(tm==='nautilus'){document.documentElement.classList.add('theme-nautilus')}}catch(e){}})()`;
