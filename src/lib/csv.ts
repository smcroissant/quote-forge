// ── CSV Export Utility ──────────────────────────────
// Generates UTF-8 with BOM for Excel FR compatibility

const BOM = "\uFEFF";

interface CSVColumn<T> {
  key: string;
  label: string;
  format?: (value: unknown, row: T) => string;
}

export function generateCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  // Header row
  const header = columns.map((col) => escapeCSVField(col.label)).join(";");

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const value = row[col.key];
        const formatted = col.format ? col.format(value, row) : String(value ?? "");
        return escapeCSVField(formatted);
      })
      .join(";")
  );

  return BOM + [header, ...rows].join("\r\n");
}

function escapeCSVField(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Formatters ──────────────────────────────────────
export function formatCurrency(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).replace(".", ","); // Excel FR expects comma decimals
}

export function formatDate(value: unknown): string {
  if (!value) return "";
  return new Date(value as string).toLocaleDateString("fr-FR");
}

export function formatStatus(status: unknown, labels: Record<string, string>): string {
  return labels[status as string] ?? (status as string) ?? "";
}

// ── Predefined columns ──────────────────────────────
const quoteStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  viewed: "Vu",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  invoiced: "Facturé",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

export const quotesCSVColumns = [
  { key: "quoteNumber", label: "N° Devis" },
  { key: "createdAt", label: "Date", format: formatDate },
  { key: "clientName", label: "Client" },
  { key: "title", label: "Titre" },
  { key: "status", label: "Statut", format: (v: unknown) => formatStatus(v, quoteStatusLabels) },
  { key: "subtotal", label: "Sous-total HT (€)", format: formatCurrency },
  { key: "taxAmount", label: "TVA (€)", format: formatCurrency },
  { key: "total", label: "Total TTC (€)", format: formatCurrency },
  { key: "validUntil", label: "Valable jusqu'au", format: formatDate },
];

export const invoicesCSVColumns = [
  { key: "invoiceNumber", label: "N° Facture" },
  { key: "createdAt", label: "Date", format: formatDate },
  { key: "clientName", label: "Client" },
  { key: "title", label: "Titre" },
  { key: "status", label: "Statut", format: (v: unknown) => formatStatus(v, invoiceStatusLabels) },
  { key: "subtotal", label: "Sous-total HT (€)", format: formatCurrency },
  { key: "taxAmount", label: "TVA (€)", format: formatCurrency },
  { key: "total", label: "Total TTC (€)", format: formatCurrency },
  { key: "dueDate", label: "Échéance", format: formatDate },
  { key: "paidAt", label: "Payée le", format: formatDate },
];

export const clientsCSVColumns = [
  { key: "name", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "address", label: "Adresse" },
  { key: "city", label: "Ville" },
  { key: "postalCode", label: "Code postal" },
  { key: "country", label: "Pays" },
  { key: "createdAt", label: "Créé le", format: formatDate },
];

export const productsCSVColumns = [
  { key: "name", label: "Nom" },
  { key: "categoryName", label: "Catégorie" },
  { key: "description", label: "Description" },
  { key: "unitPrice", label: "Prix unitaire (€)", format: formatCurrency },
  { key: "unit", label: "Unité" },
  { key: "taxRate", label: "TVA (%)", format: formatCurrency },
  { key: "isActive", label: "Actif", format: (v: unknown) => v ? "Oui" : "Non" },
  { key: "createdAt", label: "Créé le", format: formatDate },
];
