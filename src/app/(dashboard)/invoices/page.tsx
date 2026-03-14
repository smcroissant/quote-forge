"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, FileText, Eye, Receipt, Euro, Clock, AlertTriangle } from "lucide-react";
import { CSVExportButton } from "@/components/ui/csv-export-button";
import { invoicesCSVColumns } from "@/lib/csv";
import { ResponsiveList, CardFieldRow } from "@/components/ui/responsive-list";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  sent: { label: "Envoyée", variant: "default" },
  paid: { label: "Payée", variant: "default" },
  overdue: { label: "En retard", variant: "destructive" },
  cancelled: { label: "Annulée", variant: "outline" },
};

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR");
}

function formatCurrency(value: string | number): string {
  return parseFloat(String(value)).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function InvoicesPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: invoices, isLoading } = trpc.invoices.getAll.useQuery({
    status: (statusFilter as "draft" | "sent" | "paid" | "overdue" | "cancelled") || undefined,
  });

  const { data: stats } = trpc.invoices.getStats.useQuery();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Factures</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez vos factures et suivez les paiements
          </p>
        </div>
        <Button className="w-full sm:w-auto" render={(props) => (
          <Link href="/invoices/new" {...props}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle facture
          </Link>
        )} />
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Total facturé</CardTitle>
              <Euro className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.totalInvoiced)} €</div>
              <p className="text-xs text-muted-foreground">{stats.totalInvoices} factures</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium">Encaissé</CardTitle>
              <Receipt className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)} €</div>
              <p className="text-xs text-muted-foreground">{stats.statusCounts.paid ?? 0} payées</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium">En attente</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-2xl font-bold">{formatCurrency(stats.outstanding)} €</div>
              <p className="text-xs text-muted-foreground">à encaisser</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-xs sm:text-sm font-medium">En retard</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="text-lg sm:text-2xl font-bold text-red-600">{formatCurrency(stats.totalOverdue)} €</div>
              <p className="text-xs text-muted-foreground">{stats.statusCounts.overdue ?? 0} factures</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-full sm:w-[180px] h-10">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="draft">Brouillons</SelectItem>
            <SelectItem value="sent">Envoyées</SelectItem>
            <SelectItem value="paid">Payées</SelectItem>
            <SelectItem value="overdue">En retard</SelectItem>
            <SelectItem value="cancelled">Annulées</SelectItem>
          </SelectContent>
        </Select>
        <CSVExportButton
          data={(invoices ?? []).map((item) => ({
            invoiceNumber: item.invoice.invoiceNumber,
            createdAt: item.invoice.createdAt,
            clientName: item.clientName ?? "",
            title: item.invoice.title ?? "",
            status: item.invoice.status,
            subtotal: item.invoice.subtotal,
            taxAmount: item.invoice.taxAmount,
            total: item.invoice.total,
            dueDate: item.invoice.dueDate,
            paidAt: item.invoice.paidAt,
          }))}
          columns={invoicesCSVColumns}
          filename={`factures-${new Date().toISOString().split("T")[0]}.csv`}
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ResponsiveList
          items={invoices ?? []}
          getItemId={(item) => item.invoice.id}
          onRowClick={(item) => router.push(`/invoices/${item.invoice.id}`)}
          emptyState={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Aucune facture
                </CardTitle>
                <CardDescription>
                  Convertissez un devis accepté en facture ou créez-en une directement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button render={(props) => (
                  <Link href="/invoices/new" {...props}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle facture
                  </Link>
                )} />
              </CardContent>
            </Card>
          }
          columns={[
            { key: "number", header: "N°", render: (item) => <span className="font-mono text-sm">{item.invoice.invoiceNumber}</span> },
            { key: "client", header: "Client", render: (item) => item.clientName ?? "—" },
            { key: "title", header: "Titre", render: (item) => item.invoice.title ?? "—" },
            { key: "status", header: "Statut", render: (item) => {
              const status = statusConfig[item.invoice.status] ?? statusConfig.draft;
              return <Badge variant={status.variant}>{status.label}</Badge>;
            }},
            { key: "due", header: "Échéance", className: "text-sm text-muted-foreground", render: (item) => formatDate(item.invoice.dueDate) },
            { key: "total", header: "Total TTC", className: "text-right", render: (item) => <span className="font-medium">{formatCurrency(item.invoice.total)} €</span> },
          ]}
          cardHeader={(item) => (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">{item.invoice.invoiceNumber}</span>
                <Badge variant={(statusConfig[item.invoice.status] ?? statusConfig.draft).variant} className="text-xs">
                  {(statusConfig[item.invoice.status] ?? statusConfig.draft).label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{item.clientName ?? "—"}</p>
            </div>
          )}
          cardFields={[
            { key: "title", render: (item) => <CardFieldRow label="Titre" value={item.invoice.title ?? "—"} /> },
            { key: "total", render: (item) => <CardFieldRow label="Total TTC" value={`${formatCurrency(item.invoice.total)} €`} className="font-bold text-indigo-600" /> },
            { key: "due", render: (item) => <CardFieldRow label="Échéance" value={formatDate(item.invoice.dueDate)} className="text-muted-foreground" /> },
          ]}
          cardActions={(item) => (
            <Button variant="ghost" size="icon" className="h-10 w-10" render={(props) => (
              <Link href={`/invoices/${item.invoice.id}`} {...props}>
                <Eye className="h-5 w-5" />
              </Link>
            )} />
          )}
        />
      )}
    </div>
  );
}
