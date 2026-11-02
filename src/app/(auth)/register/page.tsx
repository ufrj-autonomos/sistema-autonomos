"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  User,
  Mail,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Terminal,
  ShieldCheck,
  ArrowLeft,
  Check,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { useSession } from "@/contexts/auth-context";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isAuthenticated } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Destino pós-cadastro sanitizado
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

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    // 1. Validação do Nome
    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage("Por favor, informe seu nome completo (mínimo de 2 caracteres).");
      return;
    }

    // 2. Validação do Email
    if (!trimmedEmail) {
      setErrorMessage("Por favor, informe seu endereço de email.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage("Formato de email inválido (ex: aluno@poli.ufrj.br).");
      return;
    }

    // 3. Validação da Senha (backend exige >= 6 caracteres)
    if (!password || password.length < 6) {
      setErrorMessage("A senha deve conter no mínimo 6 caracteres.");
      return;
    }

    // 4. Confirmação de Senha
    if (password !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await register({
        name: trimmedName,
        email: trimmedEmail,
        password,
      });

      if (!result.success) {
        setErrorMessage(result.error || "Não foi possível concluir o cadastro.");
        setIsSubmitting(false);
        return;
      }

      router.push("/login?registered=1");
      router.refresh();
    } catch {
      setErrorMessage("Erro inesperado ao criar conta. Tente novamente mais tarde.");
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
        {/* Glow sutil */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-32 bg-white/5 blur-2xl rounded-full" />

        {/* Cabeçalho do Card */}
        <div className="relative space-y-4 text-center pb-6 border-b border-white/10">
          <div className="flex justify-center">
            <Logo division="autonomos" variant="horizontal" size="md" priority />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-300">
            <Terminal className="w-3 h-3 text-zinc-400" />
            <span className="tracking-widest uppercase">AUTÔNOMOS AUTH // REGISTRO</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Criar Conta de Acesso
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Crie sua conta para solicitar acesso à equipe e aos cursos. Um administrador precisa aprovar seu cadastro.
            </p>
          </div>
        </div>

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

        {/* Formulário de Cadastro */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          {/* Campo Nome */}
          <div className="space-y-1.5">
            <label
              htmlFor="name"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Nome Completo
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <User className="w-4 h-4" />
              </div>
              <input
                id="name"
                type="text"
                autoComplete="name"
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Eduardo"
                className="w-full rounded-lg bg-black/40 border border-white/10 pl-9 pr-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all font-sans disabled:opacity-50"
              />
            </div>
          </div>

          {/* Campo Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Email Institucional / Pessoal
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
            <label
              htmlFor="password"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Senha (mínimo 6 caracteres)
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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
          </div>

          {/* Campo Confirmação de Senha */}
          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Confirmar Senha
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha digitada"
                className="w-full rounded-lg bg-black/40 border border-white/10 pl-9 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all font-sans disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-200 focus:outline-hidden cursor-pointer"
                aria-label={
                  showConfirmPassword ? "Ocultar confirmação" : "Exibir confirmação"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Checklist de Validação Visual */}
            {password && (
              <div className="pt-1 flex items-center gap-4 text-[11px] font-mono">
                <span
                  className={
                    password.length >= 6
                      ? "text-emerald-400 flex items-center gap-1"
                      : "text-zinc-500 flex items-center gap-1"
                  }
                >
                  <Check className="w-3 h-3" />
                  <span>≥ 6 caracteres</span>
                </span>
                {confirmPassword && (
                  <span
                    className={
                      password === confirmPassword
                        ? "text-emerald-400 flex items-center gap-1"
                        : "text-amber-400 flex items-center gap-1"
                    }
                  >
                    <Check className="w-3 h-3" />
                    <span>Senhas coincidem</span>
                  </span>
                )}
              </div>
            )}
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
                <span>Enviando cadastro...</span>
              </>
            ) : (
              <>
                <span>Cadastrar e Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Rodapé Interno do Card */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center justify-between gap-3 text-xs text-zinc-400">
          <p>
            Já possui uma conta ativa?{" "}
            <Link
              href={`/login${
                safeRedirect !== "/ensino"
                  ? `?redirect=${encodeURIComponent(safeRedirect)}`
                  : ""
              }`}
              className="text-zinc-200 hover:text-white font-medium underline underline-offset-4 decoration-zinc-600 hover:decoration-white transition-colors"
            >
              Fazer login
            </Link>
          </p>

          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>ACESSO INSTITUCIONAL • TERMOS DE USO UFRJ</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterFormSkeleton() {
  return (
    <div className="w-full max-w-md p-8 rounded-2xl bg-[#111113] border border-white/10 animate-pulse space-y-6">
      <div className="h-8 w-40 mx-auto bg-white/5 rounded-lg" />
      <div className="h-4 w-48 mx-auto bg-white/5 rounded-lg" />
      <div className="space-y-4 pt-4">
        <div className="h-10 bg-white/5 rounded-lg" />
        <div className="h-10 bg-white/5 rounded-lg" />
        <div className="h-10 bg-white/5 rounded-lg" />
        <div className="h-10 bg-white/10 rounded-lg" />
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0A0A0B] bg-grid-sm">
      {/* Luz ambiente técnica */}
      <div className="pointer-events-none absolute -top-40 right-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl" />

      <Suspense fallback={<RegisterFormSkeleton />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
