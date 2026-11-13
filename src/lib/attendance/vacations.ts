import { prisma } from '@/lib/prisma';
import { dateKey, weekKey } from './time';

export interface VacationWeekDto {
  id: string;
  weekStartsOn: string;
  label: string | null;
}

export function normalizeMondayKey(input: string): string {
  const trimmed = input.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error('Data inválida. Use o formato YYYY-MM-DD.');
  }
  return weekKey(new Date(`${trimmed}T12:00:00Z`));
}

export async function listVacationWeeks(): Promise<VacationWeekDto[]> {
  const rows = await prisma.attendanceVacationWeek.findMany({
    orderBy: { weekStartsOn: 'asc' },
    select: { id: true, weekStartsOn: true, label: true },
  });
  return rows.map((row) => ({
    id: row.id,
    weekStartsOn: dateKey(row.weekStartsOn),
    label: row.label,
  }));
}

export async function getVacationWeekKeys(): Promise<string[]> {
  const rows = await prisma.attendanceVacationWeek.findMany({
    orderBy: { weekStartsOn: 'asc' },
    select: { weekStartsOn: true },
  });
  return rows.map((row) => dateKey(row.weekStartsOn));
}

export async function setVacationWeekState(params: {
  dateOrWeekKey: string;
  isVacation: boolean;
  label?: string | null;
  actorId?: string | null;
}): Promise<{ weekStartsOn: string; isVacation: boolean; label: string | null }> {
  const monday = normalizeMondayKey(params.dateOrWeekKey);
  const weekDate = new Date(`${monday}T00:00:00Z`);
  const cleanLabel = params.label?.trim() ? params.label.trim().slice(0, 80) : null;

  if (params.isVacation) {
    const saved = await prisma.attendanceVacationWeek.upsert({
      where: { weekStartsOn: weekDate },
      create: {
        weekStartsOn: weekDate,
        label: cleanLabel ?? 'Férias',
        createdById: params.actorId ?? null,
      },
      update: {
        ...(params.label !== undefined ? { label: cleanLabel } : {}),
      },
      select: { weekStartsOn: true, label: true },
    });
    return {
      weekStartsOn: dateKey(saved.weekStartsOn),
      isVacation: true,
      label: saved.label,
    };
  }

  await prisma.attendanceVacationWeek.deleteMany({
    where: { weekStartsOn: weekDate },
  });

  return {
    weekStartsOn: monday,
    isVacation: false,
    label: null,
  };
}
