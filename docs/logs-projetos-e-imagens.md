# Logs, projetos e imagens

## Logs administrativos

`/gestao/logs` e `/api/admin/activity` exigem uma sessão aprovada e a função Admin consultada no banco a cada acesso. Gestão não recebe acesso aos logs.

A visualização padrão lista ações de autenticação, alterações de cadastro, publicações, presença e progresso. Consultas GET, polling, cliques e envios genéricos de formulário não entram na lista. Visitas a páginas ficam disponíveis pelo filtro específico e são identificadas como interações observadas, sem afirmar que uma operação de negócio foi concluída.

Eventos com a mesma conta, ação, recurso, campo e resultado são agrupados em janelas fixas de cinco minutos. Cada resumo mantém a quantidade e a última ocorrência; falhas ficam separadas dos sucessos. O agrupamento usa uma chave única e incremento atômico no PostgreSQL. A migração preserva o histórico e as ações relevantes antigas continuam pesquisáveis. Nomes de ações são apresentados em português.

O registro contém identificação da conta, ação, recurso, resultado e horários. Não armazena corpos de requisição, valores de formulários, senhas, CPF, tokens ou mensagens de erro do provedor. Falhas ao registrar um log não interrompem uma operação já concluída. Não existe reconstrução de interações anteriores à ativação da coleta.

## Projetos

A tabela oferece visões Site, Interna e Personalizada, busca nas colunas visíveis, filtros de equipe/status/ano/exibição e ordenação. A escolha de colunas e sua ordem são guardadas somente neste navegador, por conta. Observações internas continuam no banco do sistema. Edições rápidas de status, prioridade e exibição pedem confirmação e usam as mesmas ações autenticadas do formulário.

## Upload e recorte

Projetos e outros campos de imagem usam `POST /api/admin/images`, com permissão de Gestão/Admin. O perfil mantém `POST /api/profile/photo`, disponível à própria conta aprovada. Ambos usam a mesma rotina de processamento e o mesmo bucket institucional do upload de integrantes, com a chave de armazenamento somente no servidor.

Antes do envio, o editor permite enquadramento, zoom, arraste e controles de posição por teclado. Fotos de perfil têm recorte quadrado e máscara circular escurecida para antecipar o avatar. Outros conteúdos permitem proporções original, 16:9, 4:3, 1:1 e 3:4.

O arquivo original pode ter até 25 MB no editor. O envio processado tem limite de 4 MB; o servidor valida e recodifica em WebP. Projetos preservam a proporção e têm lado máximo de 2560 px. O perfil produz uma imagem quadrada de até 1024 px. É necessário salvar o formulário para associar a nova imagem ao cadastro e publicar a alteração.

## Verificação

`npm test` inclui testes da geometria de recorte, imagens processadas com Sharp, protocolo de armazenamento simulado, filtros de projetos, autorização e agrupamento de logs. `npm run test:database` exige PostgreSQL local descartável e verifica as migrações, concorrência, histórico, filtros e proteção RLS. Não usa contas ou arquivos reais de produção.
