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
import { Textarea } from "@/components/ui/textarea";
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
    city: string | null;
    postalCode: string | null;
    logo: string | null;
    siret: string | null;
    vatNumber: string | null;
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

function formatOrgAddress(org: QuoteData["organization"]): string {
  return [org.address, org.postalCode && org.city ? `${org.postalCode} ${org.city}` : org.city]
    .filter(Boolean)
    .join(", ");
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
  const [actionState, setActionState] = useState<"idle" | "confirm-reject" | "loading" | "accepted" | "rejected">("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [rejectComment, setRejectComment] = useState("");

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
        body: JSON.stringify({ action, comment: rejectComment || undefined }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Erreur lors de l'action");
      }

      setActionState(action === "accept" ? "accepted" : "rejected");

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
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <div className="rounded-full bg-red-50 p-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{error || "Devis introuvable"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ce lien est peut-être invalide ou a expiré. Vérifiez que vous avez copier l&apos;URL complète.
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
  const fullAddress = formatOrgAddress(organization);

  // ── Confirmation state (after accept/reject) ──────
  if (actionState === "accepted" || actionState === "rejected") {
    const isAccepted = actionState === "accepted";
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-lg w-full mx-4">
          <CardContent className="flex flex-col items-center gap-6 py-12 px-6">
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
            <div className="rounded-lg bg-slate-50 px-6 py-4 text-center w-full">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Devis</p>
              <p className="font-mono font-semibold mt-1">{quote.quoteNumber}</p>
              <p className="text-2xl font-bold text-indigo-600 mt-2">{formatCurrency(quote.total)} €</p>
              <p className="text-xs text-muted-foreground">TTC</p>
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
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8 space-y-4 sm:space-y-6">
        {/* ── Header Card ────────────────────────────── */}
        <Card className="overflow-hidden shadow-sm">
          {/* Gradient header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 sm:px-8 py-6 text-white">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                {organization.logo ? (
                  <img
                    src={organization.logo}
                    alt={organization.name}
                    className="h-12 w-12 rounded-lg bg-white/20 object-contain p-1.5 mb-3"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 mb-3">
                    <Building2 className="h-6 w-6" />
                  </div>
                )}
                <h1 className="text-xl font-bold">{organization.name}</h1>
                <div className="mt-2 text-sm text-white/80 space-y-1">
                  {fullAddress && (
                    <p className="flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{fullAddress}</span>
                    </p>
                  )}
                  {organization.email && (
                    <p className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <a href={`mailto:${organization.email}`} className="hover:underline">
                        {organization.email}
                      </a>
                    </p>
                  )}
                  {organization.phone && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <a href={`tel:${organization.phone}`} className="hover:underline">
                        {organization.phone}
                      </a>
                    </p>
                  )}
                </div>
                {/* Legal info */}
                {(organization.siret || organization.vatNumber) && (
                  <div className="mt-3 pt-3 border-t border-white/20 text-xs text-white/60 space-y-0.5">
                    {organization.siret && <p>SIRET : {organization.siret}</p>}
                    {organization.vatNumber && <p>TVA : {organization.vatNumber}</p>}
                  </div>
                )}
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-sm text-white/70 uppercase tracking-wider font-medium">Devis</p>
                <p className="text-2xl font-bold font-mono mt-0.5">{quote.quoteNumber}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${status.bg} ${status.color}`}>
                  <StatusIcon className="h-3 w-3" />
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          <CardContent className="p-6 sm:p-8">
            {/* Client + dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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

        {/* ── Lines Table ────────────────────────────── */}
        <Card className="shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead className="pl-4 sm:pl-6 w-8">#</TableHead>
                  <TableHead className="min-w-[150px]">Description</TableHead>
                  <TableHead className="text-right w-16">Qté</TableHead>
                  <TableHead className="text-right w-24">Prix HT</TableHead>
                  <TableHead className="text-right w-14 hidden sm:table-cell">TVA</TableHead>
                  <TableHead className="pr-4 sm:pr-6 text-right w-28">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4 sm:pl-6 text-muted-foreground font-mono text-xs">
                      {String(i + 1).padStart(2, "0")}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{line.description}</TableCell>
                    <TableCell className="text-right text-sm">{line.quantity}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(line.unitPrice)} €</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm hidden sm:table-cell">{line.taxRate}%</TableCell>
                    <TableCell className="pr-4 sm:pr-6 text-right font-semibold text-sm">{formatCurrency(line.lineTotal)} €</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* ── Totals ─────────────────────────────────── */}
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="ml-auto w-full sm:w-72 space-y-2">
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

        {/* ── Notes ──────────────────────────────────── */}
        {quote.notes && (
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">Notes</p>
              <p className="text-sm whitespace-pre-wrap text-slate-700">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* ── Action buttons ─────────────────────────── */}
        {quote.canRespond && !quote.isExpired && actionState !== "confirm-reject" && (
          <Card className="shadow-sm border-2 border-indigo-100 bg-gradient-to-b from-indigo-50/50 to-white">
            <CardContent className="p-6">
              <div className="text-center mb-6">
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

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-14 text-base border-red-200 hover:bg-red-50 hover:text-red-600 hover:border-red-300 order-2 sm:order-1"
                  onClick={() => setActionState("confirm-reject")}
                  disabled={actionState === "loading"}
                >
                  <X className="mr-2 h-5 w-5" />
                  Refuser
                </Button>
                <Button
                  size="lg"
                  className="h-14 text-base bg-green-600 hover:bg-green-700 sm:min-w-[200px] order-1 sm:order-2"
                  onClick={() => handleAction("accept")}
                  disabled={actionState === "loading"}
                >
                  {actionState === "loading" ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="mr-2 h-5 w-5" />
                  )}
                  Accepter ce devis
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Reject confirmation ────────────────────── */}
        {actionState === "confirm-reject" && (
          <Card className="shadow-sm border-2 border-red-200 bg-red-50/50">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <XCircle className="mx-auto h-10 w-10 text-red-500 mb-2" />
                <h3 className="text-lg font-semibold">Confirmer le refus</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vous êtes sur le point de refuser ce devis.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Commentaire (optionnel)
                  </label>
                  <Textarea
                    className="mt-1"
                    placeholder="Expliquez pourquoi vous refusez ce devis (prix, périmètre, timing...)"
                    value={rejectComment}
                    onChange={(e) => setRejectComment(e.target.value)}
                    rows={3}
                  />
                </div>

                {actionError && (
                  <div className="rounded-lg bg-red-100 p-3 text-sm text-red-600 text-center">
                    {actionError}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setActionState("idle");
                      setRejectComment("");
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleAction("reject")}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Confirmer le refus
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Expired notice ─────────────────────────── */}
        {quote.isExpired && (
          <Card className="shadow-sm border-2 border-amber-200 bg-amber-50">
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

        {/* ── Already responded notice ───────────────── */}
        {!quote.canRespond && !quote.isExpired && quote.status !== "draft" && (
          <Card className={`shadow-sm border-2 ${quote.status === "accepted" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
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
                    Ce devis a été converti en facture.
                  </p>
                </>
              ) : null}
            </CardContent>
          </Card>
        )}

        {/* ── Footer ─────────────────────────────────── */}
        <footer className="text-center py-4 pb-8">
          <p className="text-xs text-muted-foreground">
            Document généré par{" "}
            <a
              href="https://quoteforge.app"
              className="text-indigo-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              QuoteForge
              <ExternalLink className="inline h-3 w-3 ml-0.5" />
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
