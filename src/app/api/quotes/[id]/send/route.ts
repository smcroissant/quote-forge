import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/db";
import { quotes, quoteLines, clients, organizations, quoteActivities } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { resend, FROM_EMAIL } from "@/lib/email/resend";
import { generateQuoteEmailHTML, getQuoteEmailSubject } from "@/lib/email/templates/quote";

// ── POST /api/quotes/[id]/send ──────────────────────
// Sends the quote PDF via email to the client
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Auth check ──
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quoteId } = await params;
    const organizationId = session.session.activeOrganizationId;
    const userId = session.user?.id ?? null;

    // ── Fetch quote ──
    const [quote] = await db
      .select()
      .from(quotes)
      .where(
        and(
          eq(quotes.id, quoteId),
          eq(quotes.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }

    // ── Check status (must be draft) ──
    if (quote.status !== "draft") {
      return NextResponse.json(
        { error: "Seuls les brouillons peuvent être envoyés par email" },
        { status: 400 }
      );
    }

    // ── Fetch client ──
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, quote.clientId))
      .limit(1);

    if (!client) {
      return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
    }

    // ── Check client email ──
    if (!client.email || client.email.trim() === "") {
      return NextResponse.json(
        {
          error: "Le client n'a pas d'adresse email renseignée",
          hint: "Ajoutez une adresse email à la fiche client avant d'envoyer le devis",
        },
        { status: 400 }
      );
    }

    // ── Fetch organization ──
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // ── Fetch quote lines ──
    const lines = await db
      .select()
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, quote.id))
      .orderBy(quoteLines.sortOrder);

    // ── Build public URL ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const publicUrl = `${appUrl}/q/${quote.viewToken}`;

    // ── Generate email ──
    const emailData = {
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      total: quote.total,
      validUntil: quote.validUntil ? quote.validUntil.toISOString() : null,
      clientName: client.name,
      organizationName: org?.name ?? "Mon Entreprise",
      organizationEmail: org?.email ?? null,
      publicUrl,
      notes: quote.notes,
      lines: lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
      })),
    };

    const subject = getQuoteEmailSubject(emailData);
    const html = generateQuoteEmailHTML(emailData);

    // ── Send email via Resend ──
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [client.email],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email", details: error.message },
        { status: 500 }
      );
    }

    // ── Update quote status to "sent" ──
    await db
      .update(quotes)
      .set({
        status: "sent",
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(quotes.id, quoteId));

    // ── Log activity ──
    await db.insert(quoteActivities).values({
      quoteId,
      userId,
      action: "status_changed",
      fromStatus: "draft",
      toStatus: "sent",
      metadata: JSON.stringify({
        method: "email",
        recipient: client.email,
        resendId: data?.id ?? null,
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Devis envoyé à ${client.email}`,
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Send quote email error:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
