import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import {
  invoices, invoiceLines, quotes, quoteLines, clients,
} from "@/db/schema";

// ── Status transition rules ─────────────────────────
// draft → sent → paid / overdue / cancelled
const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["sent", "cancelled"],
  sent: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],      // terminal
  cancelled: [], // terminal
};

function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── Generate invoice number ─────────────────────────
async function generateInvoiceNumber(
  db: typeof import("@/db").db,
  organizationId: string
): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `FAC-${year}${month}-`;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(invoices)
    .where(
      and(
        eq(invoices.organizationId, organizationId),
        sql`${invoices.invoiceNumber} LIKE ${prefix + "%"}`
      )
    );

  const count = Number(result[0]?.count ?? 0) + 1;
  return `${prefix}${String(count).padStart(4, "0")}`;
}

// ── Compute totals ──────────────────────────────────
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

// ── Input schemas ───────────────────────────────────
const invoiceLineInput = z.object({
  productId: z.string().uuid().nullable().optional(),
  description: z.string().min(1, "La description est requise"),
  quantity: z.string().or(z.number()).transform(String).default("1"),
  unitPrice: z.string().or(z.number()).transform(String),
  taxRate: z.string().or(z.number()).transform(String).optional().default("20.00"),
});

const createInvoiceInput = z.object({
  clientId: z.string().uuid(),
  quoteId: z.string().uuid().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  lines: z.array(invoiceLineInput).min(1, "Ajoutez au moins une ligne"),
});

const updateInvoiceInput = z.object({
  id: z.string().uuid(),
  clientId: z.string().uuid().optional(),
  title: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  lines: z.array(invoiceLineInput).optional(),
});

const updateStatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
  paymentMethod: z.string().optional(),
});

