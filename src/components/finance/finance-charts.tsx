'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  formatBRL,
  type CategoryExpenseSummary,
  type MonthlyCashflowPoint,
} from '@/lib/finance/constants';

export function ExpensesByCategoryChart({ data }: { data: CategoryExpenseSummary[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        Nenhuma despesa registrada ainda.
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.category,
    Pago: Number((d.paidCents / 100).toFixed(2)),
    Pendente: Number((d.pendingCents / 100).toFixed(2)),
    paidCents: d.paidCents,
    pendingCents: d.pendingCents,
  }));

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-15" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-muted-foreground"
            interval={0}
            angle={-15}
            textAnchor="end"
            height={44}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-muted-foreground"
            width={54}
            tickFormatter={v => `R$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload;
              return (
                <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1 text-card-foreground">
                  <p className="font-semibold text-foreground border-b border-border/70 pb-1">{label}</p>
                  <p className="flex items-center justify-between gap-4">
                    <span className="text-emerald-600 dark:text-emerald-400">Pago:</span>
                    <span className="font-mono font-semibold">{formatBRL(row.paidCents)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-4">
                    <span className="text-amber-600 dark:text-amber-400">Aguardando:</span>
                    <span className="font-mono font-semibold">{formatBRL(row.pendingCents)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Pago" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
          <Bar dataKey="Pendente" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyCashflowChart({ data }: { data: MonthlyCashflowPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-muted-foreground">
        Nenhuma movimentação com data registrada.
      </div>
    );
  }

  const chartData = data.map(d => ({
    name: d.label,
    Entradas: Number((d.incomeCents / 100).toFixed(2)),
    Saídas: Number((d.expenseCents / 100).toFixed(2)),
    incomeCents: d.incomeCents,
    expenseCents: d.expenseCents,
  }));

  return (
    <div className="h-64 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="opacity-15" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'currentColor' }}
            className="text-muted-foreground"
            width={58}
            tickFormatter={v => `R$${v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0].payload;
              return (
                <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1 text-card-foreground">
                  <p className="font-semibold text-foreground border-b border-border/70 pb-1">{label}</p>
                  <p className="flex items-center justify-between gap-4">
                    <span className="text-emerald-600 dark:text-emerald-400">Entradas:</span>
                    <span className="font-mono font-semibold">{formatBRL(row.incomeCents)}</span>
                  </p>
                  <p className="flex items-center justify-between gap-4">
                    <span className="text-rose-600 dark:text-rose-400">Saídas Pagas:</span>
                    <span className="font-mono font-semibold">{formatBRL(row.expenseCents)}</span>
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
