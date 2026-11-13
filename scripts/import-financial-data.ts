import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient, FinancialEntryType, FinancialEntryStatus } from '@prisma/client';

loadEnvConfig(process.cwd());

const prisma = new PrismaClient();

interface AttachmentSeed {
  name: string;
  driveFileId: string;
  kind?: 'RECEIPT' | 'PAYMENT_PROOF' | 'STATEMENT';
}

interface EntrySeed {
  code: string;
  type: FinancialEntryType;
  isReimbursement: boolean;
  title: string;
  description?: string;
  category: string;
  fundSource: string;
  team: string;
  amountCents: number;
  occurredAt: string | null;
  status: FinancialEntryStatus;
  requesterName: string;
  driveFolderId?: string;
  attachments?: AttachmentSeed[];
}

const ENTRIES: EntrySeed[] = [
  // =========================================================================
  // 12 ENTRADAS
  // =========================================================================
  {
    code: 'ENT-001',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Saldo na conta da Nautilus da Nubia',
    description: '150 do Thiago e 150 do Bacci (resto verificar antiga planilha)',
    category: 'Administrativo',
    fundSource: 'Dinheiro Livre',
    team: 'Nautilus',
    amountCents: 30532,
    occurredAt: '2026-05-09',
    status: 'PAGO',
    requesterName: 'Conta antiga Nautilus',
    driveFolderId: '1eHisJvpYjb4829m8v4NQxBQszn4PBM8Z',
    attachments: [
      { name: 'PHOTO-2026-05-09-10-26-58.jpg', driveFileId: '1DdnLNIdBpUaDdIZvl97C2hXjszb1qdks', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-002',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Contribuição pessoal para Eletroquad26',
    description: 'Já tinha pagado uma parcela de 150 quando a conta da Nautilus estava com a Nubia',
    category: 'Inscrições',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 192500,
    occurredAt: '2026-05-11',
    status: 'PAGO',
    requesterName: 'Arthur Bacci',
    driveFolderId: '1Q7bM_uKvYaN76u2wIjv6aqQH06U78Ok3',
    attachments: [
      { name: 'PHOTO-2026-05-12-13-26-01.jpg', driveFileId: '1mW-DJgItnV-zjP8AiY2_mQgEpsyH_XXY', kind: 'RECEIPT' },
      { name: 'PHOTO-2026-05-12-13-27-56.jpg', driveFileId: '1ceJGFbe1e7klEXIYPCFavJXu9OsDG6JF', kind: 'RECEIPT' },
      { name: 'PHOTO-2026-05-12-13-28-58.jpg', driveFileId: '1Tg6waWK72EDZwNR7GQl2sIa4N2RO2dw9', kind: 'RECEIPT' },
      { name: 'PHOTO-2026-05-12-14-07-44.jpg', driveFileId: '1g-YNqJWMCfQHttcZxH5P1ChAb0VtKzeF', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-003',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Contribuição pessoal para Eletroquad26',
    category: 'Inscrições',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 200000,
    occurredAt: '2026-05-11',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1cYv1GzixPibOoIvWkMefev-8Zx8tS9iN',
    attachments: [
      { name: 'WhatsApp Image 2026-05-11 at 23.40.05.jpeg', driveFileId: '1Wr4LPs-EaeeA6Fb10eK8jmgbBqeX19UQ', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-004',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Contribuição pessoal para Eletroquad26',
    description: 'Já tinha pagado uma parcela de 150 quando a conta da Nautilus estava com a Nubia',
    category: 'Inscrições',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 25000,
    occurredAt: '2026-05-12',
    status: 'PAGO',
    requesterName: 'Thiago Oliveira',
    driveFolderId: '1qQCQAZQZfw4bkuPjLnFJcVNo6y9XiQA0',
    attachments: [
      { name: 'PHOTO-2026-05-22-09-13-51.jpg', driveFileId: '1CArjx85X-_bo9syCGl2E5m8Gzn7FdmtZ', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-005',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Contribuição pessoal para Eletroquad26',
    category: 'Inscrições',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 40000,
    occurredAt: '2026-05-13',
    status: 'PAGO',
    requesterName: 'Derek Werneck',
    driveFolderId: '1xJoXbMVPGSji8P_7WZ5e_eRZiW_axUCV',
    attachments: [
      { name: 'comprovante_picpay_PIX_13052026073842.pdf', driveFileId: '1M3ChM7t_1Od189MuvWkkOpdNFQY2uT8h', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-006',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Contribuição pessoal para Eletroquad26',
    category: 'Inscrições',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 20000,
    occurredAt: '2026-05-13',
    status: 'PAGO',
    requesterName: 'Pedro Barros',
    driveFolderId: '1P6A4Cyeq_D3pJv0mJlTBYpZd3csU9ICC',
    attachments: [
      { name: 'PHOTO-2026-05-13-08-14-01.jpg', driveFileId: '1kdUbQBjoT5518Zkfu1kOg2Nfblhw89Et', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-007',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Contribuição pessoal para Eletroquad26',
    category: 'Inscrições',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 40000,
    occurredAt: '2026-05-21',
    status: 'PAGO',
    requesterName: 'Gabriel Gaspar',
    driveFolderId: '1-wg-RRvKkJR8A59EXKfIzEbf0kIhEG4C',
    attachments: [
      { name: 'PHOTO-2026-05-22-11-01-20.jpg', driveFileId: '1e5b7D0SV_90oQrdwDk9S-1nBb3hPTEFF', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-008',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Rendimentos da conta',
    description: 'Rendimentos da conta corrente no Itau',
    category: 'Administrativo',
    fundSource: 'Dinheiro Livre',
    team: 'Geral',
    amountCents: 182,
    occurredAt: '2026-05-22',
    status: 'PAGO',
    requesterName: 'Banco Itau',
    attachments: [
      { name: 'itau_extrato_012026.pdf', driveFileId: '1eXDQoEPUYv6Jzq5d_qJjo4Hd78_ls0vO', kind: 'STATEMENT' },
    ],
  },
  {
    code: 'ENT-009',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Contribuição pessoal para Eletroquad26',
    category: 'Inscrições',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 20000,
    occurredAt: '2026-06-04',
    status: 'PAGO',
    requesterName: 'Pedro Barros',
    driveFolderId: '1KRDH1HOUjM8Ll1rJohu-Ifv9tZd1-iuU',
    attachments: [
      { name: 'PHOTO-2026-06-04-17-49-03.jpg', driveFileId: '12DZ0VWTVrtkuzeS8nX6Y_LoYudFV7XZs', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'ENT-010',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Edital coppetec',
    description: 'Recebido de 3 dos 4 membros parcelas de 1250 (falta Juliana)',
    category: 'Administrativo',
    fundSource: 'Dinheiro Livre',
    team: 'Geral',
    amountCents: 375000,
    occurredAt: '2026-06-18',
    status: 'PAGO',
    requesterName: 'Coppetec',
  },
  {
    code: 'ENT-011',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Venda de brinde na SBPC',
    category: 'Marketing',
    fundSource: 'Dinheiro Livre',
    team: 'Geral',
    amountCents: 200,
    occurredAt: '2026-07-31',
    status: 'PAGO',
    requesterName: 'Priscila',
  },
  {
    code: 'ENT-012',
    type: 'ENTRADA',
    isReimbursement: false,
    title: 'Conta Coppetec do Miceli',
    category: 'Administrativo',
    fundSource: 'Conta Coppetec',
    team: 'Geral',
    amountCents: 300000,
    occurredAt: null,
    status: 'PENDENTE',
    requesterName: 'Coppetec - Miceli',
  },

  // =========================================================================
  // 18 SAÍDAS / REEMBOLSOS
  // =========================================================================
  {
    code: 'RMB-001',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Aluguel de casa por 5 dias para Eletroquad 2026',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 206606,
    occurredAt: '2026-05-12',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1bKKuJ0EmFb01xLcLpE7o8w3-xiYNey6m',
    attachments: [
      { name: 'WhatsApp Image 2026-05-12 at 01.12.24.jpeg', driveFileId: '1McVy3JJlVkkku8_NVQIS5T1kDlKIDQkd', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-002',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Passagem de ônibus ida SJC Eletroquad26',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 18535,
    occurredAt: '2026-05-12',
    status: 'PAGO',
    requesterName: 'Arthur Bacci',
    driveFolderId: '14nsrEkH0DFbfc32v3ixccVPX_PWX8WOt',
    attachments: [
      { name: 'idaArthutBacci.pdf', driveFileId: '1DCSaG6GyCLfo-C7UII89etZBU_C6vRLE', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-003',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Passagem de ônibus volta SJC Eletroquad26',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 16379,
    occurredAt: '2026-05-12',
    status: 'PAGO',
    requesterName: 'Gabriel Gaspar',
    driveFolderId: '1AojmyfYufpxuOfpOGzID6N5F7_8kBkJt',
    attachments: [
      { name: 'voltaGabrielGaspar.pdf', driveFileId: '16UIvY9MTWriJeEO6IEXazbPMh6b6RHYy', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-004',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Corte de tubo de fibra de carbono',
    description: 'Foi preciso ser feito um corte nos braços de fibra de carbono do drone para se adequar as restrições da Eletroquad 2026',
    category: 'Mecânica',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 4000,
    occurredAt: '2026-05-15',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1VZMOT8hpqcuBoY7GliUpEtwfq5pN0bCd',
    attachments: [
      { name: 'IMG_3670.JPG', driveFileId: '1OGWO5lsm0L8aLTgIzXoOWDoS2qUiW76R', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-005',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Mercado Eletroqaud26',
    description: 'Comidas e bebidas para membros da equipe durante a viagem',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 69081,
    occurredAt: '2026-05-17',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1JPwOzBoh2ttq96GQ9tiq3ZPbYveGUcqJ',
    attachments: [
      { name: 'IMG_3667.JPG', driveFileId: '1OywHt37EkJwdX4vyOs9gzklZozBr_jrJ', kind: 'RECEIPT' },
      { name: 'IMG_3668.JPG', driveFileId: '1_1dll2aGFKV4Aqofi_lHl3vi8y8z1ihk', kind: 'RECEIPT' },
      { name: 'IMG_3669.JPG', driveFileId: '1dKniXzUSYMLAgiEOgqrGhVC6KaBg9BGA', kind: 'RECEIPT' },
      { name: 'IMG_3675.JPG', driveFileId: '14wAN7l6Kq1r3lPvJWwIoiHl5NpoGHqLu', kind: 'RECEIPT' },
      { name: 'IMG_3679.JPG', driveFileId: '188L8lIlVbG_PiO34ml9lSlmxx-tgwmmb', kind: 'RECEIPT' },
      { name: 'IMG_3680.PNG', driveFileId: '11DhccAjpwLmL9IWkGyEisBQNAYlTWH0d', kind: 'RECEIPT' },
      { name: 'IMG_3681.PNG', driveFileId: '1nRwPHIJ4u8VnRVCXQpio8A2lOWYlIOqr', kind: 'RECEIPT' },
      { name: 'IMG_3688.JPG', driveFileId: '1P61D7VyeDhJ7WEITUnms05uwloX6NUC7', kind: 'RECEIPT' },
      { name: 'IMG_3666.HEIC', driveFileId: '1ZbqunoAJfQ7VbN4wld5UK2ktcGq52d9J', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-006',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Pedágios Eletroquad26',
    description: 'Pedágios pagos na trajeto RJ - SJC feito pelos membros',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 8820,
    occurredAt: '2026-05-17',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1PWmqzEiP_JYxsQqPAZP5POKDszhH68i2',
    attachments: [
      { name: 'IMG_3671.JPG', driveFileId: '1xadCgYzyvXiLOZnUMltzPCEay77_3LBW', kind: 'RECEIPT' },
      { name: 'IMG_3672.JPG', driveFileId: '1ANyvaKoqso2xdzEumbc2yfzuOHLG4l6M', kind: 'RECEIPT' },
      { name: 'IMG_3673.JPG', driveFileId: '1dIth6vNctCAokG1EjE8uKL55v53W9Rk2', kind: 'RECEIPT' },
      { name: 'IMG_3674.JPG', driveFileId: '1f6uGvs4lrI5nxpmATPvcgpXusgQsEtFA', kind: 'RECEIPT' },
      { name: 'IMG_3683.PNG', driveFileId: '1PW2WyKrvnazqttoUFATUCJun3BNx7ohp', kind: 'RECEIPT' },
      { name: 'IMG_3685.PNG', driveFileId: '1UvSqGdpN0lS0q4---GYgxC5RMxrCJxQK', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-007',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Gasolina Eletroquad26',
    description: 'Gasolina gasto na viagem por carro de um membro (Henrique Fragoso)',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 50335,
    occurredAt: '2026-05-17',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1GCWAhXlxX_kBLv4bjUvPfvaF_R4MeJEm',
    attachments: [
      { name: 'IMG_3676.JPG', driveFileId: '1x0Hw87hHFEkuE20xq-5FMluiBu2buzjN', kind: 'RECEIPT' },
      { name: 'IMG_3677.JPG', driveFileId: '1fDQzsvEOb1sJz31su356XfrgBH0Acbxv', kind: 'RECEIPT' },
      { name: 'IMG_3678.JPG', driveFileId: '1exghNPhfvrqy9p1lvRGJr9XyeIrJu0vI', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-008',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Compra de chave longa de 3 posições pra rádio',
    category: 'Eletrônica',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 3100,
    occurredAt: '2026-07-14',
    status: 'AGUARDANDO_REEMBOLSO',
    requesterName: 'Arthur Bacci',
    driveFolderId: '16NW6xWTjv259I-y8ps5jjjZwE45rqJEM',
    attachments: [
      { name: 'Compra de chave longa de 3 posições pra rádio.pdf', driveFileId: '14_6sgxd1NVs4RYUxjZsupL7a29BpJJyN', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-009',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Reembolso Arthur Bacci da entrada do dia 11/05',
    description: '1925 descontado em 250 pq ja tinha pago sido pago 150 de 400',
    category: 'Administrativo',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 167500,
    occurredAt: '2026-07-21',
    status: 'PAGO',
    requesterName: 'Arthur Bacci',
    driveFolderId: '1omHtxTol7toKki3kBc_M-FTX_t9kPqjK',
    attachments: [
      { name: 'WhatsApp Image 2026-10-29 at 21.44.26.jpeg', driveFileId: '1X1VpQcTc69ZbvJElrKJWZyboJBJdpcMp', kind: 'PAYMENT_PROOF' },
    ],
  },
  {
    code: 'RMB-010',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Reembolso Henrique Fragoso da entrada do dia 11/05',
    description: '2000 descontado em 400 pq todos que foram pra competicao contribuiram com isso',
    category: 'Administrativo',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 160000,
    occurredAt: null,
    status: 'AGUARDANDO_REEMBOLSO',
    requesterName: 'Henrique Fragoso',
  },
  {
    code: 'RMB-011',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Reembolso do ônibus ida SJC Eletroquad26',
    description: 'Membro comprou a passagem com sua conta pessoal (aguardando informar valor/comprovante)',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 0,
    occurredAt: null,
    status: 'AGUARDANDO_REEMBOLSO',
    requesterName: 'Gabriel Gaspar',
  },
  {
    code: 'RMB-012',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Reembolso lavagem de carro',
    description: 'Carro de membro usado para transporte na Eletroquad26 ficou sujo de terra no interior por conta do terreno do local',
    category: 'Logística',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 10000,
    occurredAt: null,
    status: 'AGUARDANDO_REEMBOLSO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1vN_m1Ya_6RlLgVSwbnHyZWRpGu2QiO9f',
    attachments: [
      { name: 'IMG_4009.HEIC', driveFileId: '1dz67WxTGbtLJkfADIgmVIwPMDiUYTK7k', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-013',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Reembolso compra de UBEC',
    description: 'Foram comprados 2 UBECs pois o primeiro queimou e o segundo foi usado no drone',
    category: 'Eletrônica',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 50000,
    occurredAt: null,
    status: 'AGUARDANDO_REEMBOLSO',
    requesterName: 'Henrique Fragoso',
  },
  {
    code: 'RMB-014',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Componentes de eletrônica',
    description: 'Conectores XT-30 e alguns componentes para placas da equipe',
    category: 'Eletrônica',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 5500,
    occurredAt: null,
    status: 'AGUARDANDO_REEMBOLSO',
    requesterName: 'Henrique Fragoso',
  },
  {
    code: 'RMB-015',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Compra de dominio do site (ufrjautonomos.com)',
    category: 'Marketing',
    fundSource: 'Dinheiro Livre',
    team: 'Geral',
    amountCents: 5870,
    occurredAt: '2026-08-05',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1z69uGUDpJair4YvPJugs6Lk3eQ4dr7uu',
    attachments: [
      { name: '5f505bf9-02c6-5d98-a043-72c6b98688d1.pdf', driveFileId: '1lvVQT_T0MjoLDsTV3xXU4NDnIkmNCQQS', kind: 'RECEIPT' },
      { name: 'IMG_4008.jpg', driveFileId: '1jM21uO34TlFJqEE2GKZy6Sk5-rm9Hxcr', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-016',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Compra da câmera de segurança',
    category: 'Administrativo',
    fundSource: 'Dinheiro Livre',
    team: 'Geral',
    amountCents: 18990,
    occurredAt: '2026-09-10',
    status: 'PAGO',
    requesterName: 'Gabriel Gaspar',
    driveFolderId: '1BsO9iHUgJCKjLgqwPbcHb7JniBDXkC0G',
    attachments: [
      { name: 'WhatsApp Image 2026-10-07 at 01.04.15.jpeg', driveFileId: '1LPkLbxHcB-DNtv3YUzoI7bYQG64-2B2N', kind: 'RECEIPT' },
      { name: 'WhatsApp Image 2026-10-07 at 01.07.27.jpeg', driveFileId: '1OUVnkSmbckU4qq_0SoT_Lk-vYJRO0OTw', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-017',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Compra de fita dupla face',
    category: 'Manutenção',
    fundSource: 'Dinheiro Livre',
    team: 'Geral',
    amountCents: 3990,
    occurredAt: '2026-09-16',
    status: 'PAGO',
    requesterName: 'Gabriel Gaspar',
    driveFolderId: '1ByI0nNs2SqtVTtSQHCSZdRUsQQHdDeGs',
    attachments: [
      { name: 'WhatsApp Image 2026-10-07 at 01.10.17.jpeg', driveFileId: '1z03QT84B9c1FBpVwePnh__KuwHhf9bIT', kind: 'RECEIPT' },
    ],
  },
  {
    code: 'RMB-018',
    type: 'SAIDA',
    isReimbursement: true,
    title: 'Compra de Mini PC Raspberry Pi 5 8gb',
    category: 'Eletrônica',
    fundSource: 'Dinheiro Livre',
    team: 'Harpia',
    amountCents: 129990,
    occurredAt: '2026-10-30',
    status: 'PAGO',
    requesterName: 'Henrique Fragoso',
    driveFolderId: '1zvxYT5ISFiNhc_Sibt6oFZErCi643SDZ',
    attachments: [
      { name: 'Compra de Mini PC.1.jpeg', driveFileId: '1-Hoe_ZIIs6iwogvDx4pU4mMivhSosFaw', kind: 'RECEIPT' },
      { name: 'Compra de Mini PC.2.jpeg', driveFileId: '1uy9cmTPJp1jToh92feUSuRPIrtPsGA14', kind: 'RECEIPT' },
    ],
  },
];

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function guessMimeType(filename: string, headerMime?: string | null): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (headerMime && !headerMime.includes('text/html')) return headerMime.split(';')[0].trim();
  return 'application/octet-stream';
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function downloadDriveAndUploadSupabase(
  storage: ReturnType<ReturnType<typeof createClient>['storage']['from']> | null,
  code: string,
  att: AttachmentSeed
): Promise<{ url: string; mimeType: string }> {
  const fallbackUrl = `https://drive.google.com/file/d/${att.driveFileId}/view`;
  const guessedMime = guessMimeType(att.name);

  if (!storage) {
    return { url: fallbackUrl, mimeType: guessedMime };
  }

  const storagePath = `uploads/finance/imported/${code}-${att.driveFileId}-${sanitizeFilename(att.name)}`;

  // Check if file already exists in Supabase
  const { data: existingList } = await storage.list('uploads/finance/imported', {
    search: `${code}-${att.driveFileId}-`,
  });
  if (existingList && existingList.length > 0) {
    const existingPublic = storage.getPublicUrl(`uploads/finance/imported/${existingList[0].name}`).data.publicUrl;
    return { url: existingPublic, mimeType: guessedMime };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    const response = await fetch(`https://drive.google.com/uc?export=download&id=${att.driveFileId}`, {
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`  [Drive HTTP ${response.status}] fallback para ${att.name}`);
      return { url: fallbackUrl, mimeType: guessedMime };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      // Virus scan warning for very large files on Google Drive -> keep Drive URL
      console.warn(`  [Drive HTML redirect] mantendo link do Drive para ${att.name}`);
      return { url: fallbackUrl, mimeType: guessedMime };
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.length === 0) {
      return { url: fallbackUrl, mimeType: guessedMime };
    }

    const finalMime = guessMimeType(att.name, contentType);
    const { error } = await storage.upload(storagePath, buffer, {
      contentType: finalMime,
      upsert: true,
    });

    if (error) {
      console.warn(`  [Supabase upload error] ${att.name}: ${error.message}`);
      return { url: fallbackUrl, mimeType: finalMime };
    }

    const publicUrl = storage.getPublicUrl(storagePath).data.publicUrl;
    return { url: publicUrl, mimeType: finalMime };
  } catch (err) {
    console.warn(`  [Download failed] ${att.name}:`, err instanceof Error ? err.message : err);
    return { url: fallbackUrl, mimeType: guessedMime };
  }
}

async function main() {
  // 1. Limpar usuário temporário de teste se ainda existir
  const deletedTest = await prisma.member.deleteMany({
    where: { email: 'test-login-check@ufrj.br' },
  });
  if (deletedTest.count > 0) {
    console.log(`Removido ${deletedTest.count} usuário temporário de teste (test-login-check@ufrj.br).`);
  }

  // 2. Configurar Supabase Storage (se disponível)
  const supabaseUrl = process.env.INSTITUTIONAL_SUPABASE_URL;
  const supabaseKey = process.env.INSTITUTIONAL_SUPABASE_SECRET_KEY;
  const storage =
    supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from('galery-autonomos')
      : null;

  if (!storage) {
    console.warn('Supabase env não configurado: anexos usarão os links diretos do Google Drive.');
  }

  // 3. Carregar membros existentes para vincular requesterId pelo nome
  const members = await prisma.member.findMany({
    select: { id: true, name: true, email: true },
  });

  function findMemberId(name: string): string | null {
    const target = normalizeText(name);
    if (!target) return null;
    const exact = members.find(m => normalizeText(m.name) === target);
    if (exact) return exact.id;
    const partial = members.find(m => {
      const mNorm = normalizeText(m.name);
      return mNorm.includes(target) || target.split(' ').every(part => part.length > 2 && mNorm.includes(part));
    });
    return partial?.id ?? null;
  }

  let totalUploaded = 0;
  for (const item of ENTRIES) {
    const requesterId = findMemberId(item.requesterName);
    const occurredDate = item.occurredAt ? new Date(`${item.occurredAt}T12:00:00Z`) : null;
    const paidDate = item.status === 'PAGO' ? occurredDate ?? new Date('2026-07-21T12:00:00Z') : null;
    const driveFolderUrl = item.driveFolderId
      ? `https://drive.google.com/drive/folders/${item.driveFolderId}`
      : null;

    const entry = await prisma.financialEntry.upsert({
      where: { code: item.code },
      update: {
        type: item.type,
        isReimbursement: item.isReimbursement,
        title: item.title,
        description: item.description ?? null,
        category: item.category,
        fundSource: item.fundSource,
        team: item.team,
        amountCents: item.amountCents,
        occurredAt: occurredDate,
        status: item.status,
        requesterId,
        requesterName: item.requesterName,
        driveFolderId: item.driveFolderId ?? null,
        driveFolderUrl,
        paidAt: paidDate,
      },
      create: {
        code: item.code,
        type: item.type,
        isReimbursement: item.isReimbursement,
        title: item.title,
        description: item.description ?? null,
        category: item.category,
        fundSource: item.fundSource,
        team: item.team,
        amountCents: item.amountCents,
        occurredAt: occurredDate,
        status: item.status,
        requesterId,
        requesterName: item.requesterName,
        driveFolderId: item.driveFolderId ?? null,
        driveFolderUrl,
        paidAt: paidDate,
      },
    });

    if (item.attachments && item.attachments.length > 0) {
      // Remove previous attachments on re-seed to keep idempotent without duplicates
      await prisma.financialAttachment.deleteMany({ where: { entryId: entry.id } });
      for (const att of item.attachments) {
        const { url, mimeType } = await downloadDriveAndUploadSupabase(storage, item.code, att);
        await prisma.financialAttachment.create({
          data: {
            entryId: entry.id,
            name: att.name,
            url,
            driveFileId: att.driveFileId,
            mimeType,
            kind: att.kind ?? 'RECEIPT',
          },
        });
        totalUploaded++;
      }
    }

    console.log(
      `[OK] ${item.code} (${item.type} · ${item.status}) — ${item.title} [${item.requesterName}${requesterId ? ' ✓' : ''}]`
    );
  }

  // Extratos iniciais das contas (itau_extrato_012026.pdf)
  const { url: extratoUrl, mimeType: extratoMime } = await downloadDriveAndUploadSupabase(storage, 'EXTRATO', {
    name: 'itau_extrato_012026.pdf',
    driveFileId: '1eXDQoEPUYv6Jzq5d_qJjo4Hd78_ls0vO',
    kind: 'STATEMENT',
  });
  await prisma.financialStatement.upsert({
    where: { id: 'seed-extrato-itau-01-2026' },
    update: {
      title: 'Extrato Conta Itaú — Janeiro/2026',
      fundSource: 'Dinheiro Livre',
      referenceDate: new Date('2026-01-31T12:00:00Z'),
      fileName: 'itau_extrato_012026.pdf',
      fileUrl: extratoUrl,
      mimeType: extratoMime,
      notes: 'Extrato inicial da conta corrente Itaú importado da pasta financeira.',
    },
    create: {
      id: 'seed-extrato-itau-01-2026',
      title: 'Extrato Conta Itaú — Janeiro/2026',
      fundSource: 'Dinheiro Livre',
      referenceDate: new Date('2026-01-31T12:00:00Z'),
      fileName: 'itau_extrato_012026.pdf',
      fileUrl: extratoUrl,
      mimeType: extratoMime,
      notes: 'Extrato inicial da conta corrente Itaú importado da pasta financeira.',
    },
  });

  // Verificação matemática do saldo
  const allEntries = await prisma.financialEntry.findMany();
  const freeIncome = allEntries
    .filter(e => e.type === 'ENTRADA' && e.fundSource === 'Dinheiro Livre' && (e.status === 'PAGO' || e.status === 'APROVADO'))
    .reduce((acc, e) => acc + e.amountCents, 0);
  const freeExpense = allEntries
    .filter(e => e.type === 'SAIDA' && e.fundSource === 'Dinheiro Livre' && (e.status === 'PAGO' || e.status === 'APROVADO'))
    .reduce((acc, e) => acc + e.amountCents, 0);
  const awaiting = allEntries
    .filter(e => e.type === 'SAIDA' && (e.status === 'AGUARDANDO_REEMBOLSO' || e.status === 'PENDENTE' || e.status === 'AGUARDANDO_NF'))
    .reduce((acc, e) => acc + e.amountCents, 0);

  console.log('\n=== Resumo Importado ===');
  console.log(`Total de lançamentos: ${allEntries.length}`);
  console.log(`Total de comprovantes processados: ${totalUploaded}`);
  console.log(`Entradas Dinheiro Livre (Efetivadas): R$ ${(freeIncome / 100).toFixed(2)}`);
  console.log(`Saídas Dinheiro Livre (Pagas):        R$ ${(freeExpense / 100).toFixed(2)}`);
  console.log(`Saldo Dinheiro Livre:                 R$ ${((freeIncome - freeExpense) / 100).toFixed(2)}`);
  console.log(`Aguardando Reembolso:                 R$ ${(awaiting / 100).toFixed(2)}`);
}

main()
  .catch(err => {
    console.error('Erro ao importar dados financeiros:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
