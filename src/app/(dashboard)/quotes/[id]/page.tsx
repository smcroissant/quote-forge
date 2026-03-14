"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  Send,
  Check,
  XCircle,
  Clock,
  Trash2,
  Edit,
  FileText,
  Building,
  Download,
  Copy,
  Eye,
  History,
  Circle,
  Plus,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

// ── Status config ───────────────────────────────────
const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  draft: { label: "Brouillon", variant: "secondary", icon: FileText },
  sent: { label: "Envoyé", variant: "default", icon: Send },
  viewed: { label: "Vu", variant: "outline", icon: Eye },
  accepted: { label: "Accepté", variant: "default", icon: Check },
  rejected: { label: "Refusé", variant: "destructive", icon: XCircle },
  expired: { label: "Expiré", variant: "outline", icon: Clock },
};

// ── Status transition labels ────────────────────────
const transitionLabels: Record<string, { label: string; icon: typeof Send }> = {
  sent: { label: "Marquer comme envoyé", icon: Send },
  viewed: { label: "Marquer comme vu", icon: Eye },
  accepted: { label: "Marquer comme accepté", icon: Check },
  rejected: { label: "Marquer comme refusé", icon: XCircle },
  expired: { label: "Marquer comme expiré", icon: Clock },
};

// ── Activity config ─────────────────────────────────
const activityConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  created: { label: "Créé", icon: Plus, color: "text-blue-500" },
  status_changed: { label: "Changement de statut", icon: RefreshCw, color: "text-amber-500" },
  updated: { label: "Modifié", icon: Edit, color: "text-slate-500" },
  viewed: { label: "Consulté", icon: Eye, color: "text-purple-500" },
  deleted: { label: "Supprimé", icon: Trash2, color: "text-red-500" },
  pdf_generated: { label: "PDF généré", icon: FileText, color: "text-green-500" },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: string | number): string {
  return parseFloat(String(value)).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function getStatusLabel(status: string): string {
  return statusConfig[status]?.label ?? status;
}

function parseMetadata(metadata: string | null): Record<string, string> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

// ── Timeline component ──────────────────────────────
function Timeline({ quoteId }: { quoteId: string }) {
  const { data: timeline, isLoading } = trpc.quotes.getTimeline.useQuery({ quoteId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Aucune activité enregistrée
      </p>
    );
  }

  return (
    <div className="space-y-0">
      {timeline.map((item, index) => {
        const config = activityConfig[item.activity.action] ?? {
          label: item.activity.action,
          icon: Circle,
          color: "text-muted-foreground",
        };
        const ActivityIcon = config.icon;
        const metadata = parseMetadata(item.activity.metadata);
        const isLast = index === timeline.length - 1;

        return (
          <div key={item.activity.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={`flex size-8 items-center justify-center rounded-full border bg-background ${config.color}`}>
                <ActivityIcon className="size-3.5" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border my-1" />}
            </div>

            {/* Content */}
            <div className="pb-6 pt-1 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {item.activity.action === "status_changed" ? (
                    <>
                      {getStatusLabel(item.activity.fromStatus ?? "")} →{" "}
                      <span className="font-semibold">
                        {getStatusLabel(item.activity.toStatus ?? "")}
                      </span>
                    </>
                  ) : item.activity.action === "created" ? (
                    "Devis créé"
                  ) : item.activity.action === "updated" ? (
                    <>
                      Devis modifié
                      {metadata?.fields && (
                        <span className="text-muted-foreground font-normal">
                          {" "}({metadata.fields})
                        </span>
                      )}
                    </>
                  ) : (
                    config.label
                  )}
                </p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(item.activity.createdAt)}
                </span>
              </div>
              {metadata?.source === "public_link" && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  via lien public
                </p>
              )}
              {metadata?.quoteNumber && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  N° {metadata.quoteNumber}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ───────────────────────────────────────
export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: quote, isLoading, refetch } = trpc.quotes.getById.useQuery({
    id: quoteId,
  });

  const { data: transitions } = trpc.quotes.getValidTransitions.useQuery(
    { id: quoteId },
    { enabled: !!quoteId }
  );

  const updateStatus = trpc.quotes.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Statut mis à jour");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteQuote = trpc.quotes.delete.useMutation({
    onSuccess: () => {
      toast.success("Devis supprimé");
      router.push("/quotes");
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Devis introuvable</p>
        <Button variant="outline" render={(props) => <Link href="/quotes" {...props}>Retour aux devis</Link>} />
      </div>
    );
  }

  const status = statusConfig[quote.status] ?? statusConfig.draft;
  const StatusIcon = status.icon;
  const validTransitions = transitions?.validTransitions ?? [];
  const isTerminal = transitions?.isTerminal ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={(props) => <Link href="/quotes" {...props}><ArrowLeft className="h-4 w-4" /></Link>} />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">
                {quote.quoteNumber}
              </h2>
              <Badge variant={status.variant}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
              {isTerminal && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="size-3" />
                  Statut terminal
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {quote.title || "Sans titre"} — Créé le {formatDate(quote.createdAt)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/quotes/${quoteId}/pdf`, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-muted">
              <MoreHorizontal className="mr-2 h-4 w-4" />
              Actions
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit (draft only) */}
              {quote.status === "draft" && (
                <DropdownMenuItem
                  render={(props) => (
                    <Link href={`/quotes/${quote.id}/edit`} {...props}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </Link>
                  )}
                />
              )}

              {/* Status transitions */}
              {validTransitions.map((targetStatus) => {
                const label = transitionLabels[targetStatus];
                if (!label) return null;
                const TransitionIcon = label.icon;
                return (
                  <DropdownMenuItem
                    key={targetStatus}
                    onClick={() =>
                      updateStatus.mutate({ id: quote.id, status: targetStatus as "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" })
                    }
                    disabled={updateStatus.isPending}
                  >
                    <TransitionIcon className="mr-2 h-4 w-4" />
                    {label.label}
                  </DropdownMenuItem>
                );
              })}

              {/* Delete (draft only) */}
              {quote.status === "draft" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* ── Client card ───────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{quote.client?.name ?? "—"}</p>
            {quote.client?.email && (
              <p className="text-sm text-muted-foreground">{quote.client.email}</p>
            )}
            {quote.client?.phone && (
              <p className="text-sm text-muted-foreground">{quote.client.phone}</p>
            )}
            {quote.client?.address && (
              <p className="text-sm text-muted-foreground">
                {quote.client.address}
                {quote.client.city && `, ${quote.client.city}`}
                {quote.client.postalCode && ` ${quote.client.postalCode}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* ── Details card ──────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Détails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Numéro</span>
              <span className="font-mono">{quote.quoteNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Valable jusqu&apos;au</span>
              <span>{formatDate(quote.validUntil)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                <Eye className="mr-1 inline h-3 w-3" />
                Vues
              </span>
              <span>{quote.viewCount ?? 0}</span>
            </div>
            {quote.lastViewedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Dernière vue</span>
                <span>{formatDate(quote.lastViewedAt)}</span>
              </div>
            )}
            {quote.viewToken && (
              <div className="pt-2">
                <span className="text-xs text-muted-foreground">Lien de partage</span>
                <div className="mt-1 flex items-center gap-1">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {typeof window !== "undefined" ? window.location.origin : ""}/q/{quote.viewToken}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/q/${quote.viewToken}`
                      );
                      toast.success("Lien copié !");
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
            {quote.sentAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envoyé le</span>
                <span>{formatDate(quote.sentAt)}</span>
              </div>
            )}
            {quote.acceptedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Accepté le</span>
                <span>{formatDate(quote.acceptedAt)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Totals card ───────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span>{formatCurrency(quote.subtotal)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span>{formatCurrency(quote.taxAmount)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total TTC</span>
              <span>{formatCurrency(quote.total)} €</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Lines table ────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lignes du devis</CardTitle>
        </CardHeader>
        <CardContent>
          {quote.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune ligne</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Prix HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="text-right">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.lines
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((line, i) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-muted-foreground">
                        {i + 1}
                      </TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(line.unitPrice)} €
                      </TableCell>
                      <TableCell className="text-right">{line.taxRate}%</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(line.lineTotal)} €
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Timeline ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            Historique d&apos;activité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Timeline quoteId={quoteId} />
        </CardContent>
      </Card>

      {/* ── Notes ───────────────────────────────────── */}
      {quote.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Delete dialog ───────────────────────────── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le devis {quote.quoteNumber} sera
              définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteQuote.mutate({ id: quote.id })}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
