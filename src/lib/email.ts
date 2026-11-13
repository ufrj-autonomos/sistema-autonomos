import nodemailer from 'nodemailer';
import {
  buildDisciplinaryEmail,
  buildLabHoursAlertEmail,
  buildReimbursementEmail,
  type DisciplinaryEmailInput,
  type LabHoursAlertEmailInput,
  type ReimbursementEmailInput,
} from './email-templates';

function getTransport() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = process.env.SMTP_SECURE !== 'false' && (process.env.SMTP_SECURE === 'true' || port === 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
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
  html: string;
  text: string;
}): Promise<DispatchEmailResult> {
  const to = params.to?.trim();
  if (!to) {
    return { sent: false, skipped: true };
  }

  const transport = getTransport();
  if (!transport) {
    console.warn(`[email] SMTP não configurado; e-mail "${params.subject}" não enviado para ${to}.`);
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
    return { sent: true };
  } catch (err) {
    console.error(`[email] Falha ao enviar "${params.subject}" para ${to}:`, err);
    return {
      sent: false,
      error: err instanceof Error ? err.message : 'Erro desconhecido ao enviar e-mail.',
    };
  }
}

export async function sendDisciplinaryNotificationEmail(
  to: string | null | undefined,
  input: DisciplinaryEmailInput
): Promise<DispatchEmailResult> {
  const built = buildDisciplinaryEmail(input);
  return dispatchEmail({ to, ...built });
}

export async function sendLabHoursAlertEmail(
  to: string | null | undefined,
  input: LabHoursAlertEmailInput
): Promise<DispatchEmailResult> {
  const built = buildLabHoursAlertEmail(input);
  return dispatchEmail({ to, ...built });
}

export async function sendReimbursementStatusEmail(
  to: string | null | undefined,
  input: ReimbursementEmailInput
): Promise<DispatchEmailResult> {
  const built = buildReimbursementEmail(input);
  return dispatchEmail({ to, ...built });
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
    return { delivered: false };
  }

  await transport.sendMail({
    from: getFromAddress(),
    to: params.to,
    subject,
    text,
    html,
  });

  return { delivered: true };
}

export async function sendAccountApprovedEmail(params: {
  to: string;
  name: string;
}): Promise<void> {
  const transport = getTransport();
  if (!transport) return;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000';
  try {
    await transport.sendMail({
      from: getFromAddress(),
      to: params.to,
      subject: '[UFRJ Autônomos] Sua conta foi aprovada!',
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
  } catch (error) {
    console.error('Aviso: falha ao enviar e-mail de aprovação:', error);
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

