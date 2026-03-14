import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  console.warn("⚠️ RESEND_API_KEY is not set — emails will fail");
}

export const resend = new Resend(process.env.RESEND_API_KEY ?? "re_placeholder");

export const FROM_EMAIL = "CroissantDevis <devis@croissantdevis.app>";
