import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/db";
import { quotes, quoteLines, clients, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateQuotePDF } from "@/lib/pdf/generator";
import { headers } from "next/headers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Auth check
    const headersList = await headers();
    const session = await auth.api.getSession({ headers: headersList });

    if (!session?.session?.activeOrganizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: quoteId } = await params;
    const organizationId = session.session.activeOrganizationId;

    // Fetch quote with all related data
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

    // Fetch lines
    const lines = await db
      .select()
      .from(quoteLines)
      .where(eq(quoteLines.quoteId, quote.id))
      .orderBy(quoteLines.sortOrder);

    // Fetch client
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, quote.clientId))
      .limit(1);

    // Fetch organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // Generate PDF
    const pdfBuffer = await generateQuotePDF({
      quoteNumber: quote.quoteNumber,
      title: quote.title,
      status: quote.status,
      createdAt: quote.createdAt.toISOString(),
      validUntil: quote.validUntil?.toISOString() ?? null,
      notes: quote.notes,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      total: quote.total,
      organization: {
        name: org?.name ?? "Mon Entreprise",
        email: org?.email ?? null,
        phone: org?.phone ?? null,
        address: org?.address ?? null,
        logo: org?.logo ?? null,
      },
      client: {
        name: client?.name ?? "Client",
        email: client?.email ?? null,
        phone: client?.phone ?? null,
        address: client?.address ?? null,
        city: client?.city ?? null,
        postalCode: client?.postalCode ?? null,
        country: client?.country ?? null,
      },
      lines: lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate ?? "20.00",
        lineTotal: line.lineTotal,
      })),
    });

    // Update pdfUrl on the quote
    const pdfUrl = `/api/quotes/${quoteId}/pdf`;
    await db
      .update(quotes)
      .set({ pdfUrl, updatedAt: new Date() })
      .where(eq(quotes.id, quoteId));

    // Return PDF
    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="devis-${quote.quoteNumber}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}
