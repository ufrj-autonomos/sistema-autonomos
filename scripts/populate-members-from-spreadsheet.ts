import { spawnSync } from 'node:child_process';
import { prisma } from '../src/lib/prisma';
import { db as institutionalDb } from '../src/lib/institutional/db';
import { ensureAttendanceEnrollment } from '../src/lib/attendance/enrollment';
import { calculateAgeFromBirthDate } from '../src/lib/birthdays';
import { publishInstitutionalSite } from '../src/lib/institutional/publish';

interface ParsedMember {
  name: string;
  email: string;
  birthDate: string; // YYYY-MM-DD
  cpf: string | null;
  phone: string | null;
  dre: string | null;
  emergencyContactName: string;
  emergencyContactPhone: string;
  area: string;
  role: string;
  course: string;
  academicPeriod: string;
}

function parseSpreadsheet(): ParsedMember[] {
  const pyCode = `
import openpyxl, json, re, datetime

wb = openpyxl.load_workbook('/home/gaspar/Downloads/Registro de Membros 26.1 (respostas) (1).xlsx')
sheet2 = wb['Registro de Membros']

def clean_cpf(val):
    if val is None: return None
    s = str(int(val)) if isinstance(val, (int, float)) else re.sub(r'\\D', '', str(val))
    if not s: return None
    s = s.zfill(11)
    if len(s) != 11 or len(set(s)) == 1: return None
    s1 = sum(int(s[i]) * (10 - i) for i in range(9))
    if ((s1 * 10 % 11) % 10) != int(s[9]): return None
    s2 = sum(int(s[i]) * (11 - i) for i in range(10))
    if ((s2 * 10 % 11) % 10) != int(s[10]): return None
    return f'{s[:3]}.{s[3:6]}.{s[6:9]}-{s[9:]}'

def clean_dre(val):
    if val is None: return None
    s = str(int(val)) if isinstance(val, (int, float)) else re.sub(r'\\D', '', str(val))
    if not s or set(s) == {'0'}: return None
    return s

def clean_phone(val):
    if val is None: return None
    if isinstance(val, (int, float)):
        s = str(int(val))
    else:
        s = str(val).strip().lstrip('=')
    if ',' in s: s = s.split(',')[0].strip()
    if '/' in s: s = s.split('/')[0].strip()
    if '.' in s and not any(c.isalpha() for c in s): s = s.split('.')[0].strip()
    d = re.sub(r'\\D', '', s)
    if d.startswith('0'): d = d[1:]
    if d.startswith('55') and len(d) > 11: d = d[2:]
    if len(d) == 11:
        return f'({d[:2]}) {d[2:7]}-{d[7:]}'
    elif len(d) == 10:
        return f'({d[:2]}) {d[2:6]}-{d[6:]}'
    return d or None

members = []
for r in range(2, 33):
    name = sheet2[r][0].value
    if not name: continue
    name_str = str(name).strip()
    
    b_val = sheet2[r][1].value
    if name_str.startswith('Vitor Jhony'):
        birth = '2000-11-21'
    elif isinstance(b_val, (datetime.datetime, datetime.date)):
        birth = b_val.strftime('%Y-%m-%d')
    else:
        birth = str(b_val)[:10]

    email = str(sheet2[r][4].value).strip().lower()
    cpf = clean_cpf(sheet2[r][2].value)
    phone = clean_phone(sheet2[r][3].value)
    dre = clean_dre(sheet2[r][5].value)
    emg_name = str(sheet2[r][6].value or 'Contato de Emergência').strip()
    emg_phone = clean_phone(sheet2[r][7].value) or ''
    area = str(sheet2[r][8].value or '').strip()
    role = str(sheet2[r][9].value or '').strip()
    course = str(sheet2[r][10].value or '').strip()
    
    p_val = sheet2[r][11].value
    period = f'{int(p_val)}º período' if isinstance(p_val, (int, float)) else str(p_val or 'Não informado').strip()

    members.append({
        'name': name_str,
        'email': email,
        'birthDate': birth,
        'cpf': cpf,
        'phone': phone,
        'dre': dre,
        'emergencyContactName': emg_name,
        'emergencyContactPhone': emg_phone,
        'area': area,
        'role': role,
        'course': course,
        'academicPeriod': period,
    })

print(json.dumps(members))
`;

  const res = spawnSync('uv', ['run', '--with', 'openpyxl', 'python3', '-c', pyCode], { encoding: 'utf8' });
  if (res.status !== 0) {
    throw new Error(`Falha ao ler planilha: ${res.stderr || res.stdout}`);
  }
  return JSON.parse(res.stdout);
}

