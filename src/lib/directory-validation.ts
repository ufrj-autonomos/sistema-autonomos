export function privateData(input: unknown, member: boolean) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Dados internos inválidos.');
  const data = input as Record<string, unknown>;
  const allowed = member ? ['cpf', 'notes', 'userId'] : ['notes'];
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
  return { notes, cpf, userId: data.userId || null };
}
