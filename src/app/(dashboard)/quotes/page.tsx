import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

export default function QuotesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Devis</h2>
          <p className="text-muted-foreground">
            Gérez vos devis et suivez leur statut
          </p>
        </div>
        <Button>
          <Link href="/quotes/new" className="flex items-center">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aucun devis</CardTitle>
          <CardDescription>
            Créez votre premier devis pour commencer à suivre votre activité.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            Les devis apparaîtront ici
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
