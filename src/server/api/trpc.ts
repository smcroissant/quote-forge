import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Context } from "./context";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Helper to get org ID with type narrowing
export function requireOrgId(ctx: Context): string {
  if (!ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No organization selected" });
  }
  return ctx.organizationId;
}

// ── Auth middleware ──────────────────────────────────
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  if (!ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No organization selected" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      organizationId: ctx.organizationId,
    } as Context & { session: NonNullable<Context["session"]>; organizationId: string },
  });
});

// ── Rate limit middleware ────────────────────────────
const withRateLimit = t.middleware(({ ctx, next }) => {
  const ip = ctx.session?.session?.ipAddress ?? "anonymous";
  const result = rateLimit(`api:${ip}`, RATE_LIMITS.api);

  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Trop de requêtes. Veuillez patienter.",
    });
  }

  return next({ ctx });
});

// ── Production error sanitizer ──────────────────────
const sanitizeErrors = t.middleware(async ({ path, type, ctx, next }) => {
  try {
    return await next();
  } catch (error) {
    const userId = ctx.session?.session?.userId ?? "anonymous";
    const orgId = ctx.organizationId ?? "none";

    if (error instanceof TRPCError) {
      logger.warn(`tRPC error: ${error.code}`, {
        path,
        type,
        code: error.code,
        userId,
        orgId,
      });
      throw error;
    }

    logger.error(
      `Unhandled error in ${type} ${path}`,
      error instanceof Error ? error : new Error(String(error)),
      { userId, orgId }
    );

    if (process.env.NODE_ENV === "production") {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Une erreur est survenue. Veuillez réessayer.",
      });
    }

    throw error;
  }
});

export const router = t.router;
export const publicProcedure = t.procedure.use(sanitizeErrors);
export const protectedProcedure = t.procedure
  .use(sanitizeErrors)
  .use(isAuthed)
  .use(withRateLimit);
