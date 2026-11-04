import { Prisma } from '@/generated/institutional';
import { adminModels, type AdminField } from './admin-config';
import { normalizeMemberArea, normalizeMemberRole } from '../member-fields';
import { db } from './db';

export class InstitutionalError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function getInstitutionalModel(table: string) {
  const config = Object.values(adminModels).find(item => item.table === table);
  if (!config) throw new InstitutionalError('Tabela institucional inválida.');
  const modelKey = config.table === 'member' ? 'institutionalMember' : config.table;
  return { config, model: (db as any)[modelKey] };
}
export function recordData(table: string, input: unknown, creating: boolean) {
  const config = Object.values(adminModels).find(item => item.table === table);
  if (!config) throw new InstitutionalError('Tabela institucional inválida.');
  if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input).length > 262144) throw new InstitutionalError('Dados inválidos ou muito extensos.');
  const targetModelName = table.toLowerCase() === 'member' ? 'institutionalmember' : table.toLowerCase();
  const fields = Prisma.dmmf.datamodel.models.find(item => item.name.toLowerCase() === targetModelName || item.name.toLowerCase() === table.toLowerCase())!.fields;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (['id', 'createdAt', 'updatedAt'].includes(key)) continue;
    const field = config.fields.find(item => item.name === key) || (table === 'member' && ['roleEn','roleFr'].includes(key) ? { name: key, label: key, type: 'string' } as AdminField : undefined);
    const column = fields.find(item => item.name === key && item.kind === 'scalar');
    if (!field || !column) throw new InstitutionalError(`Campo não permitido: ${key}.`);
    let clean = value;
    if (table === 'member' && key === 'role' && typeof clean === 'string') clean = normalizeMemberRole(clean);
    if (table === 'member' && key === 'area' && typeof clean === 'string') {
      clean = normalizeMemberArea(clean);
      if (!clean) throw new InstitutionalError('Selecione a área na equipe.');
    }
    if (clean === '' || clean === undefined) clean = column.isRequired && column.type === 'String' ? '' : null;
    if (clean === null) {
      if (column.isRequired) throw new InstitutionalError(`Preencha ${field.label}.`);
      result[key] = null; continue;
    }
    if (column.type === 'Boolean') {
      if (typeof clean !== 'boolean') throw new InstitutionalError(`Valor inválido em ${field.label}.`);
    } else if (['Int', 'Float'].includes(column.type)) {
      if (typeof clean !== 'number' && typeof clean !== 'string') throw new InstitutionalError(`Número inválido em ${field.label}.`);
      clean = Number(clean);
      if (!Number.isFinite(clean) || (column.type === 'Int' && !Number.isSafeInteger(clean))) throw new InstitutionalError(`Número inválido em ${field.label}.`);
    } else {
      if (typeof clean !== 'string' || clean.includes('\0')) throw new InstitutionalError(`Texto inválido em ${field.label}.`);
      if (field.required && !clean.trim()) throw new InstitutionalError(`Preencha ${field.label}.`);
      if (field.type === 'image' || ['linkedin','github','instagram','website','coverImage','bannerImage','photo','logo'].includes(key)) {
        if (clean && !clean.startsWith('/images/') && !/^https?:\/\//i.test(clean)) throw new InstitutionalError(`URL inválida em ${field.label}.`);
      }
      if (field.type === 'json-array' || field.type === 'json') {
        try { const parsed = JSON.parse(clean || (field.type === 'json-array' ? '[]' : '{}')); if (!parsed || typeof parsed !== 'object' || (field.type === 'json-array' && !Array.isArray(parsed))) throw new Error(); }
        catch { throw new InstitutionalError(`JSON inválido em ${field.label}.`); }
      }
    }
    result[key] = clean;
  }
  if (creating) for (const field of fields.filter(item => item.kind === 'scalar' && item.isRequired && !item.hasDefaultValue && !item.isUpdatedAt)) {
    if (!(field.name in result)) {
      const formField = config.fields.find(item => item.name === field.name);
      if (field.type === 'String' && !formField?.required) result[field.name] = formField?.type === 'json-array' ? '[]' : formField?.type === 'json' ? '{}' : '';
      else throw new InstitutionalError(`Preencha ${formField?.label || field.name}.`);
    }
  }
  return result;
}
export function institutionalFailure(error: unknown) {
  if (error instanceof InstitutionalError) return error.message;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return 'Já existe um registro com esse identificador.';
    if (error.code === 'P2003') return 'Confira os vínculos: um dos registros relacionados não existe ou ainda está em uso.';
    if (error.code === 'P2025') return 'Registro não encontrado. Atualize a lista.';
  }
  console.error('Falha na operação institucional:', error instanceof Error ? error.name : 'unknown');
  return 'Não foi possível concluir a operação no banco institucional. Tente novamente.';
}
