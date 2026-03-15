"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, ArrowRight, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  completed: boolean;
}

export function FirstSteps() {
  const [dismissed, setDismissed] = useState(false);

  const { data: products } = trpc.products.getAll.useQuery();
  const { data: clients } = trpc.clients.getAll.useQuery();
  const { data: quotes } = trpc.quotes.getAll.useQuery({ limit: 1 });

  const items: ChecklistItem[] = [
    {
      id: "products",
      title: "Ajoutez un produit",
      description: "Créez votre premier produit ou service",
      href: "/products",
      cta: "Ajouter",
      completed: (products?.length ?? 0) > 0,
    },
    {
      id: "clients",
      title: "Ajoutez un client",
      description: "Enregistrez votre premier client",
      href: "/clients",
      cta: "Ajouter",
      completed: (clients?.length ?? 0) > 0,
    },
    {
      id: "quote",
      title: "Créez un devis",
      description: "Générez votre premier devis professionnel",
      href: "/quotes/new",
      cta: "Créer",
      completed: (quotes?.length ?? 0) > 0,
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const progress = (completedCount / items.length) * 100;
  const allDone = completedCount === items.length;

  // Auto-dismiss when all done
  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => setDismissed(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [allDone]);

  if (dismissed) return null;

  return (
    <Card className={cn(
      "border-2 transition-all",
      allDone ? "border-green-200 bg-green-50/50" : "border-indigo-200 bg-indigo-50/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {allDone ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Rocket className="h-5 w-5 text-indigo-600" />
            )}
            {allDone ? "Vous êtes prêt !" : "Premiers pas"}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground h-7"
            onClick={() => setDismissed(true)}
          >
            Masquer
          </Button>
        </div>
        {/* Progress bar */}
        <div className="mt-2 h-2 rounded-full bg-indigo-100 overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              allDone ? "bg-green-500" : "bg-indigo-500"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {completedCount}/{items.length} étapes complétées
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center justify-between rounded-lg border p-3 transition-all",
              item.completed
                ? "border-green-200 bg-green-50/50"
                : "border-input bg-background hover:border-indigo-300"
            )}
          >
            <div className="flex items-center gap-3">
              {item.completed ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div>
                <p className={cn(
                  "text-sm font-medium",
                  item.completed && "text-green-700"
                )}>
                  {item.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
            {!item.completed && (
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0"
                render={<Link href={item.href} />}
              >
                {item.cta}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
