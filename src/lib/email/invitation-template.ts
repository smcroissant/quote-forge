// ── Invitation Email Template ─────────────────────────

interface InvitationEmailData {
  inviteeEmail: string;
  orgName: string;
  inviterName: string;
  role: string;
  acceptLink: string;
}

const ROLE_LABELS: Record<string, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  member: "Membre",
};

export function generateInvitationEmailHTML(data: InvitationEmailData): string {
  const roleLabel = ROLE_LABELS[data.role] ?? data.role;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation — ${data.orgName}</title>
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
                🤝 Invitation à rejoindre l'équipe
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
                Bonjour,
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                <strong>${data.inviterName}</strong> vous invite à rejoindre
                <strong>${data.orgName}</strong> sur QuoteForge en tant que
                <strong>${roleLabel}</strong>.
              </p>

              <!-- Role badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:#f0f0ff;border-radius:8px;padding:12px 20px;">
                    <p style="margin:0;color:#4f46e5;font-size:14px;font-weight:600;">
                      👤 Rôle : ${roleLabel}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:24px 0;">
                    <a href="${data.acceptLink}"
                      style="display:inline-block;background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:-0.3px;">
                      Accepter l'invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">
                Ce lien expire dans 7 jours.
              </p>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;text-align:center;">
                Si vous n'avez pas demandé cette invitation, ignorez cet email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                Envoyé par QuoteForge — Gestion de devis simplifiée
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

export function generateInvitationEmailSubject(orgName: string): string {
  return `Invitation à rejoindre ${orgName} sur QuoteForge`;
}
