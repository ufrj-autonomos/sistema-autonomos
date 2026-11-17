# Áreas, Tarefas e Ensino

## Perfis e entradas

| Perfil | Navegação | Experiência |
| --- | --- | --- |
| Membro e trainee | Tarefas (`/tarefas`) | Lista das tarefas atribuídas ao usuário, busca, filtros, quadro opcional e atualização de entregas. |
| Coordenador | Áreas (`/areas`) | Painel da própria área, tarefas, equipe e formação. Pode alternar entre suas divisões quando possui mais de um vínculo. |
| Gestão e admin | Áreas (`/areas`) | Seleção de área e divisão, acompanhamento de tarefas, equipe e formação. |
| Todos os perfis aprovados | Ensino (`/ensino`) | Catálogo dos cursos publicados, busca, filtro por área e progresso, retomada de cursos iniciados. |

Membros que acessam `/areas` são redirecionados para `/tarefas`. A seleção de área é resolvida no servidor: parâmetros de outras áreas são ignorados para membros e coordenadores. Cargos acumulados preservam o acesso de Gestão/Admin quando presentes.

As permissões de escrita existentes continuam sendo verificadas pelas APIs: coordenação gerencia suas áreas; admin possui gestão global. O acesso de Gestão ao painel não concede automaticamente edição em todas as áreas.

## Tarefas e coordenação

O membro começa em “Minhas tarefas”, no modo Lista. “Todas” permite acompanhar o trabalho da área. Membros com vínculos em duas divisões podem alternar a divisão. Contas sem área consultam somente tarefas explicitamente atribuídas a elas.

A coordenação começa no modo Quadro. O painel mostra integrantes, trabalho em andamento, entregas em revisão e prazos vencidos. Os avisos de prazo vencido e ausência de responsável abrem os respectivos filtros. Na equipe, “Ver tarefas” filtra as tarefas pelo integrante.

A lista destaca título, responsáveis, prazo e ação principal. O quadro mantém as etapas A fazer, Em andamento, Em revisão e Concluída. A atualização de entrega conserva notas e links. As janelas possuem nomes acessíveis, rótulos associados aos campos, foco inicial, contenção de Tab, Escape e restauração do foco.

## Ensino

O catálogo consulta os cursos publicados e o progresso do usuário autenticado. A busca ignora acentos. Os filtros combinam tema, área e progresso. Cursos sem aulas e sem material externo exibem “Conteúdo em preparação”. Resultados vazios oferecem limpeza dos filtros.

“Continuar” abre a última aula registrada do curso, com fallback para a primeira aula. Cursos externos abrem em outra aba e indicam esse destino.

- `/ensino/cursos/ros2-jazzy` mantém a apresentação e a grade do ROS 2 antes disponíveis na home.
- `/ensino/cursos/[slug]` apresenta os demais cursos, seus módulos e aulas.
- `/curso/[lessonId]` mantém o player existente; seu retorno ao catálogo continua em `/ensino`.

## Direção visual

As telas usam o sistema existente em `src/app/globals.css`: cores semânticas dos temas, tipografia do shell, bordas discretas e ações de alto contraste. O conteúdo e as permissões definem a hierarquia. O catálogo usa cursos como unidades de navegação; a lista de tarefas usa linhas para leitura rápida.

## Verificação

- TypeScript: `npm run typecheck`.
- Permissões e escopos: `npm run test:areas` e `npm run test:access`.
- Harness de navegador com os componentes reais, dados sintéticos e âncoras no lugar de Next Link: 1440 e 390 px, catálogo, membro, coordenação e gestão. Sem overflow ou erros de JavaScript nas oito combinações.
- Interações verificadas no harness: busca, filtros, limpeza, Lista/Quadro, filtros de atraso, tarefas por integrante, edição, Escape e restauração do foco.

O harness não valida sessão real, navegação autenticada, persistência no banco, fontes ou shell global. Os cursos de demonstração usados na verificação não são inseridos no catálogo real.
