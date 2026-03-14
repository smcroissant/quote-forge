import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { quotes, invoices, quoteActivities } from "@/db/schema";
import { eq, and, desc, inArray, sql, gte } from "drizzle-orm";

export const notificationsRouter = router({
  // ── Get badge counts for sidebar ──────────────────
  getBadgeCounts: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId!;

    const [pendingQuotes, unpaidInvoices, overdueInvoices] = await Promise.all([
      // Quotes needing attention (draft + sent + viewed)
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(quotes)
        .where(
          and(
            eq(quotes.organizationId, orgId),
            inArray(quotes.status, ["draft", "sent", "viewed"])
          )
        ),
      // Unpaid invoices (sent + overdue)
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, orgId),
            inArray(invoices.status, ["sent", "overdue"])
          )
        ),
      // Overdue invoices specifically
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(invoices)
        .where(
          and(
            eq(invoices.organizationId, orgId),
            eq(invoices.status, "overdue")
          )
        ),
    ]);

    return {
      pendingQuotes: Number(pendingQuotes[0]?.count ?? 0),
      unpaidInvoices: Number(unpaidInvoices[0]?.count ?? 0),
      overdueInvoices: Number(overdueInvoices[0]?.count ?? 0),
    };
  }),

  // ── Get recent activity across quotes & invoices ──
  getRecentActivity: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(50).optional().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const orgId = ctx.organizationId!;
      const limit = input?.limit ?? 10;

      // Get all quotes for this org to filter activities
      const orgQuotes = await ctx.db
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.organizationId, orgId));

      const quoteIds = orgQuotes.map((q) => q.id);

      if (quoteIds.length === 0) {
        return [];
      }

      // Fetch recent activities
      const activities = await ctx.db
        .select({
          id: quoteActivities.id,
          quoteId: quoteActivities.quoteId,
          action: quoteActivities.action,
          fromStatus: quoteActivities.fromStatus,
          toStatus: quoteActivities.toStatus,
          metadata: quoteActivities.metadata,
          createdAt: quoteActivities.createdAt,
        })
        .from(quoteActivities)
        .where(inArray(quoteActivities.quoteId, quoteIds))
        .orderBy(desc(quoteActivities.createdAt))
        .limit(limit);

      // Enrich with quote numbers
      const enrichedActivities = await Promise.all(
        activities.map(async (activity) => {
          // Parse metadata
          let meta: Record<string, string> = {};
          try {
            if (activity.metadata) meta = JSON.parse(activity.metadata);
          } catch {}

          // Try to get quote number from metadata first
          let quoteNumber = meta.quoteNumber as string | undefined;

          // If not in metadata, look it up
          if (!quoteNumber && activity.quoteId) {
            const [q] = await ctx.db
              .select({ quoteNumber: quotes.quoteNumber, title: quotes.title })
              .from(quotes)
              .where(eq(quotes.id, activity.quoteId))
              .limit(1);
            quoteNumber = q?.quoteNumber;
          }

          return {
            ...activity,
            quoteNumber: quoteNumber ?? "—",
            metadata: meta,
          };
        })
      );

      return enrichedActivities;
    }),

  // ── Poll for new status changes (since timestamp) ─
  pollChanges: protectedProcedure
    .input(z.object({ since: z.string().datetime() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.organizationId!;
      const sinceDate = new Date(input.since);

      // Get quote IDs for this org
      const orgQuotes = await ctx.db
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.organizationId, orgId));

      const quoteIds = orgQuotes.map((q) => q.id);

      if (quoteIds.length === 0) {
        return { changes: [] };
      }

      // Find recent activities since the timestamp
      const recentActivities = await ctx.db
        .select({
          id: quoteActivities.id,
          quoteId: quoteActivities.quoteId,
          action: quoteActivities.action,
          fromStatus: quoteActivities.fromStatus,
          toStatus: quoteActivities.toStatus,
          metadata: quoteActivities.metadata,
          createdAt: quoteActivities.createdAt,
        })
        .from(quoteActivities)
        .where(
          and(
            inArray(quoteActivities.quoteId, quoteIds),
            gte(quoteActivities.createdAt, sinceDate)
          )
        )
        .orderBy(desc(quoteActivities.createdAt))
        .limit(20);

      // Build notification-worthy events
      const changes = await Promise.all(
        recentActivities
          .filter((a) =>
            ["status_changed", "payment_reminder_sent", "email_sent", "viewed"].includes(a.action)
          )
          .map(async (activity) => {
            let meta: Record<string, string> = {};
            try {
              if (activity.metadata) meta = JSON.parse(activity.metadata);
            } catch {}

            let quoteNumber = meta.quoteNumber as string | undefined;
            let invoiceNumber = meta.invoiceNumber as string | undefined;

            if (!quoteNumber && activity.quoteId) {
              const [q] = await ctx.db
                .select({ quoteNumber: quotes.quoteNumber })
                .from(quotes)
                .where(eq(quotes.id, activity.quoteId))
                .limit(1);
              quoteNumber = q?.quoteNumber;
            }

            // Determine notification type and message
            let notificationType: "quote_accepted" | "quote_rejected" | "quote_viewed" | "reminder_sent" | "invoice_paid" | "other" = "other";
            let message = "";
            let title = "";

            if (activity.action === "status_changed") {
              if (activity.toStatus === "accepted") {
                notificationType = "quote_accepted";
                title = "Devis accepté ! 🎉";
                message = `Le devis ${quoteNumber ?? ""} a été accepté par le client`;
              } else if (activity.toStatus === "rejected") {
                notificationType = "quote_rejected";
                title = "Devis refusé";
                message = `Le devis ${quoteNumber ?? ""} a été refusé`;
              } else if (activity.toStatus === "viewed") {
                notificationType = "quote_viewed";
                title = "Devis consulté 👀";
                message = `Le devis ${quoteNumber ?? ""} a été ouvert par le client`;
              } else if (activity.toStatus === "paid") {
                notificationType = "invoice_paid";
                title = "Facture payée ! 💰";
                message = `La facture ${invoiceNumber ?? ""} a été encaissée`;
              }
            } else if (activity.action === "payment_reminder_sent") {
              notificationType = "reminder_sent";
              title = "Relance envoyée";
              message = `Rappel #${meta.reminderNumber ?? "?"} envoyé pour la facture ${invoiceNumber ?? ""}`;
            }

            return {
              id: activity.id,
              type: notificationType,
              title,
              message,
              quoteId: activity.quoteId,
              createdAt: activity.createdAt.toISOString(),
            };
          })
      );

      return { changes };
    }),
});
