"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Terminal,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/contexts/auth-context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Destino pós-login sanitizado (previne vulnerabilidade de open-redirect)
  const rawRedirect =
    searchParams.get("redirect") ||
    searchParams.get("returnUrl") ||
    "/";
  const safeRedirect =
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//") &&
    !rawRedirect.includes("\\")
      ? rawRedirect
      : "/";

  // Se já estiver logado, redireciona diretamente
  React.useEffect(() => {
    if (isAuthenticated) {
      router.push(safeRedirect);
    }
  }, [isAuthenticated, router, safeRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validação Client-Side
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Por favor, informe seu email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Formato de email inválido (ex: nome@poli.ufrj.br).");
      return;
    }

    if (!password) {
      setErrorMessage("Por favor, informe sua senha.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login({ email: trimmedEmail, password });

      if (!result.success) {
        setErrorMessage(result.error || "Credenciais inválidas. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      // Sucesso: se for o primeiro login após aprovação, direciona ao perfil para completar cadastro
      if (result.firstLogin) {
        router.push("/perfil?welcome=1");
      } else {
        router.push(safeRedirect);
      }
      router.refresh();
    } catch {
      setErrorMessage("Erro inesperado durante login. Tente novamente mais tarde.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Botão de Retorno Rápido */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao portal</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-500">
          UFRJ • CT • COPPE
        </span>
      </div>

      {/* Card Principal — Engineering Studio com Blueprint Corners */}
      <div className="relative rounded-2xl bg-[#111113] border border-white/10 p-6 sm:p-8 shadow-2xl blueprint-corners overflow-hidden">
        {/* Glow sutil no topo do card */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-32 bg-white/5 blur-2xl rounded-full" />

        {/* Cabeçalho do Card com Logo Vetorial */}
        <div className="relative space-y-4 text-center pb-6 border-b border-white/10">
          <div className="flex justify-center">
            <Logo division="autonomos" variant="horizontal" size="md" priority />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-300">
            <Terminal className="w-3 h-3 text-zinc-400" />
            <span className="tracking-widest uppercase">AUTÔNOMOS AUTH // ENTRADA</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Acessar Plataforma
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Entre com uma conta aprovada para acessar a equipe e os cursos.
            </p>
          </div>
        </div>

        {searchParams.get("registered") === "1" && (
          <p role="status" className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Cadastro recebido. Aguarde a aprovação de um administrador. Depois, entre com seu email e senha.
          </p>
        )}
        {searchParams.get("reset") === "1" && (
          <p role="status" className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
            Senha atualizada com sucesso! Entre com seu email e sua nova senha.
          </p>
        )}
        {/* Alerta de Erro Visual */}
        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-start gap-2.5 animate-in fade-in duration-200"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Formulário de Autenticação */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* Campo Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Email de Acesso
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                disabled={isSubmitting}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@poli.ufrj.br"
                className="w-full rounded-lg bg-black/40 border border-white/10 pl-9 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all font-sans disabled:opacity-50"
              />
            </div>
          </div>

          {/* Campo Senha */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
              >
                Senha
              </label>
              
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={isSubmitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg bg-black/40 border border-white/10 pl-9 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all font-sans disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200 focus:outline-hidden cursor-pointer"
                aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <Link
                href={email.trim() ? `/forgot-password?email=${encodeURIComponent(email.trim())}` : "/forgot-password"}
                className="text-xs font-mono text-red-400 hover:text-red-300 underline underline-offset-4 transition-colors"
              >
                Esqueci minha senha              
            </Link>
          </div>

          {/* Botão de Envio */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold font-display text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé Interno do Card */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center justify-between gap-3 text-xs text-zinc-400">
          <p>
            Não possui uma conta?{" "}
            <Link
              href={`/register${
                safeRedirect !== "/ensino"
                  ? `?redirect=${encodeURIComponent(safeRedirect)}`
                  : ""
              }`}
              className="text-zinc-200 hover:text-white font-medium underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
            >
              Cadastre-se gratuitamente
            </Link>
          </p>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>SESSÃO SEGURA • CRIPTOGRAFIA AES-256 JWT</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-[#111113] border border-white/10 animate-pulse space-y-6">
      <div className="h-8 w-40 mx-auto bg-white/5 rounded-lg" />
      <div className="h-4 w-48 mx-auto bg-white/5 rounded-lg" />
      <div className="space-y-4 pt-4">
        <div className="h-10 bg-white/5 rounded-lg" />
        <div className="h-10 bg-white/5 rounded-lg" />
        <div className="h-10 bg-white/10 rounded-lg" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0A0A0B] bg-grid-sm">
      {/* Luz ambiente técnica */}
      <div className="pointer-events-none absolute -top-40 right-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl" />

      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
