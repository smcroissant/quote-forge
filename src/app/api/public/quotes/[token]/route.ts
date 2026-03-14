import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, quoteLines, clients, organizations, quoteViews, quoteActivities } from "@/db/schema";
import { eq } from "drizzle-orm";

// ── GET /api/public/quotes/[token] ──────────────────
// Returns quote data for public viewing + tracks the view
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find quote by viewToken
    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.viewToken, token))
      .limit(1);

    if (!quote) {
      return NextResponse.json(
        { error: "Devis introuvable ou lien expiré" },
        { status: 404 }
      );
    }

    // Fetch related data
    const [lines, client, org] = await Promise.all([
      db
        .select()
        .from(quoteLines)
        .where(eq(quoteLines.quoteId, quote.id))
        .orderBy(quoteLines.sortOrder),
      db
        .select()
        .from(clients)
        .where(eq(clients.id, quote.clientId))
        .limit(1),
      db
        .select()
        .from(organizations)
        .where(eq(organizations.id, quote.organizationId))
        .limit(1),
    ]);

    // Track view (fire-and-forget)
    const ipAddress =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      null;
    const userAgent = request.headers.get("user-agent") ?? null;

    // Track async, don't block the response
    // If status is "sent", auto-transition to "viewed" on first view
    const shouldMarkViewed = quote.status === "sent";

    Promise.all([
      db.insert(quoteViews).values({
        quoteId: quote.id,
        ipAddress,
        userAgent,
      }),
      db
        .update(quotes)
        .set({
          viewCount: (quote.viewCount ?? 0) + 1,
          lastViewedAt: new Date(),
          // Auto-transition sent → viewed on first view
          ...(shouldMarkViewed ? { status: "viewed" } : {}),
          ...(shouldMarkViewed ? { updatedAt: new Date() } : {}),
        })
        .where(eq(quotes.id, quote.id)),
      // Log viewed activity
      shouldMarkViewed
        ? db.insert(quoteActivities).values({
            quoteId: quote.id,
            userId: null, // external viewer
            action: "status_changed",
            fromStatus: "sent",
            toStatus: "viewed",
            ipAddress,
            metadata: JSON.stringify({ source: "public_link" }),
          })
        : db.insert(quoteActivities).values({
            quoteId: quote.id,
            userId: null,
            action: "viewed",
            ipAddress,
          }),
    ]).catch((err) => console.error("Tracking error:", err));

    // Return quote data (reflect viewed status if we just transitioned)
    return NextResponse.json({
      quote: {
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        status: shouldMarkViewed ? "viewed" : quote.status,
        createdAt: quote.createdAt.toISOString(),
        validUntil: quote.validUntil?.toISOString() ?? null,
        notes: quote.notes,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
      },
      organization: {
        name: org?.[0]?.name ?? "Mon Entreprise",
        email: org?.[0]?.email ?? null,
        phone: org?.[0]?.phone ?? null,
        address: org?.[0]?.address ?? null,
      },
      client: {
        name: client?.[0]?.name ?? "Client",
      },
      lines: lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate ?? "20.00",
        lineTotal: line.lineTotal,
      })),
    });
  } catch (error) {
    console.error("Public quote error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
