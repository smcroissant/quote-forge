"use client";

import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// ── Responsive list: table on desktop, cards on mobile ──

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (item: T) => ReactNode;
}

interface CardField<T> {
  key: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface ResponsiveListProps<T> {
  items: T[];
  getItemId: (item: T) => string;
  columns: Column<T>[];
  cardFields: CardField<T>[];
  cardHeader: (item: T) => ReactNode;
  cardActions?: (item: T) => ReactNode;
  emptyState?: ReactNode;
  onRowClick?: (item: T) => void;
}

export function ResponsiveList<T>({
  items,
  getItemId,
  columns,
  cardFields,
  cardHeader,
  cardActions,
  emptyState,
  onRowClick,
}: ResponsiveListProps<T>) {
  if (items.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <>
      {/* Desktop: Table */}
      <div className="hidden md:block border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
              {cardActions && <TableHead className="w-[50px]" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow
                key={getItemId(item)}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render(item)}
                  </TableCell>
                ))}
                {cardActions && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {cardActions(item)}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile: Cards */}
      <div className="md:hidden space-y-3">
        {items.map((item) => (
          <Card
            key={getItemId(item)}
            className={cn(onRowClick && "cursor-pointer active:scale-[0.98] transition-transform")}
            onClick={() => onRowClick?.(item)}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">{cardHeader(item)}</div>
                {cardActions && (
                  <div onClick={(e) => e.stopPropagation()} className="ml-2 shrink-0">
                    {cardActions(item)}
                  </div>
                )}
              </div>
              {/* Fields */}
              <div className="space-y-2">
                {cardFields.map((field) => (
                  <div key={field.key} className={cn("flex justify-between items-center text-sm", field.className)}>
                    {field.render(item)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ── Card field helpers ──────────────────────────────

interface CardFieldRowProps {
  label: string;
  value: ReactNode;
  className?: string;
}

export function CardFieldRow({ label, value, className }: CardFieldRowProps) {
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-medium text-right", className)}>{value}</span>
    </>
  );
}
