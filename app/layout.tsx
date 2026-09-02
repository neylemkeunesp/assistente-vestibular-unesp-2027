import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const configuredOrigin = process.env.SITE_ORIGIN;
const metadataBase = new URL(configuredOrigin && /^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(configuredOrigin) ? configuredOrigin : "http://localhost:4190");

export const metadata: Metadata = {
  metadataBase,
  title: "Assistente Vestibular Unesp 2027",
  description: "Informações sobre cursos, regras, cidades e profissões no Vestibular Unesp.",
  openGraph: {
    title: "Assistente Vestibular Unesp 2027",
    description: "Cursos, cidades e carreiras explicados para estudantes.",
    images: [{ url: "/og.png", width: 1732, height: 909, alt: "Assistente Vestibular Unesp 2027" }],
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Assistente Vestibular Unesp 2027",
    description: "Cursos, cidades e carreiras explicados para estudantes.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
