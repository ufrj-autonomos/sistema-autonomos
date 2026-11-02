# Sistema Autônomos

Plataforma de gestão e ensino da UFRJ Autônomos, com curso de ROS 2 Jazzy,
progresso individual, aprovação de contas por administradores e presença no laboratório.

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

Requisitos: Node.js 26, npm e PostgreSQL. Com nvm, use `nvm install` e `nvm use`.

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
`npm test` executa as suítes atuais de acesso, produção, indicadores de gestão e presença.

## Presença no laboratório

Meta de 2 horas semanais, entrada e saída pelo mesmo QR fixo e saldo individual na
home. Administradores acompanham semanas atuais/passadas, descumprimentos e ajustes
com auditoria em **Gestão → Presença no laboratório**. Nessa página também fica o
QR para impressão. O acompanhamento começa do zero, sem importar a planilha antiga.
Instruções e regras: [ATTENDANCE.md](ATTENDANCE.md).

## Conteúdo e acesso

O catálogo de ROS 2 Jazzy contém 11 módulos e 108 aulas, com 52 vídeos vinculados ao
YouTube na atualização de 1º de novembro de 2026. Os dados iniciais ficam em
`prisma/seed.ts`, e os textos traduzidos em `prisma/translated-lessons.json`.

Somente contas aprovadas podem entrar. A gestão é acessível a Gestão e Admin. Somente Admin altera cargos e situações; Gestão aceita ou recusa cadastros pendentes.
Rejeitar exclui a conta; suspender revoga suas sessões. O último administrador
aprovado não pode ser removido nem perder suas permissões.

Regras de acesso: [ACCESS_CONTROL.md](ACCESS_CONTROL.md).

## Área de gestão

A gestão tem layout próprio e sidebar compartilhada, com menu lateral no celular.
A visão geral destaca aprovações pendentes e presença semanal. Os sistemas ficam
em páginas independentes: `/gestao/contas`, `/gestao/integrantes`,
`/gestao/projetos`, `/gestao/presenca`, `/gestao/divisoes` e `/gestao/sistema`.
Contas aprovadas de Gestão e Admin podem acessar essas páginas.

Novos sistemas entram no catálogo `src/lib/management-navigation.ts`, utilizado
pela sidebar, pelos links da visão geral e pela localização no cabeçalho. Cada
página também mantém sua autorização no servidor. O botão **Área do membro**
retorna à navegação de início, ensino e presença individual.

## Site institucional

Integrantes e projetos têm seções próprias na gestão. Os cadastros atualizados do
site são a fonte dos dados compartilhados, inclusive para indicadores e divisões;
os dados genéricos internos não os substituem. CPF, observações internas e vínculos
com contas/presença ficam exclusivamente no banco do sistema, com acesso de Gestão
e Admin. Cada cadastro pode ser exibido ou ocultado no site.

Os demais conteúdos do admin do `site-autonomos` ficam em `/gestao/site`, com
conexão separada ao banco institucional. Configuração dos dois projetos,
variáveis da Vercel e ordem da troca: [INSTITUTIONAL_SITE.md](INSTITUTIONAL_SITE.md).
