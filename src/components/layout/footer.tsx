"use client";

import { useSession } from "@/contexts/auth-context";
import Link from "next/link";
import {
  Github,
  Instagram,
  Linkedin,
  Youtube,
  MapPin,
  Mail,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export interface FooterProps {
  className?: string;
}

export function Footer({ className }: FooterProps) {
  const { user } = useSession();
  const isAdmin = user?.role === "ADMIN";
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className={cn(
        "relative border-t border-white/10 bg-[#080809] text-zinc-400 overflow-hidden",
        className
      )}
    >
      {/* Linha de reflexo metálico no topo */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-5">
          {/* Coluna 1 & 2: Identidade Institucional e Apresentação */}
          <div className="md:col-span-2 space-y-4">
            <Link
              href="/"
              className="inline-block transition-opacity hover:opacity-90"
              aria-label="UFRJ Autônomos"
            >
              <Logo size="md" />
            </Link>
            <p className="max-w-md text-sm text-zinc-400 leading-relaxed">
              Iniciativa multidisciplinar de pesquisa e desenvolvimento em
              veículos robóticos autônomos da Universidade Federal do Rio de
              Janeiro. Desenvolvendo sistemas autônomos inteligentes em drones
              aéreos (<span className="text-zinc-200">Harpia</span>) e veículos
              submarinos (<span className="text-zinc-200">Nautilus</span>).
            </p>

            <div className="space-y-2 pt-2 text-xs text-zinc-500">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                <span>
                  Laboratório de Robótica Autônoma • Escola Politécnica / Centro
                  de Tecnologia (CT), Ilha do Fundão, Rio de Janeiro - RJ.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-400 shrink-0" />
                <a
                  href="mailto:contato@autonomos.ufrj.br"
                  className="hover:text-zinc-200 transition-colors"
                >
                  contato@autonomos.ufrj.br
                </a>
              </div>
            </div>

            {/* Redes Sociais e Canais */}
            <div className="flex items-center gap-2.5 pt-2">
              <a
                href="https://www.youtube.com/channel/UCzkfvicuHA8ZjDb4gNiwqgA"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/10 transition-all"
                aria-label="Canal Oficial no YouTube (Aulas ROS 2)"
              >
                <Youtube className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com/ufrjautonomos"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-pink-400 hover:border-pink-400/40 hover:bg-pink-500/10 transition-all"
                aria-label="Instagram UFRJ Autônomos"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/ufrj-autonomos"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:border-white/40 hover:bg-white/10 transition-all"
                aria-label="Repositório GitHub da Iniciativa"
              >
                <Github className="w-4 h-4" />
              </a>
              <a
                href="https://linkedin.com/company/ufrj-autonomos"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-zinc-400 hover:text-blue-400 hover:border-blue-400/40 hover:bg-blue-500/10 transition-all"
                aria-label="LinkedIn Institucional"
              >
                <Linkedin className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Coluna 3: Divisões de Engenharia */}
          <div className="space-y-4">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold">
              Divisões de Robótica
            </p>
            <div className="space-y-3.5 text-sm">
              <Link
                href={isAdmin ? "/gestao#harpia" : "/"}
                className="group block p-2.5 rounded-xl border border-white/5 hover:border-[#A346CC]/30 hover:bg-[#A346CC]/5 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#A346CC]" />
                  <span className="font-semibold text-zinc-200 group-hover:text-white">
                    UFRJ Harpia
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Aeronaves autônomas, drones e VANTs com PX4 e ROS 2.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-[#A346CC]">
                  <span>Missões SAE AeroDesign</span>
                </div>
              </Link>

              <Link
                href={isAdmin ? "/gestao#nautilus" : "/"}
                className="group block p-2.5 rounded-xl border border-white/5 hover:border-[#387aef]/30 hover:bg-[#387aef]/5 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#387aef]" />
                  <span className="font-semibold text-zinc-200 group-hover:text-white">
                    UFRJ Nautilus
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Submarinos robóticos (AUVs), propulsão 5 DoF e sonar.
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-[10px] font-mono text-[#387aef]">
                  <span>Competição RoboSub</span>
                </div>
              </Link>
            </div>
          </div>

          {/* Coluna 4: Ecossistema & Ensino */}
          <div className="space-y-4">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold">
              Ecossistema & Ensino
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/"
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-zinc-600">•</span>
                  <span>Início</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ensino"
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-zinc-600">•</span>
                  <span>Plataforma de Ensino</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/ensino"
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-zinc-600">•</span>
                  <span>Curso ROS 2 Jazzy (108 Aulas)</span>
                </Link>
              </li>
              {isAdmin && (<>
              <li>
                <Link
                  href="/gestao"
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-zinc-600">•</span>
                  <span>Painel de Gestão & Operações</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/gestao"
                  className="hover:text-zinc-200 transition-colors flex items-center gap-1.5"
                >
                  <span className="text-zinc-600">•</span>
                  <span>Quadro de Integrantes</span>
                </Link>
              </li>
              </>)}
            </ul>
          </div>

          {/* Coluna 5: Institucional & Referências */}
          <div className="space-y-4">
            <p className="text-xs font-mono uppercase tracking-wider text-zinc-200 font-semibold">
              Institucional & Specs
            </p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href="https://ufrj.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-200 transition-colors flex items-center justify-between group"
                >
                  <span>Universidade Federal do Rio de Janeiro</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://poli.ufrj.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-200 transition-colors flex items-center justify-between group"
                >
                  <span>Escola Politécnica da UFRJ</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://ct.ufrj.br"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-200 transition-colors flex items-center justify-between group"
                >
                  <span>Centro de Tecnologia (CT)</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.ros.org/en/jazzy/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-zinc-200 transition-colors flex items-center justify-between group"
                >
                  <span>Documentação ROS 2 Jazzy</span>
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-zinc-400" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra de Direitos e Status Operacional */}
        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-500">
          <div className="flex flex-wrap items-center gap-3 text-center md:text-left">
            <span>© {currentYear} UFRJ Autônomos. Todos os direitos reservados.</span>
            <span className="hidden sm:inline text-zinc-700">•</span>
            <span className="text-zinc-400">Escola Politécnica • UFRJ</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>Sistemas Operacionais - v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
