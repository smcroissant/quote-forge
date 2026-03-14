import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, asc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { productCategories, products } from "@/db/schema";

export const categoriesRouter = router({
  // ── List all categories ────────────────────────────
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId as string;
    return ctx.db
      .select()
      .from(productCategories)
      .where(eq(productCategories.organizationId, orgId))
      .orderBy(asc(productCategories.sortOrder), asc(productCategories.name));
  }),

  // ── Create category ────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Le nom est requis").max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId as string;
      const [category] = await ctx.db
        .insert(productCategories)
        .values({
          organizationId: orgId,
          name: input.name,
        })
        .returning();

      return category;
    }),

  // ── Rename category ────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "Le nom est requis").max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId as string;
      const [existing] = await ctx.db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, input.id),
            eq(productCategories.organizationId, orgId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Catégorie introuvable" });
      }

      const [updated] = await ctx.db
        .update(productCategories)
        .set({ name: input.name })
        .where(eq(productCategories.id, input.id))
        .returning();

      return updated;
    }),

  // ── Delete category (products → uncategorized) ─────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId as string;
      const [existing] = await ctx.db
        .select({ id: productCategories.id })
        .from(productCategories)
        .where(
          and(
            eq(productCategories.id, input.id),
            eq(productCategories.organizationId, orgId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Catégorie introuvable" });
      }

      // Move products to uncategorized (categoryId = null)
      await ctx.db
        .update(products)
        .set({ categoryId: null })
        .where(eq(products.categoryId, input.id));

      // Delete the category
      await ctx.db
        .delete(productCategories)
        .where(eq(productCategories.id, input.id));

      return { success: true };
    }),

  // ── Reorder categories ─────────────────────────────
  reorder: protectedProcedure
    .input(
      z.object({
        orderedIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId as string;
      // Update sort_order for each category
      await Promise.all(
        input.orderedIds.map((id, index) =>
          ctx.db
            .update(productCategories)
            .set({ sortOrder: index })
            .where(
              and(
                eq(productCategories.id, id),
                eq(productCategories.organizationId, orgId)
              )
            )
        )
      );

      return { success: true };
    }),
});
