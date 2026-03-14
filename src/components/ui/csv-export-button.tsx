"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { generateCSV, downloadCSV } from "@/lib/csv";

interface CSVExportButtonProps<T extends Record<string, unknown>> {
  data: T[];
  columns: { key: string; label: string; format?: (value: unknown, row: T) => string }[];
  filename: string;
  disabled?: boolean;
}

export function CSVExportButton<T extends Record<string, unknown>>({
  data,
  columns,
  filename,
  disabled,
}: CSVExportButtonProps<T>) {
  const handleExport = () => {
    const csv = generateCSV(data, columns);
    downloadCSV(csv, filename);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled || data.length === 0}
    >
      <Download className="mr-2 h-4 w-4" />
      Exporter CSV
    </Button>
  );
}
