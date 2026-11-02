# Produção

URL inicial: `https://sistema-autonomos-gamma.vercel.app`.

O endereço configurado é a origem, sem `/login`. Para trocar de domínio, configure
`NEXT_PUBLIC_APP_URL` no novo ambiente e faça um novo deploy. O domínio e o
certificado HTTPS devem estar ativos na hospedagem antes da troca.

## Variáveis na Vercel

O `.env` local está fora do Git. Ele não é enviado à Vercel pelo push do código.
Em **Project → Settings → Environment Variables**, configure as variáveis abaixo
para **Production** com os valores do `.env` local:

- `DATABASE_URL`: conexão PostgreSQL usada pela aplicação, com TLS.
- `DIRECT_URL`: conexão direta para migrações, com TLS.
- `JWT_SECRET`: chave de sessão aleatória de pelo menos 32 caracteres.
- `CRON_SECRET`: outra chave aleatória de pelo menos 32 caracteres.
- `NEXT_PUBLIC_APP_URL`: `https://sistema-autonomos-gamma.vercel.app`.
- `NODE_ENV`: `production`.
- `TRUST_PROXY_HEADERS`: `false`.
- `SEED_DEMO_USERS`: `false`.

Para funções serverless, use o pooler do Supabase se disponível no projeto e
mantenha a conexão direta apenas em `DIRECT_URL`. O `.env` limita o Prisma a uma
conexão por instância e define tempos máximos de conexão e espera.

Marque os valores privados como sensíveis. Não copie segredos para campos
`NEXT_PUBLIC_*`, comentários, logs de build ou arquivos do repositório.
A nova chave JWT exige que as pessoas entrem novamente.

Para Preview, use outro banco e outras chaves. Nunca use o banco real de
produção em testes de pull requests. O endereço `VERCEL_URL`, fornecido pela
própria hospedagem, é aceito como origem da respectiva implantação.

## Build e banco

A Vercel usa `vercel.json`: instalação com dependências de build, validação das
variáveis, `prisma migrate deploy` apenas em Production e build com Webpack.
Se a validação ou a migração falhar, o build para antes de publicar a nova versão.
O seed não roda no deploy.

As migrações versionadas recriam um banco novo. No banco já existente, o esquema
original foi conferido e registrado como baseline, sem recriar tabelas ou perder
dados. Depois disso, foram aplicadas a limitação de autenticação e a proteção RLS.
Não execute `db:push` ou `migrate dev` contra produção.

O servidor usa uma conexão PostgreSQL privada via Prisma. As tabelas possuem RLS
e não concedem permissões a `anon`, `authenticated` ou `PUBLIC`. A aplicação não
usa a API pública do Supabase para acessar essas tabelas. O papel privado de banco
deve ser o proprietário das tabelas ou ter uma política própria de acesso;
a conexão usada neste projeto é do papel servidor `postgres`.

## Proteções de autenticação

- Login: 10 tentativas por conta a cada 15 minutos e 50 por endereço no mesmo período.
- Cadastro: 30 solicitações por endereço por hora.
- Os contadores ficam no PostgreSQL e funcionam entre instâncias da Vercel.
- Identificadores de contas e endereços ficam como hashes com chave.
- Limites excedidos retornam HTTP 429 com `Retry-After`.
- Cabeçalhos de endereço só são confiáveis na Vercel ou num proxy explicitamente autorizado.
- Corpos de requisição de autenticação têm limite de 4 KiB.
- Contas de demonstração que usavam as senhas conhecidas foram suspensas,
  tiveram as senhas substituídas e suas sessões revogadas. O administrador real foi preservado.

## Verificação operacional

`GET /api/health` verifica a conexão e a tabela de autenticação e responde
`200 {"status":"ok"}` ou `503 {"status":"unavailable"}`, sem expor credenciais.
Use essa URL no monitor externo escolhido e configure alertas para falhas.
Um retorno 200 é uma verificação pontual, não uma medida histórica de uptime.

A manutenção diária configurada em `vercel.json` apaga apenas sessões e contadores
expirados. A Vercel envia `Authorization: Bearer <CRON_SECRET>`; sem a chave correta,
a rota `/api/cron/maintenance` retorna 401.

O painel de gestão mostra somente dados consultados no banco e avisa quando a
consulta falha. Não simula SLA, telemetria ou disponibilidade dos robôs.

## Backups e recuperação

Antes da abertura ao público, confirme no projeto Supabase a retenção de backups
disponível no plano e teste uma restauração em um banco separado. Essas configurações
são da hospedagem e não são alteradas por este repositório. Não há confirmação de
backup/PITR sem acesso administrativo ao projeto Supabase.

Guarde cópias externas cifradas e credenciais de recuperação com acesso restrito.
Não envie dumps de produção ao Git, a artefatos públicos de CI nem a testes locais.

## Testes e atualização

```sh
npm ci --include=dev
npm run check:production
npm test
npm run typecheck
npm audit --omit=dev
npm run build
```

A CI executa as migrações do zero em um PostgreSQL descartável, os testes, o audit
e o build. Os testes de banco exigem `TEST_DATABASE_URL` apontando para um banco
local e descartável; eles recusam o endereço de produção.

```sh
TEST_DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/autonomos_test npm run test:database
```

Atualizações do Prisma permanecem na série 6. A versão corrigida `deepmerge-ts@8.0.0`
é fixada apenas na dependência `@prisma/config`; geração do cliente, migrações,
testes e build devem continuar passando quando esse override for alterado.
