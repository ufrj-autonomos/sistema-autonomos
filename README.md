# Sistema Autônomos

Plataforma de gestão e ensino da UFRJ Autônomos, com curso de ROS 2 Jazzy,
progresso individual e aprovação de contas por administradores.

## Desenvolvimento

Requisitos: Node.js 22 ou superior, npm e PostgreSQL.

```sh
npm ci
cp .env.example .env
```

Preencha as conexões do PostgreSQL e defina `JWT_SECRET` com uma chave aleatória de
pelo menos 32 caracteres. Nunca envie o arquivo `.env` ao repositório.

Em um banco novo, crie as tabelas e carregue o conteúdo:

```sh
npm run db:push
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000`. Cadastre uma conta e configure o primeiro administrador:

```sh
npm run db:bootstrap-admin -- seu-email@exemplo.com
```

O comando de bootstrap funciona apenas se ainda não existir um administrador aprovado.
Novos cadastros precisam ser aprovados em **Gestão → Contas e permissões**.

Para um banco existente, siga [ACCESS_CONTROL.md](ACCESS_CONTROL.md) antes de aplicar
alterações de esquema. O seed de conteúdo não cria contas demonstrativas por padrão.

## Verificação e produção

```sh
npm run test:access
npx tsc --noEmit
npm run build
npm run start
```

O build usa as fontes do Google Fonts e precisa de acesso à rede. Se o ambiente
restringir os processos usados pelo Turbopack, use `npm run build -- --webpack`.

## Conteúdo e acesso

O catálogo de ROS 2 Jazzy contém 11 módulos e 108 aulas, com 52 vídeos vinculados ao
YouTube na atualização de 1º de novembro de 2026. Os dados iniciais ficam em
`prisma/seed.ts`, e os textos traduzidos em `prisma/translated-lessons.json`.

Somente contas aprovadas podem acessar a plataforma. A gestão é exclusiva para
administradores. Rejeitar uma conta a exclui do banco; suspender revoga suas sessões.
O último administrador aprovado não pode ser removido nem perder suas permissões.

Detalhes de configuração e regras de acesso: [ACCESS_CONTROL.md](ACCESS_CONTROL.md).
