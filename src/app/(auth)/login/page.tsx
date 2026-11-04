'use client';

import { Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useSession } from '@/contexts/auth-context';
import { loginDestination } from '@/lib/workspace-navigation';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login, user, isAuthenticated } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const redirect = params.get('redirect') || params.get('returnUrl');
  useEffect(() => {
    if (isAuthenticated && user && !submittingRef.current) router.replace(loginDestination(user.role, redirect, !user.profileCompletedAt));
  }, [isAuthenticated, user, redirect, router]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submittingRef.current) return;
    setError('');
    submittingRef.current = true;
    setSubmitting(true);
    const result = await login({ email: email.trim(), password });
    if (!result.success) { setError(result.error || 'Não foi possível entrar. Tente novamente.'); setSubmitting(false); submittingRef.current = false; return; }
    router.replace(loginDestination(result.user?.role, redirect, result.firstLogin));
    router.refresh();
  }
  return <div className="mx-auto flex w-full max-w-5xl flex-1 items-center gap-16 px-5 py-8 sm:px-8 sm:py-14 lg:gap-24">
    <div className="hidden flex-1 lg:block"><h1 className="max-w-sm text-4xl font-semibold leading-[1.15] tracking-tight">Tudo pronto para o próximo passo.</h1><p className="mt-6 max-w-sm text-base leading-relaxed text-muted-foreground">Da presença no laboratório aos projetos, um lugar para cuidar da equipe e continuar aprendendo.</p><div className="mt-10 flex gap-6 border-t border-border pt-6 text-sm text-muted-foreground"><span>Equipe</span><span>Projetos</span><span>Aprendizado</span></div></div>
    <section aria-labelledby="login-heading" className="w-full rounded-xl border border-border bg-card p-6 sm:p-8 lg:max-w-md"><h2 id="login-heading" className="text-2xl font-semibold tracking-tight">Entre no seu espaço</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Use o email da sua conta aprovada pela equipe.</p>
      {params.get('registered') === '1' && <p role="status" className="mt-5 rounded-lg border border-border bg-muted p-4 text-sm">Cadastro recebido. Aguarde a aprovação da gestão para entrar.</p>}
      {params.get('reset') === '1' && <p role="status" className="mt-5 rounded-lg border border-border bg-muted p-4 text-sm">Senha atualizada. Entre com sua nova senha.</p>}
      <form onSubmit={submit} className="mt-7 space-y-5"><div><label htmlFor="login-email" className="mb-2 block text-sm font-medium">Email</label><input id="login-email" name="email" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} className="workspace-input w-full" placeholder="voce@ufrj.br" /></div><div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="login-password" className="text-sm font-medium">Senha</label><Link href="/forgot-password" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Esqueci minha senha</Link></div><div className="relative"><input id="login-password" name="password" type={visible ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} className="workspace-input w-full pr-12" /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visible} className="workspace-icon-button absolute right-1 top-1">{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>{error && <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p>}<button type="submit" disabled={submitting} className="workspace-primary w-full justify-center">{submitting ? <><Loader2 size={17} className="animate-spin" />Entrando…</> : <>Entrar<ArrowRight size={17} aria-hidden="true" /></>}</button></form>
      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted-foreground">Ainda não tem conta? <Link href="/register" className="font-medium text-foreground underline underline-offset-4">Solicitar acesso</Link></p>
    </section>
  </div>;
}
export default function LoginPage() { return <Suspense fallback={<p role="status" className="m-auto p-8 text-sm text-muted-foreground">Carregando acesso…</p>}><LoginForm /></Suspense>; }
