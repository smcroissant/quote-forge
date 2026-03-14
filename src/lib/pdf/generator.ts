import puppeteer from "puppeteer";
import { generateQuoteHTML } from "./template";

export interface QuoteData {
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

export async function generateQuotePDF(data: QuoteData): Promise<Buffer> {
  const html = generateQuoteHTML(data);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    // ── Page numbering script ──────────────────────
    await page.evaluate(() => {
      // This runs in the browser context to prepare display
      // Actual page numbers come from Puppeteer headerFooter
    });

    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "30px", right: "30px", bottom: "40px", left: "30px" },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="width: 100%; text-align: center; font-size: 9px; color: #999; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 0 40px;">
          <span>Page <span class="pageNumber"></span> sur <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
