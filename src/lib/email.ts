import nodemailer from 'nodemailer';
import {
  buildDisciplinaryEmail,
  buildLabHoursAlertEmail,
  buildReimbursementEmail,
  buildSecurityCodeEmail,
  buildEmailChangeStatusEmail,
  buildIncompleteProfileEmail,
  buildMeetingLowAttendanceEmail,
  buildDisciplinaryRiskEmail,
  buildAccessSetupEmail,
  buildCustomNoticeEmail,
  buildFallbackResendHtml,
  type DisciplinaryEmailInput,
  type LabHoursAlertEmailInput,
  type ReimbursementEmailInput,
  type SecurityCodePurpose,
  type EmailChangeStatusEmailInput,
  type IncompleteProfileEmailInput,
  type MeetingLowAttendanceEmailInput,
  type DisciplinaryRiskEmailInput,
  type AccessSetupEmailInput,
  type CustomNoticeEmailInput,
} from './email-templates';
import { recordEmailDispatchLog, type EmailLogCategory } from './email-logs';

let cachedPoolKey: string | null = null;
let cachedTransport: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== 'false' && (process.env.SMTP_SECURE === 'true' || port === 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) {
    closeEmailTransport();
    return null;
  }

  const key = `${host}:${port}:${secure}:${user}:${pass}`;
  if (cachedTransport && cachedPoolKey === key) {
    return cachedTransport;
  }

  cachedTransport?.close();
  cachedPoolKey = key;
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: { user, pass },
  });
  return cachedTransport;
}

export function closeEmailTransport() {
  if (cachedTransport) {
    cachedTransport.close();
    cachedTransport = null;
    cachedPoolKey = null;
  }
}

function getFromAddress() {
  return process.env.EMAIL_FROM?.trim() || process.env.SMTP_USER?.trim() || 'UFRJ Autônomos <noreply@autonomos.ufrj.br>';
}

export interface DispatchEmailResult {
  sent: boolean;
  skipped?: boolean;
  error?: string;
}

async function dispatchEmail(params: {
  to: string | null | undefined;
  subject: string;
  logSubject?: string;
  html: string;
  text: string;
  category: EmailLogCategory;
  recipientName?: string | null;
  previewText?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<DispatchEmailResult> {
  const to = params.to?.trim();
  if (!to) {
    return { sent: false, skipped: true };
  }

  const logSubject = params.logSubject ?? params.subject;
  const previewText = params.previewText ?? params.text;
  const storedHtml = params.category === 'AUTH_CODE' ? null : params.html;
  const transport = getTransport();
  if (!transport) {
    console.warn(`[email] SMTP não configurado; e-mail "${logSubject}" não enviado para ${to}.`);
    await recordEmailDispatchLog({
      category: params.category,
      recipientEmail: to,
      recipientName: params.recipientName,
      subject: logSubject,
      previewText,
      htmlBody: storedHtml,
      status: 'SKIPPED',
      errorMessage: 'SMTP não configurado no ambiente.',
      metadata: params.metadata,
    });
    return { sent: false, skipped: true };
  }

  try {
    await transport.sendMail({
      from: getFromAddress(),
      to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });
    await recordEmailDispatchLog({
      category: params.category,
      recipientEmail: to,
      recipientName: params.recipientName,
      subject: logSubject,
      previewText,
      htmlBody: storedHtml,
      status: 'SENT',
      metadata: params.metadata,
    });
    return { sent: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido ao enviar e-mail.';
    console.error(`[email] Falha ao enviar "${logSubject}" para ${to}:`, err);
    await recordEmailDispatchLog({
      category: params.category,
      recipientEmail: to,
      recipientName: params.recipientName,
      subject: logSubject,
      previewText,
      htmlBody: storedHtml,
      status: 'FAILED',
      errorMessage: errorMsg,
      metadata: params.metadata,
    });
    return {
      sent: false,
      error: errorMsg,
    };
  }
}

export async function sendDisciplinaryNotificationEmail(
  to: string | null | undefined,
  input: DisciplinaryEmailInput
): Promise<DispatchEmailResult> {
  const built = buildDisciplinaryEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'DISCIPLINARY',
    recipientName: input.recipientName,
    metadata: {
      occurrenceType: input.occurrenceType,
      status: input.status,
      totalWarnings: input.totalWarnings,
      wasAutoExpelled: input.wasAutoExpelled,
    },
  });
}

export async function sendLabHoursAlertEmail(
  to: string | null | undefined,
  input: LabHoursAlertEmailInput
): Promise<DispatchEmailResult> {
  const built = buildLabHoursAlertEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'LAB_HOURS_ALERT',
    recipientName: input.recipientName,
    metadata: {
      mode: input.mode,
      area: input.area,
      periodLabel: input.periodLabel,
      remainingFormatted: input.remainingFormatted,
    },
  });
}

