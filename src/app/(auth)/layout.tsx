import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuoteForge — Authentification",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
