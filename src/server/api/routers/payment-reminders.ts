import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { paymentReminders, invoices, organizations } from "@/db/schema";

export const paymentRemindersRouter = router({
  // ── Get reminder settings for current org ─────────
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const [org] = await ctx.db
      .select({
        remindersEnabled: organizations.remindersEnabled,
        reminderDay1: organizations.reminderDay1,
        reminderDay2: organizations.reminderDay2,
        reminderDay3: organizations.reminderDay3,
      })
      .from(organizations)
      .where(eq(organizations.id, ctx.organizationId!))
      .limit(1);

    if (!org) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Organisation introuvable" });
    }

    return {
      enabled: org.remindersEnabled ?? true,
      day1: org.reminderDay1 ?? 7,
      day2: org.reminderDay2 ?? 14,
      day3: org.reminderDay3 ?? 30,
    };
  }),

  // ── Update reminder settings ──────────────────────
  updateSettings: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        day1: z.number().min(1).max(90).optional(),
        day2: z.number().min(1).max(90).optional(),
        day3: z.number().min(1).max(90).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (input.enabled !== undefined) updateData.remindersEnabled = input.enabled;
      if (input.day1 !== undefined) updateData.reminderDay1 = input.day1;
      if (input.day2 !== undefined) updateData.reminderDay2 = input.day2;
      if (input.day3 !== undefined) updateData.reminderDay3 = input.day3;

      const [updated] = await ctx.db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, ctx.organizationId!))
        .returning();

      return {
        enabled: updated.remindersEnabled ?? true,
        day1: updated.reminderDay1 ?? 7,
        day2: updated.reminderDay2 ?? 14,
        day3: updated.reminderDay3 ?? 30,
      };
    }),

  // ── List reminders for an invoice ─────────────────
  getByInvoice: protectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify invoice ownership
      const [invoice] = await ctx.db
        .select({ id: invoices.id })
        .from(invoices)
        .where(
          and(
            eq(invoices.id, input.invoiceId),
            eq(invoices.organizationId, ctx.organizationId!)
          )
        )
        .limit(1);

      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Facture introuvable" });
      }

      return ctx.db
        .select()
        .from(paymentReminders)
        .where(eq(paymentReminders.invoiceId, input.invoiceId))
        .orderBy(desc(paymentReminders.scheduledAt));
    }),

  // ── List all reminders for current org ────────────
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "sent", "failed", "skipped"]).optional(),
        limit: z.number().min(1).max(100).optional().default(50),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(paymentReminders.organizationId, ctx.organizationId!)];

      if (input?.status) {
        conditions.push(eq(paymentReminders.status, input.status));
      }

      return ctx.db
        .select({
          reminder: paymentReminders,
          invoiceNumber: invoices.invoiceNumber,
          invoiceTotal: invoices.total,
        })
        .from(paymentReminders)
        .leftJoin(invoices, eq(paymentReminders.invoiceId, invoices.id))
        .where(and(...conditions))
        .orderBy(desc(paymentReminders.createdAt))
        .limit(input?.limit ?? 50);
    }),

  // ── Manually trigger reminders (for testing) ──────
  triggerNow: protectedProcedure.mutation(async ({ ctx }) => {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    try {
      const res = await fetch(`${appUrl}/api/cron/payment-reminders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.CRON_SECRET ?? ""}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Erreur lors du déclenchement");
      }

      return data;
    } catch (err) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }),
});