export async function sendReimbursementStatusEmail(
  to: string | null | undefined,
  input: ReimbursementEmailInput
): Promise<DispatchEmailResult> {
  const built = buildReimbursementEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'REIMBURSEMENT',
    recipientName: input.recipientName,
    metadata: {
      event: input.event,
      code: input.code,
      status: input.status,
      amountFormatted: input.amountFormatted,
    },
  });
}

export async function sendPasswordResetCodeEmail(params: {
  to: string;
  name: string;
  code: string;
  expiresInMinutes?: number;
}): Promise<{ delivered: boolean }> {
  const transport = getTransport();
  const expiresInMinutes = params.expiresInMinutes ?? 15;
  const subject = `[UFRJ Autônomos] Seu código de verificação: ${params.code}`;
  const text = [
    `Olá, ${params.name}!`,
    '',
    'Recebemos uma solicitação para definir ou redefinir sua senha na plataforma UFRJ Autônomos.',
    '',
    `Seu código de verificação é: ${params.code}`,
    '',
    `Este código expira em ${expiresInMinutes} minutos.`,
    'Se você não solicitou esta alteração, ignore este e-mail com segurança.',
    '',
    'Equipe UFRJ Autônomos',
  ].join('\n');

  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0a0a0b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
      <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #22d3ee; margin: 0 0 12px;">UFRJ Autônomos • Segurança da Conta</p>
      <h1 style="font-size: 20px; margin: 0 0 16px; color: #ffffff;">Código de verificação</h1>
      <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8;">Olá, <strong>${escapeHtml(params.name)}</strong>. Utilize o código de 6 dígitos abaixo para definir ou redefinir sua senha na plataforma:</p>
      <div style="margin: 24px 0; padding: 18px; background: #18181b; border: 1px solid #3f3f46; border-radius: 10px; text-align: center;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 28px; font-weight: 700; letter-spacing: 0.25em; color: #ffffff;">${escapeHtml(params.code)}</span>
      </div>
      <p style="font-size: 13px; color: #a1a1aa; line-height: 1.5;">Este código é válido por <strong>${expiresInMinutes} minutos</strong>. Caso você não tenha solicitado esta operação, nenhuma ação é necessária.</p>
    </div>
  `;

  if (!transport) {
    if (process.env.NODE_ENV !== 'test') {
      console.warn(`[EMAIL FALLBACK] Código para ${params.to}: ${params.code}`);
    }
    await recordEmailDispatchLog({
      category: 'AUTH_CODE',
      recipientEmail: params.to,
      recipientName: params.name,
      subject: '[UFRJ Autônomos] Código de verificação de senha',
      previewText: `Código de verificação de ${expiresInMinutes} min enviado (código omitido no log por segurança).`,
      status: 'SKIPPED',
      errorMessage: 'SMTP não configurado no ambiente.',
    });
    return { delivered: false };
  }

  try {
    await transport.sendMail({
      from: getFromAddress(),
      to: params.to,
      subject,
      text,
      html,
    });
    await recordEmailDispatchLog({
      category: 'AUTH_CODE',
      recipientEmail: params.to,
      recipientName: params.name,
      subject: '[UFRJ Autônomos] Código de verificação de senha',
      previewText: `Código de verificação válido por ${expiresInMinutes} min (código omitido no log por segurança).`,
      status: 'SENT',
    });
  } catch (err) {
    await recordEmailDispatchLog({
      category: 'AUTH_CODE',
      recipientEmail: params.to,
      recipientName: params.name,
      subject: '[UFRJ Autônomos] Código de verificação de senha',
      previewText: `Tentativa de envio de código de verificação (código omitido no log por segurança).`,
      status: 'FAILED',
      errorMessage: err instanceof Error ? err.message : 'Erro ao enviar código.',
    });
    throw err;
  }

  return { delivered: true };
}

export async function sendAccountApprovedEmail(params: {
  to: string;
  name: string;
}): Promise<void> {
  const transport = getTransport();
  const approvedSubject = '[UFRJ Autônomos] Sua conta foi aprovada!';
  if (!transport) {
    await recordEmailDispatchLog({
      category: 'ACCOUNT_APPROVED',
      recipientEmail: params.to,
      recipientName: params.name,
      subject: approvedSubject,
      previewText: `Notificação de aprovação da conta para ${params.name}.`,
      status: 'SKIPPED',
      errorMessage: 'SMTP não configurado no ambiente.',
    });
    return;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
  try {
    await transport.sendMail({
      from: getFromAddress(),
      to: params.to,
      subject: approvedSubject,
      text: `Olá, ${params.name}!\n\nSua conta na plataforma UFRJ Autônomos foi aprovada pela gestão.\nAcesse ${appUrl}/login para entrar e preencher seu perfil de integrante.\n\nEquipe UFRJ Autônomos`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #0a0a0b; color: #f4f4f5; border-radius: 12px; border: 1px solid #27272a;">
          <p style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #34d399; margin: 0 0 12px;">UFRJ Autônomos • Acesso Liberado</p>
          <h1 style="font-size: 20px; margin: 0 0 16px; color: #ffffff;">Bem-vindo(a), ${escapeHtml(params.name)}!</h1>
          <p style="font-size: 14px; line-height: 1.6; color: #d4d4d8;">Seu cadastro foi aprovado pela gestão. No seu primeiro login, você poderá completar todas as informações do seu perfil de integrante.</p>
          <p style="margin: 24px 0;"><a href="${escapeHtml(appUrl)}/login" style="display: inline-block; padding: 12px 20px; background: #f4f4f5; color: #09090b; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">Entrar na plataforma</a></p>
        </div>
      `,
    });
    await recordEmailDispatchLog({
      category: 'ACCOUNT_APPROVED',
      recipientEmail: params.to,
      recipientName: params.name,
      subject: approvedSubject,
      previewText: `Bem-vindo(a), ${params.name}! Seu cadastro foi aprovado pela gestão.`,
      status: 'SENT',
    });
  } catch (error) {
    console.error('Aviso: falha ao enviar e-mail de aprovação:', error);
    await recordEmailDispatchLog({
      category: 'ACCOUNT_APPROVED',
      recipientEmail: params.to,
      recipientName: params.name,
      subject: approvedSubject,
      previewText: `Tentativa de notificação de aprovação da conta para ${params.name}.`,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido.',
    });
  }
}

