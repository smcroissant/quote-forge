"use client";

import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Building2, Receipt, Palette, Upload, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Constants ───────────────────────────────────────
const CURRENCIES = [
  { value: "EUR", label: "EUR (€)" },
  { value: "USD", label: "USD ($)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CHF", label: "CHF (CHF)" },
];

const TAX_RATES = [
  { value: "0.00", label: "0%" },
  { value: "5.50", label: "5,5%" },
  { value: "10.00", label: "10%" },
  { value: "20.00", label: "20%" },
];

const COUNTRIES = [
  { value: "FR", label: "France" },
  { value: "BE", label: "Belgique" },
  { value: "CH", label: "Suisse" },
  { value: "LU", label: "Luxembourg" },
  { value: "CA", label: "Canada" },
  { value: "MA", label: "Maroc" },
  { value: "TN", label: "Tunisie" },
  { value: "SN", label: "Sénégal" },
];

const TABS = [
  { id: "info", label: "Informations", icon: Building2 },
  { id: "billing", label: "Facturation", icon: Receipt },
  { id: "branding", label: "Branding", icon: Palette },
] as const;

type TabId = (typeof TABS)[number]["id"];

// ── Component ───────────────────────────────────────
export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("info");
  const [isSaving, setIsSaving] = useState(false);

  const { data: org, isLoading, refetch } = trpc.organization.get.useQuery();

  // ── Form state ────────────────────────────────────
  // Info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("FR");
  const [website, setWebsite] = useState("");

  // Billing
  const [currency, setCurrency] = useState("EUR");
  const [taxRate, setTaxRate] = useState("20.00");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [quotePrefix, setQuotePrefix] = useState("DEV-");
  const [nextQuoteNumber, setNextQuoteNumber] = useState(1);

  // Bank
  const [bankName, setBankName] = useState("");
  const [bankIban, setBankIban] = useState("");
  const [bankBic, setBankBic] = useState("");

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // ── Populate form from DB ─────────────────────────
  useEffect(() => {
    if (org) {
      setName(org.name ?? "");
      setEmail(org.email ?? "");
      setPhone(org.phone ?? "");
      setAddress(org.address ?? "");
      setCity(org.city ?? "");
      setPostalCode(org.postalCode ?? "");
      setCountry(org.country ?? "FR");
      setWebsite(org.website ?? "");
      setCurrency(org.currency ?? "EUR");
      setTaxRate(org.taxRate ?? "20.00");
      setTaxEnabled(org.taxEnabled ?? true);
      setQuotePrefix(org.quotePrefix ?? "DEV-");
      setNextQuoteNumber(org.nextQuoteNumber ?? 1);
      setBankName(org.bankName ?? "");
      setBankIban(org.bankIban ?? "");
      setBankBic(org.bankBic ?? "");
      setLogoUrl(org.logo ?? null);
    }
  }, [org]);

  // ── Mutations ─────────────────────────────────────
  const updateInfo = trpc.organization.updateInfo.useMutation({
    onSuccess: () => { toast.success("Informations sauvegardées"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateBilling = trpc.organization.updateBilling.useMutation({
    onSuccess: () => { toast.success("Facturation mise à jour"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateBank = trpc.organization.updateBank.useMutation({
    onSuccess: () => { toast.success("Coordonnées bancaires sauvegardées"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const updateLogo = trpc.organization.updateLogo.useMutation({
    onSuccess: () => { toast.success("Logo mis à jour"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  // ── Save handlers ─────────────────────────────────
  const saveInfo = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateInfo.mutateAsync({
        name: name || undefined,
        email: email || null,
        phone: phone || null,
        address: address || null,
        city: city || null,
        postalCode: postalCode || null,
        country,
        website: website || null,
      });
    } finally {
      setIsSaving(false);
    }
  }, [name, email, phone, address, city, postalCode, country, website, updateInfo]);

  const saveBilling = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateBilling.mutateAsync({
        currency,
        taxRate,
        taxEnabled,
        quotePrefix,
        nextQuoteNumber,
      });
      await updateBank.mutateAsync({
        bankName: bankName || null,
        bankIban: bankIban || null,
        bankBic: bankBic || null,
      });
    } finally {
      setIsSaving(false);
    }
  }, [currency, taxRate, taxEnabled, quotePrefix, nextQuoteNumber, bankName, bankIban, bankBic, updateBilling, updateBank]);

  const handleLogoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 2MB)");
      return;
    }

    // For MVP: store as base64 data URL
    // In production: upload to S3/Vercel Blob
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      await updateLogo.mutateAsync({ logo: dataUrl });
    };
    reader.readAsDataURL(file);
  }, [updateLogo]);

  // ── Render ────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground">
          Configurez votre entreprise et vos préférences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Informations ───────────────────────── */}
      {activeTab === "info" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations entreprise</CardTitle>
              <CardDescription>
                Ces informations apparaissent sur vos devis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;entreprise *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Acme SARL"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@acme.fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01 23 45 67 89"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="1 rue Example"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">Ville</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Paris"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Code postal</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="75001"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Select value={country} onValueChange={(v) => v && setCountry(v)}>
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Site web</Label>
                <Input
                  id="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://acme.fr"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveInfo} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab: Facturation ────────────────────────── */}
      {activeTab === "billing" && (
        <div className="space-y-6">
          {/* Devise & TVA */}
          <Card>
            <CardHeader>
              <CardTitle>Devise & TVA</CardTitle>
              <CardDescription>
                Valeurs par défaut pour vos nouveaux devis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
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
                  <Label htmlFor="taxRate">Taux de TVA par défaut</Label>
                  <Select
                    value={taxRate}
                    onValueChange={(v) => v && setTaxRate(v)}
                    disabled={!taxEnabled}
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
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={taxEnabled}
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <span className="text-sm">Assujetti à la TVA</span>
              </label>
            </CardContent>
          </Card>

          {/* Numérotation */}
          <Card>
            <CardHeader>
              <CardTitle>Numérotation des devis</CardTitle>
              <CardDescription>
                Format des numéros de devis automatiques
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quotePrefix">Préfixe</Label>
                  <Input
                    id="quotePrefix"
                    value={quotePrefix}
                    onChange={(e) => setQuotePrefix(e.target.value)}
                    placeholder="DEV-"
                  />
                  <p className="text-xs text-muted-foreground">
                    Exemple : {quotePrefix}202603-0001
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextQuoteNumber">Prochain numéro</Label>
                  <Input
                    id="nextQuoteNumber"
                    type="number"
                    min="1"
                    value={nextQuoteNumber}
                    onChange={(e) => setNextQuoteNumber(parseInt(e.target.value) || 1)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Actuel : {org?.nextQuoteNumber ?? 1}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Coordonnées bancaires */}
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées bancaires</CardTitle>
              <CardDescription>
                Affichées sur vos devis pour les paiements par virement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Nom de la banque</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="BNP Paribas"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankIban">IBAN</Label>
                  <Input
                    id="bankIban"
                    value={bankIban}
                    onChange={(e) => setBankIban(e.target.value)}
                    placeholder="FR76 1234 5678 9012 3456 7890 123"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankBic">BIC / SWIFT</Label>
                  <Input
                    id="bankBic"
                    value={bankBic}
                    onChange={(e) => setBankBic(e.target.value)}
                    placeholder="BNPAFRPP"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={saveBilling} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Enregistrer
            </Button>
          </div>
        </div>
      )}

      {/* ── Tab: Branding ───────────────────────────── */}
      {activeTab === "branding" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logo</CardTitle>
              <CardDescription>
                Apparaît en haut de vos devis. PNG, JPG ou SVG, max 2MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo preview */}
              {logoUrl && (
                <div className="flex items-center gap-4 rounded-lg border p-4">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-16 w-16 rounded-lg object-contain"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Logo actuel</p>
                    <p className="text-xs text-muted-foreground">
                      Cliquez ci-dessous pour le remplacer
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setLogoUrl(null);
                      updateLogo.mutate({ logo: null });
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              )}

              {/* Upload */}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors hover:border-primary/50 hover:bg-muted/50">
                <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">
                  {logoUrl ? "Remplacer le logo" : "Télécharger un logo"}
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou SVG — max 2MB
                </p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Aperçu sur devis</CardTitle>
              <CardDescription>
                Voici à quoi ressemblera l&apos;en-tête de vos devis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="Logo"
                        className="h-10 w-10 rounded object-contain"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold">{name || "Votre Entreprise"}</p>
                      <p className="text-xs text-muted-foreground">
                        {address || "Adresse"}, {postalCode || "CP"} {city || "Ville"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {email || "email@entreprise.fr"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">DEVIS</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {quotePrefix}202603-0001
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
