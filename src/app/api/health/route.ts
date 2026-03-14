import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

interface HealthStatus {
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

export async function GET() {
  const startTime = Date.now();
  const checks: HealthStatus["checks"] = {
    database: { status: "down" },
    environment: { status: "ok" },
  };

  // ── Check database connection ────────────────────
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    checks.database = {
      status: "up",
      latencyMs: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: "down",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }

  // ── Check required env vars ──────────────────────
  const requiredVars = [
    "DATABASE_URL",
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
  ];
  const missingVars = requiredVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    checks.environment = {
      status: "missing",
      missingVars,
    };
  }

  // ── Determine overall status ─────────────────────
  let status: HealthStatus["status"] = "healthy";
  if (checks.database.status === "down") {
    status = "unhealthy";
  } else if (checks.environment.status === "missing") {
    status = "degraded";
  }

  const response: HealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    checks,
  };

  const httpStatus = status === "healthy" ? 200 : status === "degraded" ? 200 : 503;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
