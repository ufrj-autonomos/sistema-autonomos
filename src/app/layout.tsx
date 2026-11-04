import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PlatformShell } from "@/components/layout/platform-shell";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { themeBootstrap } from "@/lib/theme";
import { getAppOrigin } from "@/lib/environment";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

export const viewport: Viewport = {
  themeColor: "#0A0A0B",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(getAppOrigin()),
  title: {
    default: "UFRJ Autônomos — Sistema Integrado de Gestão e Ensino",
    template: "%s | UFRJ Autônomos",
  },
  description:
    "Ecossistema modular de engenharia, gestão e plataforma educacional com ROS 2 Jazzy. Desenvolvendo drones aéreos (Harpia) e veículos submarinos (Nautilus).",
  keywords: [
    "UFRJ",
    "Autônomos",
    "Robótica",
    "ROS 2",
    "Jazzy",
    "Harpia",
    "Nautilus",
    "AUV",
    "UAV",
    "Drones",
    "Submarinos",
  ],
  authors: [{ name: "UFRJ Autônomos" }],
  icons: {
    icon: "/images/logos/autonomos/symbol-white.svg",
    apple: "/images/logos/autonomos/badge-rounded.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans antialiased min-h-screen bg-background text-foreground flex flex-col`}
      >
        <ThemeProvider><AuthProvider>
          <PlatformShell>{children}</PlatformShell>
        </AuthProvider></ThemeProvider>
      </body>
    </html>
  );
}
