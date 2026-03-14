// ── QuoteForge Email Templates ───────────────────────

interface QuoteEmailData {
  quoteNumber: string;
  clientName: string;
  total: string;
  orgName: string;
  orgEmail?: string | null;
  publicLink: string;
  customMessage?: string;
}

export function generateQuoteEmailHTML(data: QuoteEmailData): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Devis ${data.quoteNumber}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                📄 Devis ${data.quoteNumber}
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">
                ${data.orgName}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:16px;line-height:1.6;">
                Bonjour <strong>${data.clientName}</strong>,
              </p>

              ${data.customMessage ? `
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                ${data.customMessage}
              </p>
              ` : `
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Veuillez trouver ci-joint le devis <strong>${data.quoteNumber}</strong> d'un montant de <strong>${data.total} €</strong>.
              </p>
              `}

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="border-radius:8px;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);">
                    <a href="${data.publicLink}" target="_blank"
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      Consulter le devis en ligne →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.5;">
                Vous pouvez également copier ce lien :
              </p>
              <p style="margin:0;color:#6366f1;font-size:13px;word-break:break-all;">
                ${data.publicLink}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #e5e7eb;background-color:#f9fafb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                Cet email a été envoyé depuis <strong>QuoteForge</strong> — Devis pro en 2 minutes.
                <br>
                ${data.orgEmail ? `Contact : ${data.orgEmail}` : ""}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

export function generateQuoteEmailSubject(
  quoteNumber: string,
  orgName: string
): string {
  return `Devis ${quoteNumber} — ${orgName}`;
}
