import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Gérez votre base de données clients
          </p>
        </div>
        <Button>
          <Link href="/clients/new" className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aucun client</CardTitle>
          <CardDescription>
            Ajoutez vos premiers clients pour créer des devis plus rapidement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Les clients apparaîtront ici
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
