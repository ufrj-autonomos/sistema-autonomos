import { prisma } from '../src/lib/prisma';
import { db } from '../src/lib/institutional/db';

const SHEET_ID = '1sxZ3unxrPhciYfy82liMhbZST9f0mRu5CtfSK46duWk';

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const NAME_OVERRIDES: Record<string, string> = {
  'gabriel gaspar': 'Gabriel Gaspar Agostinho',
  'gabriel gaspar agostinho': 'Gabriel Gaspar Agostinho',
  'pedro barros santiago': 'Pedro Barros Santiago',
  'arthur bacci de oliveira': 'Arthur Bacci de Oliveira',
  'joao marcos correa gomes': 'João Marcos Correa Gomes',
  'reiki francis nunes nascimento': 'Reiki Francis Nunes Nascimento',
  'ana laura tostes': 'Ana Laura Tostes',
  'carlos alberto siebra boucas': 'Carlos Alberto Siebra Bouças',
  'gabriel facundo': 'Gabriel Facundo Alves da Costa',
  'antonio carlos': 'Antônio Carlos Medeiros de Santana',
  'andre silva mendes': 'André Silva Mendes',
  'derek arissa werneck': 'Derek Arissa Werneck',
  'brendo machado teixeira': 'Brendo Machado Teixeira',
  'gabriel felix hilleshein': 'Gabriel Felix Hilleshein',
  'victor hugo russo cordeiro': 'Victor Hugo Russo Cordeiro',
  'vitor jhony santos de oliveira': 'Vitor Jhony Santos de Oliveira',
  'filipe queiroz calixto': 'Filipe Queiroz Calixto',
  'joao pedro de marins lessa nespoli borges': 'João Pedro de Marins Lessa Nespoli Borges',
  'miguel de andrade bezerra': 'Miguel de Andrade Bezerra',
  'alexandra gabriele': 'Alexandra Alves',
  'alexandra alves': 'Alexandra Alves',
  'ana carolina': 'Ana Carolina da Silva Guimarães',
  'ana carolini': 'Ana Carolini Calot Rodrigues',
  'beatriz do carmo': 'Beatriz do Carmo Rocha',
  'marcelo bastos': 'Marcelo Bastos Juliano',
  'vitoria sabline alves': 'Vitória Sabline da Hora Alves',
  'gabriele valeria vieira': 'Gabriele Valeria Vieira',
  'leonardo lacerda': 'Leonardo Lacerda',
};

function parseDate(dateStr: string): Date {
  // Format: "15/9" -> 2026-09-15
  const parts = dateStr.trim().split('/');
  if (parts.length === 2) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const date = new Date(Date.UTC(2026, month - 1, day, 12, 0, 0));
    return date;
  }
  return new Date();
}

async function syncMembersTeam() {
  console.log('--- Sincronizando teamId dos membros ---');
  const instMembers = await db.institutionalMember.findMany();
  const instMap = new Map(instMembers.map((i) => [i.id, i]));

  const platformMembers = await prisma.member.findMany();
  let updated = 0;

  for (const m of platformMembers) {
    if (m.institutionalMemberId && instMap.has(m.institutionalMemberId)) {
      const im = instMap.get(m.institutionalMemberId)!;
      if (m.teamId !== im.teamId) {
        await prisma.member.update({
          where: { id: m.id },
          data: { teamId: im.teamId },
        });
        updated++;
      }
    }
  }
  console.log(`Atualizados ${updated} membros com teamId.`);
}

async function ensureMember(name: string, area: string, teamId: number | null) {
  const norm = normalize(name);
  const targetName = NAME_OVERRIDES[norm] || name;

  const members = await prisma.member.findMany();
  let found = members.find((m) => normalize(m.name) === normalize(targetName));

  if (!found) {
    // Check if in institutional
    const inst = await db.institutionalMember.findMany();
    const instFound = inst.find((i) => normalize(i.name) === normalize(targetName));

    console.log(`Criando membro ausente: ${targetName} (${area})`);
    const emailPrefix = normalize(targetName).replace(/\s+/g, '.');
    found = await prisma.member.create({
      data: {
        name: targetName,
        email: `${emailPrefix}@autonomos.ufrj.br`,
        area: area,
        teamId: teamId,
        institutionalMemberId: instFound?.id || null,
        role: 'MEMBER',
        status: 'APPROVED',
      },
    });
  } else {
    // Ensure teamId and area are consistent
    if (found.teamId !== teamId || found.area === 'Não informada') {
      found = await prisma.member.update({
        where: { id: found.id },
        data: {
          teamId: teamId,
          ...(found.area === 'Não informada' ? { area: area } : {}),
        },
      });
    }
  }

  return found;
}

