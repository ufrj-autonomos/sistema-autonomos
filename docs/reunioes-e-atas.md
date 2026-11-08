# Reuniões e atas

Nas áreas de `/reunioes`, Acompanhamento é a primeira visualização e a padrão. Os cartões mostram primeiro as reuniões recentes, a presença do próprio membro, descrição, resumo e acesso à ata completa. Planilha/Matriz e Chamada por Reunião continuam disponíveis. O coordenador pode abrir a chamada a partir do cartão e registrar a ata depois.

Cada reunião tem uma ata em texto (10 a 20.000 caracteres). Coordenadores editam reuniões da própria equipe; Admin pode editar todas. Membros aprovados leem atas das áreas da sua equipe. O resumo é um parágrafo gerado pelo Gemini já configurado no sistema; indisponibilidade, resposta inválida ou ausência de configuração produzem um trecho explicitamente identificado, sem impedir o salvamento. A ata é exibida como texto, sem executar HTML. Edições concorrentes recebem conflito e preservam o texto no editor.

A página inicial da coordenação e a de reuniões apresentam atas pendentes de reuniões até a data atual, incluindo períodos anteriores. O aviso aparece exclusivamente para coordenadores e vice-coordenadores com área cadastrada, considerando somente a própria área e equipe. Admin e Gestão não recebem esse aviso. Criar uma reunião de outra área não gera uma exceção. O link leva diretamente ao editor da reunião. Reuniões futuras só entram no aviso na sua data.

Novas reuniões e presenças usam N (`NOT_A_MEMBER`) por padrão. Registros antigos são preservados. N continua fora do cálculo de frequência. Criar a reunião e inicializar sua chamada ocorre numa transação. Na Planilha/Matriz, o clique abre um popup para escolher o status e confirmar. A Chamada por Reunião salva a seleção imediatamente, sem confirmação nem toast; o status de salvamento/erro aparece na própria tela, com reversão se o pedido falhar. As opções ficam desabilitadas durante o envio para evitar respostas fora de ordem.

## Verificação

`npm run test:meeting-minutes` cobre validação, resumo e contingência sem acessar um provedor real. `npm run test:database` inclui fixtures locais descartáveis para criação com N, chamada antes da ata, pendências, acesso por equipe, edição e conflitos. Os testes antigos que dependem das planilhas importadas só são ativados com `TEST_IMPORTED_SPREADSHEETS=1`; não são usados como requisito de um banco de teste vazio.

A migração cria somente as estruturas de reuniões que ainda não existirem e adiciona os campos de ata. Isso permite validar instalações novas e instalações que criaram reuniões anteriormente fora do histórico de migrações. Ela mantém os registros existentes e protege reuniões e chamadas com RLS.

## Decisões de interface

O membro acompanha conteúdo e decisões antes da matriz de presença. A chamada mantém marcação direta; a tabela mantém a escolha de status com confirmação. A ausência da ata é uma pendência documental; não bloqueia a reunião nem sua chamada. O resumo serve de entrada para a ata integral e um trecho automático não recebe o rótulo de resumo de IA.
