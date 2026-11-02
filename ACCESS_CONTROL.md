# Acesso à plataforma

Somente contas aprovadas podem entrar. Os perfis são **Trainee**, **Membro**,
**Gestão** e **Admin**. Novos cadastros começam como Trainee e aguardam aprovação.

| Perfil | Início, ensino e presença pessoal | Áreas de gestão | Contas e permissões |
| --- | --- | --- | --- |
| Trainee | Sim | Não | Sem acesso |
| Membro | Sim | Não | Sem acesso |
| Gestão | Sim | Sim, incluindo presença, site institucional e sistema | Consulta e aprovação/recusa de cadastros pendentes de Trainee/Membro |
| Admin | Sim | Sim | Controle completo de cargos e situações |

## Contas e permissões

Em **Gestão → Contas e permissões**, todos os perfis de gestão podem consultar a
lista. Gestão vê os botões **Aceitar** e **Negar e excluir** somente em cadastros
pendentes de Trainee ou Membro; após aceitar, a conta fica somente para consulta.
Gestão não pode enviar cargo no pedido, promover a si próprio ou outras contas,
suspender, reativar ou excluir contas já aprovadas. Contas pendentes com cargo de
Gestão/Admin só podem ser liberadas por Admin, para evitar promoção indireta.

Admin pode aprovar, recusar, alterar cargos, suspender e reaprovar contas. Somente
Admin pode conceder Gestão ou Admin. O último Admin aprovado não pode ser removido,
suspenso ou perder o cargo; Gestão não substitui esse Admin na proteção.

As mesmas regras são validadas nas APIs e na transação de alteração, mesmo com
requisições diretas ou um cookie com cargo antigo. Rejeitar exclui a conta, suas
sessões e seu progresso, preservando e desvinculando o perfil de integrante e o
histórico de presença. A linha some imediatamente e é restaurada se a exclusão
falhar. Suspender ou voltar à situação pendente revoga as sessões da conta.
Reaprovar exige novo login.

Os nomes dos cargos no Prisma são `TRAINEE`, `MEMBER`, `MANAGEMENT` e `ADMIN`.
`@map` mantém os valores históricos de armazenamento de Trainee/Gestão, sem
renomear tipos no PostgreSQL nem invalidar o código da implantação anterior.
Nenhuma conta existente é promovida nesta atualização; Gestão é atribuída por Admin.

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


## Proxy e autorização no servidor

O Proxy faz apenas a verificação inicial da assinatura/validade do cookie, sem
consultar Prisma. Ele não concede permissões nem usa o perfil do JWT para decidir
acesso administrativo. Cada página protegida deve chamar `requirePageUser()`
(`true` para gestão), cada Server Action deve repetir essa autorização e cada API
deve usar `authorizeApi()` ou o validador de sessão equivalente antes de consultar
ou alterar dados. Essas verificações leem a sessão, aprovação e perfil atuais no
banco; cookies revogados e perfis antigos não dão acesso. A indisponibilidade do
banco bloqueia a operação, sem liberar acesso por informações do token.
