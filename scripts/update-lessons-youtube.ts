import { prisma } from '../src/lib/prisma';

async function updateLessons() {
  const welcomeText = `### Boas-vindas ao Curso ROS 2 Jazzy Jalisco
Bem-vindo ao curso prático de **ROS 2 Jazzy Jalisco**, ministrado pela **UFRJ Autônomos**.
Neste curso você aprenderá a construir nós inteligentes, configurar pipelines de comunicação distribuída e simular robôs autônomos.

---

### 🎙️ Dica de Acessibilidade: Legendas e Áudio Dublado no YouTube

Todos os vídeos da nossa plataforma já são configurados para **abrir automaticamente com legendas em português (\`pt-BR\`)**.

Caso queira ajustar a legenda automática ou alternar para a faixa dublada no YouTube:

1. **Legendas em Português / Tradução Automática:**
   - No player do YouTube, clique no ícone **CC** (Legendas) no canto inferior direito para ligar/desligar.
   - Para traduzir caso esteja em outro idioma: clique na **Engrenagem (⚙️ Detalhes)** > **Legendas** > **Traduzir automaticamente** > Selecione **Português**.

2. **Faixa de Áudio Dublada (quando disponível no YouTube):**
   - Clique na **Engrenagem (⚙️ Detalhes)** no canto inferior do player.
   - Selecione **Faixa de áudio**.
   - Escolha **Português (dublado)**.`;

  await prisma.lesson.updateMany({
    where: { orderIndex: 1 },
    data: { textContent: welcomeText },
  });
  console.log('✅ Aula 1 (Welcome) atualizada com guia de legendas e dublagem.');

  const updates = [
    { orderIndex: 6, youtubeVideoId: 'ad3gJpq29_k', duration: 1125 },
    { orderIndex: 73, youtubeVideoId: '6ZPLhbyhPLI', duration: 1348 },
    { orderIndex: 76, youtubeVideoId: 'P-TlnQrm7PY', duration: 171 },
    { orderIndex: 77, youtubeVideoId: 'hNzpsMAZ9Tw', duration: 707 },
    { orderIndex: 78, youtubeVideoId: 'n7AngQtAY5I', duration: 490 },
    { orderIndex: 79, youtubeVideoId: 'ynDdTnXJUns', duration: 458 },
    { orderIndex: 80, youtubeVideoId: 'VFn8vvvN_LY', duration: 573 },
    { orderIndex: 82, youtubeVideoId: 'yXS1-zyZS90', duration: 386 },
    { orderIndex: 83, youtubeVideoId: 'E_WY0yGy1Sg', duration: 455 },
  ];

  for (const u of updates) {
    const res = await prisma.lesson.updateMany({
      where: { orderIndex: u.orderIndex },
      data: {
        youtubeVideoId: u.youtubeVideoId,
        videoStatus: 'AVAILABLE',
        videoDurationSeconds: u.duration,
      },
    });
    console.log(`✅ Aula #${u.orderIndex} vinculada ao vídeo ${u.youtubeVideoId} (${res.count} registro(s) atualizado(s))`);
  }
}

updateLessons()
  .catch((err) => {
    console.error('Erro ao atualizar aulas:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

