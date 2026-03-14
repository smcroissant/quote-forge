"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ClientForm, type ClientFormValues } from "./ClientForm";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  Users,
  Loader2,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

// ── Debounce hook ────────────────────────────────────
import { useEffect } from "react";
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function ClientsPage() {
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 300);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  // ── Queries ────────────────────────────────────────
  const { data: clients, isLoading } = trpc.clients.getAll.useQuery({
    search: search || undefined,
  });

  const { data: selectedClient } = trpc.clients.getById.useQuery(
    { id: selectedClientId! },
    { enabled: !!selectedClientId && editDialogOpen }
  );

  // ── Mutations ──────────────────────────────────────
  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      toast.success("Client créé ✅");
      setCreateDialogOpen(false);
      utils.clients.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      toast.success("Client mis à jour ✅");
      setEditDialogOpen(false);
      setSelectedClientId(null);
      utils.clients.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateMutation = trpc.clients.duplicate.useMutation({
    onSuccess: (data) => {
      toast.success(`"${data.name}" dupliqué ✅`);
      utils.clients.getAll.invalidate();
      // Open edit dialog on the duplicated client
      setSelectedClientId(data.id);
      setEditDialogOpen(true);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.clients.delete.useMutation({
    onSuccess: () => {
      toast.success("Client supprimé 🗑️");
      setDeleteDialogOpen(false);
      setSelectedClientId(null);
      utils.clients.getAll.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Handlers ───────────────────────────────────────
  const handleCreate = (data: ClientFormValues) => {
    createMutation.mutate({
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      notes: data.notes || null,
    });
  };

  const handleEdit = (data: ClientFormValues) => {
    if (!selectedClientId) return;
    updateMutation.mutate({
      id: selectedClientId,
      ...data,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      postalCode: data.postalCode || null,
      notes: data.notes || null,
    });
  };

  const handleDelete = () => {
    if (!selectedClientId) return;
    deleteMutation.mutate({ id: selectedClientId });
  };

  const openEdit = (clientId: string) => {
    setSelectedClientId(clientId);
    setEditDialogOpen(true);
  };

  const openDelete = (clientId: string) => {
    setSelectedClientId(clientId);
    setDeleteDialogOpen(true);
  };

  // ── Format location ────────────────────────────────
  const formatLocation = (city: string | null, postalCode: string | null) => {
    const parts = [postalCode, city].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-muted-foreground">
            Gérez votre base de données clients
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 size-4" />
          Nouveau client
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher (nom, email, ville)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !clients || clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Users className="size-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Aucun client</h3>
          <p className="text-muted-foreground mb-4">
            {search
              ? `Aucun résultat pour "${search}"`
              : "Ajoutez vos premiers clients pour créer des devis plus rapidement"}
          </p>
          {!search && (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Ajouter un client
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Localisation</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {client.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="size-3" />
                          {client.email}
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Phone className="size-3" />
                          {client.phone}
                        </div>
                      )}
                      {!client.email && !client.phone && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {formatLocation(client.city, client.postalCode) ? (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="size-3" />
                        {formatLocation(client.city, client.postalCode)}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {client.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={<Button variant="ghost" size="icon" />}
                      >
                        <MoreHorizontal className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(client.id)}>
                          <Pencil className="mr-2 size-4" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() =>
                            duplicateMutation.mutate({ id: client.id })
                          }
                        >
                          <Copy className="mr-2 size-4" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => openDelete(client.id)}
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
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Nouveau client</DialogTitle>
            <DialogDescription>
              Ajoutez un client à votre base de données
            </DialogDescription>
          </DialogHeader>
          <ClientForm
            onSubmit={handleCreate}
            onCancel={() => setCreateDialogOpen(false)}
            isLoading={createMutation.isPending}
            submitLabel="Créer le client"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Modifier le client</DialogTitle>
            <DialogDescription>
              Modifiez les informations de ce client
            </DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <ClientForm
              defaultValues={{
                name: selectedClient.name,
                email: selectedClient.email ?? "",
                phone: selectedClient.phone ?? "",
                address: selectedClient.address ?? "",
                city: selectedClient.city ?? "",
                postalCode: selectedClient.postalCode ?? "",
                country: selectedClient.country ?? "FR",
                notes: selectedClient.notes ?? "",
              }}
              onSubmit={handleEdit}
              onCancel={() => {
                setEditDialogOpen(false);
                setSelectedClientId(null);
              }}
              isLoading={updateMutation.isPending}
              submitLabel="Sauvegarder"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Si ce client a des devis associés,
              la suppression sera bloquée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedClientId(null)}>
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
