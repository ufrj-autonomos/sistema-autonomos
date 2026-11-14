import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import {
  isValidEmailSituationKey,
  resendEmailByLogId,
  sendCustomBatchOrIndividualEmails,
  sendSituationEmails,
  updateEmailAutomationRule,
} from '@/lib/email-center';
import type { EmailAccent } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_ACCENTS = new Set<EmailAccent>(['cyan', 'emerald', 'amber', 'red']);

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/gestao/emails/send', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Corpo JSON inválido.' }, { status: 400 });
    }

    const action = typeof body.action === 'string' ? body.action.trim() : '';

    try {
      if (action === 'send_situation') {
        if (!isValidEmailSituationKey(body.situationKey)) {
          return NextResponse.json({ error: 'Situação de e-mail inválida.' }, { status: 400 });
        }
        const targetMemberId =
          typeof body.memberId === 'string' && body.memberId.trim() ? body.memberId.trim() : undefined;
        const onlyPendingInWindow = Boolean(body.onlyPendingInWindow);

        const summary = await sendSituationEmails({
          situationKey: body.situationKey,
          targetMemberId,
          onlyPendingInWindow,
          actorId: access.user.id,
        });

        return NextResponse.json({ ok: true, action, summary });
      }

      if (action === 'send_custom') {
        const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
        const bodyText = typeof body.bodyText === 'string' ? body.bodyText.trim() : '';
        if (subject.length < 3 || subject.length > 160) {
          return NextResponse.json(
            { error: 'O assunto deve ter entre 3 e 160 caracteres.' },
            { status: 400 }
          );
        }
        if (bodyText.length < 5 || bodyText.length > 8000) {
          return NextResponse.json(
            { error: 'O conteúdo do e-mail deve ter entre 5 e 8.000 caracteres.' },
            { status: 400 }
          );
        }

        const situationKey = isValidEmailSituationKey(body.situationKey)
          ? body.situationKey
          : null;
        const areaFilter =
          typeof body.areaFilter === 'string' && body.areaFilter.trim()
            ? body.areaFilter.trim()
            : null;
        const recipientMemberIds = Array.isArray(body.recipientMemberIds)
          ? body.recipientMemberIds.filter((x): x is string => typeof x === 'string')
          : undefined;

        const accentRaw = typeof body.accent === 'string' ? body.accent.trim() : 'cyan';
        const accent: EmailAccent = VALID_ACCENTS.has(accentRaw as EmailAccent)
          ? (accentRaw as EmailAccent)
          : 'cyan';

        const summary = await sendCustomBatchOrIndividualEmails({
          recipientMemberIds,
          situationKey,
          areaFilter,
          subject,
          eyebrow: typeof body.eyebrow === 'string' ? body.eyebrow.slice(0, 50) : undefined,
          heading: typeof body.heading === 'string' ? body.heading.slice(0, 120) : undefined,
          subtitle: typeof body.subtitle === 'string' ? body.subtitle.slice(0, 180) : undefined,
          bodyText,
          accent,
          ctaLabel: typeof body.ctaLabel === 'string' ? body.ctaLabel.slice(0, 50) : undefined,
          ctaPath: typeof body.ctaPath === 'string' ? body.ctaPath.slice(0, 120) : undefined,
          generatedByAi: Boolean(body.generatedByAi),
        });

        return NextResponse.json({ ok: true, action, summary });
      }

      if (action === 'resend_log') {
        const logId = typeof body.logId === 'string' ? body.logId.trim() : '';
        if (!logId) {
          return NextResponse.json({ error: 'Informe o identificador do log para reenvio.' }, { status: 400 });
        }
        const overrideEmail =
          typeof body.overrideEmail === 'string' && body.overrideEmail.trim()
            ? body.overrideEmail.trim()
            : null;

        const res = await resendEmailByLogId({ logId, overrideEmail });
        return NextResponse.json({ ok: true, action, result: res });
      }

      if (action === 'toggle_rule') {
        if (!isValidEmailSituationKey(body.situationKey)) {
          return NextResponse.json({ error: 'Situação de automação inválida.' }, { status: 400 });
        }
        if (typeof body.enabled !== 'boolean') {
          return NextResponse.json({ error: 'Informe enabled (true/false).' }, { status: 400 });
        }
        const cooldownDays =
          typeof body.cooldownDays === 'number' ? body.cooldownDays : undefined;

        const updated = await updateEmailAutomationRule({
          situationKey: body.situationKey,
          enabled: body.enabled,
          cooldownDays,
          actorId: access.user.id,
        });

        return NextResponse.json({ ok: true, action, rule: updated });
      }

      return NextResponse.json({ error: 'Ação de e-mail não reconhecida.' }, { status: 400 });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao processar solicitação de e-mail.';
      const status =
        message.includes('não encontrado') || message.includes('não se encontra') ? 404 : 400;
      return NextResponse.json({ error: message }, { status });
    }
  });
}
