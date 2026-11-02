# Acesso à plataforma

Somente contas com situação `APPROVED` podem entrar. O início apresenta os cursos
e o progresso da própria pessoa. Somente `ADMIN`
aprovado acessa `/gestao`, suas subseções, `/api/gestao/*` e `/api/admin/*`.
Os perfis `STUDENT`, `MEMBER` e `INSTRUCTOR` acessam início, ensino e presença individual.

## Administração

A gestão tem navegação própria em sidebar, menu lateral no celular e páginas por
sistema. Em **Gestão → Contas e permissões** (`/gestao/contas`), use os filtros de
nome/email e situação para:

- Nas contas pendentes, usar **Aceitar** (verde) ou **Negar e excluir** (vermelho).
- Após aceitar, alterar perfil e situação pelos controles exibidos na conta.
- Suspender contas e reaprovar quando necessário.
- Alterar o perfil para aluno, membro, instrutor ou administrador.

Alterações de perfil valem na próxima requisição, mesmo com um cookie antigo.
Rejeitar exclui definitivamente a conta, suas sessões e seu progresso nos cursos.
Ela sai da lista assim que a ação é iniciada. Se a exclusão falhar, a conta é
restaurada na lista e o erro é exibido. Contas rejeitadas anteriormente não aparecem.
O perfil de integrante, se houver, é preservado e desvinculado da conta. O email
fica disponível para um novo cadastro, que precisará de aprovação novamente.
Suspensão e retorno à situação pendente revogam todas as sessões da conta.
Reaprovar exige novo login. O último administrador aprovado não pode perder esse
perfil nem ter sua conta desativada. A verificação ocorre em transação serializável;
em caso de alteração concorrente, a API retorna conflito e solicita uma nova tentativa.

## Banco e configuração

Defina `JWT_SECRET` com pelo menos 32 caracteres aleatórios. Não existe chave
embutida nem uso alternativo da chave do Supabase para assinar sessões.

As migrações estão versionadas, incluindo o esquema inicial. No banco já existente,
o baseline foi conferido e registrado, e as migrações de produção foram aplicadas.
Para novos bancos e atualizações, use `npm run db:deploy`. Não use `db:push` nem
`migrate dev` em produção. Para outro banco existente sem histórico, confira o
esquema antes de registrar o baseline; não aplique o esquema inicial sobre tabelas já criadas.

Configuração de produção, Vercel e proteção de banco: [PRODUCTION.md](PRODUCTION.md).

Caso não exista administrador aprovado, crie a conta pela tela de cadastro e execute,
com acesso operacional ao servidor e ao banco:

```sh
npm run db:bootstrap-admin -- seu-email@exemplo.com
```

Esse comando só funciona se ainda não houver administrador aprovado. Depois disso,
todas as alterações de contas devem passar pelo painel. Não há endpoint público de
promoção nem promoção automática do primeiro cadastro.

Os cookies antigos, emitidos antes desta mudança, não têm sessão persistida e exigem
novo login. O logout revoga a sessão no banco, além de apagar o cookie.

O seed de conteúdo não cria nem altera contas por padrão. As antigas contas de teste
só são criadas explicitamente com `SEED_DEMO_USERS=true`, fora de produção. Elas usam
senhas demonstrativas: não habilite essa opção em um ambiente compartilhado real.

## Validação

```sh
npm run test:access
npx tsc --noEmit
npm run build
```

A suíte de acesso usa um banco simulado em memória: verifica os handlers reais, os
JWTs assinados, a camada de proteção de rotas e as regras de aprovação e administração
sem criar ou alterar contas no banco configurado. Ela não substitui um teste de carga
com transações concorrentes em PostgreSQL.
