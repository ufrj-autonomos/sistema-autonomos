import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { hasManagementAccess } from '@/lib/access-policy';
import {
  exportMeetingsToSheets,
  exportMembersToSheets,
  exportDisciplinaryToSheets,
  exportAttendanceToSheets,
} from '@/lib/export/google-sheets';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Controle estrito de acesso: apenas Coordenadores, Gestão e Admin
    if (!hasManagementAccess(user.role)) {
      return NextResponse.json(
        { error: 'Acesso negado. A exportação para o Google Sheets é exclusiva para Coordenadores, Gestão e Administradores.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const period = searchParams.get('period') || '26.2';
    const areaKey = searchParams.get('areaKey') || undefined;
    const format = searchParams.get('format') || 'csv';
    const week = searchParams.get('week') || undefined;

    let result;
    switch (type) {
      case 'meetings':
        result = await exportMeetingsToSheets(user, period, areaKey);
        break;
      case 'members':
        result = await exportMembersToSheets();
        break;
      case 'disciplinary':
        result = await exportDisciplinaryToSheets(user);
        break;
      case 'attendance':
        result = await exportAttendanceToSheets(week);
        break;
      default:
        return NextResponse.json(
          { error: 'Tipo de tabela inválido. Use "meetings", "members", "disciplinary" ou "attendance".' },
          { status: 400 }
        );
    }

    if (format === 'json') {
      return NextResponse.json({
        success: true,
        filename: result.filename,
        title: result.title,
        rowCount: result.rowCount,
        tsv: result.tsvContent,
        csv: result.csvContent,
      });
    }

    // Retornar arquivo CSV para download direto compatível com Google Sheets e Excel
    return new NextResponse(result.csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Erro na exportação para Google Sheets:', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar exportação para o Google Sheets.' },
      { status: 500 }
    );
  }
}
