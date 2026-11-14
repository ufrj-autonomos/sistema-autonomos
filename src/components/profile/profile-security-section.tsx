"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  XCircle,
} from "lucide-react";

export type PendingEmailChangeData = {
  id: string;
  currentEmail: string;
  newEmail: string;
  createdAt: string;
} | null;

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-lg border border-border bg-background px-3.5 py-2 text-sm text-foreground placeholder-zinc-500 focus:outline-hidden focus:border-border focus:ring-1 focus:ring-ring disabled:opacity-50";

export function ProfileSecuritySection({
  currentEmail,
  initialPendingEmailChange,
  onChanged,
}: {
  currentEmail: string;
  initialPendingEmailChange: PendingEmailChangeData;
  onChanged?: () => Promise<void> | void;
}) {
  // --- Email change state ---
  const [pendingEmailChange, setPendingEmailChange] = useState<PendingEmailChangeData>(
    initialPendingEmailChange
  );
  const [newEmail, setNewEmail] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // --- Password change state ---
  const [pwCodeSent, setPwCodeSent] = useState(false);
  const [pwCode, setPwCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);

  async function handleSendEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Informe um novo e-mail válido.");
      return;
    }

    setEmailBusy(true);
    try {
      const res = await fetch("/api/profile/security/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Não foi possível enviar o código.");
        return;
      }
      setNewEmail(trimmed);
      setEmailCodeSent(true);
      setEmailSuccess(data.message);
    } catch {
      setEmailError("Erro de conexão ao enviar código.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleSubmitEmailRequest(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    if (!/^\d{6}$/.test(emailCode.trim())) {
      setEmailError("Informe o código de 6 dígitos enviado para o novo e-mail.");
      return;
    }

    setEmailBusy(true);
    try {
      const res = await fetch("/api/profile/security/email/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim().toLowerCase(), code: emailCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Não foi possível validar o código.");
        return;
      }
      setPendingEmailChange(data.pendingEmailChange);
      setEmailCodeSent(false);
      setEmailCode("");
      setNewEmail("");
      setEmailSuccess(data.message);
      await onChanged?.();
    } catch {
      setEmailError("Erro ao registrar solicitação de alteração de e-mail.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleCancelEmailRequest() {
    setEmailBusy(true);
    setEmailError(null);
    setEmailSuccess(null);
    try {
      const res = await fetch("/api/profile/security/email/request", {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || "Não foi possível cancelar a solicitação.");
        return;
      }
      setPendingEmailChange(null);
      setEmailSuccess(data.message);
      await onChanged?.();
    } catch {
      setEmailError("Erro ao cancelar solicitação.");
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleSendPasswordCode() {
    setPwError(null);
    setPwSuccess(null);
    setPwBusy(true);
    try {
      const res = await fetch("/api/profile/security/password/send-code", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Não foi possível enviar o código.");
        return;
      }
      setPwCodeSent(true);
      setPwSuccess(data.message);
    } catch {
      setPwError("Erro ao enviar código para alteração de senha.");
    } finally {
      setPwBusy(false);
    }
  }

  async function handleConfirmPasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);

    if (!/^\d{6}$/.test(pwCode.trim())) {
      setPwError("Informe o código de 6 dígitos enviado para o seu e-mail.");
      return;
    }

    if (newPassword.length < 6) {
      setPwError("A nova senha deve conter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwError("As senhas digitadas não coincidem.");
      return;
    }

    setPwBusy(true);
    try {
      const res = await fetch("/api/profile/security/password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: pwCode.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Não foi possível alterar a senha.");
        return;
      }

      setPwCodeSent(false);
      setPwCode("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess(data.message);
    } catch {
      setPwError("Erro ao salvar nova senha.");
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <section
      aria-labelledby="security-section-title"
      className="mt-8 rounded-2xl border border-border bg-card p-6 space-y-6"
    >
      <div className="border-b border-border pb-4 flex items-center gap-2.5">
        <ShieldCheck className="h-5 w-5 text-cyan-500" />
        <div>
          <h2 id="security-section-title" className="text-lg font-semibold text-foreground">
            Segurança da Conta — E-mail e Senha
          </h2>
          <p className="text-xs text-muted-foreground">
            Tanto a troca de e-mail quanto a troca de senha exigem validação por código de 6 dígitos enviado por e-mail.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bloco 1: Alteração de E-mail */}
        <div className="rounded-xl border border-border bg-background/60 p-5 space-y-4">
          <div className="flex items-start gap-2.5">
            <Mail className="h-4 w-4 text-cyan-500 mt-1 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Alterar E-mail de Acesso</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                E-mail atual: <strong className="text-foreground">{currentEmail || "Não informado"}</strong>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Após validar o código enviado ao novo e-mail, a solicitação segue para aprovação da Gestão na tela de Integrantes.
              </p>
            </div>
          </div>

          {emailError && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
              {emailError}
            </div>
          )}

          {emailSuccess && (
            <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {pendingEmailChange ? (
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-4 space-y-3 text-xs">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-200">
                <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Aguardando aprovação de Gestão</p>
                  <p className="mt-1">
                    Novo e-mail validado: <strong className="font-mono">{pendingEmailChange.newEmail}</strong>
                  </p>
                  <p className="mt-1 text-amber-800/80 dark:text-amber-200/80">
                    Um integrante de Gestão precisa aprovar a solicitação na tela de <strong>Integrantes</strong>.
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={emailBusy}
                onClick={() => void handleCancelEmailRequest()}
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-600/40 bg-background/70 px-3 text-xs font-medium text-amber-900 dark:text-amber-200 hover:bg-amber-500/15 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancelar solicitação
              </button>
            </div>
          ) : !emailCodeSent ? (
            <form onSubmit={handleSendEmailCode} className="space-y-3">
              <label className="block text-xs font-medium text-muted-foreground">
                Novo e-mail
                <input
                  type="email"
                  required
                  disabled={emailBusy}
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="novo.email@poli.ufrj.br"
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                disabled={emailBusy}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer disabled:opacity-50"
              >
                {emailBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                Enviar código para o novo e-mail
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmitEmailRequest} className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Código enviado para <strong className="text-foreground">{newEmail}</strong>
                </span>
                <button
                  type="button"
                  disabled={emailBusy}
                  onClick={() => {
                    setEmailCodeSent(false);
                    setEmailCode("");
                  }}
                  className="underline hover:text-foreground cursor-pointer"
                >
                  Alterar
                </button>
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                Código de 6 dígitos
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  disabled={emailBusy}
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className={`${inputClass} font-mono tracking-[0.3em] text-center`}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  disabled={emailBusy}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
                >
                  {emailBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Validar código e enviar para Gestão
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bloco 2: Alteração de Senha */}
        <div className="rounded-xl border border-border bg-background/60 p-5 space-y-4">
          <div className="flex items-start gap-2.5">
            <KeyRound className="h-4 w-4 text-purple-500 mt-1 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Alterar Senha</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Enviamos um código de verificação para <strong className="text-foreground">{currentEmail || "seu e-mail"}</strong> antes de liberar a nova senha.
              </p>
            </div>
          </div>

          {pwError && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
              {pwError}
            </div>
          )}

          {pwSuccess && (
            <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{pwSuccess}</span>
            </div>
          )}

          {!pwCodeSent ? (
            <button
              type="button"
              disabled={pwBusy || !currentEmail}
              onClick={() => void handleSendPasswordCode()}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 text-xs font-semibold text-foreground hover:bg-accent cursor-pointer disabled:opacity-50"
            >
              {pwBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
              Enviar código para alterar senha
            </button>
          ) : (
            <form onSubmit={handleConfirmPasswordChange} className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Código enviado para <strong className="text-foreground">{currentEmail}</strong></span>
                <button
                  type="button"
                  disabled={pwBusy}
                  onClick={() => void handleSendPasswordCode()}
                  className="underline hover:text-foreground cursor-pointer"
                >
                  Reenviar
                </button>
              </div>
              <label className="block text-xs font-medium text-muted-foreground">
                Código de 6 dígitos
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  disabled={pwBusy}
                  value={pwCode}
                  onChange={(e) => setPwCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className={`${inputClass} font-mono tracking-[0.3em] text-center`}
                />
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Nova senha (mínimo 6 caracteres)
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    disabled={pwBusy}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${inputClass} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 mt-1.5 pr-3 flex items-center text-muted-foreground hover:text-foreground cursor-pointer"
                    aria-label={showNewPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block text-xs font-medium text-muted-foreground">
                Confirmar nova senha
                <input
                  type={showNewPassword ? "text" : "password"}
                  required
                  minLength={6}
                  disabled={pwBusy}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className={inputClass}
                />
              </label>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 cursor-pointer disabled:opacity-50"
                >
                  {pwBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Confirmar e atualizar senha
                </button>
                <button
                  type="button"
                  disabled={pwBusy}
                  onClick={() => {
                    setPwCodeSent(false);
                    setPwCode("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPwError(null);
                  }}
                  className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
