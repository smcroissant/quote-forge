"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc-client";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Receipt,
  Users,
  Package,
  Search,
  Loader2,
  Clock,
  ArrowRight,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Recent pages storage ────────────────────────────
const RECENT_KEY = "croissantdevis_recent_pages";
const MAX_RECENT = 5;

interface RecentPage {
  title: string;
  href: string;
  type: "quote" | "invoice" | "client" | "product" | "page";
  timestamp: number;
}

function getRecentPages(): RecentPage[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentPage[];
  } catch {
    return [];
  }
}

function addRecentPage(page: Omit<RecentPage, "timestamp">) {
  if (typeof window === "undefined") return;
  const recent = getRecentPages();
  // Remove duplicates
  const filtered = recent.filter((r) => r.href !== page.href);
  const updated = [{ ...page, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}

// ── Type config ─────────────────────────────────────
const typeConfig = {
  quote: { label: "Devis", icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
  invoice: { label: "Facture", icon: Receipt, color: "text-indigo-500", bg: "bg-indigo-50" },
  client: { label: "Client", icon: Users, color: "text-green-500", bg: "bg-green-50" },
  product: { label: "Produit", icon: Package, color: "text-amber-500", bg: "bg-amber-50" },
  page: { label: "Page", icon: FileText, color: "text-slate-500", bg: "bg-slate-50" },
} as const;

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  viewed: "Vu",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  invoiced: "Facturé",
  paid: "Payée",
  overdue: "En retard",
  cancelled: "Annulée",
};

// ── Quick links ─────────────────────────────────────
const quickLinks = [
  { title: "Nouveau devis", href: "/quotes/new", type: "page" as const },
  { title: "Voir les devis", href: "/quotes", type: "page" as const },
  { title: "Voir les factures", href: "/invoices", type: "page" as const },
  { title: "Voir les clients", href: "/clients", type: "page" as const },
  { title: "Catalogue produits", href: "/products", type: "page" as const },
  { title: "Dashboard", href: "/dashboard", type: "page" as const },
  { title: "Paramètres", href: "/settings", type: "page" as const },
];

// ── Component ───────────────────────────────────────
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recent, setRecent] = useState<RecentPage[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const utils = trpc.useUtils();

  // Search query
  const { data: searchResults, isFetching } = trpc.search.global.useQuery(
    { query },
    { enabled: query.length >= 2 }
  );

  // Load recent pages on open
  useEffect(() => {
    if (open) {
      const pages = getRecentPages();
      queueMicrotask(() => {
        setRecent(pages);
        setSelectedIndex(0);
      });
    }
  }, [open]);

  // Keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      queueMicrotask(() => setQuery(""));
    }
  }, [open]);

  // Build flat list of navigable items
  const items = query.length >= 2 && searchResults
    ? searchResults.results.map((r) => ({
        title: r.title,
        subtitle: r.subtitle,
        href: r.href,
        type: r.type,
        badge: r.badge,
      }))
    : query.length === 0
      ? [
          ...recent.map((r) => ({
            title: r.title,
            subtitle: typeConfig[r.type]?.label ?? "Page",
            href: r.href,
            type: r.type,
            badge: undefined,
          })),
          ...quickLinks.map((q) => ({
            title: q.title,
            subtitle: "",
            href: q.href,
            type: q.type,
            badge: undefined,
          })),
        ]
      : [];

  const totalItems = items.length;

  const navigate = useCallback(
    (href: string, title: string, type: string) => {
      addRecentPage({ title, href, type: type as RecentPage["type"] });
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, totalItems - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && items[selectedIndex]) {
      e.preventDefault();
      navigate(items[selectedIndex].href, items[selectedIndex].title, items[selectedIndex].type);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showRecent = query.length === 0 && recent.length > 0;
  const showQuickLinks = query.length === 0;

  return (
    <>
      {/* Trigger button (for navbar) */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Rechercher...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Palette Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="overflow-hidden p-0 shadow-2xl max-w-[560px]">
          {/* Search input */}
          <div className="flex items-center border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Rechercher devis, factures, clients, produits..."
              className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-12 text-base"
            />
            {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {query.length >= 2 && searchResults && !searchResults.hasResults && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Aucun résultat pour &ldquo;{query}&rdquo;
                </p>
              </div>
            )}

            {query.length === 1 && (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Continuez à taper pour rechercher...
                </p>
              </div>
            )}

            {/* Search results grouped */}
            {query.length >= 2 && searchResults?.hasResults && (
              <div className="space-y-1">
                {searchResults.counts.quotes > 0 && (
                  <div className="px-2 py-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Devis ({searchResults.counts.quotes})
                    </p>
                  </div>
                )}
                {items.map((item, i) => (
                  <ResultItem
                    key={`${item.type}-${item.href}-${i}`}
                    item={item}
                    selected={i === selectedIndex}
                    onClick={() => navigate(item.href, item.title, item.type)}
                    showType={false}
                  />
                ))}
              </div>
            )}

            {/* Recent + Quick links when no query */}
            {query.length === 0 && (
              <div className="space-y-3">
                {showRecent && (
                  <div>
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Récents
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {recent.map((item, i) => (
                        <ResultItem
                          key={`recent-${i}`}
                          item={{
                            title: item.title,
                            subtitle: typeConfig[item.type]?.label ?? "Page",
                            href: item.href,
                            type: item.type,
                          }}
                          selected={i === selectedIndex}
                          onClick={() => navigate(item.href, item.title, item.type)}
                          showType
                        />
                      ))}
                    </div>
                  </div>
                )}

                {showQuickLinks && (
                  <div>
                    <div className="flex items-center gap-2 px-2 py-1">
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Navigation rapide
                      </p>
                    </div>
                    <div className="space-y-0.5">
                      {quickLinks.map((item, i) => {
                        const idx = recent.length + i;
                        return (
                          <ResultItem
                            key={`quick-${i}`}
                            item={{
                              title: item.title,
                              subtitle: "",
                              href: item.href,
                              type: item.type,
                            }}
                            selected={idx === selectedIndex}
                            onClick={() => navigate(item.href, item.title, item.type)}
                            showType
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer hints */}
          <div className="flex items-center gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-mono">↑↓</kbd> naviguer
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-mono">↵</kbd> ouvrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 font-mono">esc</kbd> fermer
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Result item component ───────────────────────────
function ResultItem({
  item,
  selected,
  onClick,
  showType,
}: {
  item: {
    title: string;
    subtitle: string;
    href: string;
    type: string;
    badge?: string;
  };
  selected: boolean;
  onClick: () => void;
  showType: boolean;
}) {
  const config = typeConfig[item.type as keyof typeof typeConfig] ?? typeConfig.page;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
        selected ? "bg-indigo-50 text-indigo-900" : "hover:bg-muted"
      )}
    >
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", config.bg)}>
        <Icon className={cn("h-4 w-4", config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        {item.subtitle && (
          <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {item.badge && (
          <Badge variant="outline" className="text-xs">
            {statusLabels[item.badge] ?? item.badge}
          </Badge>
        )}
        {showType && (
          <span className="text-xs text-muted-foreground">{config.label}</span>
        )}
        {selected && <ArrowRight className="h-3 w-3 text-indigo-500" />}
      </div>
    </button>
  );
}
