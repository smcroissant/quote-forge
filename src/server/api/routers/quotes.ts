import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { router, protectedProcedure } from "../trpc";
import { quotes, quoteLines, clients, products, quoteActivities } from "@/db/schema";

// ── Status transition rules ─────────────────────────
// Draft → Sent → Viewed → Accepted / Rejected / Expired
// Also: Draft → Expired, Sent → Expired, Viewed → Expired
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "expired"],
  sent: ["viewed", "accepted", "rejected", "expired"],
  viewed: ["accepted", "rejected", "expired"],
  accepted: [], // terminal
  rejected: [], // terminal
  expired: [],  // terminal
};

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Generate quote number ──────────────────────────
async function generateQuoteNumber(
  db: typeof import("@/db").db,
  organizationId: string
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `DEV-${year}${month}-`;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        sql`${quotes.quoteNumber} LIKE ${prefix + "%"}`
      )
    );

  const count = Number(result[0]?.count ?? 0) + 1;
  return `${prefix}${String(count).padStart(4, "0")}`;
}

// ── Log activity ───────────────────────────────────
async function logActivity(
  db: typeof import("@/db").db,
  data: {
    quoteId: string;
    userId?: string | null;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    metadata?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }
) {
  await db.insert(quoteActivities).values({
    quoteId: data.quoteId,
    userId: data.userId ?? null,
    action: data.action,
    fromStatus: data.fromStatus ?? null,
    toStatus: data.toStatus ?? null,
    metadata: data.metadata ? JSON.stringify(data.metadata) : null,
    ipAddress: data.ipAddress ?? null,
  });
}

// ── Input schemas ───────────────────────────────────
const quoteLineInput = z.object({
  productId: z.string().uuid().nullable().optional(),
  description: z.string().min(1, "La description est requise"),
  quantity: z.string().or(z.number()).transform(String).default("1"),
  unitPrice: z.string().or(z.number()).transform(String),
  taxRate: z.string().or(z.number()).transform(String).optional().default("20.00"),
});

const createQuoteInput = z.object({
  clientId: z.string().uuid(),
  title: z.string().optional(),
  notes: z.string().optional(),
  validUntil: z.string().datetime().optional(),
  lines: z.array(quoteLineInput).min(1, "Ajoutez au moins une ligne"),
});

const updateQuoteInput = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
  lines: z.array(quoteLineInput).optional(),
});

const updateStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired"]),
});

// ── Helper: compute totals ──────────────────────────
function computeTotals(
  lines: { quantity: string; unitPrice: string; taxRate: string }[]
) {
  let subtotal = 0;
  let taxAmount = 0;

  for (const line of lines) {
    const qty = parseFloat(line.quantity) || 0;
    const price = parseFloat(line.unitPrice) || 0;
    const tax = parseFloat(line.taxRate) || 0;
    const lineSubtotal = qty * price;
    const lineTax = lineSubtotal * (tax / 100);
    subtotal += lineSubtotal;
    taxAmount += lineTax;
  }

  return {
    subtotal: subtotal.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    total: (subtotal + taxAmount).toFixed(2),
  };
}

