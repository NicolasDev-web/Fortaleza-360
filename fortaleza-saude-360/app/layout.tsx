import type { Metadata, Viewport } from "next";
import {
  Alfa_Slab_One,
  Bricolage_Grotesque,
  JetBrains_Mono,
  Space_Grotesk,
} from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--ff-display",
  display: "swap",
});

const ui = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--ff-ui",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--ff-mono",
  display: "swap",
});

// Numeração de folheto de cordel ("Nº 1"); usada só em detalhes.
const cordel = Alfa_Slab_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--ff-cordel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fortaleza Saúde 360° | Observatório territorial",
  description:
    "Protótipo de inteligência territorial em saúde: UAPS cadastradas sobre os bairros oficiais de Fortaleza, contado como uma história, com fonte e limitações visíveis.",
};

export const viewport: Viewport = {
  themeColor: "#1f1a17",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${ui.variable} ${mono.variable} ${cordel.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
