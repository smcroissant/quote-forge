import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Devis — CroissantDevis",
  description: "Consultez votre devis en ligne",
  openGraph: {
    title: "Nouveau devis — CroissantDevis",
    description: "Consultez et validez votre devis en ligne",
    type: "website",
    siteName: "CroissantDevis",
  },
  twitter: {
    card: "summary",
    title: "Nouveau devis — CroissantDevis",
    description: "Consultez et validez votre devis en ligne",
  },
  robots: {
    index: false, // Don't index quote pages
    follow: false,
  },
};

export default function PublicQuoteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
