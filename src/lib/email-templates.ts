export interface BuiltEmail {
  subject: string;
  html: string;
  text: string;
}

export type EmailAccent = 'cyan' | 'emerald' | 'amber' | 'red';

const ACCENT_TOKENS: Record<
  EmailAccent,
  {
    bar: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    ctaBg: string;
    highlightBg: string;
    highlightBorder: string;
    highlightTitle: string;
  }
> = {
  cyan: {
    bar: '#06b6d4',
    badgeBg: '#083344',
    badgeText: '#67e8f9',
    badgeBorder: '#0e7490',
    ctaBg: '#0284c7',
    highlightBg: '#0c2238',
    highlightBorder: '#06b6d4',
    highlightTitle: '#67e8f9',
  },
  emerald: {
    bar: '#10b981',
    badgeBg: '#022c22',
    badgeText: '#6ee7b7',
    badgeBorder: '#047857',
    ctaBg: '#059669',
    highlightBg: '#07241e',
    highlightBorder: '#10b981',
    highlightTitle: '#6ee7b7',
  },
  amber: {
    bar: '#f59e0b',
    badgeBg: '#3b1d06',
    badgeText: '#fcd34d',
    badgeBorder: '#b45309',
    ctaBg: '#d97706',
    highlightBg: '#271a08',
    highlightBorder: '#f59e0b',
    highlightTitle: '#fcd34d',
  },
  red: {
    bar: '#ef4444',
    badgeBg: '#3b0a0a',
    badgeText: '#fca5a5',
    badgeBorder: '#b91c1c',
    ctaBg: '#dc2626',
    highlightBg: '#271014',
    highlightBorder: '#ef4444',
    highlightTitle: '#fca5a5',
  },
};

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function resolveAppBaseUrl(override?: string): string {
  const raw =
    override ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '') ||
    'https://sistema.autonomos.ufrj.br';
  return raw.replace(/\/+$/, '');
}

