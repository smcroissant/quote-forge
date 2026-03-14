interface QuoteEmailData {
  quoteNumber: string;
  title: string | null;
  total: string;
  validUntil: string | null;
  clientName: string;
  organizationName: string;
  organizationEmail: string | null;
  publicUrl: string;
  notes: string | null;
  lines: Array<{
    description: string;
    quantity: string;
    unitPrice: string;
    lineTotal: string;
  }>;
}

function formatCurrency(value: string): string {
  return parseFloat(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function getQuoteEmailSubject(data: QuoteEmailData): string {
  const title = data.title ? ` — ${data.title}` : "";
  return `Devis ${data.quoteNumber}${title} — ${data.organizationName}`;
}

export function generateQuoteEmailHTML(data: QuoteEmailData): string {
  const validUntil = formatDate(data.validUntil);

  const linesHTML = data.lines
    .map(
      (line) => `
    <tr>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333;">
        ${line.description}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666; text-align: center;">
        ${line.quantity}
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #666; text-align: right;">
        ${formatCurrency(line.unitPrice)} €
      </td>
      <td style="padding: 12px 16px; border-bottom: 1px solid #f0f0f0; font-size: 14px; color: #333; font-weight: 600; text-align: right;">
        ${formatCurrency(line.lineTotal)} €
      </td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${getQuoteEmailSubject(data)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <!-- Main card -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                📄 Nouveau devis
              </h1>
              <p style="margin: 8px 0 0; font-size: 16px; color: rgba(255,255,255,0.85);">
                ${data.quoteNumber}${data.title ? ` — ${data.title}` : ""}
              </p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.6;">
                Bonjour <strong>${data.clientName}</strong>,
              </p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #555; line-height: 1.6;">
                Veuillez trouver ci-dessous le récapitulatif de votre devis. Vous pouvez le consulter en ligne, le télécharger en PDF, ou nous faire part de votre décision directement depuis la page du devis.
              </p>
            </td>
          </tr>

          <!-- Quote lines -->
          <tr>
            <td style="padding: 16px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <!-- Table header -->
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                    Description
                  </th>
                  <th style="padding: 12px 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                    Qté
                  </th>
                  <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                    Prix HT
                  </th>
                  <th style="padding: 12px 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb;">
                    Total HT
                  </th>
                </tr>
                ${linesHTML}
              </table>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding: 8px 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="60%"></td>
                  <td style="padding: 16px 20px; background-color: #f0fdf4; border-radius: 8px; text-align: right;">
                    <span style="font-size: 14px; color: #166534; font-weight: 500;">Total TTC</span>
                    <br>
                    <span style="font-size: 24px; font-weight: 700; color: #166534;">${formatCurrency(data.total)} €</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${validUntil ? `
          <!-- Validity -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <p style="margin: 0; font-size: 13px; color: #6b7280; text-align: center;">
                ⏰ Ce devis est valable jusqu&apos;au <strong>${validUntil}</strong>
              </p>
            </td>
          </tr>
          ` : ""}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 8px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);">
                    <a href="${data.publicUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; letter-spacing: 0.3px;">
                      Consulter le devis →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 12px 0 0; font-size: 13px; color: #9ca3af;">
                Vous pouvez accepter, refuser, ou poser des questions directement depuis cette page.
              </p>
            </td>
          </tr>

          ${data.notes ? `
          <!-- Notes -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 16px;">
                <p style="margin: 0 0 4px; font-size: 12px; font-weight: 600; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px;">
                  📝 Notes
                </p>
                <p style="margin: 0; font-size: 14px; color: #78350f; line-height: 1.5; white-space: pre-wrap;">
                  ${data.notes}
                </p>
              </div>
            </td>
          </tr>
          ` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; border-top: 1px solid #f0f0f0; text-align: center;">
              <p style="margin: 0; font-size: 14px; color: #333; font-weight: 600;">
                ${data.organizationName}
              </p>
              ${data.organizationEmail ? `
              <p style="margin: 4px 0 0; font-size: 13px; color: #6b7280;">
                ${data.organizationEmail}
              </p>
              ` : ""}
              <p style="margin: 12px 0 0; font-size: 12px; color: #9ca3af;">
                Cet email a été envoyé depuis CroissantDevis
              </p>
            </td>
          </tr>

        </table>
        <!-- /Main card -->

      </td>
    </tr>
  </table>
  <!-- /Wrapper -->

</body>
</html>`;
}
