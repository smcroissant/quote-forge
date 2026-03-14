"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Users, Package, Euro, TrendingUp, Clock,
  ArrowRight, Loader2, CheckCircle2, XCircle, Eye, Send, CircleDot
} from "lucide-react";

function formatCurrency(value: string | number): string {
  return parseFloat(String(value)).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ── Status pipeline config ──────────────────────────
const pipelineSteps = [
  { key: "draft", label: "Brouillon", color: "bg-slate-400" },
  { key: "sent", label: "Envoyé", color: "bg-blue-500" },
  { key: "viewed", label: "Vu", color: "bg-purple-500" },
] as const;

const wonLostConfig = [
  { key: "accepted", label: "Accepté", icon: CheckCircle2, color: "text-green-600", bgColor: "bg-green-50" },
  { key: "rejected", label: "Refusé", icon: XCircle, color: "text-red-600", bgColor: "bg-red-50" },
  { key: "expired", label: "Expiré", icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50" },
] as const;

export default function DashboardPage() {
  const { data: stats, isLoading } = trpc.quotes.getStats.useQuery();
  const { data: productsData } = trpc.products.getAll.useQuery();
  const { data: clientsData } = trpc.clients.getAll.useQuery();

  const productCount = productsData?.length ?? 0;
  const clientCount = clientsData?.length ?? 0;

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Voici un aperçu de votre activité sur QuoteForge.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Devis au total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : stats?.totalQuotes ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pipeline.active ?? 0} en cours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA accepté</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${formatCurrency(stats?.acceptedRevenue ?? 0)} €`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total devis acceptés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux de conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${stats?.conversionRate ?? 0}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              Devis acceptés / total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clientCount}</div>
            <p className="text-xs text-muted-foreground">
              {productCount} produits / services
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline + Recent */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Quote Pipeline ────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5" />
              Pipeline des devis
            </CardTitle>
            <CardDescription>
              Répartition par statut de vos devis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active pipeline */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">En cours</p>
                  <div className="flex items-center gap-2">
                    {pipelineSteps.map((step, i) => {
                      const count = stats?.statusCounts[step.key] ?? 0;
                      return (
                        <div key={step.key} className="flex items-center gap-2 flex-1">
                          <div className={`h-2 rounded-full ${step.color} flex-1`} style={{ opacity: count > 0 ? 1 : 0.3 }} />
                          <div className="text-center">
                            <p className="text-lg font-bold">{count}</p>
                            <p className="text-xs text-muted-foreground">{step.label}</p>
                          </div>
                          {i < pipelineSteps.length - 1 && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Won / Lost */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Résultat</p>
                  <div className="grid grid-cols-3 gap-3">
                    {wonLostConfig.map((item) => {
                      const count = stats?.statusCounts[item.key] ?? 0;
                      const ItemIcon = item.icon;
                      return (
                        <div key={item.key} className={`rounded-lg p-3 ${item.bgColor}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <ItemIcon className={`h-4 w-4 ${item.color}`} />
                            <span className="text-xs font-medium">{item.label}</span>
                          </div>
                          <p className={`text-2xl font-bold ${item.color}`}>{count}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Quick start / CTA ─────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Actions rapides
            </CardTitle>
            <CardDescription>
              Vos prochaines étapes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-start" render={(props) => (
                <Link href="/quotes/new" {...props}>
                  <FileText className="mr-2 h-4 w-4" />
                  Créer un nouveau devis
                </Link>
              )} />
              <Button variant="outline" className="w-full justify-start" render={(props) => (
                <Link href="/clients" {...props}>
                  <Users className="mr-2 h-4 w-4" />
                  Gérer les clients
                </Link>
              )} />
              <Button variant="outline" className="w-full justify-start" render={(props) => (
                <Link href="/products" {...props}>
                  <Package className="mr-2 h-4 w-4" />
                  Gérer le catalogue
                </Link>
              )} />

              {/* Active quotes requiring attention */}
              {stats && (stats.statusCounts.draft > 0 || stats.statusCounts.sent > 0) && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Attention requise
                  </p>
                  {stats.statusCounts.draft > 0 && (
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="flex items-center gap-2">
                        <Badge variant="secondary">Brouillon</Badge>
                        <span className="text-muted-foreground">à finaliser</span>
                      </span>
                      <span className="font-semibold">{stats.statusCounts.draft}</span>
                    </div>
                  )}
                  {stats.statusCounts.sent > 0 && (
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="flex items-center gap-2">
                        <Badge variant="default">Envoyé</Badge>
                        <span className="text-muted-foreground">en attente de réponse</span>
                      </span>
                      <span className="font-semibold">{stats.statusCounts.sent}</span>
                    </div>
                  )}
                  {stats.statusCounts.viewed > 0 && (
                    <div className="flex items-center justify-between text-sm py-1">
                      <span className="flex items-center gap-2">
                        <Badge variant="outline">Vu</Badge>
                        <span className="text-muted-foreground">à relancer</span>
                      </span>
                      <span className="font-semibold">{stats.statusCounts.viewed}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