function normalize(s: string): string {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function removeOldTempMembers() {
  const membersToDelete = await prisma.member.findMany({
    where: {
      OR: [
        { institutionalMemberId: { gte: 109 } },
        { id: 'cmw0g5elb000iur8hlwkwqtz7' },
      ],
    },
    select: { id: true, institutionalMemberId: true, name: true },
  });

  if (membersToDelete.length === 0) {
    console.log('Nenhum membro temporário da planilha antiga para remover.');
    return;
  }

  const ids = membersToDelete.map((m) => m.id);
  const instIds = membersToDelete
    .map((m) => m.institutionalMemberId)
    .filter((id): id is number => typeof id === 'number' && id >= 109);

  console.log(`🗑️ Removendo ${ids.length} membros inseridos da planilha antiga (2024.2)...`);
  await prisma.attendancePeriod.deleteMany({ where: { memberId: { in: ids } } });
  await prisma.member.deleteMany({ where: { id: { in: ids } } });
  if (instIds.length > 0) {
    await institutionalDb.institutionalMember.deleteMany({ where: { id: { in: instIds } } });
  }
  console.log('✅ Membros antigos removidos com sucesso.\n');
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`🚀 Iniciando sincronização com a planilha 26.1 ${isDryRun ? '(MODO SIMULAÇÃO)' : '(MODO REAL)'}...`);

  if (!isDryRun) {
    await removeOldTempMembers();
  }

  const spreadsheetMembers = parseSpreadsheet();
  console.log(`Planilha lida com sucesso: ${spreadsheetMembers.length} integrantes encontrados na folha Registro de Membros.\n`);

  const platformMembers = await prisma.member.findMany();
  const instMembers = await institutionalDb.institutionalMember.findMany();

  const results: Array<{
    action: 'UPDATED' | 'CREATED';
    name: string;
    email: string;
    dre: string | null;
    cpf: string | null;
    area: string;
    course: string;
    role: string;
    institutionalId: number;
  }> = [];

  for (const s of spreadsheetMembers) {
    const sNorm = normalize(s.name);
    // Find existing by normalized name or email or special alias
    let existing = platformMembers.find(
      (m) =>
        normalize(m.name) === sNorm ||
        (m.email && m.email.toLowerCase() === s.email) ||
        (sNorm.includes('calixto') && normalize(m.name).includes('calixto')) ||
        (sNorm.includes('julia') && sNorm.includes('torques') && normalize(m.name).includes('torques'))
    );

    const birthDateObj = new Date(`${s.birthDate}T12:00:00Z`);
    const derivedAge = calculateAgeFromBirthDate(birthDateObj);

    if (existing) {
      console.log(`Atualizando integrante existente: ${existing.name} -> ${s.name} (${s.email})`);
      let instId = existing.institutionalMemberId;

      if (!isDryRun) {
        // Update InstitutionalMember if linked
        if (instId) {
          const isMatheusMendes = s.name.includes('Matheus Mendes');
          await institutionalDb.institutionalMember.update({
            where: { id: instId },
            data: {
              name: s.name,
              area: s.area,
              role: s.role,
              course: s.course,
              age: derivedAge,
              active: isMatheusMendes ? false : true,
              leftYear: isMatheusMendes ? '2026' : null,
            },
          });
        }

        // Update Member in platform
        await prisma.member.update({
          where: { id: existing.id },
          data: {
            name: s.name,
            email: s.email,
            area: s.area,
            phone: s.phone,
            dre: s.dre,
            cpf: s.cpf,
            birthDate: birthDateObj,
            course: s.course,
            academicPeriod: s.academicPeriod,
            emergencyContactName: s.emergencyContactName,
            emergencyContactPhone: s.emergencyContactPhone,
            profileCompletedAt: existing.profileCompletedAt ?? new Date(),
          },
        });
      }

      results.push({
        action: 'UPDATED',
        name: s.name,
        email: s.email,
        dre: s.dre,
        cpf: s.cpf,
        area: s.area,
        course: s.course,
        role: s.role,
        institutionalId: instId ?? 0,
      });
    } else {
      console.log(`Criando novo integrante: ${s.name} (${s.email})`);
      let instId = 0;

      if (!isDryRun) {
        // Create in Institutional DB (Juliana Braveres da Silva, Vice-Capitão, Harpia teamId: 2, showOnSite: true)
        const isFemale = s.name.toLowerCase().endsWith('a') || s.name.toLowerCase().includes('juliana');
        const createdInst = await institutionalDb.institutionalMember.create({
          data: {
            name: s.name,
            role: s.role,
            roleEn: s.role === 'Vice-Capitão' ? 'Vice-Captain' : s.role,
            roleFr: s.role === 'Vice-Capitão' ? 'Vice-Capitaine' : s.role,
            area: s.area,
            course: s.course,
            courseEn: s.course === 'Engenharia de Controle e Automação' ? 'Control and Automation Engineering' : null,
            courseFr: s.course === 'Engenharia de Controle e Automação' ? "Génie du Contrôle et de l'Automatisation" : null,
            teamId: 2, // UFRJ Harpia
            active: true,
            showOnSite: true,
            isFemale,
            age: derivedAge,
            joinedYear: '2023',
            projectIds: '[]',
          },
        });
        instId = createdInst.id;

        // Create in Platform DB
        const createdPlatform = await prisma.member.create({
          data: {
            name: s.name,
            email: s.email,
            role: 'MEMBER',
            status: 'APPROVED',
            area: s.area,
            phone: s.phone,
            dre: s.dre,
            cpf: s.cpf,
            birthDate: birthDateObj,
            course: s.course,
            academicPeriod: s.academicPeriod,
            emergencyContactName: s.emergencyContactName,
            emergencyContactPhone: s.emergencyContactPhone,
            profileCompletedAt: new Date(),
            institutionalMemberId: instId,
          },
        });

        await ensureAttendanceEnrollment(prisma, createdPlatform);
      }

      results.push({
        action: 'CREATED',
        name: s.name,
        email: s.email,
        dre: s.dre,
        cpf: s.cpf,
        area: s.area,
        course: s.course,
        role: s.role,
        institutionalId: instId,
      });
    }
  }

  if (!isDryRun) {
    await publishInstitutionalSite();
  }

  console.log('\n--- RESUMO DA OPERAÇÃO ---');
  console.table(results);
}

main()
  .catch((e) => {
    console.error('Erro na sincronização:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await institutionalDb.$disconnect();
  });
