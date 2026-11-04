---
name: "Sistema Autônomos"
description: "Sistema visual do trabalho diário da UFRJ Autônomos."
colors:
  background-light: "#f2f4f7"
  foreground-light: "#171a20"
  card-light: "#ffffff"
  card-foreground-light: "#171a20"
  popover-light: "#ffffff"
  popover-foreground-light: "#171a20"
  primary-light: "#20252e"
  primary-foreground-light: "#ffffff"
  secondary-light: "#edf0f4"
  secondary-foreground-light: "#343c48"
  muted-light: "#edf0f4"
  muted-foreground-light: "#5e6877"
  accent-light: "#e7ebf0"
  accent-foreground-light: "#171a20"
  destructive-light: "#b42318"
  border-light: "#dce1e8"
  input-light: "#8793a3"
  ring-light: "#1d5fbf"
  data-accent-light: "#1d5fbf"
  hairline-light: "#e7ebf0"
  hairline-strong-light: "#dce1e8"
  background-dark: "#101114"
  foreground-dark: "#f1f3f5"
  card-dark: "#181a1f"
  card-foreground-dark: "#f1f3f5"
  popover-dark: "#1c1f25"
  popover-foreground-dark: "#f1f3f5"
  primary-dark: "#eef1f5"
  primary-foreground-dark: "#171a20"
  secondary-dark: "#252a33"
  secondary-foreground-dark: "#d4dae3"
  muted-dark: "#22262e"
  muted-foreground-dark: "#a2adbd"
  accent-dark: "#2b313c"
  accent-foreground-dark: "#f1f3f5"
  destructive-dark: "#f87171"
  border-dark: "#303641"
  input-dark: "#626e80"
  ring-dark: "#8db5ef"
  data-accent-dark: "#8db5ef"
  hairline-dark: "#252a33"
  hairline-strong-dark: "#303641"
typography:
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "32px"
    letterSpacing: "-0.025em"
  section:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "24px"
  metric:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: "36px"
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
  input:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    lineHeight: "24px"
  course-display:
    fontFamily: "Space Grotesk, ui-sans-serif, system-ui, sans-serif"
    letterSpacing: "-0.02em"
  course-mono:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
rounded:
  control: "7px"
  panel: "12px"
  utility: "8px"
  compact: "6px"
  progress: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "20px"
  6: "24px"
  7: "28px"
  8: "32px"
  10: "40px"
components:
  button-primary:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.primary-foreground-light}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.primary-foreground-dark}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
    height: "44px"
  input-field:
    backgroundColor: "{colors.background-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "48px"
  navigation-link:
    textColor: "{colors.muted-foreground-light}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  navigation-active:
    backgroundColor: "{colors.accent-light}"
    textColor: "{colors.foreground-light}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    height: "44px"
  panel:
    backgroundColor: "{colors.card-light}"
    textColor: "{colors.card-foreground-light}"
    rounded: "{rounded.panel}"
    padding: "20px"
  progress:
    backgroundColor: "{colors.muted-light}"
    textColor: "{colors.data-accent-light}"
    rounded: "{rounded.progress}"
    height: "8px"
  count-neutral:
    backgroundColor: "{colors.muted-light}"
    textColor: "{colors.muted-foreground-light}"
    rounded: "{rounded.utility}"
    padding: "0 8px"
    height: "32px"
---

# Design System: Sistema Autônomos

## Overview

**Creative North Star: "Achromatic ledger"**

O Achromatic ledger organiza o trabalho diário com superfícies neutras, hierarquia tipográfica clara e separadores discretos. A marca oficial da UFRJ Autônomos identifica o sistema; pessoas, solicitações e horas de laboratório ocupam a atenção.

A interface usa Inter, painéis contidos e ações principais em tinta. Azul acompanha progresso e foco. Os temas claro e escuro compartilham papéis semânticos; o ensino preserva sua composição e suas famílias tipográficas existentes dentro de uma moldura que acompanha o tema.

**Key Characteristics:**
- Superfícies neutras e ações em tinta.
- Hierarquia compacta e dados com algarismos tabulares.
- Progresso azul e estados explicados por texto.
- Navegação rotulada, com adaptação ao celular.

Extraído de `src/app/globals.css`, `src/components/workspace/`, `src/components/layout/platform-shell.tsx`, `src/app/layout.tsx` e `src/contexts/theme-context.tsx`, com amostras de gestão, presença e ensino. O código é a fonte de verdade: Geist, raios e controles sugeridos no seed não substituem os valores implementados. Estratégia por perfil e composição da primeira tela ficam em `PRODUCT.md` e `.impeccable/surfaces/workspace.md`. Não havia navegador ou screenshot disponível; este registro documenta evidência de fonte, sem aprovação visual.

## Colors

