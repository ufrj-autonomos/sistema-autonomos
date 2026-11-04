# Administração do site institucional

## Formulário de integrantes e revisão de alterações

Os cargos são agrupados em Liderança, Coordenação, Integrantes e Orientação.
Valores antigos como `Integrante` são reconhecidos como `Membro`; cargos especiais
já cadastrados permanecem selecionáveis. O cargo organizacional é independente
do perfil de acesso à plataforma. Ao mudar um cargo padrão, as traduções de cargo
são atualizadas, preservando traduções editadas explicitamente no mesmo formulário.

`UFRJ Autônomos` é uma opção explícita de equipe, representada por `teamId = null`.
O formulário não mostra um segundo placeholder com o mesmo valor vazio.

Áreas são normalizadas de forma compartilhada pelo formulário, perfil, diretório
e presença. `Não informada` é tratada como ausência de informação; uma área real
da outra fonte pode ser usada como referência. Escolhas internas e públicas já
preenchidas podem ser diferentes e não são substituídas por inferência do cargo.
O script `node --import tsx scripts/repair-member-areas.ts` informa quantos vínculos
têm área preenchida em apenas um banco. `--apply` preenche somente os valores
ausentes, conferindo o valor anterior para não sobrescrever edições simultâneas.

Nos avisos de pedidos de alteração, **Ver alterações** abre uma comparação por
campo entre o conteúdo atual do site e o proposto. A comparação inclui a foto,
links, biografia, área, curso, adaptação de cargo e remoções de informação.
Os dados públicos da tabela mostram o cadastro atual; propostas aguardando
aprovação ficam na prévia. Aprovar ou recusar usa a versão da solicitação vista
pela gestão; se o integrante atualizar o pedido, a gestão deve conferir a nova
prévia. Revisões simultâneas resultam em uma única decisão.

Salvar uma área no perfil a aplica imediatamente ao cadastro interno e solicita
aprovação para alterá-la no site. Restaurar os valores publicados retira os campos
correspondentes do pedido. A aprovação valida os campos e só conclui após gravar
no banco institucional; indisponibilidade mantém a solicitação pendente.

A administração original do `site-autonomos` foi transportada para a gestão.
**Integrantes** (`/gestao/integrantes`) e **Projetos** (`/gestao/projetos`) são
seções próprias. Os demais conteúdos ficam em **Site institucional**
(`/gestao/site`). As tabelas, campos, editor Markdown,
traduções e formulários originais foram reutilizados, com autorização de Gestão ou Admin no
servidor. O conteúdo continua no projeto Supabase institucional; não foi importado
para o banco de contas, cursos ou presença.

## Conexões separadas

- O app usa o Prisma principal para autenticação/ensino/presença e um segundo
  cliente gerado de `prisma/institutional.prisma` para o site.
- O papel `institutional_editor` pode consultar, inserir, alterar e excluir os
  registros institucionais. Ele não é proprietário nem pode criar tabelas/roles.
- O site público usa `institutional_reader`, com SELECT nas tabelas públicas de
  conteúdo e sem acesso à caixa de mensagens. Nenhuma credencial de edição ou
  chave secreta de Storage deve permanecer no ambiente do site público.
- Todas as tabelas institucionais têm RLS. Os papéis `anon`, `authenticated` e
  `PUBLIC` não recebem acesso às tabelas. O site consulta pelo servidor PostgreSQL.
- As imagens públicas continuam no bucket existente `galery-autonomos`. O app
  faz o upload autenticado pelo servidor, converte a WebP e limita a imagem a
  4 MB de entrada, 40 milhões de pixels e 2560 pixels de lado.

Não execute `db:push` do esquema principal no banco institucional. O esquema
institucional documenta a estrutura já existente; `db:generate` apenas gera os
clientes e não modifica nenhum banco. O deploy aplica somente as migrações do
banco principal, como antes.

## Cadastro compartilhado de integrantes e projetos

O banco institucional é a fonte dos dados públicos e compartilhados. A gestão lê
e edita os registros existentes diretamente, preservando seus IDs, traduções,
imagens e associações. A visão geral e as divisões também consultam essa fonte.
Não se usa o diretório genérico do banco interno como alternativa em caso de erro.

`MemberDetails` e `ProjectDetails`, no banco interno, guardam somente os dados
privados e a referência explícita ao ID institucional. CPF e observações nunca
entram no banco público. Gestão e Admin podem consultá-los e editá-los.

