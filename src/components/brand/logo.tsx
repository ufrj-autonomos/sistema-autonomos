import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type LogoDivision = "autonomos" | "harpia" | "nautilus";
export type LogoVariant = "horizontal" | "stacked" | "symbol" | "badge";
export type LogoSize = "xs" | "sm" | "md" | "lg" | "xl" | number;
export type LogoTheme = "dark" | "light" | "auto";
export type HarpiaSymbolType = "eagle" | "drone";
export type NautilusSymbolType = "auv" | "shell";
export type BadgeShape = "rounded" | "square" | "rect" | "rect-rounded";

export interface LogoProps {
  /**
   * Divisão do ecossistema a exibir:
   * - 'autonomos': Marca matriz UFRJ Autônomos (padrão)
   * - 'harpia': Equipe aérea (VANTs / Drones)
   * - 'nautilus': Equipe marinha (AUVs / Submarinos)
   */
  division?: LogoDivision;

  /**
   * Formato de exibição:
   * - 'horizontal': Símbolo e texto na mesma linha (padrão para navbar)
   * - 'stacked': Símbolo centralizado acima do texto (formato quadrado 1:1)
   * - 'symbol': Apenas o símbolo gráfico sem texto
   * - 'badge': Emblema fechado com fundo de equipe
   */
  variant?: LogoVariant;

  /**
   * Tamanho do componente ('xs' | 'sm' | 'md' | 'lg' | 'xl' ou número em px)
   */
  size?: LogoSize;

  /**
   * Tema de fundo onde a logo será aplicada:
   * - 'dark': Logo clara/branca para fundos escuros (padrão do sistema)
   * - 'light': Logo escura/preta para fundos claros
   * - 'auto': Herda automaticamente via CSS
   */
  theme?: LogoTheme;

  /**
   * Compatibilidade direta com site-autonomos:
   * dark=true seleciona arte escura para fundos claros.
   */
  dark?: boolean;

  /**
   * Destino de link opcional:
   * - true: Link padrão da divisão ('/' para autonomos, '/gestao/divisoes#harpia', '/gestao/divisoes#nautilus')
   * - string: URL customizada (ex: '/', '/gestao', '/ensino')
   * - false | null | undefined: Renderiza elemento estático (não clicável)
   */
  href?: string | boolean | null;

  /**
   * Classes CSS adicionais aplicadas ao wrapper
   */
  className?: string;

  /**
   * Prioridade de carregamento no Next.js Image (útil para LCP no header)
   */
  priority?: boolean;

  /**
   * Sub-tipo do símbolo quando variant='symbol':
   * - Harpia: 'eagle' (padrão) ou 'drone'
   * - Nautilus: 'auv' (padrão) ou 'shell'
   */
  symbolType?: HarpiaSymbolType | NautilusSymbolType;

  /**
   * Formato do badge quando variant='badge'
   */
  badgeShape?: BadgeShape;

  /**
   * Texto alternativo para acessibilidade (se omitido, usa rótulo automático)
   */
  alt?: string;
}

/**
 * Mapeamento consolidado de todos os ativos vetoriais oficiais
 */
export const AUTONOMOS_LOGOS = {
  horizontalWhite: "/images/logos/autonomos/horizontal-white.svg",
  horizontalDark: "/images/logos/autonomos/horizontal-dark.svg",
  horizontal2LinesWhite: "/images/logos/autonomos/horizontal-2lines-white.svg",
  horizontal2LinesDark: "/images/logos/autonomos/horizontal-2lines-dark.svg",
  stackedWhite: "/images/logos/autonomos/vertical-white.svg",
  stackedDark: "/images/logos/autonomos/vertical-dark.svg",
  symbolWhite: "/images/logos/autonomos/symbol-white.svg",
  symbolDark: "/images/logos/autonomos/symbol-dark.svg",
  badgeRounded: "/images/logos/autonomos/badge-rounded.svg",
  badgeSquare: "/images/logos/autonomos/badge-square.svg",
  textWhite: "/images/logos/autonomos/text-white.svg",
  textDark: "/images/logos/autonomos/text-dark.svg",
} as const;

