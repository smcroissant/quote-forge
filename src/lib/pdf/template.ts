// ── Quote PDF Template System ───────────────────────
// Supports multiple layouts: classic, modern, minimal

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
    website?: string | null;
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
  template?: {
    layout: string;
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    showLogo: boolean;
    showOrgDetails: boolean;
    showClientDetails: boolean;
    showNotes: boolean;
    showTerms: boolean;
    termsText: string | null;
    headerHtml: string | null;
    footerHtml: string | null;
    cssOverrides: string | null;
  };
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
  viewed: "Consulté",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
};

// ── Shared helpers ──────────────────────────────────

/** Escape HTML entities to prevent XSS in PDF rendering */
function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildClientAddress(client: QuotePDFData["client"]): string {
  return [
    client.address,
    client.postalCode && client.city
      ? `${client.postalCode} ${client.city}`
      : client.city,
    client.country !== "FR" ? client.country : null,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join("<br>");
}

function buildOrgAddress(org: QuotePDFData["organization"]): string {
  return [org.address].filter(Boolean).map(escapeHtml).join("<br>");
}

function buildLinesHTML(
  lines: QuotePDFData["lines"],
  accentColor: string
): string {
  return lines
    .map(
      (line, i) => {
        const zebraBg = i % 2 === 1 ? " background: #fafafa;" : "";
        return `
    <tr style="${zebraBg}">
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; color: #555;">${i + 1}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0;">${escapeHtml(line.description)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">${escapeHtml(line.quantity)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">${formatCurrency(line.unitPrice)} €</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right;">${escapeHtml(line.taxRate)}%</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #f0f0f0; text-align: right; font-weight: 600;">${formatCurrency(line.lineTotal)} €</td>
    </tr>`;
      }
    )
    .join("");
}

function buildTotalsHTML(data: QuotePDFData): string {
  return `
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
    </table>`;
}

function buildNotesHTML(data: QuotePDFData, showNotes: boolean): string {
  if (!showNotes || !data.notes) return "";
  return `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${escapeHtml(data.notes)}</div>
  </div>`;
}

function buildTermsHTML(
  showTerms: boolean,
  termsText: string | null
): string {
  if (!showTerms || !termsText) return "";
  return `
  <div class="terms">
    <div class="terms-label">Conditions générales</div>
    <div class="terms-text">${escapeHtml(termsText)}</div>
  </div>`;
}

function buildSignatureHTML(): string {
  return `
  <div class="signature-section no-break">
    <table class="signature-table">
      <tr>
        <td>
          <div class="signature-label">Bon pour accord — Signature du client</div>
          <div class="signature-box"></div>
          <div class="signature-date">Date : ____________________</div>
        </td>
        <td>
          <div class="signature-label">Fait à __________, le __________</div>
          <div class="signature-box"></div>
          <div class="signature-date">Signature + cachet de l'entreprise</div>
        </td>
      </tr>
    </table>
  </div>`;
}

// ── Classic Layout ──────────────────────────────────
// Professional, clean, black & white with status badges

function renderClassicLayout(data: QuotePDFData): string {
  const t = data.template;
  const accent = t?.accentColor ?? "#3b82f6";
  const showNotes = t?.showNotes ?? true;
  const showTerms = t?.showTerms ?? false;
  const termsText = t?.termsText ?? null;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${escapeHtml(data.quoteNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #1a1a1a; background: #fff; line-height: 1.5;
      padding: 40px; font-size: 13px;
    }
    /* ── Print CSS ────────────────────────────────── */
    @page {
      size: A4;
      margin: 30px;
    }
    @media print {
      body { padding: 0; }
      .page-break-before { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
    .header {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a;
    }
    .company-name { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .company-info { color: #666; font-size: 12px; line-height: 1.6; }
    .quote-title { text-align: right; }
    .quote-title h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .quote-number { font-size: 14px; color: #666; }
    .status-badge {
      display: inline-block; padding: 4px 12px; border-radius: 20px;
      font-size: 11px; font-weight: 600; text-transform: uppercase; margin-top: 8px;
    }
    .status-draft { background: #f0f0f0; color: #666; }
    .status-sent { background: #dbeafe; color: #1d4ed8; }
    .status-viewed { background: #e0e7ff; color: #4338ca; }
    .status-accepted { background: #dcfce7; color: #15803d; }
    .status-rejected { background: #fce7f3; color: #be185d; }
    .status-expired { background: #fef3c7; color: #b45309; }
    .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; gap: 40px; }
    .info-block { flex: 1; }
    .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; margin-bottom: 6px; font-weight: 600; }
    .info-value { font-size: 13px; line-height: 1.6; }
    .info-value strong { font-size: 14px; }
    .quote-title-section { margin-bottom: 30px; }
    .quote-title-section h2 { font-size: 18px; font-weight: 600; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead th {
      background: #f8f9fa; padding: 10px 12px; text-align: left;
      font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px;
      color: #666; font-weight: 600; border-bottom: 2px solid #e5e5e5;
    }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(4),
    thead th:nth-child(5), thead th:nth-child(6) { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 280px; border-collapse: collapse; }
    .totals-table td { padding: 8px 12px; }
    .totals-table .label { color: #666; }
    .totals-table .value { text-align: right; font-weight: 500; }
    .totals-table .total-row { border-top: 2px solid #1a1a1a; font-weight: 700; font-size: 16px; }
    .totals-table .total-row td { padding-top: 12px; }
    .notes { background: #f8f9fa; padding: 16px 20px; border-radius: 8px; margin-bottom: 40px; }
    .notes-label { font-weight: 600; margin-bottom: 4px; }
    .notes-text { color: #555; white-space: pre-wrap; }
    .terms { padding: 16px 20px; border: 1px solid #e5e5e5; border-radius: 8px; margin-bottom: 40px; }
    .terms-label { font-weight: 600; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #999; }
    .terms-text { color: #555; font-size: 12px; line-height: 1.6; white-space: pre-wrap; }
    .signature-section { margin: 40px 0; }
    .signature-table { width: 100%; border-collapse: collapse; }
    .signature-table td { width: 50%; padding: 0 20px; vertical-align: bottom; }
    .signature-label { font-size: 11px; color: #999; margin-bottom: 40px; }
    .signature-box { height: 60px; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
    .signature-date { font-size: 11px; color: #999; }
    .footer { text-align: center; color: #999; font-size: 11px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${t?.showLogo !== false && data.organization.logo ? `<img src="${escapeHtml(data.organization.logo)}" alt="Logo" style="max-height: 50px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />` : ""}
      <div class="company-name">${escapeHtml(data.organization.name)}</div>
      <div class="company-info">
        ${buildOrgAddress(data.organization) ? buildOrgAddress(data.organization) + "<br>" : ""}
        ${data.organization.email ? data.organization.email + "<br>" : ""}
        ${data.organization.phone ? data.organization.phone : ""}
      </div>
    </div>
    <div class="quote-title">
      <h1>DEVIS</h1>
      <div class="quote-number">${escapeHtml(data.quoteNumber)}</div>
      <span class="status-badge status-${data.status}">${statusLabels[data.status] ?? data.status}</span>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-block">
      <div class="info-label">Client</div>
      <div class="info-value">
        <strong>${escapeHtml(data.client.name)}</strong><br>
        ${buildClientAddress(data.client) || ""}
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

  ${data.title ? `<div class="quote-title-section"><h2>${escapeHtml(data.title)}</h2></div>` : ""}

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
    <tbody>${buildLinesHTML(data.lines, accent)}</tbody>
  </table>

  <div class="totals">${buildTotalsHTML(data)}</div>

  ${buildNotesHTML(data, showNotes)}
  ${buildTermsHTML(showTerms, termsText)}
  ${buildSignatureHTML()}

  <div class="footer">
    ${escapeHtml(data.organization.name)} — Document généré par QuoteForge
  </div>
</body>
</html>`;
}

// ── Modern Layout ───────────────────────────────────
// Color accent header, sidebar-style info blocks

function renderModernLayout(data: QuotePDFData): string {
  const t = data.template;
  const primary = t?.primaryColor ?? "#0f172a";
  const accent = t?.accentColor ?? "#3b82f6";
  const showNotes = t?.showNotes ?? true;
  const showTerms = t?.showTerms ?? false;
  const termsText = t?.termsText ?? null;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${escapeHtml(data.quoteNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      color: #334155; background: #fff; line-height: 1.6; font-size: 13px;
    }
    /* ── Print CSS ────────────────────────────────── */
    @page { size: A4; margin: 30px; }
    @media print {
      body { padding: 0; }
      .no-break { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
    .header {
      background: ${primary}; color: white; padding: 40px;
      display: flex; justify-content: space-between; align-items: center;
    }
    .header-company { }
    .company-name { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
    .company-info { color: rgba(255,255,255,0.7); font-size: 12px; line-height: 1.6; }
    .header-quote { text-align: right; }
    .header-quote h1 { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin-bottom: 4px; }
    .quote-number { color: rgba(255,255,255,0.7); font-size: 14px; }
    .status-pill {
      display: inline-block; padding: 4px 14px; border-radius: 20px;
      font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 8px;
      background: ${accent}; color: white;
    }
    .content { padding: 40px; }
    .info-grid { display: flex; gap: 20px; margin-bottom: 40px; }
    .info-card {
      flex: 1; background: #f8fafc; border-radius: 12px; padding: 20px;
      border-left: 4px solid ${accent};
    }
    .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 8px; font-weight: 700; }
    .info-value { font-size: 13px; line-height: 1.6; color: #1e293b; }
    .info-value strong { font-size: 15px; display: block; margin-bottom: 4px; }
    .quote-title-section { margin-bottom: 24px; padding: 16px 20px; background: linear-gradient(135deg, ${accent}10, transparent); border-radius: 12px; }
    .quote-title-section h2 { font-size: 18px; font-weight: 600; color: ${primary}; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead th {
      background: #f1f5f9; padding: 12px; text-align: left;
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      color: #64748b; font-weight: 700;
    }
    thead th:first-child { border-radius: 8px 0 0 8px; }
    thead th:last-child { border-radius: 0 8px 8px 0; text-align: right; }
    thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5),
    thead th:nth-child(6) { text-align: right; }
    tbody td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
    tbody tr:last-child td { border-bottom: none; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
    .totals-table { width: 300px; border-collapse: collapse; }
    .totals-table td { padding: 10px 16px; }
    .totals-table .label { color: #64748b; }
    .totals-table .value { text-align: right; font-weight: 600; }
    .totals-table .total-row {
      background: ${primary}; color: white; border-radius: 8px;
      font-weight: 800; font-size: 18px;
    }
    .totals-table .total-row td { padding: 14px 16px; }
    .notes { background: #fefce8; padding: 20px; border-radius: 12px; margin-bottom: 30px; border-left: 4px solid #eab308; }
    .notes-label { font-weight: 700; margin-bottom: 6px; color: #a16207; }
    .notes-text { color: #713f12; white-space: pre-wrap; }
    .terms { background: #f8fafc; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
    .terms-label { font-weight: 700; margin-bottom: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
    .terms-text { color: #475569; font-size: 12px; line-height: 1.8; white-space: pre-wrap; }
    .signature-section { margin: 40px 0; }
    .signature-table { width: 100%; border-collapse: collapse; }
    .signature-table td { width: 50%; padding: 0 20px; vertical-align: bottom; }
    .signature-label { font-size: 11px; color: #94a3b8; margin-bottom: 40px; }
    .signature-box { height: 60px; border-bottom: 1px solid #cbd5e1; margin-bottom: 8px; }
    .signature-date { font-size: 11px; color: #94a3b8; }
    .footer { text-align: center; color: #94a3b8; font-size: 11px; padding: 20px 40px; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-company">
      ${t?.showLogo !== false && data.organization.logo ? `<img src="${escapeHtml(data.organization.logo)}" alt="Logo" style="max-height: 50px; max-width: 180px; object-fit: contain; margin-bottom: 8px; display: block;" />` : ""}
      <div class="company-name">${escapeHtml(data.organization.name)}</div>
      <div class="company-info">
        ${buildOrgAddress(data.organization) ? buildOrgAddress(data.organization) + "<br>" : ""}
        ${data.organization.email ? data.organization.email + " · " : ""}
        ${data.organization.phone ?? ""}
      </div>
    </div>
    <div class="header-quote">
      <h1>DEVIS</h1>
      <div class="quote-number">${escapeHtml(data.quoteNumber)}</div>
      <span class="status-pill">${statusLabels[data.status] ?? data.status}</span>
    </div>
  </div>

  <div class="content">
    <div class="info-grid">
      <div class="info-card">
        <div class="info-label">Client</div>
        <div class="info-value">
          <strong>${escapeHtml(data.client.name)}</strong>
          ${buildClientAddress(data.client) || ""}
          ${data.client.email ? "<br>" + data.client.email : ""}
          ${data.client.phone ? " · " + data.client.phone : ""}
        </div>
      </div>
      <div class="info-card">
        <div class="info-label">Date</div>
        <div class="info-value">
          <strong>${formatDate(data.createdAt)}</strong>
        </div>
        ${data.validUntil ? `
          <div class="info-label" style="margin-top: 12px;">Validité</div>
          <div class="info-value">${formatDate(data.validUntil)}</div>
        ` : ""}
      </div>
    </div>

    ${data.title ? `<div class="quote-title-section"><h2>${escapeHtml(data.title)}</h2></div>` : ""}

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
      <tbody>${buildLinesHTML(data.lines, accent)}</tbody>
    </table>

    <div class="totals">${buildTotalsHTML(data)}</div>

    ${buildNotesHTML(data, showNotes)}
    ${buildTermsHTML(showTerms, termsText)}
    ${buildSignatureHTML()}
  </div>

  <div class="footer">
    ${escapeHtml(data.organization.name)} — Généré avec QuoteForge
  </div>
</body>
</html>`;
}

// ── Minimal Layout ──────────────────────────────────
// Ultra-clean, minimal design, lots of whitespace

function renderMinimalLayout(data: QuotePDFData): string {
  const t = data.template;
  const showNotes = t?.showNotes ?? true;
  const showTerms = t?.showTerms ?? false;
  const termsText = t?.termsText ?? null;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Devis ${escapeHtml(data.quoteNumber)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      color: #333; background: #fff; line-height: 1.7;
      padding: 60px; font-size: 14px;
    }
    /* ── Print CSS ────────────────────────────────── */
    @page { size: A4; margin: 30px; }
    @media print {
      body { padding: 0; }
      .no-break { page-break-inside: avoid; }
      table { page-break-inside: auto; }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
    .header { margin-bottom: 60px; }
    .company-name { font-size: 16px; font-weight: 400; letter-spacing: 2px; text-transform: uppercase; color: #999; margin-bottom: 30px; }
    .quote-meta { display: flex; justify-content: space-between; }
    .quote-number { font-size: 13px; color: #999; }
    .quote-date { font-size: 13px; color: #999; }
    .section { margin-bottom: 50px; }
    .section-title {
      font-size: 10px; text-transform: uppercase; letter-spacing: 3px;
      color: #bbb; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #eee;
    }
    .client-name { font-size: 22px; font-weight: 300; margin-bottom: 4px; }
    .client-detail { color: #888; font-size: 13px; }
    .quote-title-display { font-size: 20px; font-weight: 300; color: #333; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead th {
      padding: 12px 0; text-align: left;
      font-size: 10px; text-transform: uppercase; letter-spacing: 2px;
      color: #bbb; font-weight: 400; border-bottom: 1px solid #eee;
    }
    thead th:last-child, thead th:nth-child(3), thead th:nth-child(4),
    thead th:nth-child(5), thead th:nth-child(6) { text-align: right; }
    tbody td { padding: 16px 0; border-bottom: 1px solid #f5f5f5; }
    tbody tr:last-child td { border-bottom: 1px solid #eee; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 50px; }
    .totals-table { width: 260px; border-collapse: collapse; }
    .totals-table td { padding: 8px 0; }
    .totals-table .label { color: #999; font-size: 13px; }
    .totals-table .value { text-align: right; font-weight: 400; }
    .totals-table .total-row { border-top: 2px solid #333; font-weight: 600; font-size: 18px; }
    .totals-table .total-row td { padding-top: 14px; }
    .notes { margin-bottom: 40px; }
    .notes-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #bbb; margin-bottom: 8px; }
    .notes-text { color: #666; font-size: 13px; white-space: pre-wrap; }
    .terms { margin-bottom: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .terms-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #bbb; margin-bottom: 8px; }
    .terms-text { color: #888; font-size: 12px; line-height: 1.8; white-space: pre-wrap; }
    .signature-section { margin: 50px 0; }
    .signature-table { width: 100%; border-collapse: collapse; }
    .signature-table td { width: 50%; padding: 0 20px; vertical-align: bottom; }
    .signature-label { font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #bbb; margin-bottom: 40px; }
    .signature-box { height: 50px; border-bottom: 1px solid #ddd; margin-bottom: 8px; }
    .signature-date { font-size: 10px; color: #bbb; }
    .footer { text-align: center; color: #ccc; font-size: 11px; letter-spacing: 1px; padding-top: 30px; border-top: 1px solid #f0f0f0; }
  </style>
</head>
<body>
  <div class="header">
    ${t?.showLogo !== false && data.organization.logo ? `<img src="${escapeHtml(data.organization.logo)}" alt="Logo" style="max-height: 40px; max-width: 150px; object-fit: contain; margin-bottom: 12px; display: block;" />` : ""}
    <div class="company-name">${escapeHtml(data.organization.name)}</div>
    <div class="quote-meta">
      <div class="quote-number">${escapeHtml(data.quoteNumber)}</div>
      <div class="quote-date">${formatDate(data.createdAt)}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Client</div>
    <div class="client-name">${escapeHtml(data.client.name)}</div>
    <div class="client-detail">
      ${buildClientAddress(data.client) ? buildClientAddress(data.client).replace(/<br>/g, " · ") : ""}
      ${data.client.email ? " · " + data.client.email : ""}
    </div>
  </div>

  ${data.title ? `
  <div class="section">
    <div class="section-title">Objet</div>
    <div class="quote-title-display">${escapeHtml(data.title)}</div>
  </div>` : ""}

  <div class="section">
    <div class="section-title">Détail</div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th style="width: 60px;">Qté</th>
          <th style="width: 90px;">Prix HT</th>
          <th style="width: 100px;">Total HT</th>
        </tr>
      </thead>
      <tbody>
        ${data.lines
          .map(
            (line) => `
        <tr>
          <td>${line.description}</td>
          <td style="text-align: right;">${line.quantity}</td>
          <td style="text-align: right;">${formatCurrency(line.unitPrice)} €</td>
          <td style="text-align: right;">${formatCurrency(line.lineTotal)} €</td>
        </tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>

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

  ${showNotes && data.notes ? `
  <div class="notes">
    <div class="notes-label">Notes</div>
    <div class="notes-text">${data.notes}</div>
  </div>` : ""}

  ${showTerms && termsText ? `
  <div class="terms">
    <div class="terms-label">Conditions</div>
    <div class="terms-text">${termsText}</div>
  </div>` : ""}

  ${buildSignatureHTML()}

  <div class="footer">
    ${escapeHtml(data.organization.name)}
  </div>
</body>
</html>`;
}

// ── Main entry point ────────────────────────────────

export function generateQuoteHTML(data: QuotePDFData): string {
  const layout = data.template?.layout ?? "classic";

  // Custom HTML override
  if (data.template?.headerHtml || data.template?.footerHtml) {
    // If custom HTML is provided, use classic as base and inject custom parts
    // (Future enhancement: full custom template support)
  }

  switch (layout) {
    case "modern":
      return renderModernLayout(data);
    case "minimal":
      return renderMinimalLayout(data);
    case "classic":
    default:
      return renderClassicLayout(data);
  }
}
