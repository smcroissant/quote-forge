"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Building2, Briefcase, Settings, ChevronRight, ChevronLeft, PartyPopper, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────
const SECTORS = [
  { value: "dev-web", label: "Développement Web" },
  { value: "design", label: "Design / Création" },
  { value: "marketing", label: "Marketing / Communication" },
  { value: "conseil", label: "Conseil / Consulting" },
  { value: "artisanat", label: "Artisanat / Services" },
  { value: "comptabilite", label: "Comptabilité / Juridique" },
  { value: "autre", label: "Autre" },
] as const;

const CURRENCIES = [
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CHF", label: "CHF (CHF)" },
] as const;

const TAX_RATES = [
  { value: "0.00", label: "0%" },
  { value: "5.50", label: "5,5%" },
  { value: "10.00", label: "10%" },
  { value: "20.00", label: "20%" },
] as const;

// ── Helpers ─────────────────────────────────────────
const generateSlug = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const steps = [
  { number: 1, title: "Entreprise", icon: Building2 },
  { number: 2, title: "Secteur", icon: Briefcase },
  { number: 3, title: "Devise & TVA", icon: Settings },
];

// ── Component ───────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 — Entreprise
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");

  // Step 2 — Secteur
  const [sector, setSector] = useState("");
  const [sectorOther, setSectorOther] = useState("");

  // Step 3 — Devise & TVA
  const [currency, setCurrency] = useState("EUR");
  const [taxRate, setTaxRate] = useState("20.00");
  const [taxEnabled, setTaxEnabled] = useState(true);

  // ── Validation per step ───────────────────────────
  const canProceedStep1 = orgName.trim().length >= 2;
  const canProceedStep2 = sector !== "" && (sector !== "autre" || sectorOther.trim().length > 0);
  const canProceedStep3 = currency !== "" && taxRate !== "";

  // ── Navigation ────────────────────────────────────
  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };
  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const skip = () => {
    router.push("/dashboard");
  };

  const completeOnboarding = trpc.organization.completeOnboarding.useMutation();

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canProceedStep1) return;
    setIsLoading(true);

    try {
      // 1. Create organization
      const result = await authClient.organization.create({
        name: orgName.trim(),
        slug: generateSlug(orgName),
      });

      if (result.error) {
        toast.error(result.error.message || "Erreur lors de la création de l'organisation");
        return;
      }

      // 2. Save all onboarding fields (email, phone, address, sector, billing)
      await completeOnboarding.mutateAsync({
        name: orgName.trim(),
        email: orgEmail.trim() || null,
        phone: orgPhone.trim() || null,
        address: orgAddress.trim() || null,
        sector: sector === "autre" ? sectorOther.trim() : sector || null,
        currency,
        taxRate,
        taxEnabled,
      });

      toast.success("Bienvenue sur QuoteForge ! Créez votre premier devis 🥐");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">
            Bienvenue sur QuoteForge
          </CardTitle>
          <CardDescription>
            Configurons votre espace en 3 étapes
          </CardDescription>
        </CardHeader>

        {/* ── Step indicator ────────────────────────── */}
        <div className="px-6 pb-2">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={s.number} className="flex items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors",
                    step === s.number
                      ? "border-primary bg-primary text-primary-foreground"
                      : step > s.number
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/25 text-muted-foreground"
                  )}
                >
                  {step > s.number ? (
                    <s.icon className="h-4 w-4" />
                  ) : (
                    s.number
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={cn(
                      "mx-2 h-0.5 w-12 sm:w-16",
                      step > s.number ? "bg-primary" : "bg-muted-foreground/25"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            {steps.map((s) => (
              <span
                key={s.number}
                className={cn(
                  step === s.number && "font-medium text-foreground"
                )}
              >
                {s.title}
              </span>
            ))}
          </div>
        </div>

        {/* ── Step 1 : Entreprise ───────────────────── */}
        {step === 1 && (
          <>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">Nom de l&apos;entreprise *</Label>
                <Input
                  id="orgName"
                  type="text"
                  placeholder="Acme SARL"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgEmail">Email professionnel</Label>
                <Input
                  id="orgEmail"
                  type="email"
                  placeholder="contact@acme.fr"
                  value={orgEmail}
                  onChange={(e) => setOrgEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgPhone">Téléphone</Label>
                  <Input
                    id="orgPhone"
                    type="tel"
                    placeholder="01 23 45 67 89"
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgAddress">Adresse</Label>
                  <Input
                    id="orgAddress"
                    type="text"
                    placeholder="1 rue Example"
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={skip} disabled={isLoading}>
                Passer
              </Button>
              <Button onClick={nextStep} disabled={!canProceedStep1}>
                Suivant
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* ── Step 2 : Secteur ──────────────────────── */}
        {step === 2 && (
          <>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Sélectionnez votre secteur d&apos;activité principal
              </p>
              <div className="space-y-2">
                {SECTORS.map((s) => (
                  <label
                    key={s.value}
                    className={cn(
                      "flex cursor-pointer items-center rounded-lg border p-3 transition-colors hover:bg-muted/50",
                      sector === s.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    )}
                  >
                    <input
                      type="radio"
                      name="sector"
                      value={s.value}
                      checked={sector === s.value}
                      onChange={(e) => setSector(e.target.value)}
                      className="sr-only"
                      disabled={isLoading}
                    />
                    <div
                      className={cn(
                        "mr-3 flex h-4 w-4 items-center justify-center rounded-full border-2",
                        sector === s.value
                          ? "border-primary"
                          : "border-muted-foreground/50"
                      )}
                    >
                      {sector === s.value && (
                        <div className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-sm">{s.label}</span>
                  </label>
                ))}
              </div>
              {sector === "autre" && (
                <div className="space-y-2">
                  <Label htmlFor="sectorOther">Précisez votre secteur</Label>
                  <Input
                    id="sectorOther"
                    type="text"
                    placeholder="Ex : Restauration, Immobilier..."
                    value={sectorOther}
                    onChange={(e) => setSectorOther(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={prevStep} disabled={isLoading}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Retour
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={skip} disabled={isLoading}>
                  Passer
                </Button>
                <Button onClick={nextStep} disabled={!canProceedStep2}>
                  Suivant
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </>
        )}

        {/* ── Step 3 : Devise & TVA ─────────────────── */}
        {step === 3 && (
          <>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Configurez la devise et la TVA par défaut pour vos devis
              </p>
              <div className="space-y-2">
                <Label htmlFor="currency">Devise</Label>
                <Select
                  value={currency}
                  onValueChange={(val) => val && setCurrency(val)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={(e) => setTaxEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                    disabled={isLoading}
                  />
                  Je suis assujetti à la TVA
                </Label>
              </div>
              {taxEnabled && (
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Taux de TVA par défaut</Label>
                  <Select
                    value={taxRate}
                    onValueChange={(val) => val && setTaxRate(val)}
                    disabled={isLoading}
                  >
                    <SelectTrigger id="taxRate">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TAX_RATES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="ghost" onClick={prevStep} disabled={isLoading}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Retour
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={skip} disabled={isLoading}>
                  Passer
                </Button>
                <Button onClick={handleSubmit} disabled={isLoading || !canProceedStep1}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <PartyPopper className="mr-2 h-4 w-4" />
                  )}
                  Terminer 🎉
                </Button>
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
