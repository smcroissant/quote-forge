"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, ArrowLeft, MoreHorizontal, Send, Check, XCircle, Clock,
  Trash2, FileText, Building, Download, Receipt, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  draft: { label: "Brouillon", variant: "secondary", icon: FileText },
  sent: { label: "Envoyée", variant: "default", icon: Send },
  paid: { label: "Payée", variant: "default", icon: Check },
  overdue: { label: "En retard", variant: "destructive", icon: AlertTriangle },
  cancelled: { label: "Annulée", variant: "outline", icon: XCircle },
};

const transitionLabels: Record<string, { label: string; icon: typeof Send }> = {
  sent: { label: "Marquer comme envoyée", icon: Send },
  paid: { label: "Marquer comme payée", icon: Check },
  overdue: { label: "Marquer en retard", icon: AlertTriangle },
  cancelled: { label: "Annuler", icon: XCircle },
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: invoice, isLoading, refetch } = trpc.invoices.getById.useQuery({ id: invoiceId });
  const { data: transitions } = trpc.invoices.getValidTransitions.useQuery(
    { id: invoiceId },
    { enabled: !!invoiceId }
  );

  const updateStatus = trpc.invoices.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Statut mis à jour");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => {
      toast.success("Facture supprimée");
      router.push("/invoices");
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

  if (!invoice) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Facture introuvable</p>
        <Button variant="outline" render={(props) => <Link href="/invoices" {...props}>Retour aux factures</Link>} />
      </div>
    );
  }

  const status = statusConfig[invoice.status] ?? statusConfig.draft;
  const StatusIcon = status.icon;
  const validTransitions = transitions?.validTransitions ?? [];
  const isTerminal = transitions?.isTerminal ?? false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" render={(props) => <Link href="/invoices" {...props}><ArrowLeft className="h-4 w-4" /></Link>} />
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{invoice.invoiceNumber}</h2>
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
              {invoice.title || "Sans titre"} — Créée le {formatDate(invoice.createdAt)}
              {invoice.quoteId && <span className="ml-2 text-xs">(devis converti)</span>}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, "_blank")}
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
              {validTransitions.map((targetStatus) => {
                const label = transitionLabels[targetStatus];
                if (!label) return null;
                const TransitionIcon = label.icon;
                return (
                  <DropdownMenuItem
                    key={targetStatus}
                    onClick={() => updateStatus.mutate({ id: invoice.id, status: targetStatus as "draft" | "sent" | "paid" | "overdue" | "cancelled" })}
                    disabled={updateStatus.isPending}
                  >
                    <TransitionIcon className="mr-2 h-4 w-4" />
                    {label.label}
                  </DropdownMenuItem>
                );
              })}

              {invoice.status === "draft" && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => setDeleteDialogOpen(true)}>
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
        {/* Client */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building className="h-4 w-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{invoice.client?.name ?? "—"}</p>
            {invoice.client?.email && <p className="text-sm text-muted-foreground">{invoice.client.email}</p>}
            {invoice.client?.phone && <p className="text-sm text-muted-foreground">{invoice.client.phone}</p>}
            {invoice.client?.address && (
              <p className="text-sm text-muted-foreground">
                {invoice.client.address}
                {invoice.client.city && `, ${invoice.client.city}`}
                {invoice.client.postalCode && ` ${invoice.client.postalCode}`}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Receipt className="h-4 w-4" />
              Détails
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Numéro</span>
              <span className="font-mono">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Échéance</span>
              <span>{formatDate(invoice.dueDate)}</span>
            </div>
            {invoice.sentAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Envoyée le</span>
                <span>{formatDate(invoice.sentAt)}</span>
              </div>
            )}
            {invoice.paidAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payée le</span>
                <span>{formatDate(invoice.paidAt)}</span>
              </div>
            )}
            {invoice.paymentMethod && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Mode de paiement</span>
                <span>{invoice.paymentMethod}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Totaux</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sous-total HT</span>
              <span>{formatCurrency(invoice.subtotal)} €</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA</span>
              <span>{formatCurrency(invoice.taxAmount)} €</span>
            </div>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Total TTC</span>
              <span>{formatCurrency(invoice.total)} €</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lignes de la facture</CardTitle>
        </CardHeader>
        <CardContent>
          {invoice.lines.length === 0 ? (
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
                {invoice.lines
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((line, i) => (
                    <TableRow key={line.id}>
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">{line.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(line.unitPrice)} €</TableCell>
                      <TableCell className="text-right">{line.taxRate}%</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(line.lineTotal)} €</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Delete dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La facture {invoice.invoiceNumber} sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteInvoice.mutate({ id: invoice.id })}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
