import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { quotes, invoices, clients, products } from "@/db/schema";
import { eq, and, ilike, or, desc } from "drizzle-orm";

export const searchRouter = router({
  // ── Global search across all entities ─────────────
  global: protectedProcedure
    .input(z.object({ query: z.string().min(1).max(100) }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.organizationId!;
      const q = input.query.trim();
      const like = `%${q}%`;

      const [quotesRes, invoicesRes, clientsRes, productsRes] = await Promise.all([
        // Search quotes
        ctx.db
          .select({
            id: quotes.id,
            quoteNumber: quotes.quoteNumber,
            title: quotes.title,
            status: quotes.status,
            total: quotes.total,
          })
          .from(quotes)
          .where(
            and(
              eq(quotes.organizationId, orgId),
              or(
                ilike(quotes.quoteNumber, like),
                ilike(quotes.title, like)
              )!
            )
          )
          .orderBy(desc(quotes.createdAt))
          .limit(8),

        // Search invoices
        ctx.db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            title: invoices.title,
            status: invoices.status,
            total: invoices.total,
          })
          .from(invoices)
          .where(
            and(
              eq(invoices.organizationId, orgId),
              or(
                ilike(invoices.invoiceNumber, like),
                ilike(invoices.title, like)
              )!
            )
          )
          .orderBy(desc(invoices.createdAt))
          .limit(8),

        // Search clients
        ctx.db
          .select({
            id: clients.id,
            name: clients.name,
            email: clients.email,
            city: clients.city,
          })
          .from(clients)
          .where(
            and(
              eq(clients.organizationId, orgId),
              or(
                ilike(clients.name, like),
                ilike(clients.email, like),
                ilike(clients.city, like)
              )!
            )
          )
          .orderBy(desc(clients.createdAt))
          .limit(8),

        // Search products
        ctx.db
          .select({
            id: products.id,
            name: products.name,
            description: products.description,
            unitPrice: products.unitPrice,
            isActive: products.isActive,
          })
          .from(products)
          .where(
            and(
              eq(products.organizationId, orgId),
              or(
                ilike(products.name, like),
                ilike(products.description, like)
              )!
            )
          )
          .orderBy(desc(products.createdAt))
          .limit(8),
      ]);

      const results: Array<{
        type: "quote" | "invoice" | "client" | "product";
        id: string;
        title: string;
        subtitle: string;
        href: string;
        badge?: string;
      }> = [];

      for (const q of quotesRes) {
        results.push({
          type: "quote",
          id: q.id,
          title: q.quoteNumber,
          subtitle: q.title ?? "Sans titre",
          href: `/quotes/${q.id}`,
          badge: q.status,
        });
      }

      for (const inv of invoicesRes) {
        results.push({
          type: "invoice",
          id: inv.id,
          title: inv.invoiceNumber,
          subtitle: inv.title ?? "Sans titre",
          href: `/invoices/${inv.id}`,
          badge: inv.status,
        });
      }

      for (const c of clientsRes) {
        results.push({
          type: "client",
          id: c.id,
          title: c.name,
          subtitle: [c.email, c.city].filter(Boolean).join(" · ") || "Client",
          href: `/clients`,
        });
      }

      for (const p of productsRes) {
        results.push({
          type: "product",
          id: p.id,
          title: p.name,
          subtitle: p.description ?? `${p.unitPrice} €`,
          href: `/products`,
          badge: p.isActive ? undefined : "inactif",
        });
      }

      return {
        query: q,
        results,
        hasResults: results.length > 0,
        counts: {
          quotes: quotesRes.length,
          invoices: invoicesRes.length,
          clients: clientsRes.length,
          products: productsRes.length,
        },
      };
    }),
});