export const HARPIA_LOGOS = {
  horizontalWhite: "/images/logos/harpia/horizontal-white.svg",
  horizontalDark: "/images/logos/harpia/horizontal-dark.svg",
  horizontal2LinesWhite: "/images/logos/harpia/horizontal-2lines-white.svg",
  stackedWhite: "/images/logos/harpia/vertical-white.svg",
  stackedDark: "/images/logos/harpia/vertical-dark.svg",
  stackedWithBg: "/images/logos/harpia/vertical-with-bg.svg",
  symbolEagleWhite: "/images/logos/harpia/symbol-eagle-white.svg",
  symbolEagleDark: "/images/logos/harpia/symbol-eagle-dark.svg",
  symbolDroneWhite: "/images/logos/harpia/symbol-drone-white.svg",
  symbolDroneDark: "/images/logos/harpia/symbol-drone-dark.svg",
  badgeRounded: "/images/logos/harpia/badge-rounded.svg",
  badgeSquare: "/images/logos/harpia/badge-square.svg",
  badgeRect: "/images/logos/harpia/badge-rect.svg",
  badgeRectRounded: "/images/logos/harpia/badge-rect-rounded.svg",
  textDroneWhite: "/images/logos/harpia/text-drone-white.svg",
  textDroneDark: "/images/logos/harpia/text-drone-dark.svg",
} as const;

export const NAUTILUS_LOGOS = {
  horizontalWhite: "/images/logos/nautilus/horizontal-white.svg",
  horizontalDark: "/images/logos/nautilus/horizontal-dark.svg",
  horizontal2LinesWhite: "/images/logos/nautilus/horizontal-2lines-white.svg",
  stackedWhite: "/images/logos/nautilus/vertical-white.svg",
  stackedDark: "/images/logos/nautilus/vertical-dark.svg",
  stackedWithBg: "/images/logos/nautilus/vertical-with-bg.svg",
  symbolAuvWhite: "/images/logos/nautilus/symbol-auv-white.svg",
  symbolAuvDark: "/images/logos/nautilus/symbol-auv-dark.svg",
  symbolShellWhite: "/images/logos/nautilus/symbol-shell-white.svg",
  symbolShellDark: "/images/logos/nautilus/symbol-shell-dark.svg",
  badgeRounded: "/images/logos/nautilus/badge-rounded.svg",
  badgeSquare: "/images/logos/nautilus/badge-square.svg",
  badgeRect: "/images/logos/nautilus/badge-rect.svg",
  badgeRectRounded: "/images/logos/nautilus/badge-rect-rounded.svg",
  textNautilusWhite: "/images/logos/nautilus/text-nautilus-white.svg",
  textNautilusDark: "/images/logos/nautilus/text-nautilus-dark.svg",
} as const;

/**
 * Tabela de proporções nativas (width, height) por combinação
 */
const ASSET_DIMENSIONS: Record<string, { width: number; height: number; aspect: number }> = {
  "autonomos:horizontal": { width: 477, height: 111, aspect: 477 / 111 },
  "autonomos:stacked": { width: 2400, height: 2400, aspect: 1 },
  "autonomos:symbol": { width: 2400, height: 2400, aspect: 1 },
  "autonomos:badge": { width: 2400, height: 2400, aspect: 1 },

  "harpia:horizontal": { width: 793, height: 278, aspect: 793 / 278 },
  "harpia:stacked": { width: 2400, height: 2400, aspect: 1 },
  "harpia:symbol:eagle": { width: 2400, height: 2400, aspect: 1 },
  "harpia:symbol:drone": { width: 2169, height: 725, aspect: 2169 / 725 },
  "harpia:badge": { width: 2400, height: 2400, aspect: 1 },
  "harpia:badge:rect": { width: 340, height: 191, aspect: 340 / 191 },

  "nautilus:horizontal": { width: 867, height: 232, aspect: 867 / 232 },
  "nautilus:stacked": { width: 2400, height: 2400, aspect: 1 },
  "nautilus:symbol:auv": { width: 2269.2, height: 800, aspect: 2269.2 / 800 },
  "nautilus:symbol:shell": { width: 904, height: 684, aspect: 904 / 684 },
  "nautilus:badge": { width: 2400, height: 2400, aspect: 1 },
  "nautilus:badge:rect": { width: 349, height: 196, aspect: 349 / 196 },
};

