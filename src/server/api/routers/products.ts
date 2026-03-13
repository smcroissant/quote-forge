import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { products } from "@/db/schema";

export const productsRouter = router({
  // ── List all products (with optional search) ───────
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        includeInactive: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(products.organizationId, ctx.organizationId)];

      if (!input?.includeInactive) {
        conditions.push(eq(products.isActive, true));
      }

      if (input?.search) {
        conditions.push(
          or(
            ilike(products.name, `%${input.search}%`),
            ilike(products.description, `%${input.search}%`)
          )!
        );
      }

      return ctx.db
        .select()
        .from(products)
        .where(and(...conditions))
        .orderBy(desc(products.createdAt));
    }),

  // ── Get single product by ID ───────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .select()
        .from(products)
        .where(
          and(
            eq(products.id, input.id),
            eq(products.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!product) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produit introuvable" });
      }

      return product;
    }),

  // ── Create product ─────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Le nom est requis"),
        description: z.string().optional(),
        unitPrice: z.string().or(z.number()).transform(String),
        unit: z.string().optional().default("unité"),
        taxRate: z.string().or(z.number()).transform(String).optional().default("20.00"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [product] = await ctx.db
        .insert(products)
        .values({
          organizationId: ctx.organizationId,
          name: input.name,
          description: input.description ?? null,
          unitPrice: input.unitPrice,
          unit: input.unit,
          taxRate: input.taxRate,
          isActive: true,
        })
        .returning();

      return product;
    }),

  // ── Update product ─────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "Le nom est requis").optional(),
        description: z.string().nullable().optional(),
        unitPrice: z.string().or(z.number()).transform(String).optional(),
        unit: z.string().optional(),
        taxRate: z.string().or(z.number()).transform(String).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Check ownership
      const [existing] = await ctx.db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, id),
            eq(products.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produit introuvable" });
      }

      const [updated] = await ctx.db
        .update(products)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();

      return updated;
    }),

  // ── Toggle active status ───────────────────────────
  toggleActive: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: products.id, isActive: products.isActive })
        .from(products)
        .where(
          and(
            eq(products.id, input.id),
            eq(products.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produit introuvable" });
      }

      const [updated] = await ctx.db
        .update(products)
        .set({
          isActive: !existing.isActive,
          updatedAt: new Date(),
        })
        .where(eq(products.id, input.id))
        .returning();

      return updated;
    }),

  // ── Delete product ─────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: products.id })
        .from(products)
        .where(
          and(
            eq(products.id, input.id),
            eq(products.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Produit introuvable" });
      }

      await ctx.db.delete(products).where(eq(products.id, input.id));

      return { success: true };
    }),
});
