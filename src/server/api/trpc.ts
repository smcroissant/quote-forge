import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { createContext } from "./context";

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

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

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
