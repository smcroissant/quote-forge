import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { organizations } from "@/db/schema";

export const organizationRouter = router({
  // ── Get current org settings ──────────────────────
  get: protectedProcedure.query(async ({ ctx }) => {
    const [org] = await ctx.db
      .select()
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId))
      .limit(1);

    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organisation introuvable" });
    }

    return org;
  }),

  // ── Update general info ───────────────────────────
  updateInfo: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Le nom est requis").optional(),
        email: z.string().email().nullable().optional(),
        phone: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        postalCode: z.string().nullable().optional(),
        country: z.string().optional(),
        website: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId))
        .returning();

      return updated;
    }),

  // ── Update billing settings ───────────────────────
  updateBilling: protectedProcedure
    .input(
      z.object({
        currency: z.string().optional(),
        taxRate: z.string().or(z.number()).transform(String).optional(),
        taxEnabled: z.boolean().optional(),
        quotePrefix: z.string().optional(),
        nextQuoteNumber: z.number().int().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId))
        .returning();

      return updated;
    }),

  // ── Update bank details ───────────────────────────
  updateBank: protectedProcedure
    .input(
      z.object({
        bankName: z.string().nullable().optional(),
        bankIban: z.string().nullable().optional(),
        bankBic: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId))
        .returning();

      return updated;
    }),

  // ── Update logo URL ───────────────────────────────
  updateLogo: protectedProcedure
    .input(z.object({ logo: z.string().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(organizations)
        .set({ logo: input.logo, updatedAt: new Date() })
        .where(eq(organizations.id, ctx.organizationId))
        .returning();

      return updated;
    }),
});
