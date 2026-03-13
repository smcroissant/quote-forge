"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ProductForm, type ProductFormValues } from "./ProductForm";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Power,
  Package,
  Loader2,
} from "lucide-react";

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // ── Queries ────────────────────────────────────────
  const { data: products, isLoading } = trpc.products.getAll.useQuery({
    search: search || undefined,
    includeInactive: showInactive,
  });

  const { data: selectedProduct } = trpc.products.getById.useQuery(
    { id: selectedProductId! },
    { enabled: !!selectedProductId && editDialogOpen }
  );

  // ── Mutations ──────────────────────────────────────
  const createMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Produit créé ✅");
      setCreateDialogOpen(false);
      utils.products.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Produit mis à jour ✅");
      setEditDialogOpen(false);
      setSelectedProductId(null);
      utils.products.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.products.toggleActive.useMutation({
    onSuccess: (data) => {
      toast.success(data.isActive ? "Produit activé" : "Produit désactivé");
      utils.products.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Produit supprimé 🗑️");
      setDeleteDialogOpen(false);
      setSelectedProductId(null);
      utils.products.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Handlers ───────────────────────────────────────
  const handleCreate = (data: ProductFormValues) => {
    createMutation.mutate(data);
  };

  const handleEdit = (data: ProductFormValues) => {
    if (!selectedProductId) return;
    updateMutation.mutate({ id: selectedProductId, ...data });
  };

  const handleDelete = () => {
    if (!selectedProductId) return;
    deleteMutation.mutate({ id: selectedProductId });
  };

  const openEdit = (productId: string) => {
    setSelectedProductId(productId);
    setEditDialogOpen(true);
  };

  const openDelete = (productId: string) => {
    setSelectedProductId(productId);
    setDeleteDialogOpen(true);
  };

  // ── Format price ───────────────────────────────────
  const formatPrice = (price: string, unit: string) => {
    return `${Number(price).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
    })} € / ${unit}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produits & Services</h1>
          <p className="text-muted-foreground">
            Gérez votre catalogue de produits et services
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nouveau produit
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showInactive ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Masquer inactifs" : "Voir inactifs"}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !products || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Aucun produit</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? "Aucun résultat pour cette recherche"
              : "Commencez par créer votre premier produit ou service"}
          </p>
          {!search && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Créer un produit
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>TVA</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[300px] truncate">
                    {product.description || "—"}
                  </TableCell>
                  <TableCell>
                    {formatPrice(product.unitPrice, product.unit ?? "unité")}
                  </TableCell>
                  <TableCell>{product.taxRate}%</TableCell>
                  <TableCell>
                    <Badge
                      variant={product.isActive ? "default" : "secondary"}
                    >
                      {product.isActive ? "Actif" : "Inactif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(product.id)}
                        title="Modifier"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          toggleMutation.mutate({ id: product.id })
                        }
                        title={product.isActive ? "Désactiver" : "Activer"}
                      >
                        <Power className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDelete(product.id)}
                        className="text-destructive hover:text-destructive"
                        title="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nouveau produit</DialogTitle>
            <DialogDescription>
              Ajoutez un produit ou service à votre catalogue
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            onSubmit={handleCreate}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
            submitLabel="Créer"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le produit</DialogTitle>
            <DialogDescription>
              Modifiez les informations de ce produit
            </DialogDescription>
          </DialogHeader>
          {selectedProduct && (
            <ProductForm
              defaultValues={{
                name: selectedProduct.name,
                description: selectedProduct.description ?? "",
                unitPrice: selectedProduct.unitPrice,
                unit: selectedProduct.unit ?? "unité",
                taxRate: selectedProduct.taxRate ?? "20.00",
              }}
              onSubmit={handleEdit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedProductId(null);
              }}
              isLoading={updateMutation.isPending}
              submitLabel="Enregistrer"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit sera définitivement
              supprimé de votre catalogue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => setSelectedProductId(null)}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