async function importSheet(
  sheetName: string,
  area: string,
  teamId: number | null
) {
  console.log(`\nImportando planilha [${sheetName}] (Área: ${area}, TeamId: ${teamId})...`);
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(
    sheetName
  )}`;
  const res = await fetch(url);
  const text = await res.text();
  const rows = text
    .split('\n')
    .map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()));

  const headerIdx = rows.findIndex((r) =>
    r.some((c) => c.toLowerCase().includes('nome do membro'))
  );
  if (headerIdx === -1) {
    console.error(`Cabeçalho não encontrado em ${sheetName}`);
    return;
  }

  const header = rows[headerIdx];
  const meetings: { num: number; colIdx: number; dateStr: string }[] = [];
  let col = 2;
  while (col < header.length && header[col] && !isNaN(Number(header[col]))) {
    meetings.push({ num: Number(header[col]), colIdx: col, dateStr: '' });
    col++;
  }

  const dataRow = rows.find(
    (r) => r[1]?.toLowerCase() === 'data' || r[0]?.toLowerCase() === 'data'
  );
  if (dataRow) {
    meetings.forEach((m) => {
      m.dateStr = dataRow[m.colIdx] || '';
    });
  }

  console.log(`Encontradas ${meetings.length} reuniões em ${sheetName}.`);

  // Delete existing meetings for this period & area & teamId to avoid duplicates
  const existing = await prisma.meeting.findMany({
    where: { area, teamId, period: '26.2' },
  });
  if (existing.length > 0) {
    console.log(`Removendo ${existing.length} reuniões anteriores de ${area}...`);
    await prisma.meeting.deleteMany({
      where: { id: { in: existing.map((e) => e.id) } },
    });
  }

  // Create meetings
  const createdMeetings = [];
  for (const m of meetings) {
    const meetingDate = m.dateStr ? parseDate(m.dateStr) : new Date(Date.UTC(2026, 8, 15, 12, 0, 0));
    const meeting = await prisma.meeting.create({
      data: {
        title: `Reunião ${m.num}`,
        date: meetingDate,
        area: area,
        teamId: teamId,
        period: '26.2',
        description: `Reunião ${m.num} da área de ${area} (${sheetName}) no período 26.2`,
      },
    });
    createdMeetings.push({ ...m, id: meeting.id });
  }

  // Parse members and attendances
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const rawName = row[1];
    if (!rawName || rawName.toLowerCase() === 'data' || rawName.toLowerCase().startsWith('total')) continue;

    const member = await ensureMember(rawName, area, teamId);

    for (const m of createdMeetings) {
      let mark = (row[m.colIdx] || '').toUpperCase();
      // Mecânica empty marks are counted as presence P in the spreadsheet
      if (area === 'Mecânica' && !mark) {
        mark = 'P';
      }

      let status: 'PRESENT' | 'ABSENT' | 'JUSTIFIED' | 'LATE' | 'NO_MEETING' = 'PRESENT';
      if (mark === 'P') status = 'PRESENT';
      else if (mark === 'F') status = 'ABSENT';
      else if (mark === 'J') status = 'JUSTIFIED';
      else if (mark === 'A') status = 'LATE';
      else if (mark === 'S') status = 'NO_MEETING';
      else if (!mark) status = 'PRESENT';

      await prisma.meetingAttendance.create({
        data: {
          meetingId: m.id,
          memberId: member.id,
          status: status,
        },
      });
    }
  }

  console.log(`Concluído ${sheetName}.`);
}

async function main() {
  await syncMembersTeam();

  // Software (Harpia: teamId 2)
  await importSheet('Software', 'Software', 2);

  // Mecânica (Harpia: teamId 2)
  await importSheet('Mecânica', 'Mecânica', 2);

  // Eletrônica (Harpia: teamId 2)
  await importSheet('Eletrônica', 'Eletrônica', 2);

  // Gente e Gestão (Autônomos: teamId null)
  await importSheet('Gente e Gestão', 'Gestão', null);

  // Marketing (Autônomos: teamId null)
  await importSheet('Marketing', 'Marketing', null);

  console.log('\n--- VERIFICAÇÃO FINAL ---');
  const totalMeetings = await prisma.meeting.count({ where: { period: '26.2' } });
  const totalAttendances = await prisma.meetingAttendance.count();
  console.log({ totalMeetings, totalAttendances });

  const areas = await prisma.meeting.groupBy({
    by: ['area', 'teamId'],
    _count: { id: true },
    where: { period: '26.2' },
  });
  console.log('Reuniões por área:', areas);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

