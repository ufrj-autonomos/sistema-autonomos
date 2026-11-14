import { NextRequest, NextResponse } from 'next/server';
import { traceApi } from '@/lib/activity/server';
import { authorizeApi } from '@/lib/session';
import { generateAiEmailDraft } from '@/lib/email-center';
import { buildCustomNoticeEmail, type EmailAccent } from '@/lib/email-templates';

export const dynamic = 'force-dynamic';

const VALID_ACCENTS = new Set<EmailAccent>(['cyan', 'emerald', 'amber', 'red']);

export async function POST(req: NextRequest) {
  return traceApi(req, 'POST /api/gestao/emails/ai-draft', async () => {
    const access = await authorizeApi(req, true);
    if (access.error) return access.error;

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Corpo JSON inválido.' }, { status: 400 });
    }

    const mode = typeof body.mode === 'string' ? body.mode.trim() : 'generate';

    const accentRaw = typeof body.accent === 'string' ? body.accent.trim() : 'cyan';
    const accent: EmailAccent = VALID_ACCENTS.has(accentRaw as EmailAccent)
      ? (accentRaw as EmailAccent)
      : 'cyan';

    if (mode === 'preview') {
      const subject = typeof body.subject === 'string' ? body.subject.trim() : '[Autônomos] Comunicado';
      const bodyText = typeof body.bodyText === 'string' ? body.bodyText.trim() : '';
      if (!bodyText) {
        return NextResponse.json({ error: 'Informe o corpo do e-mail para pré-visualizar.' }, { status: 400 });
      }
      const sampleName =
        typeof body.sampleName === 'string' && body.sampleName.trim()
          ? body.sampleName.trim()
          : 'Integrante Exemplo';
      const sampleArea =
        typeof body.sampleArea === 'string' && body.sampleArea.trim()
          ? body.sampleArea.trim()
          : 'Software';

      const personalized = bodyText
        .replace(/\{\{\s*NOME\s*\}\}/gi, sampleName)
        .replace(/\{\{\s*PRIMEIRO_NOME\s*\}\}/gi, sampleName.split(/\s+/)[0] || sampleName)
        .replace(/\{\{\s*AREA\s*\}\}/gi, sampleArea);

      const built = buildCustomNoticeEmail({
        recipientName: sampleName,
        subject,
        eyebrow: typeof body.eyebrow === 'string' ? body.eyebrow : undefined,
        heading: typeof body.heading === 'string' ? body.heading : undefined,
        subtitle: typeof body.subtitle === 'string' ? body.subtitle : undefined,
        bodyText: personalized,
        accent,
        ctaLabel: typeof body.ctaLabel === 'string' ? body.ctaLabel : undefined,
        ctaPath: typeof body.ctaPath === 'string' ? body.ctaPath : undefined,
      });

      return NextResponse.json({ previewHtml: built.html, subject: built.subject });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const instruction = typeof body.instruction === 'string' ? body.instruction.trim() : '';
    if (prompt.length < 5 && instruction.length < 3) {
      return NextResponse.json(
        { error: 'Descreva o que o e-mail deve comunicar (mínimo de 5 caracteres).' },
        { status: 400 }
      );
    }
    if (prompt.length > 2000 || instruction.length > 1500) {
      return NextResponse.json(
        { error: 'A descrição/instrução ultrapassou o limite permitido.' },
        { status: 400 }
      );
    }

    const currentDraft =
      body.currentDraft && typeof body.currentDraft === 'object' && !Array.isArray(body.currentDraft)
        ? (body.currentDraft as Record<string, unknown>)
        : null;

    const draft = await generateAiEmailDraft({
      prompt: prompt || String(currentDraft?.bodyText || ''),
      instruction: instruction || undefined,
      situationContext:
        typeof body.situationContext === 'string' ? body.situationContext : null,
      accent,
      ctaPath: typeof body.ctaPath === 'string' ? body.ctaPath : undefined,
      currentDraft: currentDraft
        ? {
            subject: typeof currentDraft.subject === 'string' ? currentDraft.subject : undefined,
            eyebrow: typeof currentDraft.eyebrow === 'string' ? currentDraft.eyebrow : undefined,
            heading: typeof currentDraft.heading === 'string' ? currentDraft.heading : undefined,
            subtitle: typeof currentDraft.subtitle === 'string' ? currentDraft.subtitle : undefined,
            bodyText: typeof currentDraft.bodyText === 'string' ? currentDraft.bodyText : undefined,
            accent:
              typeof currentDraft.accent === 'string' && VALID_ACCENTS.has(currentDraft.accent as EmailAccent)
                ? (currentDraft.accent as EmailAccent)
                : undefined,
            ctaLabel: typeof currentDraft.ctaLabel === 'string' ? currentDraft.ctaLabel : undefined,
            ctaPath: typeof currentDraft.ctaPath === 'string' ? currentDraft.ctaPath : undefined,
          }
        : null,
    });

    return NextResponse.json({ draft }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
