import { MEMBER_ROLES, MEMBER_AREAS } from '../member-fields';
export type FieldType = 'string' | 'text' | 'number' | 'boolean' | 'image' | 'json' | 'relation' | 'select' | 'multiselect' | 'json-array';

export interface AdminField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  relationModel?: string;
  options?: { label: string; value: string | number; group?: string }[];
  schema?: { name: string; label: string; type: 'string' | 'text' }[];
}

export interface AdminModel {
  name: string;
  table: string; // db model name matching prisma client
  primaryKey: string;
  listFields: string[]; // which fields to show on the list page
  fields: AdminField[];
}

// Helper for teams
const teamOptions = [
  { label: 'Nautilus', value: 1 },
  { label: 'Harpia', value: 2 },
];

export const adminModels: Record<string, AdminModel> = {
  team: {
    name: "Equipes",
    table: "team",
    primaryKey: "id",
    listFields: ["name", "slug"],
    fields: [
      { name: "name", label: "Nome da Equipe", type: "string", required: true, description: "Nome visível da equipe. Ex: UFRJ Nautilus" },
      { name: "slug", label: "Identificador (Slug)", type: "string", required: true, description: "Identificador na URL (nautilus ou harpia). Não deve ser alterado levianamente." },
      { name: "founded", label: "Ano de Fundação", type: "number", required: true },
      { name: "coverImage", label: "Imagem de Capa (Home)", type: "image", description: "Imagem exibida na aba da equipe na página inicial." },
      { name: "bannerImage", label: "Banner Principal", type: "image", description: "Imagem grande exibida no topo das páginas da equipe." },
      { name: "tags", label: "Focos de Atuação (PT)", type: "json-array", description: "Lista de tags como 'Visão Subaquática', 'SLAM'.", schema: [{ name: "value", label: "Tag", type: "string" }] },
      { name: "tagsEn", label: "Focos de Atuação (EN)", type: "json-array", description: "Lista de tags em inglês.", schema: [{ name: "value", label: "Tag", type: "string" }] },
      { name: "tagsFr", label: "Focos de Atuação (FR)", type: "json-array", description: "Lista de tags em francês.", schema: [{ name: "value", label: "Tag", type: "string" }] },
    ]
  },
  member: {
    name: "Integrantes",
    table: "member",
    primaryKey: "id",
    listFields: ["name", "role", "area", "age", "teamId", "active", "showOnSite"],
    fields: [
      { name: "showOnSite", label: "Exibir no site", type: "boolean", description: "Desmarque para manter este cadastro visível apenas na gestão." },
      { name: "name", label: "Nome", type: "string", required: true, description: "Nome completo do membro. Ex: João da Silva" },
      { name: "teamId", label: "Equipe / Divisão", type: "select", options: [{ label: 'UFRJ Autônomos (Geral: Gestão, Marketing, Diretoria)', value: '' }, ...teamOptions], required: false, description: "Selecione a equipe. Deixe como Autônomos para membros de Gestão, Marketing, Diretoria e Capitania." },
      { name: "role", label: "Cargo na equipe", type: "select", required: true, description: "Cargo organizacional. O acesso à plataforma é definido em Contas e permissões.", options: MEMBER_ROLES },
      { name: "isFemale", label: "Gênero Feminino (adapta Coordenadora, Diretora, etc.)", type: "boolean", description: "Adapta automaticamente cargos gramaticais para o feminino (ex: Coordenadora, Diretora, Capitã, Professora)." },
      { name: "age", label: "Idade", type: "number", description: "Idade do membro em anos. Ex: 21" },
      { name: "area", label: "Área", type: "select", required: true, options: MEMBER_AREAS.map(value => ({ label: value, value })) },
      { name: "bio", label: "Biografia", type: "text", description: "Breve biografia ou descrição sobre o membro." },
      { name: "bioEn", label: "Biografia (EN)", type: "text", description: "Tradução da biografia para Inglês." },
      { name: "bioFr", label: "Biografia (FR)", type: "text", description: "Tradução da biografia para Francês." },
      { name: "photo", label: "Foto do Integrante", type: "image", description: "Faça upload da foto de perfil." },
      { name: "linkedin", label: "LinkedIn URL", type: "string", description: "Link do perfil no LinkedIn. Ex: https://linkedin.com/in/..." },
      { name: "github", label: "GitHub URL", type: "string", description: "Link do GitHub. Ex: https://github.com/..." },
      { name: "instagram", label: "Instagram URL", type: "string", description: "Link do Instagram. Ex: https://instagram.com/..." },
      { name: "joinedYear", label: "Ano de Entrada", type: "string", description: "Ano em que entrou na equipe. Ex: 2021" },
      { name: "leftYear", label: "Ano de Saída", type: "string", description: "Ano em que saiu (se aplicável). Ex: 2023" },
      { name: "course", label: "Curso", type: "string", description: "Curso de graduação. Ex: Engenharia Mecânica" },
      { name: "courseEn", label: "Curso (EN)", type: "string", description: "Nome do curso em Inglês." },
      { name: "courseFr", label: "Curso (FR)", type: "string", description: "Nome do curso em Francês." },
      { name: "projectIds", label: "Projetos (Selecione os projetos)", type: "multiselect", description: "Projetos em que este membro trabalha ou trabalhou." },
      { name: "active", label: "Ativo?", type: "boolean", description: "Marque se o membro ainda está ativo na equipe." },
    ]
  },
  project: {
    name: "Projetos",
    table: "project",
    primaryKey: "id",
    listFields: ["name", "slug", "importance", "teamId", "status", "year", "showOnSite"],
    fields: [
      { name: "showOnSite", label: "Exibir no site", type: "boolean", description: "Desmarque para manter este cadastro visível apenas na gestão." },
      { name: "name", label: "Nome", type: "string", required: true, description: "Nome do projeto. Ex: Robô AUV Lua" },
      { name: "importance", label: "Importância (1 a 10)", type: "number", required: true, description: "Prioridade de exibição (1 a 10). Projetos com valor maior (ex: 10) aparecem no topo." },
      { name: "teamId", label: "Equipe", type: "select", options: teamOptions, required: true, description: "Equipe responsável pelo projeto." },
      { name: "slug", label: "Slug", type: "string", required: true, description: "Identificador único na URL (sem espaços ou acentos). Ex: auv-lua" },
      { name: "nameEn", label: "Nome (EN)", type: "string", description: "Nome do projeto em Inglês." },
      { name: "nameFr", label: "Nome (FR)", type: "string", description: "Nome do projeto em Francês." },
      { name: "codename", label: "Codinome", type: "string", description: "Nome interno ou de código do projeto. Ex: Apollo" },
      { name: "tagline", label: "Tagline", type: "string", required: true, description: "Frase de efeito ou resumo muito curto. Ex: Explorando as profundezas." },
      { name: "taglineEn", label: "Tagline (EN)", type: "string", description: "Tradução da tagline." },
      { name: "taglineFr", label: "Tagline (FR)", type: "string", description: "Tradução da tagline." },
      { name: "description", label: "Descrição", type: "text", required: true, description: "Descrição completa e detalhada do projeto." },
      { name: "descriptionEn", label: "Descrição (EN)", type: "text", description: "Descrição em Inglês." },
      { name: "descriptionFr", label: "Descrição (FR)", type: "text", description: "Descrição em Francês." },
      { name: "status", label: "Status", type: "select", description: "Estado atual de desenvolvimento do projeto.", options: [
        { label: 'Operação', value: 'operacao' },
        { label: 'Desenvolvimento', value: 'desenvolvimento' },
        { label: 'Conceitual', value: 'conceitual' },
        { label: 'Planejamento', value: 'planejamento' },
        { label: 'Descontinuado', value: 'descontinuado' },
        { label: 'Pausado', value: 'pausado' },
      ], required: true },
      { name: "year", label: "Ano", type: "number", required: true, description: "Ano principal ou de início do projeto. Ex: 2024" },
      { name: "model3dId", label: "Modelo 3D", type: "relation", relationModel: "model3D", description: "Selecione o modelo 3D dinâmico do banco." },
      { name: "isGenericModel", label: "Modelo 3D Genérico?", type: "boolean", description: "Marque se o modelo 3D for uma representação genérica e não o design real final." },
      { name: "coverImage", label: "Imagem de Capa", type: "image", description: "Imagem principal do projeto. Faça o upload do arquivo." },
      { name: "tags", label: "Tags (vírgula)", type: "string", required: true, description: "Palavras-chave separadas por vírgula. Ex: robótica, visão, controle" },
      { name: "tagsEn", label: "Tags (EN)", type: "string", description: "Tags traduzidas." },
      { name: "tagsFr", label: "Tags (FR)", type: "string", description: "Tags traduzidas." },
      {
        name: "specs",
        label: "Especificações",
        type: "json-array",
        required: true,
        description: "Lista de especificações técnicas do projeto. Ex: Rótulo: Peso, Valor: 15kg.",
        schema: [
          { name: "label", label: "Rótulo", type: "string" },
          { name: "value", label: "Valor", type: "string" }
        ]
      },
      {
        name: "specsEn",
        label: "Especificações (EN)",
        type: "json-array",
        description: "Especificações em Inglês.",
        schema: [
          { name: "label", label: "Rótulo", type: "string" },
          { name: "value", label: "Valor", type: "string" }
        ]
      },
      {
        name: "specsFr",
        label: "Especificações (FR)",
        type: "json-array",
        description: "Especificações em Francês.",
        schema: [
          { name: "label", label: "Rótulo", type: "string" },
          { name: "value", label: "Valor", type: "string" }
        ]
      },
      {
        name: "subsystems",
        label: "Subsistemas",
        type: "json-array",
        required: true,
        description: "Principais sistemas do projeto com nome e descrição. Ex: Nome: Navegação.",
        schema: [
          { name: "name", label: "Nome", type: "string" },
          { name: "desc", label: "Descrição", type: "text" }
        ]
      },
      {
        name: "subsystemsEn",
        label: "Subsistemas (EN)",
        type: "json-array",
        description: "Subsistemas em Inglês.",
        schema: [
          { name: "name", label: "Nome", type: "string" },
          { name: "desc", label: "Descrição", type: "text" }
        ]
      },
      {
        name: "subsystemsFr",
        label: "Subsistemas (FR)",
        type: "json-array",
        description: "Subsistemas em Francês.",
        schema: [
          { name: "name", label: "Nome", type: "string" },
          { name: "desc", label: "Descrição", type: "text" }
        ]
      },
    ]
  },
  sponsor: {
    name: "Patrocinadores",
    table: "sponsor",
    primaryKey: "id",
    listFields: ["name", "tier", "teamId"],
    fields: [
      { name: "name", label: "Nome", type: "string", required: true, description: "Nome da empresa patrocinadora." },
      { name: "teamId", label: "Equipe (Opcional - null para geral)", type: "select", options: [...teamOptions, { label: 'Geral', value: '' }], description: "Deixe 'Geral' se for patrocínio conjunto, ou escolha uma equipe específica." },
      { name: "tier", label: "Tier", type: "select", description: "Nível/Categoria do patrocínio.", options: [
        { label: 'Ouro', value: 'ouro' },
        { label: 'Prata', value: 'prata' },
        { label: 'Bronze', value: 'bronze' },
        { label: 'Apoio', value: 'apoio' },
      ], required: true },
      { name: "logo", label: "Logo", type: "image", description: "Logo com fundo transparente (PNG/WebP preferencialmente). Faça o upload do arquivo." },
      { name: "website", label: "Website", type: "string", description: "Link do site do patrocinador. Ex: https://empresa.com" },
      { name: "benefit", label: "Benefício", type: "string", description: "Detalhe do que foi oferecido. Ex: Desconto em peças." },
      { name: "benefitEn", label: "Benefício (EN)", type: "string", description: "Tradução." },
      { name: "benefitFr", label: "Benefício (FR)", type: "string", description: "Tradução." },
    ]
  },
  competition: {
    name: "Competições",
    table: "competition",
    primaryKey: "id",
    listFields: ["name", "year", "teamId", "result"],
    fields: [
      { name: "name", label: "Nome", type: "string", required: true, description: "Nome do evento competitivo. Ex: RoboSub 2024" },
      { name: "teamId", label: "Equipe", type: "select", options: teamOptions, required: true, description: "Qual equipe competiu." },
      { name: "nameEn", label: "Nome (EN)", type: "string", description: "Nome em Inglês." },
      { name: "nameFr", label: "Nome (FR)", type: "string", description: "Nome em Francês." },
      { name: "year", label: "Ano", type: "number", required: true, description: "Ano em que ocorreu. Ex: 2024" },
      { name: "location", label: "Localização", type: "string", required: true, description: "Cidade e estado. Ex: San Diego, CA" },
      { name: "locationEn", label: "Localização (EN)", type: "string", description: "Tradução." },
      { name: "locationFr", label: "Localização (FR)", type: "string", description: "Tradução." },
      { name: "country", label: "País", type: "string", required: true, description: "País sede. Ex: Estados Unidos" },
      { name: "countryEn", label: "País (EN)", type: "string", description: "Tradução." },
      { name: "countryFr", label: "País (FR)", type: "string", description: "Tradução." },
      { name: "lat", label: "Latitude", type: "number", description: "Latitude para o mapa. Ex: 32.7157" },
      { name: "lng", label: "Longitude", type: "number", description: "Longitude para o mapa. Ex: -117.1611" },
      { name: "result", label: "Resultado", type: "string", description: "Posição alcançada. Ex: 1º Lugar Geral" },
      { name: "resultEn", label: "Resultado (EN)", type: "string", description: "Tradução." },
      { name: "resultFr", label: "Resultado (FR)", type: "string", description: "Tradução." },
      { name: "details", label: "Detalhes Adicionais", type: "text", description: "Informações completas sobre a competição que aparecerão no botão Ver mais." },
      { name: "detailsEn", label: "Detalhes Adicionais (EN)", type: "text", description: "Tradução." },
      { name: "detailsFr", label: "Detalhes Adicionais (FR)", type: "text", description: "Tradução." },
      {
        name: "missions",
        label: "Missões",
        type: "json-array",
        description: "Lista de missões ou tarefas da competição.",
        schema: [
          { name: "mission", label: "Missão", type: "text" }
        ]
      },
      {
        name: "missionsEn",
        label: "Missões (EN)",
        type: "json-array",
        description: "Tradução.",
        schema: [
          { name: "mission", label: "Missão", type: "text" }
        ]
      },
      {
        name: "missionsFr",
        label: "Missões (FR)",
        type: "json-array",
        description: "Tradução.",
        schema: [
          { name: "mission", label: "Missão", type: "text" }
        ]
      },
      { name: "projectId", label: "Projeto Associado", type: "relation", relationModel: "project", description: "Selecione um projeto específico que foi utilizado, se houver." },
      { name: "showOnHome", label: "Exibir na Home?", type: "boolean", description: "Se marcado, aparecerá na página inicial das equipes." },
    ]
  },
  timelineevent: {
    name: "Eventos da Timeline",
    table: "timelineEvent",
    primaryKey: "id",
    listFields: ["title", "date", "teamId", "category"],
    fields: [
      { name: "title", label: "Título", type: "string", required: true, description: "Título do evento. Ex: Criação da UFRJ Autônomos" },
      { name: "teamId", label: "Equipe (Opcional)", type: "select", options: [...teamOptions, { label: 'Geral', value: '' }], description: "Equipe relacionada (deixe Geral para eventos do grupo como um todo)." },
      { name: "titleEn", label: "Título (EN)", type: "string", description: "Tradução." },
      { name: "titleFr", label: "Título (FR)", type: "string", description: "Tradução." },
      { name: "date", label: "Data (YYYY-MM)", type: "string", required: true, description: "Data no formato ano-mês. Ex: 2024-05" },
      { name: "description", label: "Descrição", type: "text", required: true, description: "Descrição resumida do que ocorreu." },
      { name: "descriptionEn", label: "Descrição (EN)", type: "text", description: "Tradução." },
      { name: "descriptionFr", label: "Descrição (FR)", type: "text", description: "Tradução." },
      { name: "details", label: "Detalhes Adicionais", type: "text", description: "Informações extras (pode ser maior que a descrição)." },
      { name: "detailsEn", label: "Detalhes Adicionais (EN)", type: "text", description: "Tradução." },
      { name: "detailsFr", label: "Detalhes Adicionais (FR)", type: "text", description: "Tradução." },
      { name: "category", label: "Categoria", type: "select", description: "Tipo de evento para filtragem e visualização.", options: [
        { label: 'Marco', value: 'marco' },
        { label: 'Competição', value: 'competicao' },
        { label: 'Projeto', value: 'projeto' },
        { label: 'Prêmio', value: 'premio' },
      ], required: true },
      { name: "showOnHome", label: "Exibir na Home?", type: "boolean", description: "Marque para exibir nos destaques históricos." },
    ]
  },
  galleryimage: {
    name: "Imagens da Galeria",
    table: "galleryImage",
    primaryKey: "id",
    listFields: ["url", "caption", "teamId", "projectId", "timelineEventId", "competitionId"],
    fields: [
      { name: "url", label: "Imagem", type: "image", required: true, description: "Faça upload da imagem para a galeria." },
      { name: "teamId", label: "Equipe", type: "select", options: teamOptions, required: true, description: "Equipe relacionada a esta foto." },
      { name: "caption", label: "Legenda", type: "string", required: true, description: "Descrição curta para acessibilidade e exibição." },
      { name: "captionEn", label: "Legenda (EN)", type: "string", description: "Tradução." },
      { name: "captionFr", label: "Legenda (FR)", type: "string", description: "Tradução." },
      { name: "year", label: "Ano (Opcional)", type: "string", description: "Ano em que foi tirada. Ex: 2023" },
      { name: "month", label: "Mês (Opcional)", type: "string", description: "Mês (1-12) em que foi tirada." },
      { name: "projectId", label: "Projeto Associado", type: "relation", relationModel: "project", description: "Vincule esta foto a um projeto (opcional)." },
      { name: "timelineEventId", label: "Evento da Timeline Associado", type: "relation", relationModel: "timelineEvent", description: "Vincule a um evento histórico (opcional)." },
      { name: "competitionId", label: "Competição Associada", type: "relation", relationModel: "competition", description: "Vincule a uma competição (opcional)." },
    ]
  },
  model3d: {
    name: "Modelos 3D",
    table: "model3D",
    primaryKey: "id",
    listFields: ["name", "value"],
    fields: [
      { name: "name", label: "Nome", type: "string", required: true, description: "Nome visível. Ex: Drone X500" },
      { name: "value", label: "Identificador (Slug)", type: "string", required: true, description: "O slug usado internamente no código. Ex: x500" },
      { name: "description", label: "Descrição", type: "text", description: "Breve descrição do modelo 3D." },
    ]
  }
};
