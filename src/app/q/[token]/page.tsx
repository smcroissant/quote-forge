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
import { Separator } from "@/components/ui/separator";
import { Loader2, Building2, FileText, AlertCircle } from "lucide-react";

interface QuoteData {
  quote: {
    quoteNumber: string;
    title: string | null;
    status: string;
    createdAt: string;
    validUntil: string | null;
    notes: string | null;
    subtotal: string;
    taxAmount: string;
    total: string;
  };
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
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

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
};

export default function PublicQuotePage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<QuoteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Card className="max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">{error || "Devis introuvable"}</p>
            <p className="text-sm text-muted-foreground">
              Ce lien est peut-être expiré ou invalide.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quote, organization, client, lines } = data;

  return (
    <div className="min-h-screen bg-muted/30 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-lg font-bold">
                  <Building2 className="h-5 w-5" />
                  {organization.name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {organization.address && <p>{organization.address}</p>}
                  {organization.email && <p>{organization.email}</p>}
                  {organization.phone && <p>{organization.phone}</p>}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-2xl font-bold">
                  <FileText className="h-6 w-6" />
                  DEVIS
                </div>
                <p className="font-mono text-sm text-muted-foreground">
                  {quote.quoteNumber}
                </p>
                <span className="mt-2 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {statusLabels[quote.status] ?? quote.status}
                </span>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Client
                </p>
                <p className="mt-1 font-medium">{client.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Date
                </p>
                <p className="mt-1">{formatDate(quote.createdAt)}</p>
                {quote.validUntil && (
                  <>
                    <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Valable jusqu&apos;au
                    </p>
                    <p>{formatDate(quote.validUntil)}</p>
                  </>
                )}
              </div>
            </div>

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
                <TableRow>
                  <TableHead className="pl-6">#</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qté</TableHead>
                  <TableHead className="text-right">Prix HT</TableHead>
                  <TableHead className="text-right">TVA</TableHead>
                  <TableHead className="pr-6 text-right">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-6 text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>{line.description}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.unitPrice)} €
                    </TableCell>
                    <TableCell className="text-right">{line.taxRate}%</TableCell>
                    <TableCell className="pr-6 text-right font-medium">
                      {formatCurrency(line.lineTotal)} €
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card>
          <CardContent className="p-6">
            <div className="ml-auto w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total HT</span>
                <span>{formatCurrency(quote.subtotal)} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA</span>
                <span>{formatCurrency(quote.taxAmount)} €</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total TTC</span>
                <span>{formatCurrency(quote.total)} €</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        {quote.notes && (
          <Card>
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="mt-2 text-sm whitespace-pre-wrap">{quote.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Document généré par QuoteForge — {organization.name}
        </p>
      </div>
    </div>
  );
}
