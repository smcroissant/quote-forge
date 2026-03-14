"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200, "Nom trop long (max 200)"),
  description: z.string().max(2000, "Description trop longue (max 2000)").optional(),
  unitPrice: z.string().min(1, "Le prix est requis"),
  unit: z.string().min(1, "L'unité est requise"),
  taxRate: z.string().min(1, "La TVA est requise"),
  categoryId: z.string().nullable().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  defaultValues?: Partial<ProductFormValues>;
  categories?: { id: string; name: string }[];
  onSubmit: (data: ProductFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

const UNITS = [
  { value: "unité", label: "Unité" },
  { value: "heure", label: "Heure" },
  { value: "jour", label: "Jour" },
  { value: "mois", label: "Mois" },
  { value: "an", label: "An" },
  { value: "pièce", label: "Pièce" },
  { value: "forfait", label: "Forfait" },
  { value: "m²", label: "m²" },
  { value: "m", label: "Mètre linéaire" },
];

const TAX_RATES = [
  { value: "0.00", label: "0 %" },
  { value: "5.50", label: "5,5 %" },
  { value: "10.00", label: "10 %" },
  { value: "20.00", label: "20 %" },
];

export function ProductForm({
  defaultValues,
  categories,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = "Enregistrer",
}: ProductFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      unitPrice: "",
      unit: "unité",
      taxRate: "20.00",
      categoryId: null,
      ...defaultValues,
    },
  });

  const unit = watch("unit");
  const taxRate = watch("taxRate");
  const categoryId = watch("categoryId");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom *</Label>
        <Input
          id="name"
          placeholder="Ex: Développement site web"
          maxLength={200}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Description détaillée du produit ou service..."
          rows={3}
          maxLength={2000}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-red-500">{errors.description.message}</p>
        )}
      </div>

      {/* Price + Unit */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unitPrice">Prix unitaire (€) *</Label>
          <Input
            id="unitPrice"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("unitPrice")}
          />
          {errors.unitPrice && (
            <p className="text-sm text-red-500">{errors.unitPrice.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Unité *</Label>
          <Select value={unit} onValueChange={(v: string | null) => v && setValue("unit", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {UNITS.map((u) => (
                <SelectItem key={u.value} value={u.value}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tax Rate + Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>TVA</Label>
          <Select value={taxRate} onValueChange={(v: string | null) => v && setValue("taxRate", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Taux de TVA" />
            </SelectTrigger>
            <SelectContent>
              {TAX_RATES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Catégorie</Label>
          <Select
            value={categoryId ?? "uncategorized"}
            onValueChange={(v: string | null) =>
              setValue("categoryId", !v || v === "uncategorized" ? null : v)
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Sans catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="uncategorized">Sans catégorie</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
