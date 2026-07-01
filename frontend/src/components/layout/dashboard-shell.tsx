      "use client";

      import Link from "next/link";
      import { usePathname, useRouter } from "next/navigation";
      import { useState, useEffect, useContext } from "react";
      import { useQueryClient } from "@tanstack/react-query";
      import {
        Bell,
        LogOut,
        Menu,
        X,
        RefreshCw,
        ChevronRight,
        ChevronDown,
        LayoutDashboard,
        Users,
        FileText,
        Settings,
        BarChart3,
        MessageSquare,
        Home,
        ListChecks,
        Clock,
        UserCog,
        ShoppingBag,
        CalendarDays,
        CreditCard,
        Package,
        History,
      } from "lucide-react";
      import { Button } from "@/components/ui/button";
      import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
      } from "@/components/ui/dropdown-menu";
      import { clearSession } from "@/lib/storage";
      import { useSessionUser } from "@/hooks/use-session";
      import { cn } from "@/lib/utils";
      import { navGroups, type NavItem } from "@/lib/constants";
      import { motion, AnimatePresence } from "framer-motion";
      import dynamic from "next/dynamic";
      import { usePendingAlertsCount } from "@/hooks/useAlerts";
      import { UserAvatar } from "@/components/profile/UserAvatar";
      import {
        DashboardLayoutContext,
        useDashboardMeta,
      } from "@/components/layout/dashboard-meta";

      const DashboardSearch = dynamic(
        () => import("@/components/layout/dashboard-search").then((mod) => mod.DashboardSearch),
        { ssr: false }
      );

      // Icon mapping for nav items
      const iconMap: Record<string, any> = {
        Dashboard: LayoutDashboard,
        Orders: ShoppingBag,
        "My Tasks": ListChecks,
        Customers: Users,
        Schedule: CalendarDays,
        Complaints: FileText,
        Payments: CreditCard,
        Reports: FileText,
        Alerts: Bell,
        "My Team": Users,
        "Team Members": Users,
        Analytics: BarChart3,
        Messages: MessageSquare,
        Settings: Settings,
        "System Health": Home,
        "Audit Log": Clock,
        "User Management": UserCog,
        "Material Requests": Package,
        History: History,
      };

      function NavLinkItem({
        item,
        pathname,
        onNavigate,
        nested = false,
      }: {
        item: NavItem;
        pathname: string;
        onNavigate?: () => void;
        nested?: boolean;
      }) {
        if (!item.href) return null;
        const active = pathname === item.href;
        const Icon = iconMap[item.label] || ChevronRight;

        return (
          <Link
            href={item.href}
            prefetch
            onClick={onNavigate}
            className={cn(
              "group flex items-center rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200",
              nested && "ml-4 py-1.5",
              active
                ? "bg-[#3b82f6] text-white"
                : "text-[#94a3b8] hover:bg-white/5 hover:text-white"
            )}
          >
            <span className="flex items-center gap-3">
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-white" : "text-[#94a3b8] group-hover:text-white"
                )}
              />
              {item.label}
            </span>
          </Link>
        );
      }

      function NavGroupItem({
        item,
        pathname,
        onNavigate,
      }: {
        item: NavItem;
        pathname: string;
        onNavigate?: () => void;
      }) {
        const childActive = item.children?.some((c) => c.href === pathname) ?? false;
        const [open, setOpen] = useState(childActive);
        const Icon = iconMap[item.label] || ChevronRight;

        if (!item.children?.length) {
          return <NavLinkItem item={item} pathname={pathname} onNavigate={onNavigate} />;
        }

        return (
          <div className="space-y-0">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "group flex w-full items-center justify-between rounded-[10px] px-4 py-2 text-sm font-medium transition-colors duration-200",
                childActive
                  ? "bg-[#3b82f6] text-white"
                  : "text-[#94a3b8] hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    childActive ? "text-white" : "text-[#94a3b8] group-hover:text-white"
                  )}
                />
                {item.label}
              </span>
              {open ? (
                <ChevronDown className={cn("h-4 w-4 shrink-0", childActive ? "text-white" : "text-[#94a3b8]")} />
              ) : (
                <ChevronRight className={cn("h-4 w-4 shrink-0", childActive ? "text-white" : "text-[#94a3b8]")} />
              )}
            </button>
            {open && (
              <div className="space-y-1 border-l border-[#333] ml-6 pl-2">
                {item.children.map((child) => (
                  <NavLinkItem
                    key={child.href ?? child.label}
                    item={child}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    nested
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      function getRoleBadgeLabel(role: "admin" | "team" | "store", team?: string) {
        if (role === "admin") return "Admin Mode";
        if (role === "store") return "Store Manager";
        return team ?? "Team Mode";
      }

      function getSettingsHref(role: "admin" | "team" | "store") {
        if (role === "admin") return "/admin/settings";
        if (role === "store") return "/store/settings";
        return "/team/settings";
      }

      function SidebarLogo({ className }: { className?: string }) {
        return (
          <div className={cn("px-4", className)}>
            <Link href="/" className="inline-block leading-none">
              <img
                src="/okna.png"
                alt="OKNA Assist"
                className="block h-23 w-auto -translate-x-9"
              />
            </Link>
          </div>
        );
      }

      function SidebarProfileSection({
        user,
        roleBadgeLabel,
        settingsHref,
        onSignOut,
      }: {
        user: ReturnType<typeof useSessionUser>;
        roleBadgeLabel: string;
        settingsHref: string;
        onSignOut: () => void;
      }) {
        return (
          <div className="flex-shrink-0 mt-auto pt-3 pb-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[10px] p-1 text-left transition-colors hover:bg-white/5"
                >
                  <UserAvatar
                    name={user?.name ?? "User"}
                    avatarUrl={user?.avatarUrl}
                    className="h-9 w-9 shrink-0 rounded-full text-sm"
                    textClassName="text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">
                        {user?.name ?? "Demo user"}
                      </span>
                      <span className="shrink-0 rounded bg-[#d97706] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        {roleBadgeLabel}
                      </span>
                    </div>
                    <p className="truncate text-xs text-[#94a3b8]">{user?.email ?? "Signed in"}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#94a3b8]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                side="top"
                className="w-56 rounded-2xl border border-white/10 bg-[#0f0f0f] p-2 text-white shadow-xl"
              >
                <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 cursor-pointer">
                  <Link href={settingsHref} className="flex items-center gap-2 text-white">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  className="rounded-xl px-3 py-2.5 text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                  onClick={onSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }

      export function DashboardShell({
        role,
        title,
        subtitle,
        children,
      }: {
        role: "admin" | "team" | "store";
        title: string;
        subtitle: string;
        children: React.ReactNode;
      }) {
        const layoutCtx = useContext(DashboardLayoutContext);
        useDashboardMeta({ title, subtitle });

        if (layoutCtx?.inLayout) {
          return <>{children}</>;
        }

        return (
          <DashboardShellFrame role={role} title={title} subtitle={subtitle}>
            {children}
          </DashboardShellFrame>
        );
      }

      export function DashboardShellFrame({
        role, 
        title, 
        subtitle, 
        children 
      }: { 
        role: "admin" | "team" | "store"; 
        title: string; 
        subtitle: string; 
        children: React.ReactNode 
      }) {
        const pathname = usePathname();
        const router = useRouter();
        const queryClient = useQueryClient();
        const user = useSessionUser();
        const [refreshing, setRefreshing] = useState(false);
        const navItems =
          role === "admin"
            ? navGroups.admin
            : role === "store"
              ? navGroups.store
              : navGroups.team;
        const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
        const { data: pendingAlerts = 0 } = usePendingAlertsCount(role);
        const alertsHref =
          role === "admin"
            ? "/admin/alerts"
            : role === "store"
              ? "/store/alerts"
              : "/team/alerts";

        // Close mobile menu on route change
        const handleNavClick = () => {
          setIsMobileMenuOpen(false);
        };

        // Prevent body scroll when mobile menu is open
        useEffect(() => {
          if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
          } else {
            document.body.style.overflow = 'unset';
          }
          return () => {
            document.body.style.overflow = 'unset';
          };
        }, [isMobileMenuOpen]);

        const roleBadgeLabel = getRoleBadgeLabel(role, user?.team);
        const settingsHref = getSettingsHref(role);

        const handleSignOut = () => {
          clearSession();
          window.location.href = "/";
        };

        const handleHeaderRefresh = async () => {
          setRefreshing(true);
          try {
            await queryClient.invalidateQueries();
            router.refresh();
          } finally {
            setRefreshing(false);
          }
        };

        return (
          <div className="min-h-screen lg:flex lg:h-screen lg:overflow-hidden">
            {/* Desktop Sidebar — full height, logo + nav + profile */}
            <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col border-r border-[#333] bg-[#0a0a0a] px-3 py-0 text-white overflow-hidden">
              <SidebarLogo className="mb-4" />

              <nav className="flex-1 min-h-0 space-y-0.5 overflow-y-auto pb-4">
                {navItems.map((item) => (
                  <NavGroupItem key={item.label} item={item} pathname={pathname} />
                ))}
              </nav>

              <SidebarProfileSection
                user={user}
                roleBadgeLabel={roleBadgeLabel}
                settingsHref={settingsHref}
                onSignOut={handleSignOut}
              />
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex-shrink-0 border-b border-white/10 bg-app/70 px-4 py-4 text-white backdrop-blur-xl lg:px-8">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3 min-w-0 lg:flex-1">
                  {/* Mobile Menu Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden h-10 w-10 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 flex-shrink-0"
                    onClick={() => setIsMobileMenuOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                      
                    </div>
                    <h1 className="font-heading text-xl sm:text-2xl font-semibold text-white truncate">{title}</h1>
                  </div>
                </div>

                {role === "admin" ? (
                  <div className="w-full lg:max-w-md lg:flex-1 lg:px-4">
                    <DashboardSearch navItems={navItems} role="admin" />
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-2 flex-shrink-0 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => void handleHeaderRefresh()}
                    disabled={refreshing}
                    aria-label="Refresh"
                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white transition-colors hover:bg-white/10 disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                  </button>
                  <Link
                    href={alertsHref}
                    prefetch
                    aria-label="Notifications"
                    className="relative inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 p-2.5 text-white transition-colors hover:bg-white/10"
                  >
                    <Bell className="h-4 w-4" />
                    {pendingAlerts > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                        {pendingAlerts > 99 ? "99+" : pendingAlerts}
                      </span>
                    )}
                  </Link>
                </div>
              </div>
            </header>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <>
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="fixed inset-0 z-40 bg-app/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  
                  {/* Mobile Sidebar - Full height with scroll */}
                  <motion.aside
                    initial={{ x: -320 }}
                    animate={{ x: 0 }}
                    exit={{ x: -320 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-[#333] bg-[#0a0a0a] px-5 py-6 text-white overflow-hidden lg:hidden"
                  >
                    <div className="flex-shrink-0 mb-4 flex items-start justify-between gap-3 pr-2">
                      <SidebarLogo />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full hover:bg-white/10 flex-shrink-0"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    <nav className="flex-1 min-h-0 space-y-0 overflow-y-auto pb-2">
                      {navItems.map((item) => (
                        <NavGroupItem
                          key={item.label}
                          item={item}
                          pathname={pathname}
                          onNavigate={handleNavClick}
                        />
                      ))}
                    </nav>

                    <SidebarProfileSection
                      user={user}
                      roleBadgeLabel={roleBadgeLabel}
                      settingsHref={settingsHref}
                      onSignOut={handleSignOut}
                    />
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto px-4 py-6 text-white lg:px-8">
              <div className="max-w-full">
                {children}
              </div>
            </main>
            </div>
          </div>
        );
      }