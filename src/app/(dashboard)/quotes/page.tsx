"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Search, FileText, Eye } from "lucide-react";
import { CSVExportButton } from "@/components/ui/csv-export-button";
import { quotesCSVColumns } from "@/lib/csv";
import { ResponsiveList, CardFieldRow } from "@/components/ui/responsive-list";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Brouillon", variant: "secondary" },
  sent: { label: "Envoyé", variant: "default" },
  viewed: { label: "Vu", variant: "outline" },
  accepted: { label: "Accepté", variant: "default" },
  rejected: { label: "Refusé", variant: "destructive" },
  expired: { label: "Expiré", variant: "outline" },
  invoiced: { label: "Facturé", variant: "default" },
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

export default function QuotesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: quotes, isLoading } = trpc.quotes.getAll.useQuery({
    search: search || undefined,
    status: (statusFilter as "draft" | "sent" | "viewed" | "accepted" | "rejected" | "expired" | "invoiced") || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Devis</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Gérez vos devis et suivez leur statut
          </p>
        </div>
        <Button className="w-full sm:w-auto" render={(props) => (
          <Link href="/quotes/new" {...props}>
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis
          </Link>
        )} />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un devis..."
            className="pl-8 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
            <SelectTrigger className="w-full sm:w-[180px] h-10">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="draft">Brouillons</SelectItem>
              <SelectItem value="sent">Envoyés</SelectItem>
              <SelectItem value="viewed">Vus</SelectItem>
              <SelectItem value="accepted">Acceptés</SelectItem>
              <SelectItem value="rejected">Refusés</SelectItem>
              <SelectItem value="expired">Expirés</SelectItem>
              <SelectItem value="invoiced">Facturés</SelectItem>
            </SelectContent>
          </Select>
          <CSVExportButton
            data={(quotes ?? []).map((item) => ({
              quoteNumber: item.quote.quoteNumber,
              createdAt: item.quote.createdAt,
              clientName: item.clientName ?? "",
              title: item.quote.title ?? "",
              status: item.quote.status,
              subtotal: item.quote.subtotal,
              taxAmount: item.quote.taxAmount,
              total: item.quote.total,
              validUntil: item.quote.validUntil,
            }))}
            columns={quotesCSVColumns}
            filename={`devis-${new Date().toISOString().split("T")[0]}.csv`}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <ResponsiveList
          items={quotes ?? []}
          getItemId={(item) => item.quote.id}
          onRowClick={(item) => router.push(`/quotes/${item.quote.id}`)}
          emptyState={
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Aucun devis
                </CardTitle>
                <CardDescription>
                  Créez votre premier devis pour commencer à suivre votre activité.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button render={(props) => (
                  <Link href="/quotes/new" {...props}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau devis
                  </Link>
                )} />
              </CardContent>
            </Card>
          }
          columns={[
            { key: "number", header: "N°", render: (item) => <span className="font-mono text-sm">{item.quote.quoteNumber}</span> },
            { key: "client", header: "Client", render: (item) => item.clientName ?? "—" },
            { key: "title", header: "Titre", render: (item) => item.quote.title ?? "—" },
            { key: "status", header: "Statut", render: (item) => {
              const status = statusConfig[item.quote.status] ?? statusConfig.draft;
              return <Badge variant={status.variant}>{status.label}</Badge>;
            }},
            { key: "views", header: "Vues", render: (item) => {
              const count = item.quote.viewCount ?? 0;
              return count > 0 ? (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Eye className="h-3 w-3" /> {count}
                </span>
              ) : <span className="text-sm text-muted-foreground">—</span>;
            }},
            { key: "total", header: "Total TTC", className: "text-right", render: (item) => <span className="font-medium">{formatCurrency(item.quote.total)} €</span> },
            { key: "date", header: "Date", className: "text-muted-foreground text-sm", render: (item) => formatDate(item.quote.createdAt) },
          ]}
          cardHeader={(item) => (
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">{item.quote.quoteNumber}</span>
                <Badge variant={(statusConfig[item.quote.status] ?? statusConfig.draft).variant} className="text-xs">
                  {(statusConfig[item.quote.status] ?? statusConfig.draft).label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {item.clientName ?? "—"}
              </p>
            </div>
          )}
          cardFields={[
            { key: "title", render: (item) => (
              <CardFieldRow label="Titre" value={item.quote.title ?? "—"} />
            )},
            { key: "total", render: (item) => (
              <CardFieldRow label="Total TTC" value={`${formatCurrency(item.quote.total)} €`} className="font-bold text-indigo-600" />
            )},
            { key: "date", render: (item) => (
              <CardFieldRow label="Date" value={formatDate(item.quote.createdAt)} className="text-muted-foreground" />
            )},
          ]}
          cardActions={(item) => (
            <Button variant="ghost" size="icon" className="h-10 w-10" render={(props) => (
              <Link href={`/quotes/${item.quote.id}`} {...props}>
                <Eye className="h-5 w-5" />
              </Link>
            )} />
          )}
        />
      )}
    </div>
  );
}