/**
 * Resolução do caminho exato do ativo SVG
 */
function resolveAssetSrc(
  division: LogoDivision,
  variant: LogoVariant,
  isDarkArtwork: boolean,
  symbolType?: string,
  badgeShape?: BadgeShape
): string {
  if (division === "harpia") {
    if (variant === "horizontal") {
      return isDarkArtwork ? HARPIA_LOGOS.horizontalDark : HARPIA_LOGOS.horizontalWhite;
    }
    if (variant === "stacked") {
      return isDarkArtwork ? HARPIA_LOGOS.stackedDark : HARPIA_LOGOS.stackedWhite;
    }
    if (variant === "symbol") {
      if (symbolType === "drone") {
        return isDarkArtwork ? HARPIA_LOGOS.symbolDroneDark : HARPIA_LOGOS.symbolDroneWhite;
      }
      return isDarkArtwork ? HARPIA_LOGOS.symbolEagleDark : HARPIA_LOGOS.symbolEagleWhite;
    }
    if (variant === "badge") {
      if (badgeShape === "square") return HARPIA_LOGOS.badgeSquare;
      if (badgeShape === "rect") return HARPIA_LOGOS.badgeRect;
      if (badgeShape === "rect-rounded") return HARPIA_LOGOS.badgeRectRounded;
      return HARPIA_LOGOS.badgeRounded;
    }
  }

  if (division === "nautilus") {
    if (variant === "horizontal") {
      return isDarkArtwork ? NAUTILUS_LOGOS.horizontalDark : NAUTILUS_LOGOS.horizontalWhite;
    }
    if (variant === "stacked") {
      return isDarkArtwork ? NAUTILUS_LOGOS.stackedDark : NAUTILUS_LOGOS.stackedWhite;
    }
    if (variant === "symbol") {
      if (symbolType === "shell") {
        return isDarkArtwork ? NAUTILUS_LOGOS.symbolShellDark : NAUTILUS_LOGOS.symbolShellWhite;
      }
      return isDarkArtwork ? NAUTILUS_LOGOS.symbolAuvDark : NAUTILUS_LOGOS.symbolAuvWhite;
    }
    if (variant === "badge") {
      if (badgeShape === "square") return NAUTILUS_LOGOS.badgeSquare;
      if (badgeShape === "rect") return NAUTILUS_LOGOS.badgeRect;
      if (badgeShape === "rect-rounded") return NAUTILUS_LOGOS.badgeRectRounded;
      return NAUTILUS_LOGOS.badgeRounded;
    }
  }

  // Divisão Padrão: autonomos
  if (variant === "stacked") {
    return isDarkArtwork ? AUTONOMOS_LOGOS.stackedDark : AUTONOMOS_LOGOS.stackedWhite;
  }
  if (variant === "symbol") {
    return isDarkArtwork ? AUTONOMOS_LOGOS.symbolDark : AUTONOMOS_LOGOS.symbolWhite;
  }
  if (variant === "badge") {
    return badgeShape === "square" ? AUTONOMOS_LOGOS.badgeSquare : AUTONOMOS_LOGOS.badgeRounded;
  }
  return isDarkArtwork ? AUTONOMOS_LOGOS.horizontalDark : AUTONOMOS_LOGOS.horizontalWhite;
}

/**
 * Resolução de classes CSS de dimensão
 */
function resolveSizeClasses(
  variant: LogoVariant,
  size: LogoSize
): { className?: string; style?: React.CSSProperties } {
  if (typeof size === "number") {
    if (variant === "horizontal") {
      return { style: { height: `${size}px`, width: "auto" } };
    }
    return { style: { height: `${size}px`, width: `${size}px` } };
  }

  if (variant === "horizontal") {
    switch (size) {
      case "xs":
        return { className: "h-5 w-auto" };
      case "sm":
        return { className: "h-7 w-auto" };
      case "lg":
        return { className: "h-11 w-auto" };
      case "xl":
        return { className: "h-14 w-auto" };
      case "md":
      default:
        return { className: "h-9 w-auto" };
    }
  }

  // Variantes quadradas ou proporcionais: stacked, symbol, badge
  switch (size) {
    case "xs":
      return { className: "h-5 w-5" };
    case "sm":
      return { className: "h-7 w-7" };
    case "lg":
      return { className: "h-12 w-12" };
    case "xl":
      return { className: "h-16 w-16" };
    case "md":
      default:
        return { className: "h-9 w-9" };
  }
}

