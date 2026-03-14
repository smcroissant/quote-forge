interface ReminderEmailData {
  invoiceNumber: string;
  clientName: string;
  total: string;
  dueDate: string | null;
  daysOverdue: number;
  reminderNumber: number; // 1, 2, or 3
  orgName: string;
  orgEmail: string | null;
  publicLink?: string | null;
  bankIban?: string | null;
  bankBic?: string | null;
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

const reminderMessages: Record<number, { subject: string; greeting: string; body: string }> = {
  1: {
    subject: "Rappel — Facture",
    greeting: "Nous espérons que vous allez bien.",
    body: `Nous nous permettons de vous rappeler que la facture <strong>{invoiceNumber}</strong> d'un montant de <strong>{total} €</strong>, émise le {dueDate}, est arrivée à échéance il y a {daysOverdue} jours.

Si le règlement a déjà été effectué, nous vous remercions de ne pas tenir compte de ce message.`,
  },
  2: {
    subject: "2e rappel — Facture",
    greeting: "Suite à notre précédent rappel,",
    body: `nous constatons que la facture <strong>{invoiceNumber}</strong> d'un montant de <strong>{total} €</strong> demeure impayée depuis {daysOverdue} jours.

Nous vous serions reconnaissants de bien vouloir procéder au règlement dans les meilleurs délais. Si vous rencontrez des difficultés, n'hésitez pas à nous contacter pour envisager une solution.`,
  },
  3: {
    subject: "Dernier rappel — Facture",
    greeting: "Malgré nos précédentes relances,",
    body: `la facture <strong>{invoiceNumber}</strong> d'un montant de <strong>{total} €</strong> reste impayée depuis {daysOverdue} jours.

Nous vous prions de bien vouloir régler cette facture dans les plus brefs délais. À défaut de réponse de votre part sous 8 jours, nous serons contraints d'engager les démarches appropriées.

Nous restons à votre disposition pour tout échange à ce sujet.`,
  },
};

function interpolate(
  template: string,
  data: { invoiceNumber: string; total: string; dueDate: string; daysOverdue: number }
): string {
  return template
    .replace(/{invoiceNumber}/g, data.invoiceNumber)
    .replace(/{total}/g, data.total)
    .replace(/{dueDate}/g, data.dueDate)
    .replace(/{daysOverdue}/g, String(data.daysOverdue));
}

export function getReminderEmailSubject(data: ReminderEmailData): string {
  const config = reminderMessages[data.reminderNumber] ?? reminderMessages[1];
  return `${config.subject} ${data.invoiceNumber} — ${data.orgName}`;
}

export function generateReminderEmailHTML(data: ReminderEmailData): string {
  const config = reminderMessages[data.reminderNumber] ?? reminderMessages[1];
  const dueDate = formatDate(data.dueDate);

  const bodyText = interpolate(config.body, {
    invoiceNumber: data.invoiceNumber,
    total: formatCurrency(data.total),
    dueDate,
    daysOverdue: data.daysOverdue,
  });

  const bankSection =
    data.bankIban
      ? `
    <tr>
      <td style="padding: 0 32px 24px;">
        <div style="background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 6px; font-size: 12px; font-weight: 600; color: #0369a1; text-transform: uppercase; letter-spacing: 0.5px;">
            💳 Coordonnées bancaires
          </p>
          ${data.bankIban ? `<p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;">IBAN : ${data.bankIban}</p>` : ""}
          ${data.bankBic ? `<p style="margin: 2px 0; font-size: 13px; color: #0c4a6e;">BIC : ${data.bankBic}</p>` : ""}
        </div>
      </td>
    </tr>`
      : "";

  const urgencyColor =
    data.reminderNumber === 1
      ? "#f59e0b"
      : data.reminderNumber === 2
        ? "#f97316"
        : "#ef4444";

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getReminderEmailSubject(data)}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f9fa;">
    <tr>
      <td align="center" style="padding: 40px 20px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="background-color: ${urgencyColor}; padding: 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff;">
                ${data.reminderNumber === 1 ? "⏰" : data.reminderNumber === 2 ? "⚠️" : "🔴"} ${config.subject}
              </h1>
              <p style="margin: 8px 0 0; font-size: 15px; color: rgba(255,255,255,0.9);">
                Facture ${data.invoiceNumber} — ${formatCurrency(data.total)} €
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0; font-size: 16px; color: #333; line-height: 1.6;">
                Bonjour <strong>${data.clientName}</strong>,
              </p>
              <p style="margin: 16px 0 0; font-size: 15px; color: #555; line-height: 1.7;">
                ${config.greeting}
              </p>
              <p style="margin: 12px 0 0; font-size: 15px; color: #555; line-height: 1.7;">
                ${bodyText}
              </p>
            </td>
          </tr>

          <!-- Invoice summary -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <tr style="background-color: #f9fafb;">
                  <td style="padding: 10px 16px; font-size: 13px; color: #6b7280;">Facture</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: #333; text-align: right;">${data.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; color: #6b7280; border-top: 1px solid #f0f0f0;">Montant dû</td>
                  <td style="padding: 10px 16px; font-size: 16px; font-weight: 700; color: #333; text-align: right; border-top: 1px solid #f0f0f0;">${formatCurrency(data.total)} €</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; color: #6b7280; border-top: 1px solid #f0f0f0;">Échéance</td>
                  <td style="padding: 10px 16px; font-size: 13px; color: #333; text-align: right; border-top: 1px solid #f0f0f0;">${dueDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 16px; font-size: 13px; color: #6b7280; border-top: 1px solid #f0f0f0;">Retard</td>
                  <td style="padding: 10px 16px; font-size: 13px; font-weight: 600; color: ${urgencyColor}; text-align: right; border-top: 1px solid #f0f0f0;">${data.daysOverdue} jours</td>
                </tr>
              </table>
            </td>
          </tr>

          ${bankSection}

          <!-- CTA -->
          ${data.publicLink ? `
          <tr>
            <td style="padding: 0 32px 32px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius: 8px; background-color: #1a1a1a;">
                    <a href="${data.publicLink}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                      Consulter la facture →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #f0f0f0; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #333; font-weight: 500;">
                ${data.orgName}
              </p>
              ${data.orgEmail ? `<p style="margin: 4px 0 0; font-size: 12px; color: #9ca3af;">${data.orgEmail}</p>` : ""}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
