export type AppTheme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'autonomos:theme';
export function savedTheme(value: string | null): AppTheme { return value === 'light' ? 'light' : 'dark'; }
// Default remains dark; a saved explicit choice is applied before the first paint.
export const themeBootstrap = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}')==='light'?'light':'dark';document.documentElement.classList.remove('light','dark');document.documentElement.classList.add(t);document.documentElement.style.colorScheme=t}catch(e){}})()`;
