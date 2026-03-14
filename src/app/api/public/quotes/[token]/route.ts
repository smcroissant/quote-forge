import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quotes, quoteLines, clients, organizations, quoteViews, quoteActivities } from "@/db/schema";
import { eq } from "drizzle-orm";

// ── GET /api/public/quotes/[token] ──────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.viewToken, token))
      .limit(1);

    if (!quote) {
      return NextResponse.json(
        { error: "Devis introuvable ou lien invalide" },
        { status: 404 }
      );
    }

    const [lines, client, org] = await Promise.all([
      db.select().from(quoteLines).where(eq(quoteLines.quoteId, quote.id)).orderBy(quoteLines.sortOrder),
      db.select().from(clients).where(eq(clients.id, quote.clientId)).limit(1),
      db.select().from(organizations).where(eq(organizations.id, quote.organizationId)).limit(1),
    ]);

    // Track view
    const ipAddress = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? null;
    const userAgent = request.headers.get("user-agent") ?? null;
    const shouldMarkViewed = quote.status === "sent";

    Promise.all([
      db.insert(quoteViews).values({ quoteId: quote.id, ipAddress, userAgent }),
      db.update(quotes).set({
        viewCount: (quote.viewCount ?? 0) + 1,
        lastViewedAt: new Date(),
        ...(shouldMarkViewed ? { status: "viewed", updatedAt: new Date() } : {}),
      }).where(eq(quotes.id, quote.id)),
      shouldMarkViewed
        ? db.insert(quoteActivities).values({
            quoteId: quote.id, userId: null, action: "status_changed",
            fromStatus: "sent", toStatus: "viewed", ipAddress,
            metadata: JSON.stringify({ source: "public_link" }),
          })
        : db.insert(quoteActivities).values({
            quoteId: quote.id, userId: null, action: "viewed", ipAddress,
          }),
    ]).catch(console.error);

    // Check if quote is actionable
    const currentStatus = shouldMarkViewed ? "viewed" : quote.status;
    const isExpired = quote.validUntil ? new Date(quote.validUntil) < new Date() : false;
    const canRespond = ["sent", "viewed"].includes(currentStatus) && !isExpired;

    return NextResponse.json({
      quote: {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        title: quote.title,
        status: currentStatus,
        createdAt: quote.createdAt.toISOString(),
        validUntil: quote.validUntil?.toISOString() ?? null,
        notes: quote.notes,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        isExpired,
        canRespond,
      },
      organization: {
        name: org?.[0]?.name ?? "Mon Entreprise",
        email: org?.[0]?.email ?? null,
        phone: org?.[0]?.phone ?? null,
        address: org?.[0]?.address ?? null,
        city: org?.[0]?.city ?? null,
        postalCode: org?.[0]?.postalCode ?? null,
        logo: org?.[0]?.logo ?? null,
        siret: org?.[0]?.siret ?? null,
        vatNumber: org?.[0]?.vatNumber ?? null,
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
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// ── POST /api/public/quotes/[token] ─────────────────
// Accept or reject a quote
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();
    const action = body.action as "accept" | "reject";
    const comment = body.comment as string | undefined;

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json({ error: "Action invalide" }, { status: 400 });
    }

    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.viewToken, token))
      .limit(1);

    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }

    // Check if quote can be responded to
    const isExpired = quote.validUntil ? new Date(quote.validUntil) < new Date() : false;
    if (isExpired) {
      return NextResponse.json({ error: "Ce devis a expiré" }, { status: 400 });
    }

    if (!["sent", "viewed"].includes(quote.status)) {
      const statusLabels: Record<string, string> = {
        accepted: "déjà accepté",
        rejected: "déjà refusé",
        expired: "expiré",
        invoiced: "déjà facturé",
        draft: "pas encore envoyé",
      };
      return NextResponse.json(
        { error: `Ce devis est ${statusLabels[quote.status] ?? quote.status}` },
        { status: 400 }
      );
    }

    const newStatus = action === "accept" ? "accepted" : "rejected";
    const ipAddress = request.headers.get("x-forwarded-for") ?? null;

    // Update quote status
    await db
      .update(quotes)
      .set({
        status: newStatus,
        ...(action === "accept" ? { acceptedAt: new Date() } : { rejectedAt: new Date() }),
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quote.id));

    // Log activity
    await db.insert(quoteActivities).values({
      quoteId: quote.id,
      userId: null,
      action: "status_changed",
      fromStatus: quote.status,
      toStatus: newStatus,
      ipAddress,
      metadata: JSON.stringify({ source: "public_link", clientAction: action, comment: comment || null }),
    });

    return NextResponse.json({
      success: true,
      status: newStatus,
      message: action === "accept"
        ? "Merci ! Votre acceptation a été enregistrée."
        : "Votre refus a été enregistré.",
    });
  } catch (error) {
    console.error("Public quote action error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
