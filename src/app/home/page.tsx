import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Clock,
  Palette,
  Mail,
  CreditCard,
  Shield,
  ArrowRight,
  Check,
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QuoteForge — Devis professionnels en 2 minutes",
  description:
    "Créez, envoyez et suivez vos devis B2B. Templates PDF personnalisables, envoi par email, acceptation en ligne. Gratuit pendant la bêta.",
};

const features = [
  {
    icon: Clock,
    title: "Création en 2 minutes",
    description:
      "Sélectionnez vos produits, choisissez un client, et votre devis est prêt.",
  },
  {
    icon: Palette,
    title: "Templates PDF personnalisables",
    description:
      "3 designs professionnels avec vos couleurs, logo et conditions générales.",
  },
  {
    icon: Mail,
    title: "Envoi par email intégré",
    description:
      "Envoyez vos devis directement depuis l'app avec suivi d'ouverture.",
  },
  {
    icon: FileText,
    title: "Acceptation en ligne",
    description:
      "Votre client accepte ou refuse le devis en un clic depuis son téléphone.",
  },
  {
    icon: CreditCard,
    title: "Conversion en facture",
    description:
      "Un devis accepté ? Convertissez-le en facture en un clic.",
  },
  {
    icon: Shield,
    title: "Rappels automatiques",
    description:
      "Plus jamais d'oubli — les rappels de paiement sont envoyés tout seuls.",
  },
];

const steps = [
  {
    number: "1",
    title: "Ajoutez vos produits",
    description: "Créez votre catalogue de produits et services réutilisables.",
  },
  {
    number: "2",
    title: "Créez un devis",
    description:
      "Sélectionnez un client, ajoutez des lignes, personnalisez le template.",
  },
  {
    number: "3",
    title: "Envoyez & suivez",
    description:
      "Envoyez par email, suivez les ouvertures, recevez les acceptations.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/home" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <span className="text-xl font-bold">QuoteForge</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Se connecter
            </Link>
            <Button render={<Link href="/signup" />}>
              Commencer gratuitement
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        <div className="relative mx-auto max-w-6xl px-4 text-center">
          <div className="mx-auto max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Devis professionnels{" "}
              <span className="text-indigo-600">en 2 minutes</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
              Créez, envoyez et suivez vos devis B2B. Templates PDF
              personnalisables, envoi par email, acceptation en ligne.
              <span className="font-semibold text-foreground">
                {" "}
                Gratuit pendant la bêta.
              </span>
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" render={<Link href="/signup" />} className="h-12 px-8 text-base">
                <span className="flex items-center">
                  Créer mon premier devis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/login" />}
                className="h-12 px-8 text-base"
              >
                Se connecter
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Aucune carte requise · Configuration en 30 secondes
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Tout ce qu&apos;il faut pour gérer vos devis
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Pas de tableur, pas de PDF manuel. Juste un outil qui marche.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100">
                  <feature.icon className="h-5 w-5 text-indigo-600" />
                </div>
                <h3 className="mt-4 font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t bg-slate-50 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Comment ça marche ?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              3 étapes simples. Pas de formation nécessaire.
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-xl font-bold text-white">
                  {step.number}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple et transparent
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Gratuit pendant la bêta. Pas de carte requise.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-md">
            <div className="rounded-2xl border-2 border-indigo-600 p-8">
              <div className="text-center">
                <h3 className="text-lg font-semibold">Bêta gratuite</h3>
                <div className="mt-4">
                  <span className="text-4xl font-bold">0 €</span>
                  <span className="text-muted-foreground"> / mois</span>
                </div>
              </div>
              <ul className="mt-8 space-y-3">
                {[
                  "Devis illimités",
                  "Templates PDF personnalisables",
                  "Envoi par email",
                  "Acceptation en ligne",
                  "Conversion en facture",
                  "Rappels de paiement automatiques",
                  "Support prioritaire bêta",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-indigo-600" />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                size="lg"
                render={<Link href="/signup" />}
              >
                Commencer gratuitement
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-indigo-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Prêt à simplifier vos devis ?
          </h2>
          <p className="mt-4 text-lg text-indigo-100">
            Rejoignez la bêta et créez votre premier devis en 2 minutes.
          </p>
          <Button
            size="lg"
            variant="secondary"
            render={<Link href="/signup" />}
            className="mt-8 h-12 px-8 text-base"
          >
            <span className="flex items-center">
              Créer mon compte
              <ArrowRight className="ml-2 h-4 w-4" />
            </span>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4">
          <Link href="/home" className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            QuoteForge
          </Link>
          <p className="text-sm text-muted-foreground">
            © 2026 QuoteForge. Fait avec ❤️ en France.
          </p>
        </div>
      </footer>
    </div>
  );
}
