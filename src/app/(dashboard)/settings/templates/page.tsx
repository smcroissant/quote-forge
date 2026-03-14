"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Palette,
  Copy,
  Trash2,
  Edit,
  Plus,
  Check,
  FileText,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const layoutOptions = [
  { value: "classic", label: "Classique", icon: FileText, desc: "Professionnel, sobre" },
  { value: "modern", label: "Moderne", icon: Sparkles, desc: "Coloré, dynamique" },
  { value: "minimal", label: "Minimal", icon: Palette, desc: "Épuré, épuré" },
] as const;

export default function TemplatesSettingsPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: templates, isLoading, refetch } = trpc.quoteTemplates.getAll.useQuery();

  const createTemplate = trpc.quoteTemplates.create.useMutation({
    onSuccess: () => {
      toast.success("Template créé !");
      setIsCreateOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteTemplate = trpc.quoteTemplates.delete.useMutation({
    onSuccess: () => {
      toast.success("Template supprimé");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const duplicateTemplate = trpc.quoteTemplates.duplicate.useMutation({
    onSuccess: () => {
      toast.success("Template dupliqué !");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  // Separate default and custom templates
  const defaultTemplates = templates?.filter((t) => !t.organizationId) ?? [];
  const customTemplates = templates?.filter((t) => t.organizationId) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Templates de devis</h1>
          <p className="text-muted-foreground">
            Personnalisez l'apparence de vos devis PDF
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          {/* Default templates */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Templates par défaut</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {defaultTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isDefault={true}
                  onDuplicate={(name) =>
                    duplicateTemplate.mutate({ id: template.id, name })
                  }
                />
              ))}
            </div>
          </div>

          {/* Custom templates */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Templates personnalisés</h2>
            {customTemplates.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Palette className="mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aucun template personnalisé. Créez-en un ou dupliquez un template par défaut.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {customTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    isDefault={false}
                    onEdit={() => setEditingId(template.id)}
                    onDelete={() => deleteTemplate.mutate({ id: template.id })}
                    onDuplicate={(name) =>
                      duplicateTemplate.mutate({ id: template.id, name })
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Create/Edit Dialog */}
      <TemplateFormDialog
        open={isCreateOpen || !!editingId}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingId(null);
          }
        }}
        onSubmit={(data) => {
          createTemplate.mutate(data);
        }}
        isLoading={createTemplate.isPending}
      />
    </div>
  );
}

// ── Template Card ───────────────────────────────────

function TemplateCard({
  template,
  isDefault,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  template: {
    id: string;
    name: string;
    description: string | null;
    layout: string;
    primaryColor: string | null;
    accentColor: string | null;
    isDefault: boolean | null;
    showTerms: boolean | null;
  };
  isDefault: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: (name: string) => void;
}) {
  const [showDuplicatePrompt, setShowDuplicatePrompt] = useState(false);
  const [dupName, setDupName] = useState(`${template.name} (copie)`);

  return (
    <Card className="relative overflow-hidden">
      {/* Color bar */}
      <div
        className="h-1.5"
        style={{
          background: `linear-gradient(90deg, ${template.primaryColor ?? "#1a1a1a"}, ${template.accentColor ?? "#3b82f6"})`,
        }}
      />

      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          {template.isDefault && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              Défaut
            </span>
          )}
        </div>
        {template.description && (
          <CardDescription className="line-clamp-2">
            {template.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded bg-muted px-1.5 py-0.5 capitalize">
            {template.layout}
          </span>
          {template.showTerms && (
            <span className="rounded bg-muted px-1.5 py-0.5">CGV</span>
          )}
        </div>

        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Edit className="mr-1 h-3 w-3" />
              Modifier
            </Button>
          )}
          {onDuplicate && !showDuplicatePrompt && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDuplicatePrompt(true)}
            >
              <Copy className="mr-1 h-3 w-3" />
              Dupliquer
            </Button>
          )}
          {showDuplicatePrompt && (
            <div className="flex items-center gap-1">
              <Input
                className="h-7 w-32 text-xs"
                value={dupName}
                onChange={(e) => setDupName(e.target.value)}
                autoFocus
              />
              <Button
                size="sm"
                className="h-7"
                onClick={() => {
                  onDuplicate?.(dupName);
                  setShowDuplicatePrompt(false);
                }}
              >
                <Check className="h-3 w-3" />
              </Button>
            </div>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Template Form Dialog ────────────────────────────

function TemplateFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    slug: string;
    description?: string;
    layout: "classic" | "modern" | "minimal";
    primaryColor: string;
    accentColor: string;
    showTerms: boolean;
    termsText?: string;
  }) => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState("");
  const [layout, setLayout] = useState<"classic" | "modern" | "minimal">("classic");
  const [primaryColor, setPrimaryColor] = useState("#1a1a1a");
  const [accentColor, setAccentColor] = useState("#3b82f6");
  const [description, setDescription] = useState("");
  const [showTerms, setShowTerms] = useState(false);
  const [termsText, setTermsText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    onSubmit({
      name: name.trim(),
      slug,
      description: description || undefined,
      layout,
      primaryColor,
      accentColor,
      showTerms,
      termsText: showTerms ? termsText : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nouveau template</DialogTitle>
          <DialogDescription>
            Créez un template personnalisé pour vos devis
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tpl-name">Nom *</Label>
            <Input
              id="tpl-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Mon template"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tpl-desc">Description</Label>
            <Input
              id="tpl-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description courte"
            />
          </div>

          <div className="space-y-2">
            <Label>Layout</Label>
            <div className="grid grid-cols-3 gap-2">
              {layoutOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLayout(opt.value)}
                  className={cn(
                    "rounded-lg border p-3 text-center transition-colors",
                    layout === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-muted"
                  )}
                >
                  <opt.icon className="mx-auto mb-1 h-4 w-4" />
                  <div className="text-xs font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Couleur principale</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Couleur accent</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-8 w-12 cursor-pointer rounded border"
                />
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-8 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showTerms"
              checked={showTerms}
              onChange={(e) => setShowTerms(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <Label htmlFor="showTerms" className="font-normal">
              Inclure les conditions générales
            </Label>
          </div>

          {showTerms && (
            <div className="space-y-2">
              <Label>Conditions générales</Label>
              <Textarea
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                placeholder="Vos conditions générales..."
                rows={4}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Création..." : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
