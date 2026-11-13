"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { hasManagementAccess } from "@/lib/access-policy";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  BookOpen,
  ShieldCheck,
  Home,
  Clock3,
  CalendarCheck,
  LogOut,
  ArrowRight,
  UserCircle,
  Wallet,
  Lightbulb,
} from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { useSession, SafeUser } from "@/contexts/auth-context";

export type { SafeUser };

export interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const pathname = usePathname();
  const { user, isLoading: isLoadingAuth, logout: handleLogout } = useSession();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechamento automático de menus ao navegar entre rotas
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsUserDropdownOpen(false);
  }, [pathname]);

  // Fechamento de dropdown ao clicar fora ou pressionar tecla Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsUserDropdownOpen(false);
        setIsMobileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Bloqueio do scroll do body quando o drawer mobile está aberto
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Lógica de verificação de rota ativa
  function isRouteActive(href: string): boolean {
    if (!pathname) return false;
    if (href === "/") {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const canAccessManagement = hasManagementAccess(user?.role);
  const NAV_LINKS = [
    { label: "Início", href: "/", icon: Home },
    { label: "Ensino", href: "/ensino", icon: BookOpen },
    { label: "Presença", href: "/presenca", icon: Clock3 },
    { label: "Reuniões", href: "/reunioes", icon: CalendarCheck },
    { label: "Reembolsos", href: "/reembolsos", icon: Wallet },
    { label: "Ideias & Bugs", href: "/melhorias", icon: Lightbulb },
    { label: "Meu Perfil", href: "/perfil", icon: UserCircle },
    { label: "Gestão", href: "/gestao", icon: ShieldCheck },
  ].filter(item => Boolean(user) && (item.href !== "/gestao" || canAccessManagement));

  // Iniciais do usuário para avatar de fallback
  const userInitials = user?.name
    ? user.name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "UA";

  // Identificação do rótulo da role técnica
  const roleDisplay = (() => {
    switch (user?.role) {
      case "ADMIN":
        return {
          label: "Admin",
          badgeClass: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
        };
      case "MANAGEMENT":
        return {
          label: "Gestão",
          badgeClass: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
        };
      case "MEMBER":
        return {
          label: "Membro",
          badgeClass: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20",
        };
      case "TRAINEE":
      default:
        return {
          label: "Trainee",
          badgeClass: "bg-muted-foreground/10 text-muted-foreground border-border",
        };
    }
  })();

  return (
    <>
      <header
      className={cn(
        "sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b border-border transition-colors duration-200",
        className
      )}
    >
      <div className="flex h-16 w-full items-center justify-between px-2 sm:px-4 lg:px-6">
        {/* Identidade Visual / Logo da Iniciativa */}
        <div className="flex items-center gap-3 xl:gap-6 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-2 group transition-opacity hover:opacity-90 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring rounded-lg p-0.5 shrink-0"
            aria-label="UFRJ Autônomos — Página Inicial"
          >
            <Logo size="sm" priority />
          </Link>

          {/* Navegação Primária Desktop */}
          <nav
            className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0"
            aria-label="Navegação Principal"
          >
            {NAV_LINKS.map((item) => {
              const active = isRouteActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap",
                    active
                      ? "bg-foreground/10 text-foreground border border-border shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-transparent"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 shrink-0",
                      active ? "text-foreground" : "text-muted-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Lado Direito: Portais das Divisões + Widget de Autenticação + Menu Mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Portais Rápidos das Divisões (Harpia & Nautilus) em Desktop */}
          {canAccessManagement && (
          <div className="hidden xl:flex items-center gap-1.5 pr-2 border-r border-border">
            <Link
              href="/gestao/divisoes#harpia"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
              title="Divisão Harpia — Aeronaves Autônomas"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#A346CC]" />
              <span>Harpia</span>
            </Link>
            <Link
              href="/gestao/divisoes#nautilus"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
              title="Divisão Nautilus — Veículos Subaquáticos"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#387aef]" />
              <span>Nautilus</span>
            </Link>
          </div>
          )}

          <ThemeToggle />
          {/* Widget de Autenticação */}
          {isLoadingAuth ? (
            <div className="h-8 w-24 rounded-lg bg-foreground/5 animate-pulse" />
          ) : user ? (
            /* Usuário Autenticado */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen((prev) => !prev)}
                className={cn(
                  "flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-border hover:border-border hover:bg-foreground/5 transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
                  isUserDropdownOpen && "bg-foreground/10 border-border"
                )}
                aria-expanded={isUserDropdownOpen}
                aria-haspopup="true"
                aria-label="Menu da conta do usuário"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-card border border-border flex items-center justify-center text-xs font-mono font-medium text-foreground">
                    {userInitials}
                  </div>
                )}
                <span className="text-sm font-medium text-foreground hidden sm:inline max-w-[120px] truncate">
                  {user.name.split(" ")[0]}
                </span>
                {user.role !== 'ADMIN' && user.teamSlug === 'harpia' && (
                  <span className="hidden md:inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-500/30">
                    ☁️ Harpia
                  </span>
                )}
                {user.role !== 'ADMIN' && user.teamSlug === 'nautilus' && (
                  <span className="hidden md:inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-500/30">
                    🌊 Nautilus
                  </span>
                )}
                {user.role === 'ADMIN' && (
                  <span className="hidden md:inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    🤖 Autônomos
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                    isUserDropdownOpen && "rotate-180"
                  )}
                />
              </button>

              {/* Dropdown Menu Flutuante */}
              {isUserDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-60 rounded-xl bg-card border border-border shadow-2xl p-1.5 z-50 text-sm animate-in fade-in zoom-in-95 duration-150"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="px-3 py-2.5 border-b border-border mb-1">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {user.email}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "text-[10px] font-mono px-2 py-0.5 rounded border font-medium",
                          roleDisplay.badgeClass
                        )}
                      >
                        {roleDisplay.label}
                      </span>
                      {user.role !== 'ADMIN' && user.teamSlug === 'harpia' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-500/30 flex items-center gap-1">
                          <span>☁️</span> Divisão Harpia
                        </span>
                      )}
                      {user.role !== 'ADMIN' && user.teamSlug === 'nautilus' && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-500/30 flex items-center gap-1">
                          <span>🌊</span> Divisão Nautilus
                        </span>
                      )}
                      {(user.role === 'ADMIN' || !user.teamSlug || user.teamSlug === 'autonomos') && (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                          Autônomos Geral
                        </span>
                      )}
                    </div>
                  </div>

                  <Link
                    href="/perfil"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-secondary-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors text-sm"
                    role="menuitem"
                  >
                    <UserCircle className="w-4 h-4 text-muted-foreground" />
                    <span>Meu Perfil de Integrante</span>
                  </Link>

                  <Link
                    href="/ensino"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-secondary-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors text-sm"
                    role="menuitem"
                  >
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span>Plataforma de Ensino</span>
                  </Link>

                  <Link
                    href="/reembolsos"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-secondary-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors text-sm"
                    role="menuitem"
                  >
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span>Meus Reembolsos</span>
                  </Link>

                  <Link
                    href="/melhorias"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-secondary-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors text-sm"
                    role="menuitem"
                  >
                    <Lightbulb className="w-4 h-4 text-muted-foreground" />
                    <span>Bugs, Ideias &amp; Melhorias</span>
                  </Link>

                  {canAccessManagement && (
                  <Link
                    href="/gestao"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 text-secondary-foreground hover:text-foreground hover:bg-foreground/5 rounded-lg transition-colors text-sm"
                    role="menuitem"
                  >
                    <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                    <span>Painel de Gestão</span>
                  </Link>
                  )}

                  <div className="h-px bg-foreground/10 my-1" />

                  <button
                    type="button"
                    onClick={() => handleLogout()}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left cursor-pointer"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair da conta</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Usuário Não Autenticado */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm font-medium text-secondary-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="hidden sm:inline-flex text-sm font-semibold bg-primary text-primary-foreground px-3.5 py-1.5 rounded-lg hover:bg-primary/90 transition-all shadow-xs"
              >
                Cadastrar
              </Link>
            </div>
          )}

          {/* Botão Hambúrguer Mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="flex lg:hidden items-center justify-center h-9 w-9 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={
              isMobileMenuOpen ? "Fechar menu de navegação" : "Abrir menu de navegação"
            }
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </header>

    {/* Drawer Mobile: Fundo Escurecido (Backdrop) fora do header para cobrir 100% da viewport */}
    {isMobileMenuOpen && (
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden="true"
      />
    )}

    {/* Drawer Mobile: Painel Deslizante desacoplado do header */}
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal de navegação"
      className={cn(
        "fixed inset-y-0 right-0 z-50 w-full max-w-xs bg-background border-l border-border flex flex-col shadow-2xl transition-transform duration-300 ease-in-out lg:hidden h-[100dvh] overflow-hidden",
        isMobileMenuOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
      )}
    >
      {/* Topo do Drawer */}
      <div className="flex items-center justify-between border-b border-border p-5 shrink-0 bg-background">
        <Link
          href="/"
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center gap-2"
        >
          <Logo size="sm" />
        </Link>
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/5 cursor-pointer"
          aria-label="Fechar menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Corpo com Scroll Suave */}
      <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-6">
        {/* Links Primários de Navegação */}
        <nav className="flex flex-col gap-1.5" aria-label="Menu Mobile">
          <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-3 mb-1">
            Navegação
          </p>
          {NAV_LINKS.map((item) => {
            const active = isRouteActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all",
                  active
                    ? "bg-foreground/10 text-foreground border border-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-foreground/5 border border-transparent"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Seção das Divisões de Robótica */}
        {canAccessManagement && (
          <div className="pt-2 border-t border-border">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground px-3 mb-2">
              Divisões Autônomos
            </p>
            <div className="flex flex-col gap-1.5">
              <Link
                href="/gestao/divisoes#harpia"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-foreground/5 hover:text-foreground transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#A346CC]" />
                  <span>Divisão Harpia (UAV)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
              <Link
                href="/gestao/divisoes#nautilus"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2 rounded-lg text-sm text-secondary-foreground hover:bg-foreground/5 hover:text-foreground transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 rounded-full bg-[#387aef]" />
                  <span>Divisão Nautilus (AUV)</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Rodapé Fixo do Drawer: Autenticação & Status */}
      <div className="shrink-0 p-5 border-t border-border bg-background/80 backdrop-blur-sm space-y-4">
        {user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-foreground/5 border border-border">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-accent border border-border flex items-center justify-center text-xs font-mono font-medium text-foreground">
                  {userInitials}
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.email}
                </p>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {user.role !== 'ADMIN' && user.teamSlug === 'harpia' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-500/30">
                      ☁️ Divisão Harpia
                    </span>
                  )}
                  {user.role !== 'ADMIN' && user.teamSlug === 'nautilus' && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-900/40 dark:text-sky-200 dark:border-sky-500/30">
                      🌊 Divisão Nautilus
                    </span>
                  )}
                  {(user.role === 'ADMIN' || !user.teamSlug || user.teamSlug === 'autonomos') && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-800 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                      Autônomos Geral
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleLogout()}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm font-medium hover:bg-red-500/20 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da conta</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-center py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-foreground/5 transition"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-center py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition"
            >
              Cadastrar
            </Link>
          </div>
        )}

        {/* Chip de Status do Sistema */}
        <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Sistemas Online
          </span>
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  </>
  );
}
