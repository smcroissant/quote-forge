"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  FileText,
  Users,
  Package,
  Settings,
  LogOut,
  ChevronUp,
  Building2,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import { CommandPalette } from "@/components/search/command-palette";
import { NotificationProvider, useNotifications } from "@/components/notifications/notification-provider";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Devis",
    href: "/quotes",
    icon: FileText,
  },
  {
    title: "Factures",
    href: "/invoices",
    icon: Receipt,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Produits",
    href: "/products",
    icon: Package,
  },
  {
    title: "Paramètres",
    href: "/settings",
    icon: Settings,
  },
];

// ── Nav items with badge support ────────────────────
function NavItems() {
  const pathname = usePathname();
  const { badgeCounts } = useNotifications();

  const badgeMap: Record<string, number> = {
    "/quotes": badgeCounts.pendingQuotes,
    "/invoices": badgeCounts.unpaidInvoices,
  };

  return (
    <SidebarMenu>
      {navItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/dashboard" && pathname.startsWith(item.href));
        const badge = badgeMap[item.href];

        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={isActive}
              tooltip={item.title}
              render={<Link href={item.href} />}
            >
              <item.icon className="size-4" />
              <span>{item.title}</span>
              {badge !== undefined && badge > 0 && (
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-500 px-1.5 text-[10px] font-bold text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const userInitials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const handleSignOut = async () => {
    await signOut();
    toast.success("Déconnexion réussie");
    router.push("/login");
  };

  return (
    <NotificationProvider>
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">QuoteForge</span>
                  <span className="text-xs text-muted-foreground">
                    Gestion de devis
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <NavItems />
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarSeparator />
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger render={
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage
                        src={session?.user?.image ?? undefined}
                        alt={session?.user?.name ?? ""}
                      />
                      <AvatarFallback className="rounded-lg">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session?.user?.name ?? "Utilisateur"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session?.user?.email ?? ""}
                      </span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                } />
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage
                          src={session?.user?.image ?? undefined}
                          alt={session?.user?.name ?? ""}
                        />
                        <AvatarFallback className="rounded-lg">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">
                          {session?.user?.name ?? "Utilisateur"}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          {session?.user?.email ?? ""}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Settings className="mr-2 size-4" />
                    Paramètres
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" />
                    Se déconnecter
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Top bar */}
        <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <CommandPalette />
        </header>

        {/* Main content */}
        <main className="flex flex-1 flex-col gap-4 p-4 animate-fade-in">
          {children}
        </main>
      </SidebarInset>

      {/* Command Palette (global, renders its own trigger) */}
    </SidebarProvider>
    </NotificationProvider>
  );
}
