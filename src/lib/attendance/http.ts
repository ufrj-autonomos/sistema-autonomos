import { NextResponse } from 'next/server';
import { AttendanceError } from './service';
export function attendanceFailure(error: unknown) {
  if (error instanceof AttendanceError) return NextResponse.json({ error: error.message }, { status: error.status });
  console.error('Falha no controle de presença:', error);
  return NextResponse.json({ error: 'Não foi possível consultar ou salvar a presença. Tente novamente.' }, { status: 503 });
}
export const attendanceHeaders = { 'Cache-Control': 'private, no-store' };
