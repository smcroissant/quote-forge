// ── Quote PDF HTML Template ─────────────────────────
// Generates a professional invoice-style quote document

interface QuotePDFData {
  quoteNumber: string;
  title: string | null;
  status: string;
  createdAt: string;
  validUntil: string | null;
  notes: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo: string | null;
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
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
};

export function generateQuoteHTML(data: QuotePDFData): string {
  const clientAddress = [
    data.client.address,
    data.client.postalCode && data.client.city
      ? `${data.client.postalCode} ${data.client.city}`
      : data.client.city,
    data.client.country !== "FR" ? data.client.country : null,
  ]
    .filter(Boolean)
    .join("<br>");

  const orgAddress = [data.organization.address]
    .filter(Boolean)
    .join("<br>");

  const linesHTML = data.lines
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

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${data.quoteNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
      background: #fff;
      line-height: 1.5;
      padding: 40px;
      font-size: 13px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #1a1a1a;
    }
    .company-name {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .company-info {
      color: #666;
      font-size: 12px;
      line-height: 1.6;
    }
    .quote-title {
      text-align: right;
    }
    .quote-title h1 {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 8px;
    }
    .quote-number {
      font-size: 14px;
      color: #666;
    }
    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-top: 8px;
    }
    .status-draft { background: #f0f0f0; color: #666; }
    .status-sent { background: #dbeafe; color: #1d4ed8; }
    .status-accepted { background: #dcfce7; color: #15803d; }
    .status-rejected { background: #fce7f3; color: #be185d; }
    .status-expired { background: #fef3c7; color: #b45309; }

    .info-grid {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 40px;
    }
    .info-block {
      flex: 1;
    }
    .info-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #999;
      margin-bottom: 6px;
      font-weight: 600;
    }
    .info-value {
      font-size: 13px;
      line-height: 1.6;
    }
    .info-value strong {
      font-size: 14px;
    }

    .quote-title-section {
      margin-bottom: 30px;
    }
    .quote-title-section h2 {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead th {
      background: #f8f9fa;
      padding: 10px 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #666;
      font-weight: 600;
      border-bottom: 2px solid #e5e5e5;
    }
    thead th:last-child,
    thead th:nth-child(3),
    thead th:nth-child(4),
    thead th:nth-child(5),
    thead th:nth-child(6) {
      text-align: right;
    }

    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 40px;
    }
    .totals-table {
      width: 280px;
      border-collapse: collapse;
    }
    .totals-table td {
      padding: 8px 12px;
    }
    .totals-table .label {
      color: #666;
    }
    .totals-table .value {
      text-align: right;
      font-weight: 500;
    }
    .totals-table .total-row {
      border-top: 2px solid #1a1a1a;
      font-weight: 700;
      font-size: 16px;
    }
    .totals-table .total-row td {
      padding-top: 12px;
    }

    .notes {
      background: #f8f9fa;
      padding: 16px 20px;
      border-radius: 8px;
      margin-bottom: 40px;
    }
    .notes-label {
      font-weight: 600;
      margin-bottom: 4px;
    }
    .notes-text {
      color: #555;
      white-space: pre-wrap;
    }

    .footer {
      text-align: center;
      color: #999;
      font-size: 11px;
      padding-top: 20px;
      border-top: 1px solid #e5e5e5;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div>
      <div class="company-name">${data.organization.name}</div>
      <div class="company-info">
        ${orgAddress ? orgAddress + "<br>" : ""}
        ${data.organization.email ? data.organization.email + "<br>" : ""}
        ${data.organization.phone ? data.organization.phone : ""}
      </div>
    </div>
    <div class="quote-title">
      <h1>DEVIS</h1>
      <div class="quote-number">${data.quoteNumber}</div>
      <span class="status-badge status-${data.status}">${statusLabels[data.status] ?? data.status}</span>
    </div>
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <div class="info-block">
      <div class="info-label">Client</div>
      <div class="info-value">
        <strong>${data.client.name}</strong><br>
        ${clientAddress || ""}
        ${data.client.email ? "<br>" + data.client.email : ""}
        ${data.client.phone ? "<br>" + data.client.phone : ""}
      </div>
    </div>
    <div class="info-block">
      <div class="info-label">Date</div>
      <div class="info-value">${formatDate(data.createdAt)}</div>
      ${data.validUntil ? `
        <div class="info-label" style="margin-top: 12px;">Valable jusqu'au</div>
        <div class="info-value">${formatDate(data.validUntil)}</div>
      ` : ""}
    </div>
  </div>

  <!-- Quote title -->
  ${data.title ? `
  <div class="quote-title-section">
    <h2>${data.title}</h2>
  </div>
  ` : ""}

  <!-- Lines table -->
  <table>
    <thead>
      <tr>
        <th style="width: 40px;">#</th>
        <th>Description</th>
        <th style="width: 60px;">Qté</th>
        <th style="width: 90px;">Prix HT</th>
        <th style="width: 60px;">TVA</th>
        <th style="width: 100px;">Total HT</th>
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

  <!-- Notes -->
  ${data.notes ? `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${data.notes}</div>
  </div>
  ` : ""}

  <!-- Footer -->
  <div class="footer">
    ${data.organization.name} — Document généré par QuoteForge
  </div>
</body>
</html>`;
}
