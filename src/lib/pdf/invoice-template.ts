interface InvoicePDFData {
  invoiceNumber: string;
  quoteNumber: string | null;
  title: string | null;
  status: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paymentMethod: string | null;
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo: string | null;
    bankName?: string | null;
    bankIban?: string | null;
    bankBic?: string | null;
  };
  client: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    postalCode: string | null;
    country: string | null;
  };
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    taxRate: string;
    lineTotal: string;
  }>;
}

function formatCurrency(value: string): string {
  return parseFloat(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

function buildClientAddress(client: InvoicePDFData["client"]): string {
  return [
    client.address,
    client.postalCode && client.city
      ? `${client.postalCode} ${client.city}`
      : client.city,
    client.country !== "FR" ? client.country : null,
  ]
    .filter(Boolean)
    .join("<br>");
}

function buildLinesHTML(lines: InvoicePDFData["lines"]): string {
  return lines
    .map(
      (line, i) => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #555;">${i + 1}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0;">${line.description}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">${line.quantity}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">${formatCurrency(line.unitPrice)} €</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">${line.taxRate}%</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600;">${formatCurrency(line.lineTotal)} €</td>
    </tr>`
    )
    .join("");
}

function buildBankDetails(org: InvoicePDFData["organization"]): string {
  if (!org.bankIban) return "";
  return `
  <div class="bank-details">
    <div class="bank-label">Coordonnées bancaires</div>
    ${org.bankName ? `<div class="bank-row"><span>Banque :</span> ${org.bankName}</div>` : ""}
    <div class="bank-row"><span>IBAN :</span> ${org.bankIban}</div>
    ${org.bankBic ? `<div class="bank-row"><span>BIC :</span> ${org.bankBic}</div>` : ""}
  </div>`;
}

export function generateInvoiceHTML(data: InvoicePDFData): string {
  const clientAddress = buildClientAddress(data.client);
  const linesHTML = buildLinesHTML(data.lines);
  const bankDetails = buildBankDetails(data.organization);
  const statusLabel = statusLabels[data.status] ?? data.status;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facture ${data.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.5; padding: 30px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .org-info { flex: 1; }
    .org-name { font-size: 22px; font-weight: 700; color: #6366f1; margin-bottom: 4px; }
    .org-details { font-size: 12px; color: #666; line-height: 1.6; }
    .invoice-badge { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 24px; border-radius: 10px; text-align: right; }
    .invoice-badge .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.85; }
    .invoice-badge .number { font-size: 22px; font-weight: 700; margin-top: 2px; }
    .invoice-badge .status { font-size: 11px; margin-top: 4px; padding: 2px 8px; background: rgba(255,255,255,0.2); border-radius: 4px; display: inline-block; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 30px; gap: 30px; }
    .client-box, .details-box { flex: 1; background: #f8f9fa; border-radius: 8px; padding: 16px 20px; }
    .box-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #888; margin-bottom: 8px; font-weight: 600; }
    .client-name { font-size: 16px; font-weight: 600; margin-bottom: 4px; }
    .client-address { font-size: 13px; color: #555; line-height: 1.5; }
    .detail-row { display: flex; justify-content: space-between; font-size: 13px; padding: 3px 0; }
    .detail-row .label { color: #888; }
    .detail-row .value { font-weight: 500; }
    table.lines { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    table.lines th { background: #f1f3f5; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; text-align: left; border-bottom: 2px solid #e5e7eb; }
    table.lines th:last-child { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 30px; }
    .totals-table { width: 280px; }
    .totals-table .label { color: #888; font-size: 14px; }
    .totals-table .value { text-align: right; font-size: 14px; }
    .totals-table .total-row { border-top: 2px solid #6366f1; font-weight: 700; font-size: 18px; color: #6366f1; }
    .totals-table .total-row td { padding-top: 10px; }
    .notes { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
    .notes-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #92400e; font-weight: 600; margin-bottom: 4px; }
    .notes-text { font-size: 13px; color: #78350f; white-space: pre-wrap; }
    .bank-details { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
    .bank-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #0369a1; font-weight: 600; margin-bottom: 6px; }
    .bank-row { font-size: 13px; color: #0c4a6e; padding: 2px 0; }
    .bank-row span { color: #0369a1; font-weight: 500; }
    .footer { text-align: center; font-size: 11px; color: #aaa; border-top: 1px solid #eee; padding-top: 16px; margin-top: 30px; }
  </style>
</head>
<body>

  <!-- Header -->
  <div class="header">
    <div class="org-info">
      <div class="org-name">${data.organization.name}</div>
      <div class="org-details">
        ${data.organization.address ? `${data.organization.address}<br>` : ""}
        ${data.organization.email ? `✉ ${data.organization.email}<br>` : ""}
        ${data.organization.phone ? `☎ ${data.organization.phone}` : ""}
      </div>
    </div>
    <div class="invoice-badge">
      <div class="label">Facture</div>
      <div class="number">${data.invoiceNumber}</div>
      <div class="status">${statusLabel}</div>
    </div>
  </div>

  <!-- Meta -->
  <div class="meta">
    <div class="client-box">
      <div class="box-label">Facturer à</div>
      <div class="client-name">${data.client.name}</div>
      <div class="client-address">${clientAddress || ""}</div>
      ${data.client.email ? `<div style="font-size: 13px; color: #555; margin-top: 4px;">${data.client.email}</div>` : ""}
    </div>
    <div class="details-box">
      <div class="box-label">Détails</div>
      <div class="detail-row"><span class="label">Date</span><span class="value">${formatDate(data.createdAt)}</span></div>
      <div class="detail-row"><span class="label">Échéance</span><span class="value">${formatDate(data.dueDate)}</span></div>
      ${data.paidAt ? `<div class="detail-row"><span class="label">Payée le</span><span class="value">${formatDate(data.paidAt)}</span></div>` : ""}
      ${data.paymentMethod ? `<div class="detail-row"><span class="label">Paiement</span><span class="value">${data.paymentMethod}</span></div>` : ""}
      ${data.quoteNumber ? `<div class="detail-row"><span class="label">Devis ref.</span><span class="value">${data.quoteNumber}</span></div>` : ""}
    </div>
  </div>

  <!-- Lines -->
  <table class="lines">
    <thead>
      <tr>
        <th style="width: 30px;">#</th>
        <th>Description</th>
        <th style="width: 60px; text-align: right;">Qté</th>
        <th style="width: 90px; text-align: right;">Prix HT</th>
        <th style="width: 50px; text-align: right;">TVA</th>
        <th style="width: 100px; text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${linesHTML}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <table class="totals-table">
      <tr>
        <td class="label">Sous-total HT</td>
        <td class="value">${formatCurrency(data.subtotal)} €</td>
      </tr>
      <tr>
        <td class="label">TVA</td>
        <td class="value">${formatCurrency(data.taxAmount)} €</td>
      </tr>
      <tr class="total-row">
        <td>Total TTC</td>
        <td class="value">${formatCurrency(data.total)} €</td>
      </tr>
    </table>
  </div>

  <!-- Bank details -->
  ${bankDetails}

  <!-- Notes -->
  ${data.notes ? `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${data.notes}</div>
  </div>` : ""}

  <!-- Footer -->
  <div class="footer">
    ${data.organization.name} — Facture ${data.invoiceNumber} — ${formatDate(data.createdAt)}
  </div>

</body>
</html>`;
}
