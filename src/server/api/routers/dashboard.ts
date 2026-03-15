import { eq, and, gte, lt, lte, desc, sql, inArray } from "drizzle-orm";
import { router, protectedProcedure } from "../trpc";
import { quotes, invoices, clients } from "@/db/schema";

export const dashboardRouter = router({
  // ── Get all KPIs for dashboard ────────────────────
  getKPIs: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    sixMonthsAgo.setDate(1);

    // ── Fetch all quotes ──
    const allQuotes = await ctx.db
      .select({
        status: quotes.status,
        total: quotes.total,
        createdAt: quotes.createdAt,
        acceptedAt: quotes.acceptedAt,
      })
      .from(quotes)
      .where(eq(quotes.organizationId, orgId));

    // ── Fetch all invoices ──
    const allInvoices = await ctx.db
      .select({
        status: invoices.status,
        total: invoices.total,
        createdAt: invoices.createdAt,
        sentAt: invoices.sentAt,
        paidAt: invoices.paidAt,
        dueDate: invoices.dueDate,
        clientId: invoices.clientId,
      })
      .from(invoices)
      .where(eq(invoices.organizationId, orgId));

    // ── Quote stats ──
    const quoteStatusCounts: Record<string, number> = {};
    let totalQuotes = 0;
    let acceptedQuotes = 0;
    for (const q of allQuotes) {
      quoteStatusCounts[q.status] = (quoteStatusCounts[q.status] ?? 0) + 1;
      totalQuotes++;
      if (q.status === "accepted" || q.status === "invoiced") acceptedQuotes++;
    }
    const quoteConversionRate = totalQuotes > 0
      ? Math.round((acceptedQuotes / totalQuotes) * 100)
      : 0;

    // ── Invoice stats ──
    const invoiceStatusCounts: Record<string, number> = {};
    let totalInvoicedAllTime = 0;
    let totalPaidAllTime = 0;
    let invoicedThisMonth = 0;
    let invoicedLastMonth = 0;
    let paidThisMonth = 0;
    let paidLastMonth = 0;

    for (const inv of allInvoices) {
      invoiceStatusCounts[inv.status] = (invoiceStatusCounts[inv.status] ?? 0) + 1;
      const amount = parseFloat(inv.total) || 0;
      totalInvoicedAllTime += amount;

      if (inv.status === "paid") {
        totalPaidAllTime += amount;
        if (inv.paidAt && inv.paidAt >= startOfMonth) {
          paidThisMonth += amount;
        } else if (inv.paidAt && inv.paidAt >= startOfLastMonth && inv.paidAt < startOfMonth) {
          paidLastMonth += amount;
        }
      }

      if (inv.createdAt >= startOfMonth) {
        invoicedThisMonth += amount;
      } else if (inv.createdAt >= startOfLastMonth && inv.createdAt < startOfMonth) {
        invoicedLastMonth += amount;
      }
    }

    // ── Quote → Invoice conversion rate ──
    const invoicedQuotes = allQuotes.filter(q => q.status === "invoiced").length;
    const quoteToInvoiceRate = acceptedQuotes > 0
      ? Math.round((invoicedQuotes / acceptedQuotes) * 100)
      : 0;

    // ── Average payment delay (days between sentAt and paidAt) ──
    const paidInvoices = allInvoices.filter(inv => inv.paidAt && inv.sentAt);
    let avgPaymentDays = 0;
    if (paidInvoices.length > 0) {
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const sent = inv.sentAt!;
        const paid = inv.paidAt!;
        return sum + Math.floor((paid.getTime() - sent.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgPaymentDays = Math.round(totalDays / paidInvoices.length);
    }

    // ── Top 5 clients by revenue ──
    const clientRevenue: Record<string, number> = {};
    for (const inv of allInvoices) {
      if (inv.status === "paid" || inv.status === "sent" || inv.status === "overdue") {
        const amount = parseFloat(inv.total) || 0;
        clientRevenue[inv.clientId] = (clientRevenue[inv.clientId] ?? 0) + amount;
      }
    }

    const topClientIds = Object.entries(clientRevenue)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    let topClients: { id: string; name: string; revenue: number }[] = [];
    if (topClientIds.length > 0) {
      const clientData = await ctx.db
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(inArray(clients.id, topClientIds));

      topClients = clientData.map(c => ({
        id: c.id,
        name: c.name,
        revenue: parseFloat((clientRevenue[c.id] ?? 0).toFixed(2)),
      })).sort((a, b) => b.revenue - a.revenue);
    }

    // ── 6-month revenue evolution ──
    const monthlyRevenue: { month: string; label: string; invoiced: number; paid: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthLabel = monthStart.toLocaleDateString("fr-FR", { month: "short" });

      let monthInvoiced = 0;
      let monthPaid = 0;

      for (const inv of allInvoices) {
        if (inv.createdAt >= monthStart && inv.createdAt < monthEnd) {
          monthInvoiced += parseFloat(inv.total) || 0;
        }
        if (inv.paidAt && inv.paidAt >= monthStart && inv.paidAt < monthEnd) {
          monthPaid += parseFloat(inv.total) || 0;
        }
      }

      monthlyRevenue.push({
        month: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, "0")}`,
        label: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        invoiced: parseFloat(monthInvoiced.toFixed(2)),
        paid: parseFloat(monthPaid.toFixed(2)),
      });
    }

    // ── Outstanding (unpaid) ──
    const outstanding = totalInvoicedAllTime - totalPaidAllTime;

    return {
      quotes: {
        total: totalQuotes,
        statusCounts: quoteStatusCounts,
        conversionRate: quoteConversionRate,
      },
      invoices: {
        total: allInvoices.length,
        statusCounts: invoiceStatusCounts,
        quoteToInvoiceRate,
      },
      revenue: {
        currentMonth: parseFloat(invoicedThisMonth.toFixed(2)),
        lastMonth: parseFloat(invoicedLastMonth.toFixed(2)),
        paidThisMonth: parseFloat(paidThisMonth.toFixed(2)),
        paidLastMonth: parseFloat(paidLastMonth.toFixed(2)),
        totalInvoiced: parseFloat(totalInvoicedAllTime.toFixed(2)),
        totalPaid: parseFloat(totalPaidAllTime.toFixed(2)),
        outstanding: parseFloat(outstanding.toFixed(2)),
      },
      payment: {
        avgDays: avgPaymentDays,
        paidCount: paidInvoices.length,
      },
      topClients,
      monthlyRevenue,
    };
  }),

  // ── Get advanced stats (pending quotes + conversion trend) ──
  getAdvancedStats: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId!;
    const now = new Date();

    // ── Pending quotes: sent > 3 days without response ──
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const pendingQuotes = await ctx.db
      .select({
        id: quotes.id,
        quoteNumber: quotes.quoteNumber,
        total: quotes.total,
        sentAt: quotes.sentAt,
        createdAt: quotes.createdAt,
        clientName: clients.name,
      })
      .from(quotes)
      .leftJoin(clients, eq(quotes.clientId, clients.id))
      .where(
        and(
          eq(quotes.organizationId, orgId),
          eq(quotes.status, "sent"),
          lte(quotes.sentAt, threeDaysAgo)
        )
      )
      .orderBy(desc(quotes.sentAt))
      .limit(10);

    // ── Conversion rate trend: this month vs last month ──
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const allQuotes = await ctx.db
      .select({
        status: quotes.status,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(eq(quotes.organizationId, orgId));

    let thisMonthTotal = 0;
    let thisMonthAccepted = 0;
    let lastMonthTotal = 0;
    let lastMonthAccepted = 0;

    for (const q of allQuotes) {
      const createdAt = new Date(q.createdAt);
      if (createdAt >= startOfMonth) {
        thisMonthTotal++;
        if (q.status === "accepted" || q.status === "invoiced") thisMonthAccepted++;
      } else if (createdAt >= startOfLastMonth && createdAt < startOfMonth) {
        lastMonthTotal++;
        if (q.status === "accepted" || q.status === "invoiced") lastMonthAccepted++;
      }
    }

    const thisMonthRate = thisMonthTotal > 0
      ? Math.round((thisMonthAccepted / thisMonthTotal) * 100)
      : 0;
    const lastMonthRate = lastMonthTotal > 0
      ? Math.round((lastMonthAccepted / lastMonthTotal) * 100)
      : 0;

    return {
      pendingQuotes: pendingQuotes.map(q => ({
        id: q.id,
        quoteNumber: q.quoteNumber,
        total: parseFloat(q.total) || 0,
        clientName: q.clientName ?? "Client",
        sentAt: q.sentAt,
        daysWaiting: q.sentAt
          ? Math.floor((now.getTime() - new Date(q.sentAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      })),
      conversionTrend: {
        thisMonthRate,
        lastMonthRate,
        difference: thisMonthRate - lastMonthRate,
      },
    };
  }),
});