export async function sendSecurityVerificationCodeEmail(params: {
  purpose: SecurityCodePurpose;
  to: string;
  name: string;
  code: string;
  expiresInMinutes?: number;
  targetEmail?: string;
}): Promise<DispatchEmailResult> {
  const expiresInMinutes = params.expiresInMinutes ?? 15;
  const built = buildSecurityCodeEmail({
    purpose: params.purpose,
    recipientName: params.name,
    code: params.code,
    expiresInMinutes,
    targetEmail: params.targetEmail ?? params.to,
  });

  const actionLabel =
    params.purpose === 'REGISTER_VERIFY'
      ? 'validação de cadastro'
      : params.purpose === 'PROFILE_PASSWORD_CHANGE'
        ? 'alteração de senha no perfil'
        : 'validação do novo e-mail no perfil';

  return dispatchEmail({
    to: params.to,
    subject: built.subject,
    logSubject: built.subject,
    html: built.html,
    text: built.text,
    category: 'AUTH_CODE',
    recipientName: params.name,
    previewText: `Código de 6 dígitos para ${actionLabel} válido por ${expiresInMinutes} min (código omitido no log por segurança).`,
    metadata: {
      purpose: params.purpose,
      expiresInMinutes,
    },
  });
}

export async function sendEmailChangeStatusEmail(
  to: string | null | undefined,
  input: EmailChangeStatusEmailInput
): Promise<DispatchEmailResult> {
  const built = buildEmailChangeStatusEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'EMAIL_CHANGE',
    recipientName: input.recipientName,
    metadata: {
      previousEmail: input.previousEmail,
      newEmail: input.newEmail,
      approved: input.approved,
    },
  });
}

