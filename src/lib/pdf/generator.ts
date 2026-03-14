import puppeteer from "puppeteer";
import { generateQuoteHTML } from "./template";

interface QuoteData {
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

export async function generateQuotePDF(data: QuoteData): Promise<Buffer> {
  const html = generateQuoteHTML(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
      printBackground: true,
      preferCSSPageSize: false,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
