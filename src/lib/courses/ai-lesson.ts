import { extractYoutubeVideoId } from '@/lib/areas/service';

export interface GeneratedLessonDraft {
  summary: string;
  textContent: string;
  videoTitle?: string | null;
  source: 'gemini-video' | 'gemini-text' | 'fallback';
}

async function fetchYoutubeOEmbedTitle(videoId: string): Promise<{ title: string; author: string } | null> {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; author_name?: string };
    if (!data.title) return null;
    return { title: data.title, author: data.author_name || '' };
  } catch {
    return null;
  }
}

function buildFallbackLessonDraft(params: {
  title: string;
  videoTitle?: string | null;
  courseTitle?: string;
  area?: string;
}): GeneratedLessonDraft {
  const effectiveTitle = params.title.trim() || params.videoTitle || 'Nova Aula';
  const contextLine = [params.courseTitle, params.area].filter(Boolean).join(' · ');
  const summary = `Guia prático sobre ${effectiveTitle}${contextLine ? ` (${contextLine})` : ''}.`;
  const textContent = [
    `## ${effectiveTitle}`,
    '',
    params.videoTitle && params.videoTitle !== effectiveTitle
      ? `> Referência do vídeo: **${params.videoTitle}**`
      : '',
    '### Objetivos de Aprendizagem',
    `- Compreender os fundamentos de **${effectiveTitle}**.`,
    '- Aplicar os conceitos apresentados na prática dentro dos projetos da equipe.',
    '',
    '### Pontos-Chave',
    '- Revise os comandos, configurações e boas práticas demonstrados na aula.',
    '- Documente dúvidas e resultados no repositório ou no canal da área.',
    '',
    '### Checklist Prático',
    '- [ ] Assistir ao vídeo completo e acompanhar os exemplos.',
    '- [ ] Reproduzir o passo a passo no ambiente da equipe.',
  ]
    .filter((line, idx, arr) => !(line === '' && arr[idx - 1] === ''))
    .join('\n');

  return {
    summary: summary.slice(0, 240),
    textContent,
    videoTitle: params.videoTitle ?? null,
    source: 'fallback',
  };
}

async function callGeminiLesson(
  apiKey: string,
  parts: Array<Record<string, unknown>>
): Promise<{ summary: string; textContent: string } | null> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(25000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.4,
          responseMimeType: 'application/json',
        },
      }),
    }
  );
  if (!response.ok) return null;
  const payload = (await response.json().catch(() => null)) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  } | null;
  const rawText = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) return null;
  const parsed = JSON.parse(rawText) as { summary?: unknown; textContent?: unknown };
  const summary = typeof parsed.summary === 'string' ? parsed.summary.trim() : '';
  const textContent = typeof parsed.textContent === 'string' ? parsed.textContent.trim() : '';
  if (!textContent) return null;
  return {
    summary: summary.slice(0, 240),
    textContent,
  };
}

export async function generateLessonContentWithAi(params: {
  title?: string;
  youtubeUrl?: string;
  courseTitle?: string;
  area?: string;
}): Promise<GeneratedLessonDraft> {
  const title = (params.title || '').trim();
  const rawYoutube = (params.youtubeUrl || '').trim();
  const videoId = rawYoutube ? extractYoutubeVideoId(rawYoutube) : null;
  const oembed = videoId ? await fetchYoutubeOEmbedTitle(videoId) : null;
  const videoTitle = oembed?.title ?? null;

  const key = process.env.GEMINI_API_KEY || process.env.GEMINI_API;
  if (!key) {
    return buildFallbackLessonDraft({
      title,
      videoTitle,
      courseTitle: params.courseTitle,
      area: params.area,
    });
  }

  const promptText = [
    'Você é instrutor técnico da equipe de robótica autônoma UFRJ Autônomos (Nautilus e Harpia).',
    'Gere um resumo curto e uma apostila/guia didático em Markdown (português do Brasil) para uma aula da plataforma interna de ensino.',
    `Título informado da aula: "${title || videoTitle || 'Aula técnica'}"`,
    videoTitle ? `Título do vídeo no YouTube: "${videoTitle}"${oembed?.author ? ` (Canal: ${oembed.author})` : ''}` : '',
    params.courseTitle ? `Curso: "${params.courseTitle}"` : '',
    params.area ? `Área técnica: "${params.area}"` : '',
    '',
    'Retorne SOMENTE um objeto JSON válido com as chaves exatas:',
    '- "summary": string (1 frase objetiva com até 180 caracteres resumindo o objetivo da aula)',
    '- "textContent": string (conteúdo em Markdown bem estruturado com seções como ## Visão Geral, ### Conceitos Principais, ### Passo a Passo / Comandos ou Boas Práticas e ### Checklist Prático)',
  ]
    .filter(Boolean)
    .join('\n');

  if (videoId) {
    try {
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const videoResult = await callGeminiLesson(key, [
        { fileData: { fileUri: watchUrl } },
        { text: promptText },
      ]);
      if (videoResult) {
        return {
          ...videoResult,
          videoTitle,
          source: 'gemini-video',
        };
      }
    } catch {
      // Fallback para geração textual abaixo
    }
  }

  try {
    const textResult = await callGeminiLesson(key, [{ text: promptText }]);
    if (textResult) {
      return {
        ...textResult,
        videoTitle,
        source: 'gemini-text',
      };
    }
  } catch {
    // Fallback estruturado abaixo
  }

  return buildFallbackLessonDraft({
    title,
    videoTitle,
    courseTitle: params.courseTitle,
    area: params.area,
  });
}