export async function sendIncompleteProfileEmail(
  to: string | null | undefined,
  input: IncompleteProfileEmailInput
): Promise<DispatchEmailResult> {
  const built = buildIncompleteProfileEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'INCOMPLETE_PROFILE',
    recipientName: input.recipientName,
    metadata: {
      situationKey: 'INCOMPLETE_PROFILE',
      area: input.area ?? null,
      missingFields: input.missingFields,
    },
  });
}

export async function sendMeetingLowAttendanceEmail(
  to: string | null | undefined,
  input: MeetingLowAttendanceEmailInput
): Promise<DispatchEmailResult> {
  const built = buildMeetingLowAttendanceEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'MEETING_LOW_ATTENDANCE',
    recipientName: input.recipientName,
    metadata: {
      situationKey: 'MEETING_LOW_ATTENDANCE',
      area: input.area,
      periodCode: input.periodCode,
      attendancePct: Math.round(input.attendancePct),
      presences: input.presences,
      absences: input.absences,
      totalMeetings: input.totalMeetings,
    },
  });
}

export async function sendDisciplinaryRiskEmail(
  to: string | null | undefined,
  input: DisciplinaryRiskEmailInput
): Promise<DispatchEmailResult> {
  const built = buildDisciplinaryRiskEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'DISCIPLINARY_RISK',
    recipientName: input.recipientName,
    metadata: {
      situationKey: 'DISCIPLINARY_AT_RISK',
      area: input.area,
      avisosCount: input.avisosCount,
      directWarningsCount: input.directWarningsCount,
      totalWarnings: input.totalWarnings,
      statusLabel: input.statusLabel,
    },
  });
}

export async function sendAccessSetupEmail(
  to: string | null | undefined,
  input: AccessSetupEmailInput
): Promise<DispatchEmailResult> {
  const built = buildAccessSetupEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'ACCESS_SETUP',
    recipientName: input.recipientName,
    metadata: {
      situationKey: 'ACCESS_SETUP',
      area: input.area ?? null,
    },
  });
}

export async function sendCustomNoticeEmail(
  to: string | null | undefined,
  input: CustomNoticeEmailInput,
  metadata?: Record<string, unknown> | null
): Promise<DispatchEmailResult> {
  const built = buildCustomNoticeEmail(input);
  return dispatchEmail({
    to,
    ...built,
    category: 'ANNOUNCEMENT',
    recipientName: input.recipientName ?? null,
    metadata: metadata ?? null,
  });
}

export async function resendLoggedMessage(params: {
  to: string;
  recipientName?: string | null;
  category: EmailLogCategory;
  subject: string;
  text: string;
  htmlBody?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<DispatchEmailResult> {
  const html =
    params.htmlBody?.trim() ||
    buildFallbackResendHtml({
      recipientName: params.recipientName,
      subject: params.subject,
      text: params.text,
    });
  return dispatchEmail({
    to: params.to,
    recipientName: params.recipientName,
    category: params.category,
    subject: params.subject,
    text: params.text,
    html,
    metadata: params.metadata ?? null,
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

