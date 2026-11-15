'use client';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import type { AdminEvaluationDashboardDTO } from '@/lib/evaluations/types';

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export function AreaScoresComparisonChart({
  data,
}: {
  data: AdminEvaluationDashboardDTO['areaComparison'];
}) {
  const hasAny = data.some((d) => d.areaScore !== null || d.memberAvgScore !== null);
  if (!hasAny) {
    return <EmptyChart message="Lance notas de áreas ou membros para comparar o desempenho entre frentes." />;
  }

  const rows = data.map((d) => ({
    name: d.shortLabel,
    fullName: d.label,
    areaScore: d.areaScore,
    memberAvgScore: d.memberAvgScore,
  }));

  return (
    <div className="h-72 w-full min-w-0 max-w-full overflow-hidden pt-2">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={rows} margin={{ top: 10, right: 12, left: -18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} vertical={false} />
          <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload;
              return (
                <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1 text-card-foreground">
                  <p className="font-semibold text-foreground border-b border-border/60 pb-1">
                    {row.fullName}
                  </p>
                  <p className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Nota da área:</span>
                    <strong className="font-mono text-foreground">
                      {row.areaScore !== null ? row.areaScore.toFixed(1) : '—'}
                    </strong>
                  </p>
                  <p className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Média dos membros:</span>
                    <strong className="font-mono text-foreground">
                      {row.memberAvgScore !== null ? row.memberAvgScore.toFixed(1) : '—'}
                    </strong>
                  </p>
                </div>
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="areaScore" name="Nota da Área" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          <Bar dataKey="memberAvgScore" name="Média dos Membros" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreDistributionChart({
  data,
}: {
  data: AdminEvaluationDashboardDTO['scoreDistribution'];
}) {
  const hasAny = data.some((d) => d.members > 0 || d.coordinators > 0);
  if (!hasAny) {
    return <EmptyChart message="Nenhuma avaliação individual registrada neste semestre ainda." />;
  }

  return (
    <div className="h-72 w-full min-w-0 max-w-full overflow-hidden pt-2">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} vertical={false} />
          <XAxis dataKey="bucket" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis allowDecimals={false} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar dataKey="members" name="Membros" fill="#10b981" radius={[6, 6, 0, 0]} />
          <Bar dataKey="coordinators" name="Coordenadores" fill="#f59e0b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const CARGO_COLORS = ['#0ea5e9', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

export function CargoAverageChart({
  data,
}: {
  data: AdminEvaluationDashboardDTO['byCargoAverage'];
}) {
  if (data.length === 0) {
    return <EmptyChart message="Ainda não há avaliações suficientes por cargo neste semestre." />;
  }

  return (
    <div className="h-64 w-full min-w-0 max-w-full overflow-hidden pt-2">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} vertical={false} />
          <XAxis dataKey="cargo" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const row = payload[0]?.payload;
              return (
                <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1 text-card-foreground">
                  <p className="font-semibold text-foreground">{row.cargo}</p>
                  <p className="text-muted-foreground">
                    Média: <strong className="font-mono text-foreground">{row.avgScore.toFixed(1)}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Avaliados: <strong className="font-mono text-foreground">{row.count}</strong>
                  </p>
                </div>
              );
            }}
          />
          <Bar dataKey="avgScore" name="Média de Nota" radius={[6, 6, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={idx} fill={CARGO_COLORS[idx % CARGO_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyEvolutionChart({
  data,
}: {
  data: AdminEvaluationDashboardDTO['monthlyTrend'];
}) {
  const hasAny = data.some((d) => d.totalEvaluations > 0);
  if (!hasAny) {
    return <EmptyChart message="Sem histórico de avaliações entre meses para traçar evolução." />;
  }

  return (
    <div className="h-64 w-full min-w-0 max-w-full overflow-hidden pt-2">
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} vertical={false} />
          <XAxis dataKey="periodLabel" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey="memberAvg"
            name="Média Membros"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="areaAvg"
            name="Média Áreas"
            stroke="#8b5cf6"
            strokeWidth={2.5}
            dot={{ r: 4 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="coordinatorAvg"
            name="Média Coordenação"
            stroke="#f59e0b"
            strokeWidth={2.5}
            dot={{ r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
