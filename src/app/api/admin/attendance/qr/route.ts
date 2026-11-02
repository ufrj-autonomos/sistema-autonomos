import QRCode from 'qrcode';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { getAppOrigin } from '@/lib/environment';
import { AttendanceError } from '@/lib/attendance/service';
import { attendanceFailure, attendanceHeaders } from '@/lib/attendance/http';
export async function GET(req: NextRequest) {
  try {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;
    const settings = await prisma.attendanceSettings.findUnique({ where: { id: 'lab' } });
    if (!settings) throw new AttendanceError('O controle de presença ainda não foi configurado.', 503);
    const url = `${getAppOrigin()}/presenca/registrar?code=${settings.qrCode}`;
    const image = await QRCode.toDataURL(url, { width: 480, margin: 4, errorCorrectionLevel: 'M' });
    return NextResponse.json({ image, origin: getAppOrigin() }, { headers: attendanceHeaders });
  } catch (error) { return attendanceFailure(error); }
}