Em **Integrantes → editar → Dados internos**, a gestão pode vincular uma conta
aprovada da mesma pessoa. O vínculo usa o `Member` interno já existente e preserva
todos os períodos, visitas, marcações e auditorias de presença. Não há associação
automática por nome nem pela coincidência dos IDs dos dois bancos. Desvincular
uma conta também preserva o histórico. Uma conta e um CPF só podem pertencer a um
cadastro institucional. Contas suspensas já vinculadas continuam disponíveis para
consulta; a suspensão segue controlada em Contas e permissões.

A lista e a edição do integrante mostram as semanas abaixo da meta usando o
cálculo de presença existente, sem contar semanas em andamento como faltas.
Na lista, esse indicador está disponível apenas como coluna opcional na visão
Personalizada; não aparece nas visões Site e Interna.
Sem vínculo, o acompanhamento aparece como não associado. A presença usa o nome
e a área atuais do cadastro institucional quando há vínculo; os registros internos
antigos continuam preservados. Remover um cadastro institucional não apaga presença
ou dados privados: prefira desativar/ocultar quando precisar preservar o acesso ao cadastro.

`showOnSite` controla a publicação de integrantes e projetos, independentemente
de `active`. Os registros que já existiam continuam públicos; novos formulários
começam com **Exibir no site** desmarcado. O leitor público tem políticas RLS que
ocultam integrantes, projetos e galerias associadas a projetos ocultos, incluindo
consultas por slug, contagens, relações e sitemap. O editor continua vendo todos.
O site público atual já usa esse leitor e não precisa de outra conexão ou acesso
ao banco interno. O cache público é invalidado após alterações, com aviso se a
publicação não for confirmada.

Antes de publicar a versão com o diretório unificado:

1. Aplique `npm run db:deploy` no banco interno.
2. Defina temporariamente `INSTITUTIONAL_OWNER_DATABASE_URL` e execute
   `npm run db:institutional-directory`. O script aplica somente o SQL aditivo
   de `scripts/institutional/shared-directory.sql`; ele pode ser repetido e não
   substitui conteúdo ou a visibilidade dos registros existentes.
3. Publique o sistema. Não é necessário executar seed, importar os cadastros
   genéricos ou recriar os dados do site. As rotas antigas de membros e projetos
   em `/gestao/site` redirecionam para suas novas seções.

O proprietário é necessário apenas para essa migração. O editor de runtime não
recebe permissão de alterar tabelas ou políticas. Em um banco institucional novo,
o provisionamento já instala as políticas com o filtro de visibilidade.

## Visões da tabela de integrantes e cadastro operacional

A tela de integrantes oferece três visões:

- **Site:** nome, cargo, área, idade, equipe, status e exibição pública, sem dados
  de presença ou documentos internos.
- **Interna:** nome, área, email, contato/WhatsApp, DRE, CPF, nascimento, curso,
  período acadêmico e contato de emergência.
- **Personalizada:** seleção e ordenação de colunas do site, internas e de
  presença. A preferência é salva na conta de quem está usando a gestão, sem
  alterar as preferências de outras pessoas.

Busca, filtros por área/equipe/status e ordenação funcionam sobre a visão atual.
A busca considera somente as colunas visíveis. A tabela tem rolagem horizontal,
cabeçalho fixo e, em telas maiores, primeira coluna e ações fixas. No celular,
as colunas podem rolar livremente para não se sobreporem.

A migração `20261102030000_member_operations` adiciona campos exclusivamente a
`MemberDetails` e uma preferência JSON em `User`, no banco interno. Não altera
tabelas, colunas ou conteúdo do banco institucional. Aplica-se com `db:deploy`.

Os dados são preenchidos em **Integrantes → editar → Dados internos**. Nome, área
e curso internos vazios usam o valor institucional como referência; um valor
preenchido é uma informação operacional independente e nunca é enviado ao site.
O email vazio usa a conta vinculada, quando houver, sem alterar o email de login.
Nascimento é armazenado como data sem horário, preservando o dia em qualquer fuso.
CPF e DRE são únicos quando preenchidos, e salvar campos antigos não apaga os
novos campos omitidos na requisição. Campos vazios podem ser salvos sem inventar dados.

## Variáveis na Vercel

