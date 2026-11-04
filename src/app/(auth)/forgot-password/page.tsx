"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Mail,
  ArrowRight,
  AlertTriangle,
  Loader2,
  Terminal,
  ShieldCheck,
  ArrowLeft,
  KeyRound,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Informe um endereço de email válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Não foi possível enviar o código.");
        setIsSubmitting(false);
        return;
      }

      router.push(`/reset-password?email=${encodeURIComponent(trimmedEmail)}&sent=1`);
    } catch {
      setErrorMessage("Erro de comunicação com o servidor. Tente novamente.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar ao login</span>
        </Link>
        <span className="text-[11px] text-muted-foreground">
          UFRJ • CT • COPPE
        </span>
      </div>

      <div className="relative rounded-xl bg-card border border-border p-6 sm:p-8 overflow-hidden">

        <div className="relative space-y-4 text-center pb-6 border-b border-border">
          <div className="flex justify-center">
            <Logo division="autonomos" variant="horizontal" size="md" priority />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground">
              Esqueci minha senha
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Informe o email cadastrado no diretório da equipe para receber um código de 6 dígitos e definir ou redefinir sua senha.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs font-mono flex items-start gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-mono uppercase tracking-wider text-muted-foreground"
            >
              Email do Integrante
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-muted-foreground">
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
                className="w-full rounded-lg bg-muted/60 border border-border pl-9 pr-3.5 py-2.5 text-sm text-foreground placeholder-zinc-500 focus:outline-hidden focus:border-input focus:ring-1 focus:ring-input transition-all font-sans disabled:opacity-50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold font-display text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                <span>Enviando código...</span>
              </>
            ) : (
              <>
                <span>Enviar Código por Email</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border flex flex-col items-center justify-between gap-3 text-xs text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Já recebeu um código?</span>{" "}
            <Link
              href={email.trim() ? `/reset-password?email=${encodeURIComponent(email.trim())}` : "/reset-password"}
              className="text-foreground hover:text-foreground font-medium underline underline-offset-4"
            >
              Validar código
            </Link>
          </p>

          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
            <span>CÓDIGO DE USO ÚNICO • EXPIRA EM 15 MINUTOS</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12 relative bg-background">

      <Suspense fallback={<div className="w-full max-w-md p-8 rounded-xl bg-card border border-border animate-pulse h-80" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

