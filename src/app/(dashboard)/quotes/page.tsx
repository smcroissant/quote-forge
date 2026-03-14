"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Search, FileText, Eye } from "lucide-react";
import { CSVExportButton } from "@/components/ui/csv-export-button";
import { quotesCSVColumns } from "@/lib/csv";

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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: quotes, isLoading } = trpc.quotes.getAll.useQuery({
    search: search || undefined,
    status: (statusFilter as "draft" | "sent" | "accepted" | "rejected" | "expired") || undefined,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Devis</h2>
          <p className="text-muted-foreground">
            Gérez vos devis et suivez leur statut
          </p>
        </div>
        <Button
          render={(props) => (
            <Link href="/quotes/new" {...props}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau devis
            </Link>
          )}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un devis..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
          <SelectTrigger className="w-[180px]">
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

      {/* Table */}
      {isLoading ? (
        <div className="flex h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !quotes || quotes.length === 0 ? (
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
            <Button
              render={(props) => (
                <Link href="/quotes/new" {...props}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau devis
                </Link>
              )}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Total TTC</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((item) => {
                const status = statusConfig[item.quote.status] ?? statusConfig.draft;
                return (
                  <TableRow key={item.quote.id}>
                    <TableCell className="font-mono text-sm">
                      {item.quote.quoteNumber}
                    </TableCell>
                    <TableCell>{item.clientName ?? "—"}</TableCell>
                    <TableCell>{item.quote.title ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.quote.total)} €
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(item.quote.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        render={(props) => (
                          <Link href={`/quotes/${item.quote.id}`} {...props}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
