import { Resend } from "resend";
import {
  generateQuoteEmailHTML,
  generateQuoteEmailSubject,
} from "./template";

interface SendQuoteEmailInput {
  to: string;
  quoteNumber: string;
  clientName: string;
  total: string;
  orgName: string;
  orgEmail?: string | null;
  publicLink: string;
  customMessage?: string;
  pdfBuffer: Buffer;
}

interface SendQuoteEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

export async function sendQuoteEmail(
  input: SendQuoteEmailInput
): Promise<SendQuoteEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY non configurée" };
  }

  const resend = new Resend(apiKey);

  const subject = generateQuoteEmailSubject(input.quoteNumber, input.orgName);
  const html = generateQuoteEmailHTML({
    quoteNumber: input.quoteNumber,
    clientName: input.clientName,
    total: input.total,
    orgName: input.orgName,
    orgEmail: input.orgEmail,
    publicLink: input.publicLink,
    customMessage: input.customMessage,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: `${input.orgName} <devis@quoteforge.app>`,
      to: [input.to],
      subject,
      html,
      attachments: [
        {
          filename: `devis-${input.quoteNumber}.pdf`,
          content: input.pdfBuffer,
        },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, emailId: data?.id };
  } catch (err) {
    console.error("Email send error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}
