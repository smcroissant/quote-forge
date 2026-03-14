"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Loader2, Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { TemplateSelector } from "@/components/quotes/template-selector";

// ── Types ───────────────────────────────────────────
interface QuoteLine {
  id: string; // temp client-side id
  productId: string | null;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
}

let lineIdCounter = 0;
const createTempId = () => `temp-${++lineIdCounter}`;

const emptyLine = (): QuoteLine => ({
  id: createTempId(),
  productId: null,
  description: "",
  quantity: "1",
  unitPrice: "0.00",
  taxRate: "20.00",
});

// ── Helpers ─────────────────────────────────────────
function formatCurrency(value: number): string {
  return value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function computeLineTotal(qty: string, price: string): string {
  return (parseFloat(qty || "0") * parseFloat(price || "0")).toFixed(2);
}

// ── Component ───────────────────────────────────────
export default function NewQuotePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [clientId, setClientId] = useState("");
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [lines, setLines] = useState<QuoteLine[]>([emptyLine()]);

  // Data
  const { data: clients, isLoading: clientsLoading } = trpc.clients.getAll.useQuery();
  const { data: products, isLoading: productsLoading } = trpc.products.getAll.useQuery();

  const createQuote = trpc.quotes.create.useMutation({
    onSuccess: (data) => {
      toast.success("Devis créé !");
      router.push(`/quotes/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message || "Erreur lors de la création");
      setIsSubmitting(false);
    },
  });

  // ── Computed totals ───────────────────────────────
  const totals = useMemo(() => {
    let subtotal = 0;
    let taxAmount = 0;
    for (const line of lines) {
      const qty = parseFloat(line.quantity) || 0;
      const price = parseFloat(line.unitPrice) || 0;
      const tax = parseFloat(line.taxRate) || 0;
      const lineSubtotal = qty * price;
      subtotal += lineSubtotal;
      taxAmount += lineSubtotal * (tax / 100);
    }
    return {
      subtotal,
      taxAmount,
      total: subtotal + taxAmount,
    };
  }, [lines]);

  // ── Line handlers ─────────────────────────────────
  const addLine = useCallback(() => {
    setLines((prev) => [...prev, emptyLine()]);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((l) => l.id !== id);
    });
  }, []);

  const updateLine = useCallback(
    (id: string, field: keyof QuoteLine, value: string | null) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.id !== id) return l;
          const updated = { ...l, [field]: value };

          // When selecting a product, auto-fill description, unitPrice, taxRate
          if (field === "productId" && value && products) {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.description = product.name;
              updated.unitPrice = product.unitPrice;
              updated.taxRate = product.taxRate ?? "20.00";
            }
          }

          return updated;
        })
      );
    },
    [products]
  );

  // ── Submit ────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      toast.error("Sélectionnez un client");
      return;
    }

    const validLines = lines.filter((l) => l.description.trim() && parseFloat(l.unitPrice) >= 0);
    if (validLines.length === 0) {
      toast.error("Ajoutez au moins une ligne avec une description");
      return;
    }

    setIsSubmitting(true);

    createQuote.mutate({
      clientId,
      templateId,
      title: title || undefined,
      notes: notes || undefined,
      validUntil: validUntil ? new Date(validUntil).toISOString() : undefined,
      lines: validLines.map((l) => ({
        productId: l.productId,
        description: l.description,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxRate: l.taxRate,
      })),
    });
  };

  // ── Render ────────────────────────────────────────
  const isLoading = clientsLoading || productsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/quotes" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Nouveau devis</h2>
          <p className="text-muted-foreground">
            Remplissez les informations ci-dessous
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            {/* ── Left column: Info ──────────────────── */}
            <div className="space-y-6 md:col-span-1">
              {/* Client */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Informations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={clientId}
                      onValueChange={(val) => val && setClientId(val)}
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.length === 0 ? (
                          <div className="p-2 text-sm text-muted-foreground">
                            Aucun client —{" "}
                            <Link href="/clients/new" className="text-primary hover:underline">
                              en créer un
                            </Link>
                          </div>
                        ) : (
                          clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id}>
                              {client.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Titre du devis</Label>
                    <Input
                      id="title"
                      placeholder="Ex : Développement site vitrine"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="validUntil">Valable jusqu&apos;au</Label>
                    <Input
                      id="validUntil"
                      type="date"
                      value={validUntil}
                      onChange={(e) => setValidUntil(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Conditions particulières, remarques..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
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
                    <span>{formatCurrency(totals.subtotal)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">TVA</span>
                    <span>{formatCurrency(totals.taxAmount)} €</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>Total TTC</span>
                      <span>{formatCurrency(totals.total)} €</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Template PDF</CardTitle>
                </CardHeader>
                <CardContent>
                  <TemplateSelector
                    selectedId={templateId}
                    onSelect={setTemplateId}
                  />
                </CardContent>
              </Card>
            </div>

            {/* ── Right column: Lines ────────────────── */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Lignes du devis</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addLine}>
                    <Plus className="mr-1 h-4 w-4" />
                    Ajouter une ligne
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Produit</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="w-[80px]">Qté</TableHead>
                          <TableHead className="w-[100px]">Prix HT</TableHead>
                          <TableHead className="w-[70px]">TVA</TableHead>
                          <TableHead className="w-[100px] text-right">Total</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => {
                          const lineTotal = computeLineTotal(line.quantity, line.unitPrice);
                          return (
                            <TableRow key={line.id}>
                              {/* Product select */}
                              <TableCell>
                                <Select
                                  value={line.productId ?? ""}
                                  onValueChange={(val) =>
                                    updateLine(line.id, "productId", val || null)
                                  }
                                >
                                  <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Catalogue" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">— Manuel —</SelectItem>
                                    {products?.map((p) => (
                                      <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>

                              {/* Description */}
                              <TableCell>
                                <Input
                                  className="h-8 text-xs"
                                  placeholder="Description de la prestation"
                                  value={line.description}
                                  onChange={(e) =>
                                    updateLine(line.id, "description", e.target.value)
                                  }
                                />
                              </TableCell>

                              {/* Quantity */}
                              <TableCell>
                                <Input
                                  className="h-8 text-xs text-right"
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={line.quantity}
                                  onChange={(e) =>
                                    updateLine(line.id, "quantity", e.target.value)
                                  }
                                />
                              </TableCell>

                              {/* Unit price */}
                              <TableCell>
                                <Input
                                  className="h-8 text-xs text-right"
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unitPrice}
                                  onChange={(e) =>
                                    updateLine(line.id, "unitPrice", e.target.value)
                                  }
                                />
                              </TableCell>

                              {/* Tax rate */}
                              <TableCell>
                                <Input
                                  className="h-8 text-xs text-right"
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.5"
                                  value={line.taxRate}
                                  onChange={(e) =>
                                    updateLine(line.id, "taxRate", e.target.value)
                                  }
                                />
                              </TableCell>

                              {/* Line total */}
                              <TableCell className="text-right font-medium">
                                {formatCurrency(parseFloat(lineTotal))} €
                              </TableCell>

                              {/* Delete */}
                              <TableCell>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => removeLine(line.id)}
                                  disabled={lines.length <= 1}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  variant="outline"
                  type="button"
                  render={(props) => (
                    <Link href="/quotes" {...props}>
                      Annuler
                    </Link>
                  )}
                />
                <Button type="submit" disabled={isSubmitting || !clientId}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Enregistrer le brouillon
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
