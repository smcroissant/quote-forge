import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, ilike, or } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { clients } from "@/db/schema";

export const clientsRouter = router({
  // ── List all clients (with optional search) ────────
  getAll: protectedProcedure
    .input(
      z.object({
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(clients.organizationId, ctx.organizationId)];

      if (input?.search) {
        conditions.push(
          or(
            ilike(clients.name, `%${input.search}%`),
            ilike(clients.email, `%${input.search}%`),
            ilike(clients.city, `%${input.search}%`)
          )!
        );
      }

      return ctx.db
        .select()
        .from(clients)
        .where(and(...conditions))
        .orderBy(desc(clients.createdAt))
        .limit(input?.limit ?? 50);
    }),

  // ── Get single client by ID ────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [client] = await ctx.db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable" });
      }

      return client;
    }),

  // ── Create client ──────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Le nom est requis").max(200, "Nom trop long (max 200)"),
        email: z.string().email("Email invalide").nullable().optional(),
        phone: z.string().max(30).nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        postalCode: z.string().max(15).nullable().optional(),
        country: z.string().max(2).optional().default("FR"),
        notes: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [client] = await ctx.db
        .insert(clients)
        .values({
          organizationId: ctx.organizationId,
          name: input.name,
          email: input.email ?? null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          city: input.city ?? null,
          postalCode: input.postalCode ?? null,
          country: input.country ?? "FR",
          notes: input.notes ?? null,
        })
        .returning();

      return client;
    }),

  // ── Update client ──────────────────────────────────
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1, "Le nom est requis").max(200).optional(),
        email: z.string().email("Email invalide").nullable().optional(),
        phone: z.string().max(30).nullable().optional(),
        address: z.string().max(500).nullable().optional(),
        city: z.string().max(100).nullable().optional(),
        postalCode: z.string().max(15).nullable().optional(),
        country: z.string().max(2).optional(),
        notes: z.string().max(2000).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const [existing] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, id),
            eq(clients.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable" });
      }

      const [updated] = await ctx.db
        .update(clients)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(clients.id, id))
        .returning();

      return updated;
    }),

  // ── Duplicate client ───────────────────────────────
  duplicate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [original] = await ctx.db
        .select()
        .from(clients)
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!original) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable" });
      }

      const [duplicate] = await ctx.db
        .insert(clients)
        .values({
          organizationId: ctx.organizationId,
          name: `${original.name} (copie)`,
          email: original.email,
          phone: original.phone,
          address: original.address,
          city: original.city,
          postalCode: original.postalCode,
          country: original.country,
          notes: original.notes,
        })
        .returning();

      return duplicate;
    }),

  // ── Delete client ──────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.id),
            eq(clients.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable" });
      }

      // Note: quotes reference clients with onDelete: "restrict"
      // so deletion will fail if client has quotes — this is intentional
      await ctx.db.delete(clients).where(eq(clients.id, input.id));

      return { success: true };
    }),
});