// ── Router ──────────────────────────────────────────
export const quotesRouter = router({
  // ── List all quotes ───────────────────────────────
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "sent", "viewed", "accepted", "rejected", "expired"]).optional(),
        clientId: z.string().uuid().optional(),
        search: z.string().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(quotes.organizationId, ctx.organizationId)];

      if (input?.status) {
        conditions.push(eq(quotes.status, input.status));
      }
      if (input?.clientId) {
        conditions.push(eq(quotes.clientId, input.clientId));
      }

      const result = await ctx.db
        .select({
          quote: quotes,
          clientName: clients.name,
        })
        .from(quotes)
        .leftJoin(clients, eq(quotes.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(quotes.createdAt))
        .limit(input?.limit ?? 50);

      return result;
    }),

  // ── Get single quote with lines ───────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [quote] = await ctx.db
        .select()
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.id),
            eq(quotes.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devis introuvable" });
      }

      const lines = await ctx.db
        .select()
        .from(quoteLines)
        .where(eq(quoteLines.quoteId, quote.id))
        .orderBy(quoteLines.sortOrder);

      const [client] = await ctx.db
        .select()
        .from(clients)
        .where(eq(clients.id, quote.clientId))
        .limit(1);

      return { ...quote, lines, client };
    }),

  // ── Get timeline / activity log ───────────────────
  getTimeline: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify ownership
      const [quote] = await ctx.db
        .select({ id: quotes.id })
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.quoteId),
            eq(quotes.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devis introuvable" });
      }

      const activities = await ctx.db
        .select({
          activity: quoteActivities,
          userName: sql<string | null>`(
            SELECT name FROM ${clients} WHERE id = ${quoteActivities.userId}
          )`,
        })
        .from(quoteActivities)
        .where(eq(quoteActivities.quoteId, input.quoteId))
        .orderBy(desc(quoteActivities.createdAt));

      return activities;
    }),

  // ── Create quote ──────────────────────────────────
  create: protectedProcedure
    .input(createQuoteInput)
    .mutation(async ({ ctx, input }) => {
      // Verify client belongs to org
      const [client] = await ctx.db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            eq(clients.id, input.clientId),
            eq(clients.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client introuvable" });
      }

      const totals = computeTotals(input.lines);
      const quoteNumber = await generateQuoteNumber(ctx.db, ctx.organizationId);
      const viewToken = randomBytes(32).toString("hex");

      const [quote] = await ctx.db
        .insert(quotes)
        .values({
          organizationId: ctx.organizationId,
          clientId: input.clientId,
          quoteNumber,
          viewToken,
          title: input.title ?? null,
          notes: input.notes ?? null,
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          status: "draft",
        })
        .returning();

      // Insert lines
      const linesData = input.lines.map((line, index) => ({
        quoteId: quote.id,
        productId: line.productId ?? null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        lineTotal: (parseFloat(line.quantity) * parseFloat(line.unitPrice)).toFixed(2),
        sortOrder: index,
      }));

      await ctx.db.insert(quoteLines).values(linesData);

      // Log creation activity
      await logActivity(ctx.db, {
        quoteId: quote.id,
        userId: ctx.session.session.userId,
        action: "created",
        toStatus: "draft",
      });

      return { ...quote, lineCount: input.lines.length };
    }),

  // ── Update quote ──────────────────────────────────
  update: protectedProcedure
    .input(updateQuoteInput)
    .mutation(async ({ ctx, input }) => {
      const { id, lines, ...updateData } = input;

      // Check ownership
      const [existing] = await ctx.db
        .select({ id: quotes.id, status: quotes.status })
        .from(quotes)
        .where(
          and(
            eq(quotes.id, id),
            eq(quotes.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devis introuvable" });
      }

      // Can't edit non-draft quotes
      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seuls les brouillons peuvent être modifiés",
        });
      }

      const updateValues: Record<string, unknown> = {
        ...updateData,
        validUntil: updateData.validUntil
          ? new Date(updateData.validUntil)
          : updateData.validUntil === null
            ? null
            : undefined,
        updatedAt: new Date(),
      };

      // If lines provided, recalculate totals
      if (lines && lines.length > 0) {
        const totals = computeTotals(lines);
        updateValues.subtotal = totals.subtotal;
        updateValues.taxAmount = totals.taxAmount;
        updateValues.total = totals.total;

        // Delete old lines and insert new ones
        await ctx.db.delete(quoteLines).where(eq(quoteLines.quoteId, id));

        const linesData = lines.map((line, index) => ({
          quoteId: id,
          productId: line.productId ?? null,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          lineTotal: (parseFloat(line.quantity) * parseFloat(line.unitPrice)).toFixed(2),
          sortOrder: index,
        }));

        await ctx.db.insert(quoteLines).values(linesData);
      }

      const [updated] = await ctx.db
        .update(quotes)
        .set(updateValues)
        .where(eq(quotes.id, id))
        .returning();

      // Log update activity
      await logActivity(ctx.db, {
        quoteId: id,
        userId: ctx.session.session.userId,
        action: "updated",
        metadata: {
          fields: Object.keys(updateData),
          linesChanged: !!lines,
        },
      });

      return updated;
    }),

  // ── Update status (with transition validation) ────
  updateStatus: protectedProcedure
    .input(updateStatusInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: quotes.id, status: quotes.status })
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.id),
            eq(quotes.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devis introuvable" });
      }

      // ── Validate transition ──
      if (existing.status === input.status) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Le devis est déjà dans ce statut",
        });
      }

      if (!isValidTransition(existing.status, input.status)) {
        const validTargets = VALID_TRANSITIONS[existing.status] ?? [];
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transition invalide : ${existing.status} → ${input.status}. Transitions autorisées : ${validTargets.length > 0 ? validTargets.join(", ") : "aucune (statut terminal)"}`,
        });
      }

      // ── Set timestamps ──
      const timestampFields: Record<string, Date> = {};
      if (input.status === "sent") timestampFields.sentAt = new Date();
      if (input.status === "accepted") timestampFields.acceptedAt = new Date();
      if (input.status === "rejected") timestampFields.rejectedAt = new Date();

      const [updated] = await ctx.db
        .update(quotes)
        .set({
          status: input.status,
          ...timestampFields,
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, input.id))
        .returning();

      // ── Log status change activity ──
      await logActivity(ctx.db, {
        quoteId: input.id,
        userId: ctx.session.session.userId,
        action: "status_changed",
        fromStatus: existing.status,
        toStatus: input.status,
      });

      return updated;
    }),

  // ── Get valid transitions for a quote ─────────────
  getValidTransitions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [quote] = await ctx.db
        .select({ status: quotes.status })
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.id),
            eq(quotes.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!quote) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devis introuvable" });
      }

      return {
        currentStatus: quote.status,
        validTransitions: VALID_TRANSITIONS[quote.status] ?? [],
        isTerminal: (VALID_TRANSITIONS[quote.status]?.length ?? 0) === 0,
      };
    }),

  // ── Get stats (KPIs + status pipeline) ─────────────
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const allQuotes = await ctx.db
        .select({ status: quotes.status, total: quotes.total })
        .from(quotes)
        .where(eq(quotes.organizationId, ctx.organizationId));

      const statusCounts: Record<string, number> = {
        draft: 0,
        sent: 0,
        viewed: 0,
        accepted: 0,
        rejected: 0,
        expired: 0,
      };

      let totalRevenue = 0;
      let acceptedRevenue = 0;

      for (const q of allQuotes) {
        statusCounts[q.status] = (statusCounts[q.status] ?? 0) + 1;
        const amount = parseFloat(q.total) || 0;
        totalRevenue += amount;
        if (q.status === "accepted") {
          acceptedRevenue += amount;
        }
      }

      const totalQuotes = allQuotes.length;
      const conversionRate = totalQuotes > 0
        ? Math.round((statusCounts.accepted / totalQuotes) * 100)
        : 0;

      return {
        statusCounts,
        totalQuotes,
        totalRevenue: totalRevenue.toFixed(2),
        acceptedRevenue: acceptedRevenue.toFixed(2),
        conversionRate,
        pipeline: {
          active: (statusCounts.draft ?? 0) + (statusCounts.sent ?? 0) + (statusCounts.viewed ?? 0),
          won: statusCounts.accepted ?? 0,
          lost: (statusCounts.rejected ?? 0) + (statusCounts.expired ?? 0),
        },
      };
    }),

  // ── Delete quote (draft only) ─────────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: quotes.id, status: quotes.status, quoteNumber: quotes.quoteNumber })
        .from(quotes)
        .where(
          and(
            eq(quotes.id, input.id),
            eq(quotes.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Devis introuvable" });
      }

      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seuls les brouillons peuvent être supprimés",
        });
      }

      // Log before deleting
      await logActivity(ctx.db, {
        quoteId: input.id,
        userId: ctx.session.session.userId,
        action: "deleted",
        fromStatus: existing.status,
        metadata: { quoteNumber: existing.quoteNumber },
      });

      await ctx.db.delete(quotes).where(eq(quotes.id, input.id));

      return { success: true };
    }),
});