A paleta combina papel frio, tinta e cinzas de baixa saturação. Os sufixos `-light` e `-dark` do frontmatter registram os valores reais de cada variável semântica. As classes `light` e `dark` no elemento raiz selecionam o tema. Componentes do frontmatter exemplificam o claro; variantes escuras e snippets usam os mesmos papéis.

### Primary

- **Tinta de ação (`primary`, `primary-foreground`):** ação principal neutra e seu texto contrastante.
- **Azul de acompanhamento (`data-accent`):** preenchimento de progresso, especialmente presença; `ring` usa o mesmo azul para foco.
- **Vermelho destrutivo (`destructive`):** ação ou estado destrutivo, sempre explicado por texto.

### Neutral

- **Papel frio (`background`):** plano contínuo e fundo de campos.
- **Superfície de trabalho (`card`, `card-foreground`):** painéis, sidebar e barra superior.
- **Superfície flutuante (`popover`, `popover-foreground`):** busca e sobreposições.
- **Tinta (`foreground`, `muted-foreground`):** informação principal e auxiliar.
- **Planos auxiliares (`secondary`, `secondary-foreground`, `muted`):** avatar, informação secundária e trilho de progresso.
- **Plano de interação (`accent`, `accent-foreground`):** hover e seleção neutros.
- **Divisores (`border`, `hairline`, `hairline-strong`):** linhas e separação de planos.
- **Contorno de campo (`input`):** borda mais perceptível que o divisor de painel.

Revisão usa âmbar; confirmação usa esmeralda, com variantes claro/escuro e texto explícito. Esses estados locais não viram cores de marca. Tokens roxos de Harpia e azuis de Nautilus permanecem no stylesheet como legado de divisão; o seletor de aparência não os aplica. O QR usa branco literal e texto escuro fixo.

**The Semantic Theme Rule.** Use os papéis semânticos do tema para superfícies, texto, bordas e interação. O cartaz QR é a exceção de impressão com branco e texto escuro fixos.

**The Data Accent Rule.** Reserve o azul de dados para progresso e foco. Ações e navegação usam neutros; cores de estado acompanham texto explicativo.

## Typography

**Body Font:** Inter, com fallback sans-serif do sistema; títulos, navegação, texto e números do workspace.

**Display Font (ensino e superfícies legadas):** Space Grotesk, com fallback sans-serif e tracking existente.

**Label/Mono Font (código e ensino legado):** JetBrains Mono, com fallback monospace. O workspace usa algarismos tabulares em Inter para dados comparáveis, sem herdar a sugestão de mono universal do seed.

### Hierarchy

- **Title:** título do novo workspace; medidas em `typography.title`.
- **Section:** cabeçalhos de painéis; medidas em `typography.section`.
- **Metric:** valor numérico de destaque; medidas em `typography.metric`.
- **Body:** texto, navegação e ações; medidas em `typography.body`. Ações elevam o peso para médio e seleção para semibold.
- **Label:** metadados e grupos; medidas em `typography.label`.
- **Input:** entrada de dados; medidas em `typography.input`, também mantidas nos campos móveis.

As fontes são carregadas por `next/font/google` com `display: swap`. O ensino mantém escalas display maiores, rótulos mono e código existentes; essa escala não se aplica retroativamente a todas as aulas.

**The Course Continuity Rule.** Preserve a estrutura do ensino e suas famílias display e mono existentes. Essa continuidade não define a tipografia de novas superfícies de trabalho.

## Layout

Desktop: sidebar fixa (256px) a partir de 1024px; barra utilitária sticky (64px); canvas fluido com teto (1600px) e recuo equivalente à sidebar. Conteúdo: margem interna (16px; 28px a partir de 640px) e espaço superior (24px; 32px a partir de 640px). O espaço pessoal limita a coluna a (1152px).

Celular: quatro destinos rotulados na barra inferior, com três atalhos por perfil e Menu. Cada destino mede no mínimo (64px), mais a safe area. O conteúdo reserva `calc(6.5rem + env(safe-area-inset-bottom))` no rodapé; a partir de 1024px reserva (40px). O menu ocupa toda a tela móvel, com rolagem própria e safe area; no desktop mede (384px), com limite de altura baseado em `100dvh`.

Painéis usam padding (20px; 24px em telas maiores), intervalos recorrentes (12px e 24px) e filas de altura mínima (64px). Contêineres permitem encolhimento sem estourar a página; tabelas extensas mantêm rolagem horizontal local.

O ensino conserva palco de conteúdo, sidebar de currículo, modos de visualização e sequenciamento. Grades ortogonais e cantoneiras técnicas ainda presentes são legado local: este registro não recomenda remodelar a estrutura do curso nem exportar esses ornamentos para o workspace. Abaixo de 640px, o player de altura fixa desconta a moldura externa (64px).

