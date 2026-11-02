export function privateData(input: unknown, member: boolean) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dados internos inválidos.');
  const data = input as Record<string, unknown>;
  const allowed = member ? ['cpf', 'notes', 'userId', 'name', 'area', 'email', 'phone', 'dre', 'birthDate', 'course', 'academicPeriod', 'emergencyContactName', 'emergencyContactPhone'] : ['notes'];
  if (Object.keys(data).some(key => !allowed.includes(key))) throw new Error('Campo interno não permitido.');
  if (typeof data.notes !== 'string' || data.notes.length > 10000) throw new Error('Informe observações de até 10.000 caracteres.');
  const notes = data.notes.trim() || null;
  if (!member) return { notes };
  if (typeof data.cpf !== 'string' || !/^[\d.\-\s]*$/.test(data.cpf)) throw new Error('CPF inválido.');
  const cpf = data.cpf.replace(/\D/g, '') || null;
  if (cpf) {
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) throw new Error('CPF inválido.');
    for (const length of [9, 10]) {
      const sum = [...cpf.slice(0, length)].reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
      const check = (sum * 10) % 11 % 10;
      if (check !== Number(cpf[length])) throw new Error('CPF inválido. Confira os dígitos.');
    }
  }
  if (typeof data.userId !== 'string' || data.userId.length > 100) throw new Error('Selecione uma conta válida.');
  const operational: {
    name?: string | null; area?: string | null; email?: string | null; phone?: string | null;
    dre?: string | null; birthDate?: Date | null; course?: string | null; academicPeriod?: string | null;
    emergencyContactName?: string | null; emergencyContactPhone?: string | null;
  } = {};
  const textFields = { name: ['nome', 200], area: ['área', 100], email: ['email', 254], phone: ['contato', 30], dre: ['DRE', 25], course: ['curso', 200], academicPeriod: ['período', 50], emergencyContactName: ['nome do contato de emergência', 200], emergencyContactPhone: ['telefone de emergência', 30] } as const;
  for (const key of Object.keys(textFields) as (keyof typeof textFields)[]) {
    if (!(key in data)) continue;
    const value = data[key];
    const [label, limit] = textFields[key];
    if (typeof value !== 'string' || value.length > limit || value.includes('\0')) throw new Error(`Confira o campo ${label}.`);
    operational[key] = value.trim() || null;
  }
  if (operational.email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operational.email)) throw new Error('Informe um email válido.');
    operational.email = operational.email.toLowerCase();
  }
  for (const key of ['phone', 'emergencyContactPhone'] as const) {
    const value = operational[key];
    if (value && (!/^[+\d().\s-]+$/.test(value) || value.replace(/\D/g, '').length < 8 || value.replace(/\D/g, '').length > 15)) throw new Error('Informe um telefone válido, incluindo o DDD.');
  }
  if (operational.dre) {
    if (!/^[\d.\s-]+$/.test(operational.dre)) throw new Error('Informe apenas números no DRE.');
    operational.dre = operational.dre.replace(/\D/g, '') || null;
  }
  if ('birthDate' in data) {
    if (typeof data.birthDate !== 'string') throw new Error('Data de nascimento inválida.');
    operational.birthDate = null;
    if (data.birthDate) {
      const date = new Date(`${data.birthDate}T00:00:00Z`);
      const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo' }).format(new Date());
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== data.birthDate || data.birthDate < '1900-01-01' || data.birthDate > today) throw new Error('Informe uma data de nascimento válida, sem data futura.');
      operational.birthDate = date;
    }
  }
  return { notes, cpf, userId: data.userId || null, ...operational };
}
