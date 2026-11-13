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
