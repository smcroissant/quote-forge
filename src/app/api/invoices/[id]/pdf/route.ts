import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/db";
import { invoices, invoiceLines, clients, organizations, quotes } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateInvoicePDF } from "@/lib/pdf/invoice-generator";
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

    const { id: invoiceId } = await params;
    const organizationId = session.session.activeOrganizationId;

    // Fetch invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(
        and(
          eq(invoices.id, invoiceId),
          eq(invoices.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!invoice) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }

    // Fetch lines
    const lines = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invoice.id))
      .orderBy(invoiceLines.sortOrder);

    // Fetch client
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, invoice.clientId))
      .limit(1);

    // Fetch organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    // Fetch linked quote number (if any)
    let quoteNumber: string | null = null;
    if (invoice.quoteId) {
      const [linkedQuote] = await db
        .select({ quoteNumber: quotes.quoteNumber })
        .from(quotes)
        .where(eq(quotes.id, invoice.quoteId))
        .limit(1);
      quoteNumber = linkedQuote?.quoteNumber ?? null;
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePDF({
      invoiceNumber: invoice.invoiceNumber,
      quoteNumber,
      title: invoice.title,
      status: invoice.status,
      createdAt: invoice.createdAt.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      notes: invoice.notes,
      subtotal: invoice.subtotal,
      taxAmount: invoice.taxAmount,
      total: invoice.total,
      paymentMethod: invoice.paymentMethod,
      organization: {
        name: org?.name ?? "Mon Entreprise",
        email: org?.email ?? null,
        phone: org?.phone ?? null,
        address: org?.address ?? null,
        logo: org?.logo ?? null,
        bankName: org?.bankName ?? null,
        bankIban: org?.bankIban ?? null,
        bankBic: org?.bankBic ?? null,
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

    // Update pdfUrl on the invoice
    await db
      .update(invoices)
      .set({ pdfUrl: `/api/invoices/${invoiceId}/pdf`, updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));

    // Return PDF
    return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="facture-${invoice.invoiceNumber}.pdf"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Invoice PDF generation error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du PDF" },
      { status: 500 }
    );
  }
}
