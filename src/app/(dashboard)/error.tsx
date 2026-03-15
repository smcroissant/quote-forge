"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to error reporting service in production
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Oups, quelque chose s&apos;est mal passé</CardTitle>
          <CardDescription>
            Une erreur inattendue s&apos;est produite. Vous pouvez réessayer ou
            retourner à l&apos;accueil.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            Réessayer
          </Button>
          <Button variant="outline" render={<Link href="/dashboard" />} className="w-full">
            <Home className="mr-2 h-4 w-4" />
            Retour à l&apos;accueil
          </Button>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 rounded-lg bg-muted p-3 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Détails de l&apos;erreur (dev)
              </summary>
              <pre className="mt-2 whitespace-pre-wrap text-destructive">
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
