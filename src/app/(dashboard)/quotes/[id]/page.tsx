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
  Share2,
  Copy,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }
> = {
  draft: { label: "Brouillon", variant: "secondary", icon: FileText },
  sent: { label: "Envoyé", variant: "default", icon: Send },
  accepted: { label: "Accepté", variant: "default", icon: Check },
  rejected: { label: "Refusé", variant: "destructive", icon: XCircle },
  expired: { label: "Expiré", variant: "outline", icon: Clock },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatCurrency(value: string | number): string {
  return parseFloat(String(value)).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: quote, isLoading, refetch } = trpc.quotes.getById.useQuery({
    id: quoteId,
  });

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
        <Button
          variant="outline"
          render={(props) => (
            <Link href="/quotes" {...props}>
              Retour aux devis
            </Link>
          )}
        />
      </div>
    );
  }

  const status = statusConfig[quote.status] ?? statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            render={(props) => (
              <Link href="/quotes" {...props}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}
          />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">
                {quote.quoteNumber}
              </h2>
              <Badge variant={status.variant}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {status.label}
              </Badge>
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
            {quote.status === "draft" && (
              <>
                <DropdownMenuItem
                  render={(props) => (
                    <Link href={`/quotes/${quote.id}/edit`} {...props}>
                      <Edit className="mr-2 h-4 w-4" />
                      Modifier
                    </Link>
                  )}
                />
                <DropdownMenuItem
                  onClick={() =>
                    updateStatus.mutate({ id: quote.id, status: "sent" })
                  }
                >
                  <Send className="mr-2 h-4 w-4" />
                  Marquer comme envoyé
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {quote.status === "sent" && (
              <>
                <DropdownMenuItem
                  onClick={() =>
                    updateStatus.mutate({ id: quote.id, status: "accepted" })
                  }
                >
                  <Check className="mr-2 h-4 w-4" />
                  Marquer comme accepté
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateStatus.mutate({ id: quote.id, status: "rejected" })
                  }
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Marquer comme refusé
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    updateStatus.mutate({ id: quote.id, status: "expired" })
                  }
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Marquer comme expiré
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {quote.status === "draft" && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
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
