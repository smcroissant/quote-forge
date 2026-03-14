"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductForm, type ProductFormValues } from "./ProductForm";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  Power,
  Package,
  Loader2,
  MoreHorizontal,
  FolderPlus,
  Tag,
} from "lucide-react";
import { CSVExportButton } from "@/components/ui/csv-export-button";
import { productsCSVColumns } from "@/lib/csv";
import { TableSkeleton } from "@/components/ui/table-skeleton";

// ── Debounce hook ────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function ProductsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showInactive, setShowInactive] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteCategoryDialogOpen, setDeleteCategoryDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const newCategoryInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();

  // ── Queries ────────────────────────────────────────
  const { data: categories } = trpc.categories.getAll.useQuery();

  const categoryFilterValue =
    categoryFilter === "all"
      ? undefined
      : categoryFilter === "uncategorized"
        ? null
        : categoryFilter;

  const { data: products, isLoading } = trpc.products.getAll.useQuery({
    search: search || undefined,
    categoryId: categoryFilterValue,
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

  const duplicateMutation = trpc.products.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.name}" dupliqué ✅`);
      utils.products.getAll.invalidate();
      // Open edit dialog on the duplicated product
      setSelectedProductId(data.id);
      setEditDialogOpen(true);
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

  const createCategoryMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Catégorie créée ✅");
      setNewCategoryName("");
      setShowNewCategoryInput(false);
      utils.categories.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCategoryMutation = trpc.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Catégorie supprimée — produits déplacés");
      setDeleteCategoryDialogOpen(false);
      setSelectedCategoryId(null);
      utils.categories.getAll.invalidate();
      utils.products.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Handlers ───────────────────────────────────────
  const handleCreate = (data: ProductFormValues) => {
    createMutation.mutate({
      ...data,
      categoryId: data.categoryId || undefined,
    });
  };

  const handleEdit = (data: ProductFormValues) => {
    if (!selectedProductId) return;
    updateMutation.mutate({
      id: selectedProductId,
      ...data,
      categoryId: data.categoryId === null ? null : data.categoryId,
    });
  };

  const handleDelete = () => {
    if (!selectedProductId) return;
    deleteMutation.mutate({ id: selectedProductId });
  };

  const handleDeleteCategory = () => {
    if (!selectedCategoryId) return;
    deleteCategoryMutation.mutate({ id: selectedCategoryId });
  };

  const openEdit = (productId: string) => {
    setSelectedProductId(productId);
    setEditDialogOpen(true);
  };

  const openDelete = (productId: string) => {
    setSelectedProductId(productId);
    setDeleteDialogOpen(true);
  };

  const openDeleteCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setDeleteCategoryDialogOpen(true);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    createCategoryMutation.mutate({ name: newCategoryName.trim() });
  };

  // Focus new category input when shown
  useEffect(() => {
    if (showNewCategoryInput) {
      newCategoryInputRef.current?.focus();
    }
  }, [showNewCategoryInput]);

  // ── Format price ───────────────────────────────────
  const formatPrice = (price: string, unit: string) => {
    return `${Number(price).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
    })} € / ${unit}`;
  };

  // ── Get category name ──────────────────────────────
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return null;
    return categories?.find((c) => c.id === categoryId)?.name ?? null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mon catalogue</h1>
          <p className="text-muted-foreground">
            Produits et services réutilisables dans vos devis
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nouveau produit
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={(v: string | null) => v && setCategoryFilter(v)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Toutes catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            <SelectItem value="uncategorized">Sans catégorie</SelectItem>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={showInactive ? "secondary" : "outline"}
          size="sm"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Masquer inactifs" : "Voir inactifs"}
        </Button>
        <CSVExportButton
          data={(products ?? []).map((p) => ({
            name: p.name,
            categoryName: categories?.find(c => c.id === p.categoryId)?.name ?? "",
            description: p.description ?? "",
            unitPrice: p.unitPrice,
            unit: p.unit ?? "unité",
            taxRate: p.taxRate,
            isActive: p.isActive,
            createdAt: p.createdAt,
          }))}
          columns={productsCSVColumns}
          filename={`produits-${new Date().toISOString().split("T")[0]}.csv`}
        />
      </div>

      {/* Categories sidebar / inline management */}
      {categories && categories.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Tag className="size-4 text-muted-foreground" />
          {categories.map((cat) => (
            <Badge
              key={cat.id}
              variant={categoryFilter === cat.id ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() =>
                setCategoryFilter(categoryFilter === cat.id ? "all" : cat.id)
              }
            >
              {cat.name}
              <button
                className="ml-1.5 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  openDeleteCategory(cat.id);
                }}
              >
                ×
              </button>
            </Badge>
          ))}
          {/* New category inline */}
          {showNewCategoryInput ? (
            <div className="flex items-center gap-1">
              <Input
                ref={newCategoryInputRef}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateCategory();
                  if (e.key === "Escape") {
                    setShowNewCategoryInput(false);
                    setNewCategoryName("");
                  }
                }}
                placeholder="Nom catégorie"
                className="h-7 w-36 text-xs"
              />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={handleCreateCategory}
                disabled={!newCategoryName.trim()}
              >
                ✓
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() => setShowNewCategoryInput(true)}
            >
              <FolderPlus className="mr-1 size-3" />
              Nouvelle
            </Button>
          )}
        </div>
      )}

      {/* Show new category if no categories exist */}
      {(!categories || categories.length === 0) && !showNewCategoryInput && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => setShowNewCategoryInput(true)}
        >
          <FolderPlus className="mr-2 size-4" />
          Créer une catégorie
        </Button>
      )}

      {/* Table */}
      {isLoading ? (
        <TableSkeleton columns={7} />
      ) : !products || products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Aucun produit</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? `Aucun résultat pour "${search}"`
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
        <div className="border rounded-lg overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Catégorie</TableHead>
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
                  <TableCell>
                    {getCategoryName(product.categoryId) ? (
                      <Badge variant="outline">
                        {getCategoryName(product.categoryId)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[250px] truncate">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button variant="ghost" size="icon" />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(product.id)}>
                          <Pencil className="mr-2 size-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            duplicateMutation.mutate({ id: product.id })
                          }
                        >
                          <Copy className="mr-2 size-4" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            toggleMutation.mutate({ id: product.id })
                          }
                        >
                          <Power className="mr-2 size-4" />
                          {product.isActive ? "Désactiver" : "Activer"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDelete(product.id)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 size-4" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
            categories={categories}
            onSubmit={handleCreate}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
            submitLabel="Créer le produit"
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
              categories={categories}
              defaultValues={{
                name: selectedProduct.name,
                description: selectedProduct.description ?? "",
                unitPrice: selectedProduct.unitPrice,
                unit: selectedProduct.unit ?? "unité",
                taxRate: selectedProduct.taxRate ?? "20.00",
                categoryId: selectedProduct.categoryId,
              }}
              onSubmit={handleEdit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedProductId(null);
              }}
              isLoading={updateMutation.isPending}
              submitLabel="Sauvegarder"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Product Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce produit ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le produit sera définitivement
              supprimé de votre catalogue. Les devis existants ne seront pas
              affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedProductId(null)}>
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

      {/* Delete Category Confirmation */}
      <AlertDialog
        open={deleteCategoryDialogOpen}
        onOpenChange={setDeleteCategoryDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette catégorie ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les produits de cette catégorie seront déplacés vers &quot;Sans
              catégorie&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedCategoryId(null)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategoryMutation.isPending ? (
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
