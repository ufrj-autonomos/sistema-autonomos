'use client';

import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  LabelList,
} from 'recharts';
import { formatDuration } from '@/lib/attendance/format';

interface WeeklyTrendItem {
  key: string;
  met: number;
  required: number;
  seconds: number;
  percentage: number | null;
}

interface WeeklyPresenceChartProps {
  trend: WeeklyTrendItem[];
  start: string;
  end: string;
}

function formatDate(key: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(`${key}T12:00:00Z`));
  } catch {
    return key;
  }
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload as WeeklyTrendItem;
    return (
      <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1.5 min-w-44 text-card-foreground">
        <p className="font-semibold text-foreground border-b border-border/70 pb-1">
          Semana de {formatDate(label)}
        </p>
        <div className="space-y-1">
          <p className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Meta cumprida:
            </span>
            <strong className="text-foreground font-mono">{data.met} integrantes</strong>
          </p>
          <p className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              Total com meta:
            </span>
            <strong className="text-foreground font-mono">{data.required} integrantes</strong>
          </p>
          <p className="flex items-center justify-between gap-3 text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Taxa de adesão:
            </span>
            <strong className="text-foreground font-mono">
              {data.percentage !== null ? `${data.percentage}%` : 'Sem meta'}
            </strong>
          </p>
          <p className="flex items-center justify-between gap-3 text-muted-foreground pt-1 border-t border-border/50">
            <span>Horas validadas:</span>
            <strong className="text-foreground font-mono">{formatDuration(data.seconds)}</strong>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function WeeklyPresenceChart({ trend }: WeeklyPresenceChartProps) {
  const chartData = trend.map((row) => ({
    ...row,
    displayDate: formatDate(row.key),
    metRate: row.percentage ?? 0,
  }));

  return (
    <div className="h-72 w-full pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.6}
            vertical={false}
          />
          <XAxis
            dataKey="displayDate"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="left"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            unit="%"
            hide={true}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
          />
          <Bar
            yAxisId="left"
            dataKey="required"
            name="Com Meta"
            fill="var(--muted-foreground)"
            opacity={0.3}
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Bar
            yAxisId="left"
            dataKey="met"
            name="Meta Cumprida"
            fill="#387aef"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="metRate"
            name="Adesão (%)"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ r: 3, fill: '#10b981' }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

interface DistributionItem {
  label: string;
  count: number;
}

interface TeamDistributionChartProps {
  teams: DistributionItem[];
  total: number;
}

const TEAM_COLORS: Record<string, string> = {
  harpia: '#A346CC',
  nautilus: '#387aef',
  'autônomos': '#10b981',
  autonomos: '#10b981',
};

function PieItemTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-2.5 shadow-xl text-xs space-y-1 min-w-36 text-foreground">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: data.color }}
          />
          <p className="font-semibold text-foreground">{data.name}</p>
        </div>
        <p className="text-muted-foreground font-mono flex items-center justify-between gap-3 pt-0.5">
          <span>Integrantes:</span>
          <strong className="text-foreground font-bold text-sm">{data.value}</strong>
        </p>
        <p className="text-muted-foreground font-mono text-[11px]">
          {data.percentage}% do total
        </p>
      </div>
    );
  }
  return null;
}

export function TeamDistributionChart({ teams, total }: TeamDistributionChartProps) {
  const chartData = teams.map((t) => {
    const slug = t.label.toLowerCase();
    const color =
      TEAM_COLORS[slug] ||
      (slug.includes('harpia')
        ? '#A346CC'
        : slug.includes('nautilus')
        ? '#387aef'
        : '#10b981');
    const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
    return {
      name: t.label,
      value: t.count,
      percentage: pct,
      color,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<PieItemTooltip />} />
            <Pie
              data={chartData}
              innerRadius={46}
              outerRadius={68}
              paddingAngle={4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {chartData.map((t) => (
          <div
            key={t.name}
            className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: t.color }}
              />
              <span className="text-sm font-medium text-foreground">{t.name}</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-foreground font-bold">{t.value}</span>
              <span className="text-xs text-muted-foreground">({t.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface AreaDistributionChartProps {
  areas: DistributionItem[];
  total: number;
}

function AreaCustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const data = payload[0]?.payload;
    if (!data) return null;
    return (
      <div className="rounded-xl border border-border bg-card p-2.5 shadow-xl text-xs space-y-1 min-w-36 text-foreground">
        <p className="font-semibold text-foreground">{data.name}</p>
        <p className="text-muted-foreground font-mono flex items-center justify-between gap-3 pt-0.5">
          <span>Integrantes:</span>
          <strong className="text-foreground font-bold text-sm">{data.count}</strong>
        </p>
        <p className="text-muted-foreground font-mono text-[11px]">
          {data.pct}% do total
        </p>
      </div>
    );
  }
  return null;
}

export function AreaDistributionChart({ areas, total }: AreaDistributionChartProps) {
  const chartData = areas.map((a, idx) => {
    const colors = ['#387aef', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'];
    return {
      name: a.label,
      count: a.count,
      pct: total > 0 ? Math.round((a.count / total) * 100) : 0,
      fill: colors[idx % colors.length],
    };
  });

  return (
    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 35, left: 15, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            horizontal={false}
          />
          <XAxis
            type="number"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip content={<AreaCustomTooltip />} />
          <Bar dataKey="count" name="Integrantes" radius={[0, 6, 6, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="count"
              position="right"
              fill="var(--foreground)"
              fontSize={11}
              fontWeight="bold"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CoursesDistributionChartProps {
  courses: DistributionItem[];
  total: number;
}

export function CoursesDistributionChart({ courses, total }: CoursesDistributionChartProps) {
  const COURSE_COLORS = [
    '#387aef',
    '#10b981',
    '#A346CC',
    '#f59e0b',
    '#ec4899',
    '#06b6d4',
    '#6366f1',
    '#84cc16',
    '#64748b',
    '#e11d48',
  ];

  const chartData = courses.map((c, idx) => ({
    name: c.label,
    value: c.count,
    percentage: total > 0 ? Math.round((c.count / total) * 100) : 0,
    color: COURSE_COLORS[idx % COURSE_COLORS.length],
  }));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
      <div className="h-52 w-52 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<PieItemTooltip />} />
            <Pie
              data={chartData}
              innerRadius={46}
              outerRadius={72}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
        {chartData.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: c.color }}
              />
              <span className="font-medium text-foreground truncate" title={c.name}>
                {c.name}
              </span>
            </div>
            <div className="flex items-center gap-2 font-mono shrink-0">
              <span className="text-foreground font-bold">{c.value}</span>
              <span className="text-muted-foreground">({c.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
