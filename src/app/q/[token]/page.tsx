"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Building2,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
} from "lucide-react";

interface QuoteData {
  quote: {
    id: string;
    quoteNumber: string;
    title: string | null;
    status: string;
    createdAt: string;
    validUntil: string | null;
    notes: string | null;
    subtotal: string;
    taxAmount: string;
    total: string;
    isExpired: boolean;
    canRespond: boolean;
  };
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo: string | null;
  };
  client: {
    name: string;
  };
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
  }>;
}

function formatCurrency(value: string): string {
  return parseFloat(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Check }> = {
  draft: { label: "Brouillon", color: "text-slate-600", bg: "bg-slate-100", icon: FileText },
  sent: { label: "Envoyé", color: "text-blue-600", bg: "bg-blue-50", icon: Clock },
  viewed: { label: "Consulté", color: "text-purple-600", bg: "bg-purple-50", icon: Clock },
  accepted: { label: "Accepté", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
  rejected: { label: "Refusé", color: "text-red-600", bg: "bg-red-50", icon: XCircle },
  expired: { label: "Expiré", color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  invoiced: { label: "Facturé", color: "text-indigo-600", bg: "bg-indigo-50", icon: FileText },
};

export default function PublicQuotePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<QuoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<"idle" | "loading" | "accepted" | "rejected">("idle");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/public/quotes/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Devis introuvable");
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleAction = async (action: "accept" | "reject") => {
    setActionState("loading");
    setActionError(null);

    try {
      const res = await fetch(`/api/public/quotes/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de l'action");
      }

      setActionState(action === "accept" ? "accepted" : "rejected");

      // Update local data
      if (data) {
        setData({
          ...data,
          quote: { ...data.quote, status: result.status, canRespond: false },
        });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erreur inconnue");
      setActionState("idle");
    }
  };

  // ── Loading state ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-500" />
          <p className="mt-4 text-sm text-muted-foreground">Chargement du devis...</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-red-50 p-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{error || "Devis introuvable"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ce lien est peut-être invalide ou a expiré. Vérifiez que vous avez copié l&apos;URL complète.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quote, organization, client, lines } = data;
  const status = statusConfig[quote.status] ?? statusConfig.draft;
  const StatusIcon = status.icon;

  // ── Confirmation state (after accept/reject) ──────
  if (actionState === "accepted" || actionState === "rejected") {
    const isAccepted = actionState === "accepted";
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4">
        <Card className="max-w-lg w-full">
          <CardContent className="flex flex-col items-center gap-6 py-12">
            <div className={`rounded-full p-4 ${isAccepted ? "bg-green-50" : "bg-red-50"}`}>
              {isAccepted ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold">
                {isAccepted ? "Devis accepté !" : "Devis refusé"}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {isAccepted
                  ? `Merci ${client.name} ! ${organization.name} a été notifié et vous enverra la facture prochainement.`
                  : `Votre refus a été enregistré. ${organization.name} a été notifié.`}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-6 py-3 text-center">
              <p className="text-xs text-muted-foreground">Devis</p>
              <p className="font-mono font-semibold">{quote.quoteNumber}</p>
              <p className="text-lg font-bold text-indigo-600 mt-1">{formatCurrency(quote.total)} € TTC</p>
            </div>
            {organization.email && (
              <a
                href={`mailto:${organization.email}`}
                className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
              >
                <Mail className="h-3 w-3" />
                Contacter {organization.name}
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main quote view ───────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        {/* Header */}
        <Card className="overflow-hidden">
          {/* Gradient header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                {organization.logo ? (
                  <img src={organization.logo} alt={organization.name} className="h-10 w-10 rounded bg-white/20 object-contain p-1 mb-2" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-white/20 mb-2">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <h1 className="text-xl font-bold">{organization.name}</h1>
                <div className="mt-1 text-sm text-white/80 space-y-0.5">
                  {organization.address && <p className="flex items-center gap-1"><MapPin className="h-3 w-3" />{organization.address}</p>}
                  {organization.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{organization.email}</p>}
                  {organization.phone && <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{organization.phone}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/70 uppercase tracking-wider">Devis</p>
                <p className="text-2xl font-bold font-mono">{quote.quoteNumber}</p>
                <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                  <StatusIcon className="inline h-3 w-3 mr-1" />
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-8">
            {/* Client + dates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client</p>
                <p className="mt-1 text-lg font-semibold">{client.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Date d&apos;émission</p>
                <p className="mt-1">{formatDate(quote.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Validité</p>
                <p className="mt-1">
                  {quote.validUntil ? (
                    <span className={quote.isExpired ? "text-red-600 font-medium" : ""}>
                      {formatDate(quote.validUntil)}
                      {quote.isExpired && " (expiré)"}
                    </span>
                  ) : (
                    "Non définie"
                  )}
                </p>
              </div>
            </div>

            {/* Title */}
            {quote.title && (
              <>
                <Separator className="my-6" />
                <h2 className="text-lg font-semibold">{quote.title}</h2>
              </>
            )}
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="pl-6 w-8">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right w-16">Qté</TableHead>
                  <TableHead className="text-right w-24">Prix HT</TableHead>
                  <TableHead className="text-right w-16">TVA</TableHead>
                  <TableHead className="pr-6 text-right w-28">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6 text-muted-foreground font-mono text-xs">
                      {String(i + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell className="font-medium">{line.description}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(line.unitPrice)} €</TableCell>
                    <TableCell className="text-right text-muted-foreground">{line.taxRate}%</TableCell>
                    <TableCell className="pr-6 text-right font-semibold">{formatCurrency(line.lineTotal)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="p-6">
            <div className="ml-auto w-72 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span className="font-medium">{formatCurrency(quote.subtotal)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA</span>
                <span className="font-medium">{formatCurrency(quote.taxAmount)} €</span>
              </div>
              <Separator />
              <div className="flex justify-between text-xl font-bold">
                <span>Total TTC</span>
                <span className="text-indigo-600">{formatCurrency(quote.total)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-slate-700">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* ── Action buttons ──────────────────────────── */}
        {quote.canRespond && !quote.isExpired && (
          <Card className="border-2 border-indigo-100 bg-indigo-50/50">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Votre décision</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vous pouvez accepter ou refuser ce devis directement en ligne.
                </p>
              </div>

              {actionError && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 text-center">
                  {actionError}
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="flex-1 max-w-[200px] h-14 text-base border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300"
                  onClick={() => handleAction("reject")}
                  disabled={actionState === "loading"}
                >
                  {actionState === "loading" ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <X className="mr-2 h-5 w-5" />
                  )}
                  Refuser
                </Button>
                <Button
                  size="lg"
                  className="flex-1 max-w-[200px] h-14 text-base bg-green-600 hover:bg-green-700"
                  onClick={() => handleAction("accept")}
                  disabled={actionState === "loading"}
                >
                  {actionState === "loading" ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-5 w-5" />
                  )}
                  Accepter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Expired notice */}
        {quote.isExpired && (
          <Card className="border-2 border-amber-200 bg-amber-50">
            <CardContent className="p-6 text-center">
              <Clock className="mx-auto h-8 w-8 text-amber-500 mb-2" />
              <h3 className="text-lg font-semibold text-amber-800">Ce devis a expiré</h3>
              <p className="text-sm text-amber-700 mt-1">
                La date de validité ({formatDate(quote.validUntil)}) est dépassée.
                Veuillez contacter {organization.name} pour obtenir un nouveau devis.
              </p>
              {organization.email && (
                <a
                  href={`mailto:${organization.email}?subject=Devis ${quote.quoteNumber} expiré`}
                  className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:text-amber-900"
                >
                  <Mail className="h-4 w-4" />
                  Contacter par email
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Already responded notice */}
        {!quote.canRespond && !quote.isExpired && quote.status !== "draft" && (
          <Card className={`border-2 ${quote.status === "accepted" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
            <CardContent className="p-6 text-center">
              {quote.status === "accepted" ? (
                <>
                  <CheckCircle2 className="mx-auto h-8 w-8 text-green-500 mb-2" />
                  <h3 className="text-lg font-semibold text-green-800">Devis accepté</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Vous avez déjà accepté ce devis. {organization.name} va vous envoyer la facture.
                  </p>
                </>
              ) : quote.status === "rejected" ? (
                <>
                  <XCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                  <h3 className="text-lg font-semibold text-red-800">Devis refusé</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Vous avez refusé ce devis. Contactez {organization.name} si vous souhaitez le modifier.
                  </p>
                </>
              ) : quote.status === "invoiced" ? (
                <>
                  <FileText className="mx-auto h-8 w-8 text-indigo-500 mb-2" />
                  <h3 className="text-lg font-semibold text-indigo-800">Devis facturé</h3>
                  <p className="text-sm text-indigo-700 mt-1">
                    Ce devis a été converti en facture. Vous devriez recevoir la facture prochainement.
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">
            Document généré par{" "}
            <a href="https://croissantdevis.app" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
              CroissantDevis
              <ExternalLink className="inline h-3 w-3 ml-0.5" />
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
