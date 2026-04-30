import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SIGDM Mali – Système Intégré de Gestion des Déplacements au Mali",
  description:
    "Plateforme nationale de digitalisation, suivi et contrôle des déplacements sur le territoire malien. Déclaration obligatoire des trajets, contrôle aux postes, traçabilité véhicules et passagers.",
  keywords: [
    "Mali",
    "déplacements",
    "transport",
    "contrôle",
    "sécurité",
    "digitalisation",
    "SIGDM",
  ],
  authors: [{ name: "République du Mali – Ministère de la Sécurité" }],
  robots: "noindex, nofollow", // Plateforme gouvernementale – non indexée
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${poppins.variable} h-full antialiased`}
    >
      <body className={`min-h-full flex flex-col font-sans`}>{children}</body>
    </html>
  );
}
