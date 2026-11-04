# Justificativas e recursos de presença

O membro solicita em `/presenca`, pelo botão **Justificar falta / recorrer**. O formulário pede a semana, um motivo e detalhes (10 a 3.000 caracteres). Motivos incluem saúde, questões pessoais, compromisso acadêmico, transporte, evento fora do laboratório, problema no registro e outro motivo.

A semana deve começar na segunda-feira, ser atual ou passada e pertencer ao período de acompanhamento do próprio membro. A autoria vem da sessão aprovada; o cliente não pode escolher outra pessoa nem atribuir aprovação. Existe no máximo um pedido pendente ou aprovado por membro/semana. Depois de uma negativa, um novo recurso pode ser enviado preservando o pedido anterior.

Em `/gestao/presenca`, Gestão e Admin recebem uma fila de todas as semanas, com filtros, paginação, histórico e confirmação da decisão. É possível adicionar uma resposta ao membro. Outra pessoa deve analisar pedidos do próprio gestor; autoaprovação é bloqueada também no servidor. Solicitações já analisadas não podem receber uma segunda decisão.

A aprovação garante o mínimo de **7.200 segundos (2 horas)** na semana de referência. As horas físicas não são somadas novamente: 1 hora registrada passa a contar como 2 horas, e 3 horas registradas continuam sendo 3 horas. A negativa não altera as horas. O crédito fica na justificativa e não cria visita nem batida de QR fictícias. Relatórios, histórico de semanas abaixo da meta, visão geral, dashboard e diretório de integrantes usam o mesmo cálculo. O relatório de presença e o CSV distinguem a parcela creditada por justificativa.

Os pedidos e as respostas permanecem no banco privado do sistema, com RLS e sem acesso direto por papéis públicos. Os logs resumidos registram o envio e a decisão, sem incluir motivo, detalhes médicos ou texto da resposta.

Verificação: `npm run test:justifications` cobre entradas, crédito semanal e análises; `npm run test:database`, em PostgreSQL local descartável, cobre autoria, permissões, concorrência, recurso, aprovação/negativa, relatórios, privacidade e RLS. Nunca execute testes de fixtures em produção.
