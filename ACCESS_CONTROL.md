# Acesso à plataforma

Somente contas com situação `APPROVED` podem entrar. O início apresenta os cursos,
o progresso da própria pessoa e informações gerais das equipes. Somente `ADMIN`
aprovado acessa `/gestao`, `/api/gestao/*` e `/api/admin/*`.
Os perfis `STUDENT`, `MEMBER` e `INSTRUCTOR` acessam início e ensino.

## Administração

Em **Gestão → Contas e permissões**, use os filtros de nome/email e situação para:

- Aprovar novos cadastros ou usar **Rejeitar e excluir** para apagar a conta do banco e da lista.
- Suspender contas e reaprovar quando necessário.
- Alterar o perfil para aluno, membro, instrutor ou administrador.

Alterações de perfil valem na próxima requisição, mesmo com um cookie antigo.
Rejeitar exclui definitivamente a conta, suas sessões e seu progresso nos cursos;
o perfil de integrante, se houver, é preservado e desvinculado da conta. O email
fica disponível para um novo cadastro, que precisará de aprovação novamente.
Suspensão e retorno à situação pendente revogam todas as sessões da conta.
Reaprovar exige novo login. O último administrador aprovado não pode perder esse
perfil nem ter sua conta desativada. A verificação ocorre em transação serializável;
em caso de alteração concorrente, a API retorna conflito e solicita uma nova tentativa.

## Banco e configuração

Defina `JWT_SECRET` com pelo menos 32 caracteres aleatórios. Não existe chave
embutida nem uso alternativo da chave do Supabase para assinar sessões.

Para um banco existente, aplique a mudança aditiva e gere o cliente:

```sh
npm run db:access-control
npm run db:generate
```

O comando SQL é idempotente: na primeira execução cria a coluna `User.status`,
coloca os administradores existentes como aprovados e deixa os demais usuários
pendentes. Reexecutá-lo não reativa contas que tenham sido suspensas posteriormente.
Este projeto não tinha histórico de migrations: o comando explícito acima aplica
somente essa alteração no banco existente, sem recriar tabelas nem apagar dados.
Não execute `prisma migrate deploy` em um banco existente sem antes criar seu baseline.
Em um banco novo criado com `db:push`, todas as contas começam pendentes.

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