// ── Router ──────────────────────────────────────────
export const invoicesRouter = router({
  // ── List all invoices ─────────────────────────────
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
        clientId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(invoices.organizationId, ctx.organizationId)];

      if (input?.status) {
        conditions.push(eq(invoices.status, input.status));
      }
      if (input?.clientId) {
        conditions.push(eq(invoices.clientId, input.clientId));
      }

      const result = await ctx.db
        .select({
          invoice: invoices,
          clientName: clients.name,
        })
        .from(invoices)
        .leftJoin(clients, eq(invoices.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(invoices.createdAt))
        .limit(input?.limit ?? 50);

      return result;
    }),

  // ── Get single invoice with lines ─────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [invoice] = await ctx.db
        .select()
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.id),
            eq(invoices.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Facture introuvable" });
      }

      const lines = await ctx.db
        .select()
        .from(invoiceLines)
        .where(eq(invoiceLines.invoiceId, invoice.id))
        .orderBy(invoiceLines.sortOrder);

      const [client] = await ctx.db
        .select()
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1);

      return { ...invoice, lines, client };
    }),

  // ── Get valid transitions ─────────────────────────
  getValidTransitions: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [invoice] = await ctx.db
        .select({ status: invoices.status })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.id),
            eq(invoices.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Facture introuvable" });
      }

      return {
        currentStatus: invoice.status,
        validTransitions: VALID_TRANSITIONS[invoice.status] ?? [],
        isTerminal: (VALID_TRANSITIONS[invoice.status]?.length ?? 0) === 0,
      };
    }),

  // ── Convert quote to invoice ──────────────────────
  convertFromQuote: protectedProcedure
    .input(z.object({ quoteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch quote
      const [quote] = await ctx.db
        .select()
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

      if (quote.status !== "accepted") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seuls les devis acceptés peuvent être convertis en facture",
        });
      }

      // Check if already converted
      const [existing] = await ctx.db
        .select({ id: invoices.id })
        .from(invoices)
        .where(eq(invoices.quoteId, quote.id))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ce devis a déjà été converti en facture",
        });
      }

      // Fetch quote lines
      const lines = await ctx.db
        .select()
        .from(quoteLines)
        .where(eq(quoteLines.quoteId, quote.id))
        .orderBy(quoteLines.sortOrder);

      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber(ctx.db, ctx.organizationId);

      // Default due date: 30 days
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      // Create invoice
      const [invoice] = await ctx.db
        .insert(invoices)
        .values({
          organizationId: ctx.organizationId,
          clientId: quote.clientId,
          quoteId: quote.id,
          invoiceNumber,
          title: quote.title,
          notes: quote.notes,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          total: quote.total,
          dueDate,
          status: "draft",
        })
        .returning();

      // Copy lines
      const invoiceLinesData = lines.map((line) => ({
        invoiceId: invoice.id,
        productId: line.productId,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        lineTotal: line.lineTotal,
        sortOrder: line.sortOrder,
      }));

      await ctx.db.insert(invoiceLines).values(invoiceLinesData);

      // Update quote status to invoiced
      await ctx.db
        .update(quotes)
        .set({
          status: "invoiced",
          invoicedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(quotes.id, quote.id));

      return invoice;
    }),

  // ── Create invoice from scratch ───────────────────
  create: protectedProcedure
    .input(createInvoiceInput)
    .mutation(async ({ ctx, input }) => {
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
      const invoiceNumber = await generateInvoiceNumber(ctx.db, ctx.organizationId);

      const [invoice] = await ctx.db
        .insert(invoices)
        .values({
          organizationId: ctx.organizationId,
          clientId: input.clientId,
          quoteId: input.quoteId ?? null,
          invoiceNumber,
          title: input.title ?? null,
          notes: input.notes ?? null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          subtotal: totals.subtotal,
          taxAmount: totals.taxAmount,
          total: totals.total,
          status: "draft",
        })
        .returning();

      const linesData = input.lines.map((line, index) => ({
        invoiceId: invoice.id,
        productId: line.productId ?? null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        lineTotal: (parseFloat(line.quantity) * parseFloat(line.unitPrice)).toFixed(2),
        sortOrder: index,
      }));

      await ctx.db.insert(invoiceLines).values(linesData);

      return { ...invoice, lineCount: input.lines.length };
    }),

  // ── Update status ─────────────────────────────────
  updateStatus: protectedProcedure
    .input(updateStatusInput)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: invoices.id, status: invoices.status })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.id),
            eq(invoices.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Facture introuvable" });
      }

      if (existing.status === input.status) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "La facture est déjà dans ce statut",
        });
      }

      if (!isValidTransition(existing.status, input.status)) {
        const validTargets = VALID_TRANSITIONS[existing.status] ?? [];
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Transition invalide : ${existing.status} → ${input.status}. Transitions autorisées : ${validTargets.length > 0 ? validTargets.join(", ") : "aucune (statut terminal)"}`,
        });
      }

      const timestampFields: Record<string, Date> = {};
      if (input.status === "sent") timestampFields.sentAt = new Date();
      if (input.status === "paid") timestampFields.paidAt = new Date();
      if (input.status === "cancelled") timestampFields.cancelledAt = new Date();

      const [updated] = await ctx.db
        .update(invoices)
        .set({
          status: input.status,
          paymentMethod: input.paymentMethod ?? undefined,
          ...timestampFields,
          updatedAt: new Date(),
        })
        .where(eq(invoices.id, input.id))
        .returning();

      return updated;
    }),

  // ── Delete invoice (draft only) ───────────────────
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: invoices.id, status: invoices.status })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.id),
            eq(invoices.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Facture introuvable" });
      }

      if (existing.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Seuls les brouillons peuvent être supprimés",
        });
      }

      await ctx.db.delete(invoices).where(eq(invoices.id, input.id));

      return { success: true };
    }),

  // ── Get invoice stats ─────────────────────────────
  getStats: protectedProcedure
    .query(async ({ ctx }) => {
      const allInvoices = await ctx.db
        .select({ status: invoices.status, total: invoices.total })
        .from(invoices)
        .where(eq(invoices.organizationId, ctx.organizationId));

      const statusCounts: Record<string, number> = {
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
      };

      let totalInvoiced = 0;
      let totalPaid = 0;
      let totalOverdue = 0;

      for (const inv of allInvoices) {
        statusCounts[inv.status] = (statusCounts[inv.status] ?? 0) + 1;
        const amount = parseFloat(inv.total) || 0;
        totalInvoiced += amount;
        if (inv.status === "paid") totalPaid += amount;
        if (inv.status === "overdue") totalOverdue += amount;
      }

      return {
        statusCounts,
        totalInvoices: allInvoices.length,
        totalInvoiced: totalInvoiced.toFixed(2),
        totalPaid: totalPaid.toFixed(2),
        totalOverdue: totalOverdue.toFixed(2),
        outstanding: (totalInvoiced - totalPaid).toFixed(2),
      };
    }),
});
