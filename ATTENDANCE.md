# Presença no laboratório

O controle começa do zero na implantação desta funcionalidade. A planilha antiga
não é alterada e seu histórico não é importado.

## Usar e imprimir

1. Entre com uma conta ADMIN e abra **Gestão → Presença no laboratório**.
2. Clique em **QR code do laboratório → Imprimir QR code**.
3. Coloque o impresso dentro do laboratório.
4. Cada membro lê esse mesmo QR pela câmera do celular ao entrar e ao sair.
   Se precisar fazer login, o sistema retorna à leitura após a autenticação.
5. Aguarde a confirmação **Entrada registrada** ou **Saída registrada**.

O QR é fixo e funciona com contas aprovadas e acompanhamento ativo. O horário e a
identidade vêm do servidor, não do formulário nem do relógio do celular. Leituras
repetidas em menos de 60 segundos retornam a confirmação anterior; atualizar a
página também não deve alternar entrada e saída. Se esquecer a saída, peça ajuste
à gestão. O QR fixo pode ser fotografado/compartilhado: ele não comprova localização
física. Mantenha-o dentro do laboratório e confira registros suspeitos na gestão.

Ao trocar de domínio, atualize `NEXT_PUBLIC_APP_URL`, publique a aplicação e imprima
novamente o QR. Não é necessária uma nova variável de ambiente para presença.

## Meta e acompanhamento

- Meta: 2 horas por semana, de segunda-feira 00h até a segunda seguinte 00h,
  no fuso `America/Sao_Paulo` (horário de Brasília).
- Somente visitas encerradas e validadas contam. Entrada em aberto não gera horas.
- Visitas que atravessam domingo/segunda têm as horas divididas entre as semanas.
- A meta usa segundos exatos, sem arredondar uma duração incompleta para 2 horas.
- A semana atual incompleta fica **Em andamento**. Só depois do encerramento ela
  pode contar como **Abaixo da meta**.
- O histórico de descumprimento conta semanas encerradas até a semana selecionada,
  dentro dos períodos ativos de acompanhamento. Semanas anteriores à adesão não
  geram faltas.
- Na implantação, contas aprovadas com perfil de membro ativo são acompanhadas a
  partir da semana da implantação. Contas aprovadas sem perfil recebem um perfil
  interno básico. Novas aprovações iniciam o acompanhamento naquela semana.
- Suspender ou excluir uma conta encerra seu período na semana atual. Reaprovar
  abre o período novamente, sem cobrar semanas de suspensão. Excluir a conta
  preserva o perfil e o histórico de presença, desvinculando o login.

Na home, o membro vê o saldo semanal e o link **Minha presença** (`/presenca`),
com suas entradas e saídas e consulta de semanas passadas. Cada pessoa só acessa
seus próprios dados. A home e os painéis atualizam a consulta a cada minuto e ao
voltar o foco à janela.

## Gestão e revisão

`/gestao/presenca` é exclusivo de ADMIN e oferece:

- Consulta por semana, busca por membro/email e filtros de área e situação.
- Horas validadas, restante, cumprimento da meta e número de semanas abaixo dela.
- Entradas em aberto, quantidade de registros para revisão e exportação CSV.
- Detalhes das visitas de cada membro e histórico das alterações administrativas.

Uma saída após mais de 12 horas deixa a visita **Para revisão**, sem creditar as
horas automaticamente. Entradas ainda abertas acima de 12 horas também são
sinalizadas. A gestão pode inserir presença esquecida, corrigir/validar horários,
desconsiderar registros e restaurá-los. Todo ajuste exige justificativa de pelo
menos 10 caracteres e guarda administrador, horário e valores anteriores/novos.
Horários digitados pela gestão são interpretados em Brasília. Ajustes não aceitam
horário futuro, saída anterior à entrada, duração acima de 24 horas ou sobreposição
com outra visita não desconsiderada. Resolva registros conflitantes antes de criar
outro no mesmo intervalo.

As visitas não são apagadas ao desconsiderar: ficam no histórico sem somar horas.
Os totais são recalculados após ajustes, inclusive o histórico de descumprimento.
O CSV exporta todos os membros da semana selecionada; filtros visuais não limitam
esse arquivo.

## Implementação e verificação

As cinco tabelas `Attendance*` têm RLS e não permitem acesso pela API pública do
Supabase. As rotas validam sessão e papel no servidor. A leitura usa transação com
bloqueio por membro, chave de idempotência e índice único para impedir duas visitas
abertas. A rota de registro limita 20 solicitações por minuto por conta e exige
origem autorizada. Não há marcação por simples GET nem por pré-carregamento de link.

```sh
npm test
npm run typecheck
# Somente em PostgreSQL local descartável, já migrado:
TEST_DATABASE_URL=postgresql://postgres:SENHA@localhost:5432/autonomos_test npm run test:database
npm run build
```

A CI valida migrações do zero, privacidade, permissões, leituras simultâneas,
idempotência, entrada/saída, revisão, correção com auditoria, suspensão e exclusão.
