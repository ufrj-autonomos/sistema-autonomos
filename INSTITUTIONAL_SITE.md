# Administração do site institucional

A administração original do `site-autonomos` foi transportada para **Gestão →
Site institucional** (`/gestao/site`). As tabelas, campos, editor Markdown,
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
