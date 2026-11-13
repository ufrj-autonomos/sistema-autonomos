import { prisma } from '@/lib/prisma';
import { db } from '@/lib/institutional/db';
import type { SafeUser } from '@/lib/session';
import { hasManagementAccess } from '@/lib/access-policy';
import { getMeetingsDashboardData, calculateAttendanceScore, KNOWN_AREAS } from '@/lib/meetings/service';
import { getDisciplinaryDashboardData } from '@/lib/disciplinary/service';
import { attendanceReport } from '@/lib/attendance/service';
import { weekKey } from '@/lib/attendance/time';

export interface ExportDataResult {
  filename: string;
  csvContent: string;
  tsvContent: string;
  rowCount: number;
  title: string;
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let str = String(value);
  // Proteção contra CSV formula injection no Excel/Sheets
  if (/^[=+\-@]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function escapeTsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  return str.replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
}

export function buildCsvAndTsv(headers: string[], rows: (string | number | boolean | null | undefined)[][]): { csv: string; tsv: string } {
  const csvRows: string[] = [];
  const tsvRows: string[] = [];

  // UTF-8 BOM para garantir acentos corretos no Excel e Google Sheets
  csvRows.push(headers.map(escapeCsvCell).join(';'));
  tsvRows.push(headers.map(escapeTsvCell).join('\t'));

  for (const row of rows) {
    csvRows.push(row.map(escapeCsvCell).join(';'));
    tsvRows.push(row.map(escapeTsvCell).join('\t'));
  }

  return {
    csv: '\uFEFF' + csvRows.join('\r\n'),
    tsv: tsvRows.join('\r\n'),
  };
}

/**
 * 1. Exportação da Tabela de Reuniões
 */
export async function exportMeetingsToSheets(user: SafeUser, period = '26.2', areaKey?: string): Promise<ExportDataResult> {
  const data = await getMeetingsDashboardData(user, period);

  // Se uma área específica foi requisitada
  const targetAreas = areaKey
    ? data.detailedAreas.filter((da) => `${da.def.area}-${da.def.teamId}` === areaKey)
    : data.detailedAreas;

  const rows: (string | number | boolean | null | undefined)[][] = [];

  if (targetAreas.length === 1) {
    const da = targetAreas[0];
    const meetingHeaders = da.meetings.map((m, idx) => {
      const dt = new Date(m.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
      return `${dt} (#${idx + 1})`;
    });

    const headers = [
      'Nº',
      'Nome do Integrante',
      'Área',
      'Divisão',
      ...meetingHeaders,
      'Presenças (P)',
      'Faltas (F)',
      '% Presença',
      'Situação',
    ];

    da.members.forEach((mem, idx) => {
      const attendancesCols = da.meetings.map((m) => {
        const att = mem.attendances[m.id];
        return att?.status || 'N';
      });

      rows.push([
        idx + 1,
        mem.name,
        da.def.label,
        da.def.teamSlug === 'harpia' ? 'Harpia' : da.def.teamSlug === 'nautilus' ? 'Nautilus' : 'Geral',
        ...attendancesCols,
        mem.presences,
        mem.absences,
        `${mem.pct.toFixed(1)}%`,
        mem.status.label,
      ]);
    });

    const { csv, tsv } = buildCsvAndTsv(headers, rows);
    return {
      filename: `reunioes_${da.def.area.toLowerCase()}_periodo_${period}.csv`,
      csvContent: csv,
      tsvContent: tsv,
      rowCount: rows.length,
      title: `Reuniões — ${da.def.label} (${period})`,
    };
  }

  // Consolidado Geral de Todas as Áreas
  const headers = [
    'Nº',
    'Nome do Integrante',
    'Área',
    'Divisão',
    'Total de Reuniões',
    'Presenças Computadas',
    'Faltas',
    '% Frequência Geral',
    'Status de Assiduidade',
  ];

  let counter = 1;
  for (const da of data.detailedAreas) {
    for (const mem of da.members) {
      rows.push([
        counter++,
        mem.name,
        da.def.label,
        da.def.teamSlug === 'harpia' ? 'Harpia' : da.def.teamSlug === 'nautilus' ? 'Nautilus' : 'Geral',
        mem.total,
        mem.presences,
        mem.absences,
        `${mem.pct.toFixed(1)}%`,
        mem.status.label,
      ]);
    }
  }

  const { csv, tsv } = buildCsvAndTsv(headers, rows);
  return {
    filename: `reunioes_consolidado_todas_areas_${period}.csv`,
    csvContent: csv,
    tsvContent: tsv,
    rowCount: rows.length,
    title: `Consolidado de Reuniões — Período ${period}`,
  };
}

/**
 * 2. Exportação da Tabela de Integrantes (Efetivo)
 */
export async function exportMembersToSheets(): Promise<ExportDataResult> {
  const [institutional, members] = await Promise.all([
    db.institutionalMember.findMany({
      include: { team: { select: { name: true } } },
      orderBy: [{ active: 'desc' }, { name: 'asc' }],
    }),
    prisma.member.findMany({
      select: {
        id: true,
        institutionalMemberId: true,
        email: true,
        role: true,
        status: true,
        phone: true,
        dre: true,
        cpf: true,
        birthDate: true,
        course: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        profileCompletedAt: true,
        active: true,
      },
    }),
  ]);

  const memberByInstId = new Map(
    members
      .filter((m) => typeof m.institutionalMemberId === 'number')
      .map((m) => [m.institutionalMemberId as number, m])
  );

  const headers = [
    'ID',
    'Nome Completo',
    'Cargo',
    'Divisão / Equipe',
    'Subárea',
    'Status da Conta',
    'Ativo no Sistema',
    'Curso / Graduação',
    'DRE',
    'E-mail',
    'Telefone',
    'Contato de Emergência',
    'Tel. de Emergência',
    'Data de Nascimento',
    'Data de Entrada',
    'Perfil Completo',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = institutional.map((inst) => {
    const mem = memberByInstId.get(inst.id);
    const roleLabel = mem?.role || inst.role || 'TRAINEE';
    const teamName = inst.team?.name || 'Autônomos Geral';

    return [
      inst.id,
      inst.name,
      roleLabel,
      teamName,
      inst.area || 'Não informada',
      mem?.status || 'Não cadastrado',
      inst.active ? 'Ativo' : 'Inativo',
      mem?.course || inst.course || 'Não informado',
      mem?.dre || 'Não informado',
      mem?.email || 'Não informado',
      mem?.phone || 'Não informado',
      mem?.emergencyContactName || 'Não informado',
      mem?.emergencyContactPhone || 'Não informado',
      mem?.birthDate ? new Date(mem.birthDate).toLocaleDateString('pt-BR') : 'Não informado',
      inst.joinedYear || 'Não informado',
      mem?.profileCompletedAt ? 'Sim' : 'Pendente',
    ];
  });

  const { csv, tsv } = buildCsvAndTsv(headers, rows);
  return {
    filename: `integrantes_ufrj_autonomos_${new Date().toISOString().slice(0, 10)}.csv`,
    csvContent: csv,
    tsvContent: tsv,
    rowCount: rows.length,
    title: 'Quadro de Integrantes — UFRJ Autônomos',
  };
}

/**
 * 3. Exportação da Tabela Disciplinar (Avisos e Advertências)
 */
export async function exportDisciplinaryToSheets(user: SafeUser): Promise<ExportDataResult> {
  const data = await getDisciplinaryDashboardData(user);

  const headers = [
    'Nº',
    'Integrante',
    'Divisão',
    'Área',
    'Avisos Recebidos',
    'Advertências Diretas',
    'Advertências Convertidas (2 Avisos = 1 Adv)',
    'Total Efetivo de Advertências',
    'Situação Disciplinar',
    'Risco de Expulsão',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = data.members.map((mem, idx) => {
    const teamName =
      mem.teamSlug === 'harpia'
        ? 'Harpia'
        : mem.teamSlug === 'nautilus'
        ? 'Nautilus'
        : 'Autônomos Geral';

    return [
      idx + 1,
      mem.name,
      teamName,
      mem.area,
      mem.avisosCount,
      mem.directWarningsCount,
      mem.warningFromAvisos,
      mem.totalWarnings,
      mem.statusLabel,
      mem.status === 'EXPULSAO' ? 'SIM - Risco Crítico' : 'Não',
    ];
  });

  const { csv, tsv } = buildCsvAndTsv(headers, rows);
  return {
    filename: `quadro_disciplinar_advertencias_${new Date().toISOString().slice(0, 10)}.csv`,
    csvContent: csv,
    tsvContent: tsv,
    rowCount: rows.length,
    title: 'Quadro Disciplinar e Advertências',
  };
}

/**
 * 4. Exportação da Tabela de Presença no Laboratório
 */
export async function exportAttendanceToSheets(week = weekKey()): Promise<ExportDataResult> {
  const report = await attendanceReport(week);

  const headers = [
    'Nome do Integrante',
    'E-mail',
    'Área',
    'Meta Semanal (h)',
    'Horas Validadas',
    'Horas Justificadas',
    'Horas Restantes',
    'Situação da Meta',
    'Semanas Abaixo da Meta',
    'Registros em Revisão',
  ];

  const rows: (string | number | boolean | null | undefined)[][] = report.members.map((mem) => [
    mem.name,
    mem.email || 'Não informado',
    mem.area,
    (mem.requiredSeconds / 3600).toFixed(1),
    (mem.completedSeconds / 3600).toFixed(2),
    ((mem.justifiedSeconds || 0) / 3600).toFixed(2),
    (mem.remainingSeconds / 3600).toFixed(2),
    mem.status === 'MET'
      ? 'Meta Cumprida'
      : mem.status === 'PENDING'
      ? 'Em Andamento'
      : mem.status === 'MISSED'
      ? 'Abaixo da Meta'
      : 'Sem Meta',
    mem.missedWeeks,
    mem.pendingReviews,
  ]);

  const { csv, tsv } = buildCsvAndTsv(headers, rows);
  return {
    filename: `presenca_laboratorio_semana_${week}.csv`,
    csvContent: csv,
    tsvContent: tsv,
    rowCount: rows.length,
    title: `Presença no Laboratório — Semana ${week}`,
  };
}
