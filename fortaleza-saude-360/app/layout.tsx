import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Fortaleza Saúde 360° | Protótipo", description: "Inteligência territorial em saúde — demonstração conceitual" };
export default function RootLayout({children}:{children:React.ReactNode}) {return <html lang="pt-BR"><body>{children}</body></html>}
