"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, Package, Euro, TrendingUp, Clock } from "lucide-react";

const stats = [
  {
    title: "Devis ce mois",
    value: "0",
    description: "Commencez par créer votre premier devis",
    icon: FileText,
  },
  {
    title: "Chiffre d'affaires",
    value: "0,00 €",
    description: "Devis acceptés ce mois",
    icon: Euro,
  },
  {
    title: "Clients actifs",
    value: "0",
    description: "Ajoutez des clients dans la section Clients",
    icon: Users,
  },
  {
    title: "Produits / Services",
    value: "0",
    description: "Configurez votre catalogue",
    icon: Package,
  },
];

const recentActivity: { message: string; time: string }[] = [];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Bienvenue sur QuoteForge. Voici un aperçu de votre activité.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick start + Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Pour commencer
            </CardTitle>
            <CardDescription>
              Les étapes pour lancer votre premier devis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium">Configurez votre entreprise</p>
                  <p className="text-xs text-muted-foreground">
                    Allez dans Paramètres pour ajouter votre logo et coordonnées
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  2
                </div>
                <div>
                  <p className="text-sm font-medium">Ajoutez des produits</p>
                  <p className="text-xs text-muted-foreground">
                    Créez votre catalogue dans la section Produits
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  3
                </div>
                <div>
                  <p className="text-sm font-medium">Ajoutez vos clients</p>
                  <p className="text-xs text-muted-foreground">
                    Importez ou créez vos fiches clients
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                  4
                </div>
                <div>
                  <p className="text-sm font-medium">Créez votre premier devis</p>
                  <p className="text-xs text-muted-foreground">
                    Rendez-vous dans la section Devis
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Activité récente
            </CardTitle>
            <CardDescription>
              Vos dernières actions sur QuoteForge
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Aucune activité pour le moment
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">{activity.time}</span>
                    <span>{activity.message}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
