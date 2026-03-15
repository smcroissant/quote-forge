"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText, Users, Package, Euro, TrendingUp, Clock,
  ArrowRight, Loader2, CheckCircle2, XCircle, CircleDot,
  ArrowUpRight, ArrowDownRight, Receipt, Timer, Trophy,
  Bell, Eye, Mail, Pencil, Trash2,
} from "lucide-react";
import { FirstSteps } from "@/components/dashboard/first-steps";

function formatCurrency(value: string | number): string {
  return parseFloat(String(value)).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatCompactCurrency(value: number): string {
  if (value >= 10000) {
    return `${(value / 1000).toFixed(1)}k €`;
  }
  return `${formatCurrency(value)} €`;
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
  { key: "invoiced", label: "Facturé", icon: Receipt, color: "text-indigo-600", bgColor: "bg-indigo-50" },
] as const;

// ── Simple bar chart component ──────────────────────
function MiniBarChart({ data }: { data: { label: string; invoiced: number; paid: number }[] }) {
  const maxValue = Math.max(...data.map(d => Math.max(d.invoiced, d.paid)), 1);

  return (
    <div className="flex items-end gap-2 h-32 mt-4">
      {data.map((item, i) => {
        const invoicedHeight = Math.max((item.invoiced / maxValue) * 100, 2);
        const paidHeight = Math.max((item.paid / maxValue) * 100, 2);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex items-end gap-0.5 h-24 w-full justify-center">
              <div
                className="w-3 bg-indigo-200 rounded-t-sm"
                style={{ height: `${invoicedHeight}%` }}
                title={`Facturé: ${formatCurrency(item.invoiced)} €`}
              />
              <div
                className="w-3 bg-green-400 rounded-t-sm"
                style={{ height: `${paidHeight}%` }}
                title={`Payé: ${formatCurrency(item.paid)} €`}
              />
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const { data: kpis, isLoading } = trpc.dashboard.getKPIs.useQuery();
  const { data: advanced } = trpc.dashboard.getAdvancedStats.useQuery();

  // Compute month-over-month change
  const revenueChange = kpis?.revenue.lastMonth
    ? Math.round(((kpis.revenue.currentMonth - kpis.revenue.lastMonth) / Math.max(kpis.revenue.lastMonth, 1)) * 100)
    : 0;

  const paidChange = kpis?.revenue.paidLastMonth
    ? Math.round(((kpis.revenue.paidThisMonth - kpis.revenue.paidLastMonth) / Math.max(kpis.revenue.paidLastMonth, 1)) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Aperçu de votre activité en temps réel
        </p>
      </div>

      {/* ── First Steps Checklist ───────────────────── */}
      <FirstSteps />

      {/* ── KPI Cards Row 1: Revenue ─────────────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CA du mois */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CA facturé (mois)</CardTitle>
            <Euro className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${formatCurrency(kpis?.revenue.currentMonth ?? 0)} €`}
            </div>
            <p className="text-xs flex items-center gap-1 mt-1">
              {revenueChange >= 0 ? (
                <span className="text-green-600 flex items-center"><ArrowUpRight className="h-3 w-3" />{revenueChange}%</span>
              ) : (
                <span className="text-red-600 flex items-center"><ArrowDownRight className="h-3 w-3" />{Math.abs(revenueChange)}%</span>
              )}
              <span className="text-muted-foreground">vs mois dernier</span>
            </p>
          </CardContent>
        </Card>

        {/* Encaissé */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encaissé (mois)</CardTitle>
            <Receipt className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${formatCurrency(kpis?.revenue.paidThisMonth ?? 0)} €`}
            </div>
            <p className="text-xs flex items-center gap-1 mt-1">
              {paidChange >= 0 ? (
                <span className="text-green-600 flex items-center"><ArrowUpRight className="h-3 w-3" />{paidChange}%</span>
              ) : (
                <span className="text-red-600 flex items-center"><ArrowDownRight className="h-3 w-3" />{Math.abs(paidChange)}%</span>
              )}
              <span className="text-muted-foreground">vs mois dernier</span>
            </p>
          </CardContent>
        </Card>

        {/* Conversion devis → facture */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${kpis?.quotes.conversionRate ?? 0}%`}
            </div>
            <p className="text-xs flex items-center gap-1 mt-1">
              {advanced?.conversionTrend ? (
                advanced.conversionTrend.difference >= 0 ? (
                  <span className="text-green-600 flex items-center">
                    <ArrowUpRight className="h-3 w-3" />+{advanced.conversionTrend.difference}pts
                  </span>
                ) : (
                  <span className="text-red-600 flex items-center">
                    <ArrowDownRight className="h-3 w-3" />{advanced.conversionTrend.difference}pts
                  </span>
                )
              ) : null}
              <span className="text-muted-foreground">vs mois dernier ({advanced?.conversionTrend.lastMonthRate ?? 0}%)</span>
            </p>
          </CardContent>
        </Card>

        {/* Délai moyen paiement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Délai paiement</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${kpis?.payment.avgDays ?? 0} jours`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Moyenne sur {kpis?.payment.paidCount ?? 0} factures payées
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 2: Outstanding + Top Clients ─────────── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Encours */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encours à encaisser</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : `${formatCurrency(kpis?.revenue.outstanding ?? 0)} €`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(kpis?.revenue.totalInvoiced ?? 0)} € facturés · {formatCurrency(kpis?.revenue.totalPaid ?? 0)} € encaissés
            </p>
          </CardContent>
        </Card>

        {/* Top 5 Clients */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top 5 clients par CA
              </CardTitle>
              <CardDescription>Chiffre d&apos;affaires total (factures)</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : !kpis?.topClients || kpis.topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune facture enregistrée pour le moment
              </p>
            ) : (
              <div className="space-y-3">
                {kpis.topClients.map((client, i) => {
                  const maxRevenue = kpis.topClients[0]?.revenue ?? 1;
                  const barWidth = (client.revenue / maxRevenue) * 100;
                  return (
                    <div key={client.id} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-4">
                        {i + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{client.name}</span>
                          <span className="text-sm font-semibold ml-2">{formatCompactCurrency(client.revenue)}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Pipeline + Revenue Chart ──────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quote Pipeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleDot className="h-5 w-5" />
              Pipeline des devis
            </CardTitle>
            <CardDescription>Répartition par statut</CardDescription>
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
                      const count = kpis?.quotes.statusCounts[step.key] ?? 0;
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
                  <div className="grid grid-cols-2 gap-3">
                    {wonLostConfig.map((item) => {
                      const count = kpis?.quotes.statusCounts[item.key] ?? 0;
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

        {/* Revenue Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Évolution CA (6 mois)
            </CardTitle>
            <CardDescription>
              <span className="inline-flex items-center gap-1">
                <span className="w-3 h-3 bg-indigo-200 rounded-sm" /> Facturé
                <span className="w-3 h-3 bg-green-400 rounded-sm ml-2" /> Encaissé
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-[200px] items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <MiniBarChart data={kpis?.monthlyRevenue ?? []} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Pending Quotes Alert ──────────────────────── */}
      {advanced?.pendingQuotes && advanced.pendingQuotes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-amber-800">
              <Bell className="h-5 w-5 text-amber-600" />
              Devis en attente de réponse ({advanced.pendingQuotes.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              Ces devis ont été envoyés il y a plus de 3 jours sans retour du client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {advanced.pendingQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between rounded-lg border border-amber-200 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100">
                      <FileText className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {quote.quoteNumber} — {quote.clientName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Envoyé il y a {quote.daysWaiting} jours
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">
                      {formatCurrency(quote.total)} €
                    </span>
                    <Link href={`/quotes/${quote.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Actions ─────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions rapides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" render={(props) => (
              <Link href="/quotes/new" {...props}>
                <FileText className="mr-2 h-4 w-4" />
                Nouveau devis
              </Link>
            )} />
            <Button variant="outline" render={(props) => (
              <Link href="/clients" {...props}>
                <Users className="mr-2 h-4 w-4" />
                Ajouter client
              </Link>
            )} />
            <Button variant="outline" render={(props) => (
              <Link href="/invoices" {...props}>
                <Receipt className="mr-2 h-4 w-4" />
                Voir les factures
              </Link>
            )} />
            <Button variant="outline" render={(props) => (
              <Link href="/products" {...props}>
                <Package className="mr-2 h-4 w-4" />
                Gérer le catalogue
              </Link>
            )} />
          </div>
        </CardContent>
      </Card>

      {/* ── Recent Activity ──────────────────────────── */}
      <RecentActivity />
    </div>
  );
}

// ── Recent Activity Component ───────────────────────
function RecentActivity() {
  const { data: activities, isLoading } = trpc.notifications.getRecentActivity.useQuery({ limit: 10 });

  const actionConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
    status_changed: { label: "Changement statut", color: "text-indigo-600", icon: CheckCircle2 },
    created: { label: "Créé", color: "text-blue-600", icon: FileText },
    updated: { label: "Modifié", color: "text-slate-600", icon: Pencil },
    viewed: { label: "Consulté", color: "text-purple-600", icon: Eye },
    email_sent: { label: "Email envoyé", color: "text-green-600", icon: Mail },
    payment_reminder_sent: { label: "Relance envoyée", color: "text-amber-600", icon: Bell },
    deleted: { label: "Supprimé", color: "text-red-600", icon: Trash2 },
  };

  const statusLabels: Record<string, string> = {
    draft: "Brouillon", sent: "Envoyé", viewed: "Vu",
    accepted: "Accepté ✅", rejected: "Refusé", expired: "Expiré",
    invoiced: "Facturé", paid: "Payé", overdue: "En retard",
  };

  function formatTimeAgo(date: Date | string): string {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);

    if (diffMins < 1) return "à l'instant";
    if (diffMins < 60) return `il y a ${diffMins}min`;
    if (diffHours < 24) return `il y a ${diffHours}h`;
    if (diffDays < 7) return `il y a ${diffDays}j`;
    return d.toLocaleDateString("fr-FR");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Activité récente
        </CardTitle>
        <CardDescription>Les 10 dernières actions sur vos devis</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !activities || activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucune activité récente
          </p>
        ) : (
          <div className="space-y-0">
            {activities.map((activity, i) => {
              const config = actionConfig[activity.action] ?? actionConfig.updated;
              const Icon = config.icon;
              const isLast = i === activities.length - 1;

              // Build description
              let description = "";
              if (activity.action === "status_changed") {
                const from = statusLabels[activity.fromStatus ?? ""] ?? activity.fromStatus ?? "";
                const to = statusLabels[activity.toStatus ?? ""] ?? activity.toStatus ?? "";
                description = `${from} → ${to}`;
              } else if (activity.action === "created") {
                description = "Nouveau devis créé";
              } else if (activity.action === "payment_reminder_sent") {
                description = `Rappel #${activity.metadata?.reminderNumber ?? "?"}`;
              } else if (activity.action === "email_sent") {
                description = "Devis envoyé par email";
              } else {
                description = config.label;
              }

              return (
                <div key={activity.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full border bg-background ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    {!isLast && <div className="w-px flex-1 bg-border my-1" />}
                  </div>
                  <div className="pb-4 pt-0.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{activity.quoteNumber}</span>
                        {" — "}
                        <span className="text-muted-foreground">{description}</span>
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimeAgo(activity.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}