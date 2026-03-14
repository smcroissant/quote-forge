"use client";

import { trpc } from "@/lib/trpc-client";
import { cn } from "@/lib/utils";
import { Check, Palette, FileText, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateSelectorProps {
  selectedId: string | null;
  onSelect: (templateId: string | null) => void;
}

const layoutIcons: Record<string, React.ReactNode> = {
  classic: <FileText className="h-4 w-4" />,
  modern: <Sparkles className="h-4 w-4" />,
  minimal: <Palette className="h-4 w-4" />,
};

const layoutLabels: Record<string, string> = {
  classic: "Classique",
  modern: "Moderne",
  minimal: "Minimal",
};

export function TemplateSelector({ selectedId, onSelect }: TemplateSelectorProps) {
  const { data: templates, isLoading } = trpc.quoteTemplates.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun template disponible
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => {
        const isSelected = selectedId === template.id;

        return (
          <button
            key={template.id}
            type="button"
            onClick={() => onSelect(template.id)}
            className={cn(
              "relative rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-input bg-background"
            )}
          >
            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="h-3.5 w-3.5" />
              </div>
            )}

            {/* Template color preview */}
            <div className="mb-3 flex gap-1.5">
              <div
                className="h-3 w-8 rounded-full"
                style={{ backgroundColor: template.primaryColor ?? "#1a1a1a" }}
              />
              <div
                className="h-3 w-4 rounded-full"
                style={{ backgroundColor: template.accentColor ?? "#3b82f6" }}
              />
              <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                {layoutIcons[template.layout] ?? <FileText className="h-4 w-4" />}
                {layoutLabels[template.layout] ?? template.layout}
              </div>
            </div>

            {/* Template name & description */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{template.name}</span>
                {template.isDefault && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    Défaut
                  </span>
                )}
                {template.organizationId && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    Custom
                  </span>
                )}
              </div>
              {template.description && (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {template.description}
                </p>
              )}
            </div>

            {/* Feature badges */}
            <div className="mt-2 flex flex-wrap gap-1">
              {template.showTerms && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  CGV
                </span>
              )}
              {template.showLogo && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Logo
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
