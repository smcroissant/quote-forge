import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileQuestion, Home } from "lucide-react";

export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Page introuvable</CardTitle>
          <CardDescription>
            La page que vous recherchez n&apos;existe pas ou a été déplacée.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href="/dashboard" />}>
            <Home className="mr-2 h-4 w-4" />
            Retour à l&apos;accueil
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