As variáveis privadas já configuradas nos `.env` locais não são enviadas pelo Git.
Configure-as também em Production nos dois projetos antes de concluir a troca.

No projeto **sistema-autonomos**, acrescente os valores do seu `.env`:

- `INSTITUTIONAL_DATABASE_URL`: conexão do papel `institutional_editor` pelo session pooler.
- `INSTITUTIONAL_SUPABASE_URL`: URL do projeto institucional.
- `INSTITUTIONAL_SUPABASE_SECRET_KEY`: chave de servidor para o Storage institucional.
- `INSTITUTIONAL_SITE_URL`: URL pública canônica do site.
- `INSTITUTIONAL_BRIDGE_SECRET`: segredo compartilhado exclusivamente entre os servidores.

No projeto **site-autonomos**, configure os valores do `.env` desse projeto:

- `SITE_READONLY_DATABASE_URL`: conexão do papel `institutional_reader` pelo session pooler.
- `DATABASE_URL` e `DIRECT_URL`: as conexões de leitura, para ferramentas do projeto.
- `INSTITUTIONAL_APP_URL`: origem pública deste app, sem `/login`.
- `INSTITUTIONAL_BRIDGE_SECRET`: o mesmo segredo configurado no app.
- Preserve as variáveis SMTP e de notificação já utilizadas pelo formulário.
- Remova `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY` e `ENABLE_ADMIN_PANEL`.

Publique os dois projetos após configurar as variáveis. Não use o banco real em
Preview ou CI. A ponte usa HTTPS e HMAC com corpo, finalidade, horário e nonce;
segredos não são enviados ao navegador.

## Contato e publicação

O formulário público mantém a mesma interface. O servidor do site encaminha o
contato assinado para `/api/institutional/contact` neste app, que valida e salva a
mensagem no banco institucional. O site pode continuar notificando por SMTP.
A caixa privada fica em `/gestao/site/mensagens`; o antigo GET público de contatos
retorna 404. O site não grava mais mensagens diretamente no banco.

Após uma edição, o app solicita invalidação de cache ao endpoint assinado
`/api/institutional/revalidate` do site. Se a publicação não for confirmada, a tela
avisa que os dados foram salvos e podem aguardar o ciclo de atualização do site.
O endpoint não permite alterações de conteúdo nem aceita chamadas sem assinatura.

O painel antigo e suas ações de servidor foram removidos do site. A URL antiga
retorna 404 independentemente de flags de ambiente. Também foi removida a criação
automática de configurações durante a leitura de páginas públicas.

## Troca definitiva e credenciais antigas

O código novo exige a credencial de leitura no site. Para garantir que versões
antigas do site também percam capacidade de editar, após validar os novos deploys:

1. Crie uma nova chave secreta de Storage no Supabase, configure-a somente no app
   (local e Vercel) e publique. A chave antiga também existia em um script versionado
   do site; o script foi corrigido, mas o histórico do Git exige revogar essa chave.
2. Remova ou proteja implantações antigas acessíveis que contenham o admin anterior.
3. Troque a senha antiga de `postgres` do projeto institucional e revogue a chave
   secreta antiga. Atualize apenas ferramentas que ainda precisarem desses acessos;
   as conexões leitor/editor usam senhas próprias.

Mudar o `.env` local ou publicar código novo não revoga segredos guardados em
implantações anteriores. Não altere a senha do projeto Supabase do sistema interno.

## Provisionamento e testes

O script `scripts/institutional/provision.ts` recebe
`INSTITUTIONAL_OWNER_DATABASE_URL` apenas durante configuração. Ele cria os papéis,
aplica permissões/RLS e mantém suas senhas em arquivo privado ignorado pelo Git.
Não roda automaticamente no build e não altera o conteúdo institucional.

```sh
npm run db:generate
npm test
npm run typecheck
npm run build
# Apenas PostgreSQL local descartável:
TEST_DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/autonomos_test npm run test:database
```

Os testes institucionais criam um banco temporário separado, verificam CRUD,
restrição de leitura, privacidade das mensagens e cascatas, e removem os dados.
Nunca criam fixtures nos bancos reais.

O build do site mantém sua configuração anterior de ignorar erros de TypeScript.
A checagem global desse repositório ainda encontra problemas em exemplos, scripts
e componentes legados que não fazem parte desta migração. O app interno valida
os tipos normalmente; os builds dos dois projetos foram verificados.
