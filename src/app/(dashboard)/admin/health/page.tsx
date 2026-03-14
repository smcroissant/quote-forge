"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Database, Server, Clock } from "lucide-react";

interface HealthData {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  checks: {
    database: {
      status: "up" | "down";
      latencyMs?: number;
      error?: string;
    };
    environment: {
      status: "ok" | "missing";
      missingVars?: string[];
    };
  };
}

const statusConfig = {
  healthy: { label: "Healthy", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", badge: "default" as const },
  degraded: { label: "Degraded", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", badge: "outline" as const },
  unhealthy: { label: "Unhealthy", icon: XCircle, color: "text-red-600", bg: "bg-red-50", badge: "destructive" as const },
};

export default function HealthPage() {
  const [data, setData] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setData({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: "unknown",
        checks: {
          database: { status: "down", error: "Failed to fetch health" },
          environment: { status: "ok" },
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Auto-refresh every 30s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const config = data ? statusConfig[data.status] : statusConfig.unhealthy;
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Health</h1>
          <p className="text-muted-foreground">
            Status du système · v{data?.version ?? "?"} · Mis à jour {lastRefresh.toLocaleTimeString("fr-FR")}
          </p>
        </div>
        <Button variant="outline" onClick={fetchHealth} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Rafraîchir
        </Button>
      </div>

      {/* Overall status */}
      <Card className={`${config.bg} border-2`}>
        <CardContent className="flex items-center gap-4 py-6">
          <StatusIcon className={`h-10 w-10 ${config.color}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{config.label}</span>
              <Badge variant={config.badge}>{data?.status.toUpperCase()}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Dernier check : {data ? new Date(data.timestamp).toLocaleString("fr-FR") : "—"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Checks */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Database */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database (Neon)
            </CardTitle>
            <Badge variant={data?.checks.database.status === "up" ? "default" : "destructive"}>
              {data?.checks.database.status === "up" ? "UP" : "DOWN"}
            </Badge>
          </CardHeader>
          <CardContent>
            {data?.checks.database.status === "up" ? (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Latence</span>
                  <span className="font-mono font-medium">{data.checks.database.latencyMs}ms</span>
                </div>
                <div className="h-2 rounded-full bg-green-100">
                  <div
                    className="h-2 rounded-full bg-green-500 transition-all"
                    style={{ width: `${Math.min(100, (data.checks.database.latencyMs ?? 0) / 2)}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-600">{data?.checks.database.error ?? "Connection failed"}</p>
            )}
          </CardContent>
        </Card>

        {/* Environment */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Server className="h-4 w-4" />
              Environment
            </CardTitle>
            <Badge variant={data?.checks.environment.status === "ok" ? "default" : "destructive"}>
              {data?.checks.environment.status === "ok" ? "OK" : "MISSING"}
            </Badge>
          </CardHeader>
          <CardContent>
            {data?.checks.environment.status === "ok" ? (
              <p className="text-sm text-muted-foreground">Toutes les variables d&apos;environnement sont configurées</p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm text-red-600 font-medium">Variables manquantes :</p>
                <ul className="text-sm text-red-600 list-disc pl-4">
                  {data?.checks.environment.missingVars?.map((v) => (
                    <li key={v} className="font-mono">{v}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Informations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version (commit)</span>
            <span className="font-mono">{data?.version ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environnement</span>
            <span className="font-mono">{process.env.NODE_ENV}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Auto-refresh</span>
            <span>30 secondes</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Health endpoint</span>
            <a href="/api/health" target="_blank" className="text-primary hover:underline font-mono">
              /api/health
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
