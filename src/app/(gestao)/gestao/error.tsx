'use client';
export default function ManagementError({ reset }: { reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-xl py-16"><h1 className="font-display text-2xl font-semibold">Não foi possível carregar esta seção</h1><p className="mt-3 text-sm leading-relaxed text-zinc-400">Ocorreu uma falha ao consultar os dados. Tente novamente ou use o menu para abrir outro sistema.</p><button type="button" onClick={reset} className="mt-6 min-h-11 rounded-lg bg-zinc-100 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-4">Tentar novamente</button></section>;
}
