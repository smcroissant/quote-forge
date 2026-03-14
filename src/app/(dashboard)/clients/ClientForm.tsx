"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const clientSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200, "Nom trop long (max 200)"),
  email: z
    .string()
    .email("Email invalide")
    .or(z.literal(""))
    .nullable()
    .optional(),
  phone: z.string().max(30).optional().or(z.literal("")),
  address: z.string().max(500).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  postalCode: z.string().max(15).optional().or(z.literal("")),
  country: z.string().max(2),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

interface ClientFormProps {
  defaultValues?: Partial<ClientFormValues>;
  onSubmit: (data: ClientFormValues) => void;
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
}

export function ClientForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
  submitLabel = "Enregistrer",
}: ClientFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postalCode: "",
      country: "FR",
      notes: "",
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Nom / Raison sociale *</Label>
        <Input
          id="name"
          placeholder="Ex: Dupont SAS"
          maxLength={200}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-sm text-red-500">{errors.name.message}</p>
        )}
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="contact@entreprise.fr"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Téléphone</Label>
          <Input
            id="phone"
            placeholder="06 12 34 56 78"
            maxLength={30}
            {...register("phone")}
          />
        </div>
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Adresse</Label>
        <Input
          id="address"
          placeholder="12 rue de la Paix"
          maxLength={500}
          {...register("address")}
        />
      </div>

      {/* City + Postal Code + Country */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ville</Label>
          <Input
            id="city"
            placeholder="Paris"
            maxLength={100}
            {...register("city")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="postalCode">Code postal</Label>
          <Input
            id="postalCode"
            placeholder="75001"
            maxLength={15}
            {...register("postalCode")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="country">Pays</Label>
          <Input
            id="country"
            placeholder="FR"
            maxLength={2}
            {...register("country")}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Informations complémentaires..."
          rows={3}
          maxLength={2000}
          {...register("notes")}
        />
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
