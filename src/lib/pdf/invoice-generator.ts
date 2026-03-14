import puppeteer from "puppeteer";
import { generateInvoiceHTML } from "./invoice-template";

interface InvoiceData {
  invoiceNumber: string;
  quoteNumber: string | null;
  title: string | null;
  status: string;
  createdAt: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paymentMethod: string | null;
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    logo: string | null;
    bankName?: string | null;
    bankIban?: string | null;
    bankBic?: string | null;
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

export async function generateInvoicePDF(data: InvoiceData): Promise<Buffer> {
  const html = generateInvoiceHTML(data);

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
