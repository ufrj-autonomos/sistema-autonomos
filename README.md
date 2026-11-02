# Sistema Autônomos

Plataforma de gestão e ensino da UFRJ Autônomos, com curso de ROS 2 Jazzy,
progresso individual e aprovação de contas por administradores.

## Produção

Consulte [PRODUCTION.md](PRODUCTION.md) para configuração da Vercel, variáveis,
migrações, segurança, monitoramento e recuperação. O `.env` contém credenciais e
fica fora do Git; o push do código não envia essas variáveis para a hospedagem.

```sh
npm ci --include=dev
npm run check:production
npm run db:deploy
npm run build
npm start
```

O deploy não executa seed nem cria usuários de demonstração.

## Desenvolvimento

Requisitos: Node.js 22 ou 24, npm e PostgreSQL.

```sh
npm ci --include=dev
cp .env.example .env
```

Use um banco separado de produção. Preencha as conexões e as chaves, e crie
`.env.development.local` com `NEXT_PUBLIC_APP_URL=http://localhost:3000` para
navegar localmente com `npm run dev`. O comando `next dev` usa o modo de desenvolvimento.

Em um banco novo, aplique as migrações e carregue o conteúdo inicial:

```sh
npm run db:deploy
npm run db:seed
npm run dev
```

O seed de ensino carrega o curso; `db:seed` não cria contas por padrão.
Cadastre uma conta na plataforma e configure o primeiro administrador:

```sh
npm run db:bootstrap-admin -- seu-email@exemplo.com
```

O bootstrap funciona apenas se ainda não existir um administrador aprovado.
As novas contas são aprovadas em **Gestão → Contas e permissões**.

## Verificação

```sh
npm test
npm run typecheck
npm audit --omit=dev
npm run build
```

A CI também testa as migrações e operações de banco em PostgreSQL descartável.
Os testes antigos de milestones ficam disponíveis como referência histórica;
`npm test` executa as suítes atuais de acesso, produção e indicadores de gestão.

## Conteúdo e acesso

O catálogo de ROS 2 Jazzy contém 11 módulos e 108 aulas, com 52 vídeos vinculados ao
YouTube na atualização de 1º de novembro de 2026. Os dados iniciais ficam em
`prisma/seed.ts`, e os textos traduzidos em `prisma/translated-lessons.json`.

Somente contas aprovadas podem entrar. A gestão é exclusiva para administradores.
Rejeitar exclui a conta; suspender revoga suas sessões. O último administrador
aprovado não pode ser removido nem perder suas permissões.

Regras de acesso: [ACCESS_CONTROL.md](ACCESS_CONTROL.md).