/**
 * Componente Principal <Logo />
 */
export function Logo({
  division = "autonomos",
  variant = "horizontal",
  size = "md",
  theme = "dark",
  dark = false,
  href,
  className,
  priority = false,
  symbolType,
  badgeShape = "rounded",
  alt,
}: LogoProps) {
  // dark=true ou theme='light' significa aplicar arte escura em fundo claro
  const isDarkArtwork = dark || theme === "light";

  const src = resolveAssetSrc(division, variant, isDarkArtwork, symbolType, badgeShape);

  const dimKey =
    variant === "symbol" && symbolType
      ? `${division}:symbol:${symbolType}`
      : variant === "badge" && (badgeShape === "rect" || badgeShape === "rect-rounded")
      ? `${division}:badge:rect`
      : `${division}:${variant}`;

  const dimensions = ASSET_DIMENSIONS[dimKey] || { width: 300, height: 100, aspect: 3 };

  const defaultLabel =
    division === "harpia"
      ? "UFRJ Harpia — Aeronaves Autônomas"
      : division === "nautilus"
      ? "UFRJ Nautilus — Veículos Subaquáticos"
      : "UFRJ Autônomos";

  const accessibleAlt = alt || defaultLabel;
  const sizeConfig = resolveSizeClasses(variant, size);

  // Resolução de Link automático ou customizado
  const computedHref =
    href === true
      ? division === "harpia"
        ? "/gestao/divisoes#harpia"
        : division === "nautilus"
        ? "/gestao/divisoes#nautilus"
        : "/"
      : typeof href === "string"
      ? href
      : null;

  const content = (
    <span
      className={cn(
        "relative inline-flex items-center justify-center shrink-0 select-none transition-transform duration-200 group-hover:opacity-95",
        sizeConfig.className,
        className
      )}
      style={sizeConfig.style}
    >
      <Image
        src={src}
        alt={accessibleAlt}
        width={dimensions.width}
        height={dimensions.height}
        unoptimized
        priority={priority}
        className={cn(
          "h-full w-auto object-contain transition-transform duration-300",
          variant === "symbol" || variant === "badge" ? "aspect-square" : ""
        )}
      />
      <span className="sr-only">{accessibleAlt}</span>
    </span>
  );

  if (computedHref) {
    return (
      <Link
        href={computedHref}
        className="group inline-flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-lg"
        aria-label={accessibleAlt}
      >
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * Componentes de Conveniência para compatibilidade com site-autonomos
 */
export function AutonomosMark({
  className,
  dark,
  size = "sm",
}: {
  className?: string;
  dark?: boolean;
  size?: LogoSize;
}) {
  return (
    <Logo
      division="autonomos"
      variant="symbol"
      size={size}
      dark={dark}
      className={className}
    />
  );
}

export function HarpiaMark({
  className,
  dark,
  size = "sm",
  symbolType = "eagle",
}: {
  className?: string;
  dark?: boolean;
  size?: LogoSize;
  symbolType?: HarpiaSymbolType;
}) {
  return (
    <Logo
      division="harpia"
      variant="symbol"
      size={size}
      dark={dark}
      symbolType={symbolType}
      className={className}
    />
  );
}

export function NautilusMark({
  className,
  dark,
  size = "sm",
  symbolType = "auv",
}: {
  className?: string;
  dark?: boolean;
  size?: LogoSize;
  symbolType?: NautilusSymbolType;
}) {
  return (
    <Logo
      division="nautilus"
      variant="symbol"
      size={size}
      dark={dark}
      symbolType={symbolType}
      className={className}
    />
  );
}

export function LogoHorizontal({
  division = "autonomos",
  dark = false,
  className,
  size = "md",
  href,
}: {
  division?: LogoDivision;
  dark?: boolean;
  className?: string;
  size?: LogoSize;
  href?: string | boolean | null;
}) {
  return (
    <Logo
      division={division}
      variant="horizontal"
      size={size}
      dark={dark}
      href={href}
      className={className}
    />
  );
}