function wrapAutonomosShell(params: {
  accent: EmailAccent;
  eyebrow: string;
  heading: string;
  subtitle?: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): string {
  const t = ACCENT_TOKENS[params.accent];
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>${escapeEmailHtml(params.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:#050a14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#050a14;padding:28px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background-color:#0d1526;border-radius:16px;overflow:hidden;border:1px solid #1e293b;box-shadow:0 20px 45px rgba(0,0,0,0.5);">
          <tr>
            <td style="height:5px;background:${t.bar};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="background-color:#080f1d;border-bottom:1px solid #1e293b;padding:24px 28px;color:#f8fafc;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#64748b;margin-bottom:10px;">
                UFRJ AUTÔNOMOS &bull; NAUTILUS &bull; HARPIA
              </div>
              <div style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:${t.badgeBg};border:1px solid ${t.badgeBorder};color:${t.badgeText};font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">
                ${escapeEmailHtml(params.eyebrow)}
              </div>
              <h1 style="margin:0;font-size:22px;line-height:1.25;font-weight:800;color:#f8fafc;">
                ${escapeEmailHtml(params.heading)}
              </h1>
              ${
                params.subtitle
                  ? `<p style="margin:8px 0 0;font-size:14px;line-height:1.5;color:#94a3b8;">${escapeEmailHtml(params.subtitle)}</p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:26px 28px;background-color:#0d1526;color:#cbd5e1;font-size:15px;line-height:1.6;">
              ${params.bodyHtml}
              ${
                params.ctaLabel && params.ctaUrl
                  ? `<div style="margin-top:24px;text-align:center;">
                      <a href="${escapeEmailHtml(params.ctaUrl)}" style="display:inline-block;padding:12px 24px;border-radius:10px;background-color:${t.ctaBg};color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.01em;">
                        ${escapeEmailHtml(params.ctaLabel)}
                      </a>
                    </div>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="background-color:#080f1d;border-top:1px solid #1e293b;padding:16px 28px;font-size:12px;line-height:1.5;color:#64748b;">
              Mensagem automática enviada pelo <strong style="color:#94a3b8;">Sistema Autônomos (UFRJ)</strong>.<br />
              Em caso de dúvida, entre em contato com a Gestão da equipe.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export interface DisciplinaryEmailInput {
  recipientName: string;
  occurrenceType: 'AVISO' | 'ADVERTENCIA_DIRETA' | 'EXPULSAO_DIRETA';
  occurrenceReason: string;
  occurrenceNotes?: string | null;
  avisosCount: number;
  directWarningsCount: number;
  warningFromAvisos: number;
  totalWarnings: number;
  status: 'REGULAR' | 'ATENCAO' | 'ALERTA' | 'EXPULSAO';
  statusLabel: string;
  wasAutoExpelled: boolean;
  appUrl?: string;
}

export function buildDisciplinaryEmail(input: DisciplinaryEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const typeTitle =
    input.occurrenceType === 'EXPULSAO_DIRETA'
      ? 'Expulsão Direta'
      : input.occurrenceType === 'ADVERTENCIA_DIRETA'
        ? 'Advertência Direta'
        : 'Aviso Disciplinar';

  const isExpelled =
    input.wasAutoExpelled ||
    input.occurrenceType === 'EXPULSAO_DIRETA' ||
    input.totalWarnings >= 3;
  const accent: EmailAccent =
    isExpelled || input.occurrenceType === 'ADVERTENCIA_DIRETA' || input.totalWarnings >= 2
      ? 'red'
      : 'amber';
  const t = ACCENT_TOKENS[accent];

  const subject = isExpelled
    ? `[Autônomos] Notificação disciplinar: Desligamento da equipe (${input.recipientName})`
    : `[Autônomos] Registro disciplinar: ${typeTitle} — Status ${input.statusLabel}`;

  const heading = isExpelled
    ? 'Desligamento Disciplinar Registrado'
    : `Nova Ocorrência: ${typeTitle}`;

  const subtitle = isExpelled
    ? 'Seu cadastro atingiu o limite disciplinar e foi movido para Ex-Membros.'
    : 'Um novo registro disciplinar foi lançado na sua ficha da equipe Autônomos.';

  const statusRiskNote = isExpelled
    ? 'Com este registro, seu vínculo ativo na equipe foi encerrado automaticamente conforme o regimento disciplinar.'
    : input.totalWarnings === 2
      ? 'Você está em situação de RISCO DE EXPULSÃO (2 advertências acumuladas). Uma nova advertência resultará em expulsão automática.'
      : 'Acompanhe seu histórico disciplinar para evitar o acúmulo de novas penalidades.';

  const notesHtml = input.occurrenceNotes?.trim()
    ? `<p style="margin:8px 0 0;font-size:13px;color:#cbd5e1;"><strong style="color:#f8fafc;">Observações:</strong> ${escapeEmailHtml(input.occurrenceNotes.trim())}</p>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(input.recipientName)}</strong>.</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      Informamos que foi registrado um(a) <strong style="color:#f8fafc;">${escapeEmailHtml(typeTitle)}</strong> no seu histórico disciplinar na <strong style="color:#f8fafc;">UFRJ Autônomos</strong>.
    </p>

    <div style="background-color:${t.highlightBg};border-left:4px solid ${t.highlightBorder};border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:${t.highlightTitle};margin-bottom:4px;">
        Motivo registrado
      </div>
      <div style="font-size:14px;font-weight:600;color:#f8fafc;">
        ${escapeEmailHtml(input.occurrenceReason)}
      </div>
      ${notesHtml}
    </div>

    <div style="background-color:#111c33;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:12px;">
        Seu Score Disciplinar Atual
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Avisos</div>
            <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:2px;">${input.avisosCount}</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Adv. Diretas</div>
            <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:2px;">${input.directWarningsCount}</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Total Adv.</div>
            <div style="font-size:20px;font-weight:800;color:#f87171;margin-top:2px;">${input.totalWarnings} / 3</div>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#cbd5e1;">
        <strong style="color:#f8fafc;">Status atual:</strong> ${escapeEmailHtml(input.statusLabel)}
        (incluindo ${input.warningFromAvisos} advertência(s) convertida(s) por avisos).
      </p>
      <p style="margin:6px 0 0;font-size:13px;color:#94a3b8;">
        ${escapeEmailHtml(statusRiskNote)}
      </p>
    </div>

    <div style="background-color:#080f1d;border:1px solid #1e293b;color:#cbd5e1;border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.55;">
      <strong style="color:#38bdf8;">Regra Disciplinar da Equipe:</strong><br />
      &bull; <strong style="color:#f8fafc;">2 avisos</strong> se convertem em <strong style="color:#f8fafc;">1 advertência</strong>.<br />
      &bull; <strong style="color:#f8fafc;">2 advertências</strong> colocam o membro em <strong style="color:#f8fafc;">risco de expulsão</strong>.<br />
      &bull; Na <strong style="color:#f8fafc;">3ª advertência</strong>, o desligamento (<strong style="color:#f8fafc;">expulsão</strong>) é aplicado automaticamente.
    </div>
  `;

  const html = wrapAutonomosShell({
    accent,
    eyebrow: isExpelled ? 'Desligamento Disciplinar' : 'Notificação Disciplinar',
    heading,
    subtitle,
    bodyHtml,
    ctaLabel: isExpelled ? undefined : 'Acessar Sistema Autônomos',
    ctaUrl: isExpelled ? undefined : `${baseUrl}/`,
  });

  const text = [
    `Olá, ${input.recipientName}.`,
    '',
    `Foi registrado um(a) ${typeTitle} na sua ficha disciplinar da UFRJ Autônomos.`,
    `Motivo: ${input.occurrenceReason}`,
    input.occurrenceNotes?.trim() ? `Observações: ${input.occurrenceNotes.trim()}` : null,
    '',
    'Seu score disciplinar atual:',
    `- Avisos: ${input.avisosCount}`,
    `- Advertências diretas: ${input.directWarningsCount}`,
    `- Advertências convertidas por avisos: ${input.warningFromAvisos}`,
    `- Total de advertências: ${input.totalWarnings} / 3`,
    `- Status atual: ${input.statusLabel}`,
    '',
    statusRiskNote,
    '',
    'Regra disciplinar: 2 avisos = 1 advertência; 2 advertências = risco de expulsão; na 3ª advertência = expulsão automática.',
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { subject, html, text };
}

export interface LabHoursAlertEmailInput {
  recipientName: string;
  area: string;
  mode: 'WEEKLY' | 'MONTHLY';
  periodLabel: string;
  completedFormatted: string;
  requiredFormatted: string;
  remainingFormatted: string;
  deadlineText: string;
  appUrl?: string;
}

export function buildLabHoursAlertEmail(input: LabHoursAlertEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const modeTitle = input.mode === 'MONTHLY' ? 'Meta Mensal (Gestão / Marketing)' : 'Meta Semanal de Laboratório';
  const subject = `⚠️ [Autônomos] Alerta de Horas Pendentes (${input.periodLabel}) — Faltam ${input.remainingFormatted}`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(input.recipientName)}</strong> (${escapeEmailHtml(input.area)}).</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      Identificamos que você <strong style="color:#f8fafc;">ainda não completou suas horas obrigatórias</strong> referentes a <strong style="color:#f8fafc;">${escapeEmailHtml(input.periodLabel)}</strong>.
    </p>

    <div style="background-color:#271014;border:1px solid #991b1b;border-radius:12px;padding:16px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#fca5a5;margin-bottom:10px;">
        ⚠️ Status de Presença &bull; ${escapeEmailHtml(modeTitle)}
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #7f1d1d;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Cumprido</div>
            <div style="font-size:18px;font-weight:800;color:#f8fafc;margin-top:2px;">${escapeEmailHtml(input.completedFormatted)}</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #7f1d1d;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;font-weight:700;text-transform:uppercase;">Meta</div>
            <div style="font-size:18px;font-weight:800;color:#f8fafc;margin-top:2px;">${escapeEmailHtml(input.requiredFormatted)}</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #7f1d1d;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#fca5a5;font-weight:700;text-transform:uppercase;">Faltando</div>
            <div style="font-size:18px;font-weight:800;color:#f87171;margin-top:2px;">${escapeEmailHtml(input.remainingFormatted)}</div>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;font-weight:600;color:#fca5a5;">
        Prazo final para regularização: ${escapeEmailHtml(input.deadlineText)}.
      </p>
    </div>

    <div style="background-color:#271a08;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 16px;font-size:13px;color:#fde68a;">
      <strong style="color:#fcd34d;">Atenção:</strong><br />
      A falta de presença no laboratório é passível de receber um <strong style="color:#ffffff;">aviso disciplinar</strong>. Caso haja algum imprevisto, registre sua justificativa no sistema ou alinhe com a Gestão antes do fechamento.
    </div>
  `;

  const html = wrapAutonomosShell({
    accent: 'red',
    eyebrow: 'Alerta Urgente de Presença',
    heading: 'Horas Obrigatórias Pendentes no Lab',
    subtitle: `${input.periodLabel} • Faltam ${input.remainingFormatted} para bater a meta`,
    bodyHtml,
    ctaLabel: 'Registrar Presença / Ver Horas',
    ctaUrl: `${baseUrl}/presenca`,
  });

  const text = [
    `ALERTA DE PRESENÇA — UFRJ AUTÔNOMOS`,
    '',
    `Olá, ${input.recipientName} (${input.area}).`,
    `Você ainda não completou suas horas obrigatórias de ${input.periodLabel} (${modeTitle}).`,
    `- Cumprido: ${input.completedFormatted}`,
    `- Meta obrigatória: ${input.requiredFormatted}`,
    `- Restante: ${input.remainingFormatted}`,
    `- Prazo final: ${input.deadlineText}`,
    '',
    'ATENÇÃO: A falta de presença é passível de receber um aviso disciplinar.',
    `Acesse: ${baseUrl}/presenca`,
  ].join('\n');

  return { subject, html, text };
}

export interface ReimbursementEmailInput {
  recipientName: string;
  event: 'CREATED' | 'STATUS_UPDATED';
  code: string;
  title: string;
  amountFormatted: string;
  status: string;
  statusLabel: string;
  pixKey?: string | null;
  pixKeyType?: string | null;
  reviewNotes?: string | null;
  teamLabel?: string | null;
  appUrl?: string;
}

export function buildReimbursementEmail(input: ReimbursementEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);

  let accent: EmailAccent = 'cyan';
  if (input.status === 'PAGO' || input.status === 'APROVADO') accent = 'emerald';
  else if (input.status === 'AGUARDANDO_NF' || input.status === 'AGUARDANDO_REEMBOLSO' || input.status === 'PENDENTE') accent = 'amber';
  else if (input.status === 'RECUSADO' || input.status === 'CANCELADO') accent = 'red';

  const t = ACCENT_TOKENS[accent];
  const isCreated = input.event === 'CREATED';

  const subject = isCreated
    ? `[Autônomos Financeiro] Solicitação ${input.code} recebida (${input.amountFormatted})`
    : input.status === 'PAGO'
      ? `[Autônomos Financeiro] Reembolso ${input.code} PAGO (${input.amountFormatted})`
      : `[Autônomos Financeiro] Reembolso ${input.code}: ${input.statusLabel}`;

  const heading = isCreated
    ? `Reembolso ${input.code} Registrado`
    : `Atualização do Reembolso ${input.code}`;

  const subtitle = isCreated
    ? 'Sua solicitação entrou na fila de análise financeira da equipe.'
    : `Novo status: ${input.statusLabel}`;

  const pixInfo = input.pixKey
    ? `${input.pixKeyType ? `${input.pixKeyType}: ` : ''}${input.pixKey}`
    : 'Não informada no pedido';

  const reviewNotesHtml = input.reviewNotes?.trim()
    ? `<div style="margin-top:12px;padding:12px 14px;background-color:${t.highlightBg};border-left:4px solid ${t.highlightBorder};border-radius:8px;font-size:13px;color:#cbd5e1;">
         <strong style="color:${t.highlightTitle};">Parecer / Observação da Gestão:</strong><br />
         ${escapeEmailHtml(input.reviewNotes.trim())}
       </div>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(input.recipientName)}</strong>.</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      ${
        isCreated
          ? 'Recebemos sua solicitação de reembolso no Sistema Autônomos. Confira os dados registrados:'
          : 'O andamento da sua solicitação de reembolso foi atualizado pela equipe financeira:'
      }
    </p>

    <div style="background-color:#111c33;border:1px solid #1e293b;border-radius:12px;padding:16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;">
        <tr>
          <td style="padding:6px 0;color:#94a3b8;width:130px;">Código:</td>
          <td style="padding:6px 0;font-weight:700;color:#f8fafc;">${escapeEmailHtml(input.code)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Descrição:</td>
          <td style="padding:6px 0;font-weight:600;color:#f8fafc;">${escapeEmailHtml(input.title)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Valor:</td>
          <td style="padding:6px 0;font-weight:800;color:#f8fafc;">${escapeEmailHtml(input.amountFormatted)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Status:</td>
          <td style="padding:6px 0;font-weight:700;color:${t.badgeText};">${escapeEmailHtml(input.statusLabel)}</td>
        </tr>
        ${
          input.teamLabel
            ? `<tr>
                <td style="padding:6px 0;color:#94a3b8;">Equipe:</td>
                <td style="padding:6px 0;color:#f8fafc;">${escapeEmailHtml(input.teamLabel)}</td>
              </tr>`
            : ''
        }
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Chave PIX:</td>
          <td style="padding:6px 0;color:#e2e8f0;font-family:monospace;">${escapeEmailHtml(pixInfo)}</td>
        </tr>
      </table>
      ${reviewNotesHtml}
    </div>
  `;

  const html = wrapAutonomosShell({
    accent,
    eyebrow: isCreated ? 'Novo Reembolso' : `Reembolso • ${input.statusLabel}`,
    heading,
    subtitle,
    bodyHtml,
    ctaLabel: 'Acompanhar Meus Reembolsos',
    ctaUrl: `${baseUrl}/financeiro/reembolso`,
  });

  const text = [
    `Olá, ${input.recipientName}.`,
    '',
    isCreated
      ? `Sua solicitação de reembolso ${input.code} foi registrada.`
      : `Seu reembolso ${input.code} teve o status atualizado para: ${input.statusLabel}.`,
    `- Descrição: ${input.title}`,
    `- Valor: ${input.amountFormatted}`,
    `- Chave PIX: ${pixInfo}`,
    input.reviewNotes?.trim() ? `- Parecer da Gestão: ${input.reviewNotes.trim()}` : null,
    '',
    `Acompanhe em: ${baseUrl}/financeiro/reembolso`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { subject, html, text };
}

export type SecurityCodePurpose =
  | 'REGISTER_VERIFY'
  | 'PROFILE_PASSWORD_CHANGE'
  | 'PROFILE_EMAIL_CHANGE';

export interface SecurityCodeEmailInput {
  purpose: SecurityCodePurpose;
  recipientName: string;
  code: string;
  expiresInMinutes?: number;
  targetEmail?: string;
  appUrl?: string;
}

export function buildSecurityCodeEmail(input: SecurityCodeEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const expiresInMinutes = input.expiresInMinutes ?? 15;
  const displayName = input.recipientName.trim() || 'Integrante';

  const config: Record<
    SecurityCodePurpose,
    {
      subject: string;
      eyebrow: string;
      heading: string;
      subtitle: string;
      descriptionHtml: string;
      ctaLabel: string;
      ctaPath: string;
    }
  > = {
    REGISTER_VERIFY: {
      subject: `[Autônomos] Confirme seu e-mail para concluir o cadastro`,
      eyebrow: 'Validação de Cadastro',
      heading: 'Confirme seu endereço de e-mail',
      subtitle: 'Use o código de 6 dígitos abaixo para validar sua conta na UFRJ Autônomos.',
      descriptionHtml:
        'Para garantir que este endereço de e-mail realmente pertence a você, insira o código abaixo na tela de cadastro:',
      ctaLabel: 'Voltar para o Cadastro',
      ctaPath: '/register',
    },
    PROFILE_PASSWORD_CHANGE: {
      subject: `[Autônomos] Código para alteração de senha no Perfil`,
      eyebrow: 'Segurança da Conta',
      heading: 'Confirmação de alteração de senha',
      subtitle: 'Solicitação iniciada a partir da sua tela de Perfil.',
      descriptionHtml:
        'Recebemos uma solicitação para alterar sua senha pelo seu Perfil. Digite o código de 6 dígitos abaixo para concluir a troca:',
      ctaLabel: 'Abrir Meu Perfil',
      ctaPath: '/perfil',
    },
    PROFILE_EMAIL_CHANGE: {
      subject: `[Autônomos] Confirme seu novo e-mail (${input.targetEmail || ''})`.trim(),
      eyebrow: 'Alteração de E-mail',
      heading: 'Confirmação do novo endereço de e-mail',
      subtitle: 'Após validar este código, sua solicitação seguirá para aprovação da Gestão.',
      descriptionHtml: `Você solicitou a troca do seu e-mail de acesso${
        input.targetEmail ? ` para <strong style="color:#f8fafc;">${escapeEmailHtml(input.targetEmail)}</strong>` : ''
      }. Informe o código de 6 dígitos abaixo no seu Perfil para enviar a solicitação à Gestão em Integrantes:`,
      ctaLabel: 'Confirmar no Meu Perfil',
      ctaPath: '/perfil',
    },
  };

  const meta = config[input.purpose];

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(displayName)}</strong>.</p>
    <p style="margin:0 0 18px;color:#cbd5e1;">${meta.descriptionHtml}</p>

    <div style="margin:20px 0;padding:22px 16px;background-color:#080f1d;border:1px solid #334155;border-radius:12px;text-align:center;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#38bdf8;margin-bottom:8px;">
        Código de Verificação (válido por ${expiresInMinutes} min)
      </div>
      <div style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:800;letter-spacing:0.28em;color:#f8fafc;">
        ${escapeEmailHtml(input.code)}
      </div>
    </div>

    <div style="background-color:#111c33;border-left:4px solid #0284c7;border-radius:8px;padding:12px 14px;font-size:13px;color:#cbd5e1;">
      Se você não solicitou esta ação, ignore este e-mail com segurança e não compartilhe este código com ninguém.
    </div>
  `;

  const html = wrapAutonomosShell({
    accent: 'cyan',
    eyebrow: meta.eyebrow,
    heading: meta.heading,
    subtitle: meta.subtitle,
    bodyHtml,
    ctaLabel: meta.ctaLabel,
    ctaUrl: `${baseUrl}${meta.ctaPath}`,
  });

  const text = [
    `Olá, ${displayName}.`,
    '',
    meta.subtitle,
    `Seu código de verificação é: ${input.code}`,
    `Válido por ${expiresInMinutes} minutos.`,
    '',
    'Se você não solicitou esta operação, ignore este e-mail.',
  ].join('\n');

  return { subject: meta.subject, html, text };
}

export interface EmailChangeStatusEmailInput {
  recipientName: string;
  previousEmail: string;
  newEmail: string;
  approved: boolean;
  reviewNotes?: string | null;
  appUrl?: string;
}

export function buildEmailChangeStatusEmail(input: EmailChangeStatusEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const accent: EmailAccent = input.approved ? 'emerald' : 'red';
  const t = ACCENT_TOKENS[accent];

  const subject = input.approved
    ? `[Autônomos] Seu novo e-mail de acesso foi aprovado (${input.newEmail})`
    : `[Autônomos] Solicitação de alteração de e-mail recusada`;

  const heading = input.approved
    ? 'Alteração de E-mail Aprovada'
    : 'Alteração de E-mail Recusada';

  const subtitle = input.approved
    ? 'A Gestão validou sua solicitação e seu acesso já usa o novo e-mail.'
    : 'A solicitação de alteração de e-mail foi recusada pela Gestão.';

  const notesHtml = input.reviewNotes?.trim()
    ? `<div style="margin-top:12px;padding:12px 14px;background-color:${t.highlightBg};border-left:4px solid ${t.highlightBorder};border-radius:8px;font-size:13px;color:#cbd5e1;">
         <strong style="color:${t.highlightTitle};">Observação da Gestão:</strong><br />
         ${escapeEmailHtml(input.reviewNotes.trim())}
       </div>`
    : '';

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(input.recipientName)}</strong>.</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      ${
        input.approved
          ? 'Um integrante da Gestão aprovou a alteração do seu e-mail cadastrado na plataforma UFRJ Autônomos.'
          : 'Um integrante da Gestão analisou sua solicitação de alteração de e-mail e optou por recusá-la.'
      }
    </p>
    <div style="background-color:#111c33;border:1px solid #1e293b;border-radius:12px;padding:16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px;">
        <tr>
          <td style="padding:6px 0;color:#94a3b8;width:140px;">E-mail anterior:</td>
          <td style="padding:6px 0;color:#cbd5e1;">${escapeEmailHtml(input.previousEmail || 'Não informado')}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Novo e-mail:</td>
          <td style="padding:6px 0;font-weight:700;color:#f8fafc;">${escapeEmailHtml(input.newEmail)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#94a3b8;">Status:</td>
          <td style="padding:6px 0;font-weight:700;color:${t.badgeText};">${input.approved ? 'Aprovado pela Gestão' : 'Recusado pela Gestão'}</td>
        </tr>
      </table>
      ${notesHtml}
    </div>
  `;

  const html = wrapAutonomosShell({
    accent,
    eyebrow: input.approved ? 'E-mail Atualizado' : 'Troca de E-mail Recusada',
    heading,
    subtitle,
    bodyHtml,
    ctaLabel: 'Acessar Meu Perfil',
    ctaUrl: `${baseUrl}/perfil`,
  });

  const text = [
    `Olá, ${input.recipientName}.`,
    '',
    input.approved
      ? `Sua troca de e-mail de ${input.previousEmail} para ${input.newEmail} foi APROVADA pela Gestão.`
      : `Sua solicitação de troca de e-mail para ${input.newEmail} foi RECUSADA pela Gestão.`,
    input.reviewNotes?.trim() ? `Observação: ${input.reviewNotes.trim()}` : null,
    '',
    `Acesse em: ${baseUrl}/perfil`,
  ]
    .filter((line) => line !== null)
    .join('\n');

  return { subject, html, text };
}

export interface IncompleteProfileEmailInput {
  recipientName: string;
  area?: string | null;
  missingFields: string[];
  appUrl?: string;
}

export function buildIncompleteProfileEmail(input: IncompleteProfileEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const displayName = input.recipientName?.trim() || 'Integrante';
  const missingList = input.missingFields.length > 0
    ? input.missingFields
    : ['Dados obrigatórios pendentes no perfil'];
  const areaSuffix = input.area && input.area !== 'Não informada' ? ` (${input.area})` : '';

  const subject = `[Autônomos] Complete seu perfil para oficializar seu vínculo na equipe`;
  const listHtml = missingList
    .map((field) => `<li style="margin:4px 0;color:#f8fafc;">${escapeEmailHtml(field)}</li>`)
    .join('');

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(displayName)}</strong>${escapeEmailHtml(areaSuffix)}.</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      Identificamos que o seu cadastro na plataforma da <strong style="color:#f8fafc;">UFRJ Autônomos</strong> ainda está incompleto.
    </p>

    <div style="background-color:#271a08;border-left:4px solid #f59e0b;border-radius:10px;padding:14px 16px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#fcd34d;margin-bottom:6px;">
        Regra de Oficialização
      </div>
      <div style="font-size:14px;line-height:1.55;color:#f8fafc;">
        Você só passa a ser considerado(a) <strong>membro oficial</strong> da equipe após preencher e salvar todos os dados obrigatórios do seu perfil (dados internos, contato de emergência, foto e biografia para o site).
      </div>
    </div>

    <div style="background-color:#111c33;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:8px;">
        Pendências encontradas no seu perfil (${missingList.length})
      </div>
      <ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.5;">
        ${listHtml}
      </ul>
    </div>

    <p style="margin:0;font-size:13px;color:#94a3b8;">
      Após preencher tudo e clicar em salvar em <strong>Meu Perfil</strong>, seu cadastro fica regularizado automaticamente (alterações públicas no site seguem para validação rápida da Gestão).
    </p>
  `;

  const html = wrapAutonomosShell({
    accent: 'amber',
    eyebrow: 'Cadastro Pendente',
    heading: 'Complete seu perfil oficial',
    subtitle: 'Preencha todos os campos obrigatórios para confirmar sua participação oficial na UFRJ Autônomos.',
    bodyHtml,
    ctaLabel: 'Completar Meu Perfil Agora',
    ctaUrl: `${baseUrl}/perfil`,
  });

  const text = [
    `Olá, ${displayName}${areaSuffix}.`,
    '',
    'Identificamos que o seu perfil na UFRJ Autônomos ainda está incompleto.',
    'IMPORTANTE: Você só passa a ser considerado(a) membro oficial da equipe após preencher e salvar todos os dados obrigatórios corretamente.',
    '',
    'Campos pendentes:',
    ...missingList.map((field) => `- ${field}`),
    '',
    `Complete seu perfil em: ${baseUrl}/perfil`,
  ].join('\n');

  return { subject, html, text };
}

export interface MeetingLowAttendanceEmailInput {
  recipientName: string;
  area: string;
  periodCode: string;
  attendancePct: number;
  presences: number;
  absences: number;
  totalMeetings: number;
  appUrl?: string;
}

export function buildMeetingLowAttendanceEmail(input: MeetingLowAttendanceEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const pctRounded = Math.round(input.attendancePct);
  const isCritical = input.attendancePct < 60;
  const accent: EmailAccent = isCritical ? 'red' : 'amber';
  const t = ACCENT_TOKENS[accent];

  const subject = `[Autônomos] Atenção: baixa presença em reuniões (${pctRounded}% no ciclo ${input.periodCode})`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(input.recipientName)}</strong> (${escapeEmailHtml(input.area)}).</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      Notamos que a sua frequência nas reuniões da equipe no ciclo <strong style="color:#f8fafc;">${escapeEmailHtml(input.periodCode)}</strong> está abaixo do patamar mínimo esperado (<strong style="color:#f8fafc;">75%</strong>).
    </p>

    <div style="background-color:#111c33;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:18px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#94a3b8;margin-bottom:12px;">
        Resumo de Frequência em Reuniões
      </div>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Presença</div>
            <div style="font-size:20px;font-weight:800;color:${t.badgeText};margin-top:2px;">${pctRounded}%</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Presenças</div>
            <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:2px;">${input.presences.toFixed(1)}</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Faltas / Reuniões</div>
            <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:2px;">${input.absences.toFixed(1)} / ${input.totalMeetings}</div>
          </td>
        </tr>
      </table>
    </div>

    <div style="background-color:${t.highlightBg};border-left:4px solid ${t.highlightBorder};border-radius:10px;padding:14px 16px;font-size:13px;color:#cbd5e1;">
      As reuniões são fundamentais para o alinhamento técnico e organizacional dos projetos. Ausências recorrentes sem justificativa prévia junto à coordenação são passíveis de aviso disciplinar.
    </div>
  `;

  const html = wrapAutonomosShell({
    accent,
    eyebrow: 'Frequência em Reuniões',
    heading: `Presença em Reuniões em Atenção (${pctRounded}%)`,
    subtitle: `Referência do ciclo ${input.periodCode} — área de ${input.area}.`,
    bodyHtml,
    ctaLabel: 'Consultar Histórico de Reuniões',
    ctaUrl: `${baseUrl}/reunioes`,
  });

  const text = [
    `Olá, ${input.recipientName} (${input.area}).`,
    '',
    `Sua frequência nas reuniões do ciclo ${input.periodCode} está em ${pctRounded}% (abaixo da referência mínima de 75%).`,
    `- Presenças ponderadas: ${input.presences.toFixed(1)}`,
    `- Faltas ponderadas: ${input.absences.toFixed(1)} em ${input.totalMeetings} reuniões`,
    '',
    'Ausências recorrentes sem justificativa prévia são passíveis de aviso disciplinar. Caso tenha imprevistos de horário, alinhe com sua coordenação ou Gestão.',
    `Consulte em: ${baseUrl}/reunioes`,
  ].join('\n');

  return { subject, html, text };
}

export interface DisciplinaryRiskEmailInput {
  recipientName: string;
  area: string;
  avisosCount: number;
  directWarningsCount: number;
  totalWarnings: number;
  statusLabel: string;
  appUrl?: string;
}

export function buildDisciplinaryRiskEmail(input: DisciplinaryRiskEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const isHighRisk = input.totalWarnings >= 2;
  const accent: EmailAccent = isHighRisk ? 'red' : 'amber';
  const t = ACCENT_TOKENS[accent];

  const subject = isHighRisk
    ? `[Autônomos] Alerta crítico disciplinar: ${input.totalWarnings}/3 advertências (${input.recipientName})`
    : `[Autônomos] Acompanhamento disciplinar preventivo (${input.statusLabel})`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(input.recipientName)}</strong> (${escapeEmailHtml(input.area)}).</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      Este é um lembrete preventivo sobre a sua situação disciplinar atual na <strong style="color:#f8fafc;">UFRJ Autônomos</strong>.
    </p>

    <div style="background-color:#111c33;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:18px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Avisos</div>
            <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:2px;">${input.avisosCount}</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Adv. Diretas</div>
            <div style="font-size:20px;font-weight:800;color:#f8fafc;margin-top:2px;">${input.directWarningsCount}</div>
          </td>
          <td width="4"></td>
          <td width="33%" style="padding:10px 8px;background:#080f1d;border:1px solid #1e293b;border-radius:8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Total Adv.</div>
            <div style="font-size:20px;font-weight:800;color:${t.badgeText};margin-top:2px;">${input.totalWarnings} / 3</div>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:13px;color:#cbd5e1;">
        <strong style="color:#f8fafc;">Status atual:</strong> ${escapeEmailHtml(input.statusLabel)}
      </p>
    </div>

    <div style="background-color:${t.highlightBg};border-left:4px solid ${t.highlightBorder};border-radius:10px;padding:14px 16px;font-size:13px;color:#cbd5e1;">
      Lembrete do regimento: <strong style="color:#f8fafc;">2 avisos</strong> equivalem a <strong style="color:#f8fafc;">1 advertência</strong>, e ao atingir <strong style="color:#f8fafc;">3 advertências</strong> o desligamento automático é aplicado. Em caso de dificuldades com horários ou demandas, converse com a Gestão.
    </div>
  `;

  const html = wrapAutonomosShell({
    accent,
    eyebrow: isHighRisk ? 'Risco de Expulsão' : 'Acompanhamento Disciplinar',
    heading: isHighRisk ? 'Atenção: Risco Disciplinar Crítico' : 'Lembrete Preventivo Disciplinar',
    subtitle: 'Acompanhe seu histórico e mantenha suas presenças e entregas em dia.',
    bodyHtml,
    ctaLabel: 'Acessar Plataforma',
    ctaUrl: `${baseUrl}/`,
  });

  const text = [
    `Olá, ${input.recipientName} (${input.area}).`,
    '',
    `Lembrete preventivo sobre sua ficha disciplinar (Status: ${input.statusLabel}):`,
    `- Avisos: ${input.avisosCount}`,
    `- Advertências diretas: ${input.directWarningsCount}`,
    `- Total de advertências: ${input.totalWarnings} / 3`,
    '',
    'Regra: 2 avisos = 1 advertência | 3 advertências = desligamento automático.',
    `Acesse: ${baseUrl}/`,
  ].join('\n');

  return { subject, html, text };
}

export interface AccessSetupEmailInput {
  recipientName: string;
  area?: string | null;
  email: string;
  appUrl?: string;
}

export function buildAccessSetupEmail(input: AccessSetupEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const subject = `[Autônomos] Ative sua senha para acessar a plataforma`;

  const bodyHtml = `
    <p style="margin:0 0 14px;color:#cbd5e1;">Olá, <strong style="color:#f8fafc;">${escapeEmailHtml(input.recipientName)}</strong>.</p>
    <p style="margin:0 0 16px;color:#cbd5e1;">
      Seu cadastro institucional já está aprovado com o e-mail <strong style="color:#f8fafc;">${escapeEmailHtml(input.email)}</strong>, porém identificamos que você ainda não definiu uma senha de acesso na plataforma.
    </p>

    <div style="background-color:#111c33;border:1px solid #1e293b;border-radius:12px;padding:16px;margin-bottom:16px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#67e8f9;margin-bottom:8px;">
        Como ativar sua conta em 1 minuto
      </div>
      <ol style="margin:0;padding-left:18px;font-size:14px;line-height:1.6;color:#cbd5e1;">
        <li>Clique no botão abaixo para abrir a tela de definição de senha.</li>
        <li>Informe seu e-mail (<strong style="color:#f8fafc;">${escapeEmailHtml(input.email)}</strong>) e solicite o código de 6 dígitos.</li>
        <li>Crie sua senha, entre no sistema e preencha seu <strong style="color:#f8fafc;">Meu Perfil</strong> para oficializar seu cadastro e registrar presença no lab.</li>
      </ol>
    </div>
  `;

  const html = wrapAutonomosShell({
    accent: 'cyan',
    eyebrow: 'Ativação de Conta',
    heading: 'Defina sua senha de acesso',
    subtitle: 'Libere acesso ao controle de horas no laboratório, reuniões e perfil oficial.',
    bodyHtml,
    ctaLabel: 'Definir Minha Senha Agora',
    ctaUrl: `${baseUrl}/forgot-password`,
  });

  const text = [
    `Olá, ${input.recipientName}.`,
    '',
    `Seu e-mail (${input.email}) já está habilitado na plataforma UFRJ Autônomos, mas você ainda não definiu uma senha de acesso.`,
    `Acesse ${baseUrl}/forgot-password, solicite seu código de 6 dígitos e crie sua senha para entrar e completar seu perfil.`,
  ].join('\n');

  return { subject, html, text };
}

export interface CustomNoticeEmailInput {
  recipientName?: string;
  subject: string;
  eyebrow?: string;
  heading?: string;
  subtitle?: string;
  bodyText: string;
  accent?: EmailAccent;
  ctaLabel?: string;
  ctaPath?: string;
  appUrl?: string;
}

export function buildCustomNoticeEmail(input: CustomNoticeEmailInput): BuiltEmail {
  const baseUrl = resolveAppBaseUrl(input.appUrl);
  const accent: EmailAccent = input.accent || 'cyan';
  const eyebrow = input.eyebrow?.trim() || 'Comunicado da Gestão';
  const heading = input.heading?.trim() || input.subject.replace(/^\[[^\]]+\]\s*/, '').trim() || 'Comunicado UFRJ Autônomos';
  const normalizedBody = input.bodyText.trim();

  const paragraphs = normalizedBody
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 14px;color:#cbd5e1;line-height:1.65;">${escapeEmailHtml(block).replace(/\n/g, '<br />')}</p>`
    )
    .join('');

  const bodyHtml = paragraphs || `<p style="margin:0;color:#cbd5e1;">${escapeEmailHtml(normalizedBody)}</p>`;

  const safePath = input.ctaPath?.trim();
  const ctaUrl = safePath
    ? safePath.startsWith('http://') || safePath.startsWith('https://')
      ? safePath
      : `${baseUrl}${safePath.startsWith('/') ? safePath : `/${safePath}`}`
    : undefined;

  const html = wrapAutonomosShell({
    accent,
    eyebrow,
    heading,
    subtitle: input.subtitle?.trim() || undefined,
    bodyHtml,
    ctaLabel: ctaUrl ? input.ctaLabel?.trim() || 'Acessar Plataforma' : undefined,
    ctaUrl,
  });

  const text = [
    normalizedBody,
    ctaUrl ? `\nAcesse: ${ctaUrl}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const finalSubject = input.subject.trim().startsWith('[')
    ? input.subject.trim()
    : `[Autônomos] ${input.subject.trim()}`;

  return {
    subject: finalSubject,
    html,
    text,
  };
}

export function buildFallbackResendHtml(params: {
  recipientName?: string | null;
  subject: string;
  text: string;
  eyebrow?: string;
  appUrl?: string;
}): string {
  const cleanHeading = params.subject.replace(/^\[[^\]]+\]\s*/, '').trim() || 'Notificação UFRJ Autônomos';
  return buildCustomNoticeEmail({
    recipientName: params.recipientName || undefined,
    subject: params.subject,
    eyebrow: params.eyebrow || 'Reenvio de Notificação',
    heading: cleanHeading,
    bodyText: params.text || 'Conteúdo da notificação anterior reenviado pela Gestão da UFRJ Autônomos.',
    accent: 'cyan',
    ctaLabel: 'Acessar Sistema Autônomos',
    ctaPath: '/',
    appUrl: params.appUrl,
  }).html;
}
