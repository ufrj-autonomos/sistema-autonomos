'use client';

import { useSession } from '@/contexts/auth-context';
import { getEffectiveTeamTheme } from '@/lib/theme';

export function TeamAmbient() {
  const { user } = useSession();
  const team = getEffectiveTeamTheme(user);

  if (!team) return null;

  if (team === 'harpia') {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-30 select-none"
        aria-hidden="true"
      >
        {/* Nuvem Superior Direita */}
        <div className="absolute -top-16 -right-16 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl" />
        <svg
          className="absolute top-4 right-8 h-48 w-80 text-purple-400/20 stroke-purple-300/30"
          viewBox="0 0 240 140"
          fill="currentColor"
        >
          <path
            d="M50,110 Q20,110 20,85 Q20,60 45,55 Q55,25 90,25 Q120,25 135,45 Q150,30 175,30 Q205,30 215,60 Q235,65 235,85 Q235,110 205,110 Z"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Nuvem Inferior Esquerda */}
        <div className="absolute -bottom-20 -left-20 h-96 w-96 rounded-full bg-purple-800/15 blur-3xl" />
        <svg
          className="absolute bottom-12 left-10 h-36 w-64 text-purple-500/15 stroke-purple-400/25"
          viewBox="0 0 240 140"
          fill="currentColor"
        >
          <path
            d="M60,115 Q30,115 30,92 Q30,70 52,65 Q62,35 95,35 Q122,35 135,52 Q148,40 170,40 Q198,40 208,66 Q225,72 225,92 Q225,115 195,115 Z"
            strokeWidth="1.2"
          />
        </svg>
      </div>
    );
  }

  if (team === 'nautilus') {
    return (
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-35 select-none"
        aria-hidden="true"
      >
        {/* Ondas e Profundidade Superior */}
        <div className="absolute -top-24 -right-12 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
        <svg
          className="absolute top-0 right-0 h-64 w-[600px] text-blue-500/20 stroke-blue-400/30"
          viewBox="0 0 600 200"
          fill="none"
        >
          <path
            d="M0,80 C120,130 200,30 320,70 C440,110 520,40 600,90 L600,0 L0,0 Z"
            fill="currentColor"
          />
          <path
            d="M0,110 C140,160 220,60 340,100 C460,140 540,70 600,120"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
          <path
            d="M0,140 C150,180 250,80 370,130 C490,170 550,100 600,150"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeOpacity="0.5"
          />
        </svg>

        {/* Ondas e Relevo Oceânico Inferior */}
        <div className="absolute -bottom-24 -left-12 h-96 w-96 rounded-full bg-sky-600/15 blur-3xl" />
        <svg
          className="absolute bottom-0 left-0 h-52 w-[600px] text-sky-600/15 stroke-sky-400/25"
          viewBox="0 0 600 160"
          fill="none"
        >
          <path
            d="M0,90 C150,50 240,130 360,80 C480,40 540,110 600,70 L600,160 L0,160 Z"
            fill="currentColor"
          />
          <path
            d="M0,60 C130,20 220,100 340,50 C460,20 530,90 600,40"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    );
  }

  return null;
}

