# Visão geral e temas

A página inicial (`/`) de Gestão/Admin e a visão geral (`/gestao`) usam o mesmo painel.
Os demais perfis mantêm a página pessoal com seus cursos e sua presença.
A navegação existente e a estrutura dos cursos foram preservadas.

O painel consulta solicitações `MemberProfileChange` pendentes (alterações e fotos dos
integrantes), cadastros pendentes e relatórios de presença. Cada consulta mantém seu
próprio estado de indisponibilidade; uma falha nunca aparece como zero pendências.

As semanas vão de segunda a domingo em `America/Sao_Paulo`. A lista da semana passada
inclui apenas `MISSED` com meta positiva. Pessoas sem meta naquele período são excluídas.
Somente visitas validadas contam; registros em revisão aparecem identificados.
O link da semana passada abre o filtro correspondente e ainda permite voltar à atual.

O tema padrão continua escuro. O botão de sol/lua no cabeçalho alterna claro/escuro.
A escolha é salva em `autonomos:theme`, sincronizada entre abas e aplicada antes da
primeira pintura. As cores usam tokens semânticos de `src/app/globals.css`; a opção clara
usa fundo `#FAFAFA`, superfícies `#FFFFFF` e texto `#0A0A0B`. Logos trocam a arte conforme
o tema. O cartaz QR permanece branco, e imagens/vídeos mantêm suas cores próprias.

Validação: testes de semanas, metas, revisão, falhas e tema; suíte de acesso e integração;
build de produção. O ambiente não disponibilizou navegador para validação visual.
