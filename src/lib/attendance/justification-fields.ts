export const JUSTIFICATION_REASONS = [
  { value: 'MEDICAL', label: 'Problemas médicos / saúde' },
  { value: 'PERSONAL', label: 'Questões pessoais ou familiares' },
  { value: 'ACADEMIC', label: 'Compromisso acadêmico' },
  { value: 'TRANSPORT', label: 'Problemas de transporte' },
  { value: 'OFFSITE_EVENT', label: 'Evento fora do laboratório' },
  { value: 'RECORD_CORRECTION', label: 'Recurso por problema no registro de presença' },
  { value: 'OTHER', label: 'Outro motivo' },
] as const;
export const JUSTIFICATION_STATUSES: Record<string, string> = { PENDING: 'Aguardando análise', APPROVED: 'Aprovada', REJECTED: 'Negada' };
export function justificationReason(value: string) { return JUSTIFICATION_REASONS.find(reason => reason.value === value)?.label || value; }
export type JustificationDto = {
  id: string; week: string; reason: string; details: string; status: string;
  createdAt: string; reviewedAt: string | null; reviewerName: string | null; reviewNote: string | null;
  member: { id: string; name: string; email: string | null };
};
export type JustificationList = { items: JustificationDto[]; pending: number; total: number; nextCursor: string | null };
