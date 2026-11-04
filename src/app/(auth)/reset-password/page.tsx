"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
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
  CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";
  const wasSent = searchParams.get("sent") === "1";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = code.replace(/\D/g, "");

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Informe seu endereço de email.");
      return;
    }

    if (trimmedCode.length !== 6) {
      setErrorMessage("Informe o código de 6 dígitos enviado para seu email.");
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage("A nova senha deve conter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("As senhas informadas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          code: trimmedCode,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Não foi possível redefinir a senha.");
        setIsSubmitting(false);
        return;
      }

      router.push("/login?reset=1");
    } catch {
      setErrorMessage("Erro de comunicação com o servidor. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-2 text-xs font-mono text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Solicitar novo código</span>
        </Link>
        <span className="text-[11px] font-mono text-zinc-500">
          UFRJ • CT • COPPE
        </span>
      </div>

      <div className="relative rounded-2xl bg-[#111113] border border-white/10 p-6 sm:p-8 shadow-2xl blueprint-corners overflow-hidden">
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-32 bg-white/5 blur-2xl rounded-full" />

        <div className="relative space-y-4 text-center pb-6 border-b border-white/10">
          <div className="flex justify-center">
            <Logo division="autonomos" variant="horizontal" size="md" priority />
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] font-mono text-zinc-300">
            <Terminal className="w-3 h-3 text-cyan-400" />
            <span className="tracking-widest uppercase">AUTÔNOMOS AUTH // DEFINIR SENHA</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white">
              Validar Código e Nova Senha
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">
              Digite o código de 6 dígitos enviado para seu email e escolha sua nova senha.
            </p>
          </div>
        </div>

        {wasSent && !errorMessage && (
          <div
            role="status"
            className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              Se o email estiver cadastrado como integrante ativo, enviamos um código de 6 dígitos para sua caixa de entrada.
            </div>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Email
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

          <div className="space-y-1.5">
            <label
              htmlFor="code"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Código de 6 Dígitos
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                autoComplete="one-time-code"
                disabled={isSubmitting}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-lg bg-black/40 border border-white/10 pl-9 pr-3.5 py-2.5 text-sm font-mono tracking-widest text-zinc-100 placeholder-zinc-600 focus:outline-hidden focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="password"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Nova Senha (mínimo 6 caracteres)
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
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="block text-xs font-mono uppercase tracking-wider text-zinc-400"
            >
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                disabled={isSubmitting}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full rounded-lg bg-black/40 border border-white/10 pl-9 pr-10 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-300 focus:ring-1 focus:ring-zinc-300 transition-all font-sans disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold font-display text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-zinc-900" />
                <span>Salvando senha...</span>
              </>
            ) : (
              <>
                <span>Confirmar Nova Senha</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center justify-between gap-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>VERIFICAÇÃO CRIPTOGRÁFICA HMAC-SHA256</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12 relative overflow-hidden bg-[#0A0A0B] bg-grid-sm">
      <div className="pointer-events-none absolute -top-40 right-1/4 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl" />

      <Suspense fallback={<div className="w-full max-w-md p-8 rounded-2xl bg-[#111113] border border-white/10 animate-pulse h-96" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}