## Elevation & Depth

A base é plana: superfície, borda fina e contraste tonal distinguem painéis. Busca e menu desktop usam `shadow-xl` do Tailwind e backdrop preto a 50%; a sombra identifica sobreposição. O sidecar registra a expansão desse utilitário. Painéis do novo workspace não usam sombra de repouso.

Utilidades de brilho de equipe, vinheta e grain permanecem no CSS legado. No workspace, grain tem opacidade zero e brilho de equipe é transparente nos dois temas; não são prescrição para novos painéis.

## Shapes

Painéis e diálogos usam `rounded.panel`; ações, campos e navegação usam `rounded.control`. Botões de ícone usam `rounded.utility`; avatares são circulares e progresso usa cápsula. Bordas medem (1px). A variável base `--radius` mantém (0.5rem); os controles do workspace têm medidas explícitas próprias.

## Components

### Buttons

Ações em caixa normal. Principal usa tinta e texto contrastante; secundária usa superfície card com borda. Ambas têm altura **mínima**, não fixa (44px), padding do frontmatter e gap (10px). Hover principal reduz opacidade para (0.88); secundário muda para accent com borda input. Principal desabilitada usa opacidade (0.5) e cursor de espera. Ícones usuais medem (16–20px), em área mínima (44px × 44px). A busca do cabeçalho e opções de aparência preservam altura específica implementada (40px).

### Chips

Contagem neutra: fundo muted, texto auxiliar, números tabulares. Pendências recebem âmbar quando requerem revisão. O contador da fila tem altura mínima (32px), raio utilitário e padding horizontal (8px). Chips comunicam informação, sem substituir descrições. Pills coloridos do ensino continuam locais.

### Cards / Containers

Fundo card, borda border, raio de painel e padding de Layout. Cabeçalhos e filas usam separadores; não criar uma pilha de subcartões. Filas vazias e consultas indisponíveis têm mensagens distintas. Falhas usam status quando apropriado, sem fabricar contagens iguais a zero.

### Inputs / Fields

Altura mínima (48px), fundo background, borda input, padding (10px 12px), placeholder muted-foreground. Busca de navegação: campo transparente sem borda interna, altura (56px), nome acessível e foco inicial. Formulários mantêm rótulos visíveis.

### Navigation

Itens laterais: altura mínima (44px), gap (12px), ícone de contorno (18px) e corpo de texto. Ativo usa accent, tinta principal, semibold e `aria-current="page"`. Navegações, breadcrumb e atalhos móveis têm nomes acessíveis. Marca usa símbolo oficial escuro no claro e branco no escuro.

O link de salto aparece ao foco e aponta ao main focável. Busca abre por Ctrl K ou Cmd K, filtra destinos por nome/descrição ignorando acentos e anuncia resultados por status. Não é pesquisa de conteúdo ou dados. Busca e menu usam `dialog` nativo com título acessível, Escape, botão de fechamento e retorno ao foco anterior. Abrir bloqueia rolagem do body; trocar de rota fecha diálogos.

### Appearance

O botão de aparência alterna claro/escuro e anuncia a próxima ação. Menu oferece radios nativos Claro, Escuro e Sistema em fieldset com legend. A preferência persiste em `autonomos:theme`; ausente ou inválida, segue o dispositivo. Bootstrap aplica classe antes da hidratação. Mudança do dispositivo e sincronização entre abas são acompanhadas; toast recebe tema resolvido.

### Progress and focus

Progresso usa `progress` nativo, com value, max e nome acessível. Trilho muted, preenchimento data-accent e valor também comunicado em texto. Foco visível de links, botões e campos no workspace e moldura do curso: outline (2px), afastamento (3px), cor ring. Opções de aparência têm indicador no rótulo. Estados não dependem somente de cor.

`prefers-reduced-motion: reduce` usa scroll-behavior auto, animações/transições de (0.01ms) e uma iteração. O workspace não estabelece animação decorativa de entrada.

## Do's and Don'ts

### Do:
- **Do** usar variáveis semânticas em ambos os temas.
- **Do** manter rótulos na navegação e nomes acessíveis nos botões de ícone.
- **Do** manter foco visível e retorno de foco nos diálogos.
- **Do** distinguir fila vazia de dado indisponível.
- **Do** preservar módulos, aulas, exercícios e progresso do curso ao adaptar cores.
- **Do** manter o cartaz QR branco e com texto escuro.

### Don't:
- **Don't** usar azul como decoração do chrome ou em todas as ações principais.
- **Don't** aplicar temas de divisão como aparência padrão do workspace.
- **Don't** cobrir a última ação com a barra inferior móvel.
- **Don't** promover ornamentos e rótulos técnicos legados do ensino a regras globais.
- **Don't** declarar validação visual por screenshot sem essa evidência.
