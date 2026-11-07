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
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<CustomTooltip />}
          />
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
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<AreaCustomTooltip />}
          />
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

/* ==========================================================================
   NOVOS GRÁFICOS DE INSIGHTS ESTRATÉGICOS (REUNIÕES, MATRIZ ÁREA x DIVISÃO,
   HIERARQUIA DE CARGOS, SAÚDE DISCIPLINAR E HISTÓRICO INDIVIDUAL)
   ========================================================================== */

function StandardChartTooltip({
  active,
  payload,
  label,
  suffix = '',
}: {
  active?: boolean;
  payload?: any[];
  label?: string;
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const heading = label || payload[0]?.name || payload[0]?.payload?.name || payload[0]?.payload?.label;

  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-xl text-xs space-y-1.5 min-w-40 text-foreground">
      {heading && (
        <p className="font-semibold text-foreground border-b border-border/70 pb-1">
          {heading}
        </p>
      )}
      <div className="space-y-1">
        {payload.map((entry: any, idx: number) => {
          const dotColor =
            entry.color && entry.color !== '#000' && entry.color !== '#000000'
              ? entry.color
              : entry.payload?.fill || entry.payload?.color || '#387aef';
          return (
            <div
              key={idx}
              className="flex items-center justify-between gap-3 text-muted-foreground"
            >
              <span className="flex items-center gap-1.5 truncate">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: dotColor }}
                />
                <span className="text-foreground/90 font-medium">{entry.name}:</span>
              </span>
              <strong className="text-foreground font-mono font-bold">
                {entry.value}
                {suffix}
              </strong>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface AreaByTeamItem {
  area: string;
  Harpia: number;
  Nautilus: number;
  Autonomos: number;
  total: number;
}

export function AreaByTeamStackedChart({ data }: { data: AreaByTeamItem[] }) {
  return (
    <div className="h-64 w-full pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="area"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<StandardChartTooltip />}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar dataKey="Harpia" name="☁️ Harpia" stackId="a" fill="#A346CC" radius={[0, 0, 0, 0]} barSize={28} />
          <Bar dataKey="Nautilus" name="🌊 Nautilus" stackId="a" fill="#387aef" radius={[0, 0, 0, 0]} barSize={28} />
          <Bar dataKey="Autonomos" name="🤖 Geral" stackId="a" fill="#10b981" radius={[6, 6, 0, 0]} barSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface RolesByTeamItem {
  team: string;
  Lideranca: number;
  Membros: number;
  Trainees: number;
}

export function RolesHierarchyChart({ data }: { data: RolesByTeamItem[] }) {
  return (
    <div className="h-64 w-full pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
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
            dataKey="team"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={80}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<StandardChartTooltip />}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar dataKey="Lideranca" name="Liderança / Coord." stackId="role" fill="#f59e0b" barSize={22} />
          <Bar dataKey="Membros" name="Membros Efetivos" stackId="role" fill="#387aef" barSize={22} />
          <Bar dataKey="Trainees" name="Trainees" stackId="role" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface AreaMeetingPerfItem {
  label: string;
  teamSlug?: string;
  pct: number;
  presences: number;
  absences: number;
  meetingsCount: number;
}

export function MeetingsPerformanceByAreaChart({ data }: { data: AreaMeetingPerfItem[] }) {
  const chartData = data.map((d) => ({
    ...d,
    fill:
      d.pct >= 85
        ? '#10b981'
        : d.pct >= 70
        ? '#387aef'
        : d.pct >= 55
        ? '#f59e0b'
        : '#ef4444',
  }));

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 42, left: 10, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            unit="%"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={125}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<StandardChartTooltip suffix="%" />}
          />
          <Bar dataKey="pct" name="Frequência" fill="#387aef" radius={[0, 6, 6, 0]} barSize={18}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="pct"
              position="right"
              formatter={(v: any) => `${v}%`}
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

export function DisciplinaryHealthChart({
  regulares,
  atencao,
  alerta,
  expulsao,
}: {
  regulares: number;
  atencao: number;
  alerta: number;
  expulsao: number;
}) {
  const total = regulares + atencao + alerta + expulsao;
  const items = [
    { name: 'Regular (0 ocorrências)', value: regulares, color: '#10b981' },
    { name: 'Atenção (1 aviso/adv)', value: atencao, color: '#f59e0b' },
    { name: 'Alerta (2 advertências)', value: alerta, color: '#f97316' },
    { name: 'Risco Expulsão (3+ adv)', value: expulsao, color: '#ef4444' },
  ].filter((i) => i.value > 0 || i.name.includes('Regular'));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<StandardChartTooltip />} />
            <Pie
              data={items}
              innerRadius={42}
              outerRadius={64}
              paddingAngle={3}
              dataKey="value"
            >
              {items.map((entry, idx) => (
                <Cell key={idx} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex-1 w-full space-y-2">
        {[
          { label: '🟢 Regulares', count: regulares, color: '#10b981' },
          { label: '🟡 Em Atenção', count: atencao, color: '#f59e0b' },
          { label: '🟠 Em Alerta', count: alerta, color: '#f97316' },
          { label: '🔴 Risco de Expulsão', count: expulsao, color: '#ef4444' },
        ].map((row) => {
          const pct = total > 0 ? Math.round((row.count / total) * 100) : 0;
          return (
            <div
              key={row.label}
              className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/20 text-xs"
            >
              <span className="font-medium text-foreground">{row.label}</span>
              <span className="font-mono font-bold text-foreground">
                {row.count} <span className="text-muted-foreground font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface HeadToHeadAreaItem {
  area: string;
  Harpia: number;
  Nautilus: number;
  harpiaRate: number;
  nautilusRate: number;
}

export function DivisionsHeadToHeadChart({ data }: { data: HeadToHeadAreaItem[] }) {
  return (
    <div className="h-64 w-full pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="area"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<StandardChartTooltip />}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar dataKey="Harpia" name="☁️ Harpia (UAV)" fill="#A346CC" radius={[5, 5, 0, 0]} barSize={22}>
            <LabelList dataKey="Harpia" position="top" fill="var(--foreground)" fontSize={10} fontWeight="bold" />
          </Bar>
          <Bar dataKey="Nautilus" name="🌊 Nautilus (AUV)" fill="#387aef" radius={[5, 5, 0, 0]} barSize={22}>
            <LabelList dataKey="Nautilus" position="top" fill="var(--foreground)" fontSize={10} fontWeight="bold" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DivisionsMeetingRateComparisonChart({ data }: { data: HeadToHeadAreaItem[] }) {
  const filtered = data.filter((d) => d.harpiaRate > 0 || d.nautilusRate > 0);
  return (
    <div className="h-64 w-full pt-3">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={filtered}
          margin={{ top: 10, right: 15, left: -15, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="area"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            unit="%"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<StandardChartTooltip suffix="%" />}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
          />
          <Bar dataKey="harpiaRate" name="☁️ Harpia" fill="#A346CC" radius={[5, 5, 0, 0]} barSize={22} />
          <Bar dataKey="nautilusRate" name="🌊 Nautilus" fill="#387aef" radius={[5, 5, 0, 0]} barSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MemberWeeklyLabChart({
  data,
}: {
  data: { week: string; hours: number; targetHours: number; met: boolean }[];
}) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.week),
    fill: d.hours >= d.targetHours ? '#10b981' : d.hours > 0 ? '#387aef' : '#94a3b8',
  }));

  return (
    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            unit="h"
            stroke="#888888"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--muted)', opacity: 0.35 }}
            content={<StandardChartTooltip suffix="h" />}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ paddingBottom: '8px', fontSize: '11px' }}
          />
          <Bar dataKey="hours" name="Horas Validadas" fill="#387aef" radius={[5, 5, 0, 0]} barSize={24}>
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="targetHours"
            name="Meta Semanal (2h)"
            stroke="#f59e0b"
            strokeWidth={2}
            strokeDasharray="4 4"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

