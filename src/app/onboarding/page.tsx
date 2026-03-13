"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");

  const generateSlug = (name: string) =>
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (orgName.trim().length < 2) {
      toast.error("Le nom de l'entreprise doit contenir au moins 2 caractères");
      return;
    }

    setIsLoading(true);

    try {
      const result = await authClient.organization.create({
        name: orgName.trim(),
        slug: generateSlug(orgName),
      });

      if (result.error) {
        toast.error(result.error.message || "Erreur lors de la création de l'organisation");
        return;
      }

      toast.success("Organisation créée avec succès !");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Configurez votre entreprise
          </CardTitle>
          <CardDescription>
            Ces informations apparaîtront sur vos devis. Vous pourrez les modifier plus tard.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nom de l&apos;entreprise *</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="Acme SARL"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                required
                disabled={isLoading}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgEmail">Email professionnel</Label>
              <Input
                id="orgEmail"
                type="email"
                placeholder="contact@acme.fr"
                value={orgEmail}
                onChange={(e) => setOrgEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orgPhone">Téléphone</Label>
                <Input
                  id="orgPhone"
                  type="tel"
                  placeholder="01 23 45 67 89"
                  value={orgPhone}
                  onChange={(e) => setOrgPhone(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orgAddress">Adresse</Label>
                <Input
                  id="orgAddress"
                  type="text"
                  placeholder="1 rue Example"
                  value={orgAddress}
                  onChange={(e) => setOrgAddress(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer mon espace
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
