import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { createContext } from "./context";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

// ── Auth middleware ──────────────────────────────────
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session || !ctx.organizationId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      organizationId: ctx.organizationId,
    },
  });
});

// ── Rate limit middleware ────────────────────────────
const withRateLimit = t.middleware(({ ctx, next }) => {
  const ip =
    ctx.session?.session?.ipAddress ??
    "anonymous";

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
const sanitizeErrors = t.middleware(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof TRPCError) {
      // Re-throw tRPC errors as-is (they're already user-friendly)
      throw error;
    }

    // In production, hide internal errors
    if (process.env.NODE_ENV === "production") {
      console.error("[Internal Error]", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Une erreur est survenue. Veuillez réessayer.",
      });
    }

    // In dev, show the real error
    throw error;
  }
});

export const router = t.router;
export const publicProcedure = t.procedure.use(sanitizeErrors);
export const protectedProcedure = t.procedure
  .use(sanitizeErrors)
  .use(isAuthed)
  .use(withRateLimit);
