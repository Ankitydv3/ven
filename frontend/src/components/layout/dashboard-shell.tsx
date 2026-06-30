      "use client";

      import Link from "next/link";
      import { usePathname } from "next/navigation";
      import { useState, useEffect, useLayoutEffect } from "react";
      import {
        Bell,
        LogOut,
        Workflow,
        Menu,
        X,
        ChevronRight,
        ChevronDown,
        RefreshCw,
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
      import { Badge } from "@/components/ui/badge";
      import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
      } from "@/components/ui/dropdown-menu";
      import { clearSession, readUser } from "@/lib/storage";
      import { cn } from "@/lib/utils";
      import { navGroups, type NavItem } from "@/lib/constants";
      import { motion, AnimatePresence } from "framer-motion";
      import dynamic from "next/dynamic";
      import { usePendingAlertsCount } from "@/hooks/useAlerts";
      import { UserAvatar } from "@/components/profile/UserAvatar";
      import { useDashboardLayoutContext } from "@/components/layout/dashboard-layout-context";

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

      const sidebarNavLinkClass = (active: boolean, nested?: boolean) =>
        cn(
          "group flex w-full items-center gap-3 px-4 py-2.5 text-sm font-medium tracking-wide transition-colors duration-150",
          nested ? "ml-0 rounded-none py-2 pl-8" : "rounded-none",
          active
            ? "bg-[#3b82f6] text-white"
            : "text-[#94a3b8] hover:bg-white/[0.04] hover:text-white"
        );

      function NavLinkItem({
        item,
        pathname,
        onNavigate,
        nested = false,
        alertCount = 0,
      }: {
        item: NavItem;
        pathname: string;
        onNavigate?: () => void;
        nested?: boolean;
        alertCount?: number;
      }) {
        if (!item.href) return null;
        const active = pathname === item.href;
        const Icon = iconMap[item.label] || ChevronRight;
        const showAlertDot = item.label === "Alerts" && alertCount > 0;

        return (
          <Link
            href={item.href}
            onClick={onNavigate}
            className={sidebarNavLinkClass(active, nested)}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px] shrink-0",
                active ? "text-white" : "text-[#94a3b8] group-hover:text-white"
              )}
              strokeWidth={1.75}
            />
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {item.label}
              {showAlertDot ? (
                <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500" />
              ) : null}
            </span>
          </Link>
        );
      }

      function NavGroupItem({
        item,
        pathname,
        onNavigate,
        alertCount = 0,
      }: {
        item: NavItem;
        pathname: string;
        onNavigate?: () => void;
        alertCount?: number;
      }) {
        const childActive = item.children?.some((c) => c.href === pathname) ?? false;
        const [open, setOpen] = useState(childActive);
        const Icon = iconMap[item.label] || ChevronRight;

        if (!item.children?.length) {
          return (
            <NavLinkItem
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              alertCount={alertCount}
            />
          );
        }

        return (
          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                sidebarNavLinkClass(childActive),
                "w-full justify-between"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    childActive ? "text-white" : "text-[#94a3b8] group-hover:text-white"
                  )}
                  strokeWidth={1.75}
                />
                {item.label}
              </span>
              {open ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-[#94a3b8]" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-[#94a3b8]" strokeWidth={1.75} />
              )}
            </button>
            {open && (
              <div className="ml-3 space-y-0.5 border-l border-white/[0.08] pl-2">
                {item.children.map((child) => (
                  <NavLinkItem
                    key={child.href ?? child.label}
                    item={child}
                    pathname={pathname}
                    onNavigate={onNavigate}
                    nested
                    alertCount={alertCount}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      function SidebarUserProfile({
        user,
        roleBadgeLabel,
        settingsHref,
        onSignOut,
      }: {
        user: ReturnType<typeof readUser>;
        roleBadgeLabel: string;
        settingsHref: string;
        onSignOut: () => void;
      }) {
        return (
          <div className="mt-auto flex-shrink-0 border-t border-white/[0.08] px-4 pt-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[10px] px-1 py-2 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <UserAvatar
                    name={user?.name ?? "User"}
                    avatarUrl={user?.avatarUrl}
                    className="h-9 w-9 shrink-0 rounded-full bg-[#3b82f6] text-sm text-white"
                    textClassName="text-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">
                        {user?.name ?? "Demo user"}
                      </span>
                      <Badge className="shrink-0 rounded px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide bg-[#854d2b] text-white border-0">
                        {roleBadgeLabel}
                      </Badge>
                    </div>
                    <p className="truncate text-xs text-[#94a3b8]">
                      {user?.email ?? "Signed in"}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 shrink-0 text-[#94a3b8]" strokeWidth={1.75} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="mb-2 w-64 rounded-xl border border-white/10 bg-[#0c0c0c] p-2 text-white shadow-xl"
              >
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <Badge
                    variant="info"
                    className="mb-2 bg-blue-500/20 text-blue-300 border-blue-500/20"
                  >
                    {roleBadgeLabel}
                  </Badge>
                  <p className="text-sm font-semibold text-white">{user?.name ?? "Demo user"}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email ?? "Signed in"}</p>
                </div>
                <DropdownMenuSeparator className="my-2 bg-white/10" />
                <DropdownMenuItem asChild className="rounded-lg px-3 py-2.5 cursor-pointer">
                  <Link href={settingsHref} className="flex items-center gap-2 text-white">
                    <Settings className="h-4 w-4" strokeWidth={1.75} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-2 bg-white/10" />
                <DropdownMenuItem
                  variant="destructive"
                  className="rounded-lg px-3 py-2.5 text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                  onClick={onSignOut}
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.75} />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        const user = readUser();
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

        useEffect(() => {
          setIsMobileMenuOpen(false);
        }, [pathname]);

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

        const handleRefresh = () => {
          window.location.reload();
        };

        return (
          <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
            
            {/* Desktop Sidebar - Fixed height with scroll */}
            <aside className="hidden lg:flex lg:flex-col h-screen sticky top-0 border-r border-white/[0.06] bg-[#0c0c0c] pt-2 pb-3 text-white overflow-hidden">
              <div className="mb-3 w-full shrink-0 pl-0">
                <img
                  src="/okna.png"
                  alt="Complaint Flow OS"
                  className="block h-20 w-auto object-contain object-left"
                />
              </div>

              <nav className="flex-1 space-y-1 min-h-0">
                {navItems.map((item) => (
                  <NavGroupItem
                    key={item.label}
                    item={item}
                    pathname={pathname}
                    alertCount={pendingAlerts}
                  />
                ))}
              </nav>

              <SidebarUserProfile
                user={user}
                roleBadgeLabel={roleBadgeLabel}
                settingsHref={settingsHref}
                onSignOut={handleSignOut}
              />
            </aside>

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
                    className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/[0.06] bg-[#0c0c0c] pt-2 pb-3 text-white overflow-hidden lg:hidden"
                  >
                    <div className="mb-3 flex shrink-0 items-start justify-between pl-4 pr-4">
                      <img
                        src="/okna.png"
                        alt="Complaint Flow OS"
                        className="block h-20 w-auto object-contain object-left"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-lg text-[#94a3b8] hover:bg-white/[0.06] hover:text-white"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <X className="h-5 w-5" strokeWidth={1.75} />
                      </Button>
                    </div>

                    <nav className="flex-1 space-y-1 min-h-0 overflow-y-auto">
                      {navItems.map((item) => (
                        <NavGroupItem
                          key={item.label}
                          item={item}
                          pathname={pathname}
                          onNavigate={handleNavClick}
                          alertCount={pendingAlerts}
                        />
                      ))}
                    </nav>

                    <SidebarUserProfile
                      user={user}
                      roleBadgeLabel={roleBadgeLabel}
                      settingsHref={settingsHref}
                      onSignOut={handleSignOut}
                    />
                  </motion.aside>
                </>
              )}
            </AnimatePresence>

            {/* Main Content - Full scrollable */}
            <div className="flex min-h-screen flex-col overflow-y-auto">
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
                      <p className="text-sm text-slate-300 truncate">{subtitle}</p>
                    </div>
                  </div>

                  {role === "admin" ? (
                    <div className="w-full lg:max-w-xl lg:flex-1 lg:px-4">
                      <DashboardSearch navItems={navItems} role="admin" />
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0 lg:justify-end">
                    
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 whitespace-nowrap"
                      onClick={() => {
                        window.location.href = alertsHref;
                      }}
                    >
                      <Bell className="h-4 w-4 mr-1.5" />
                      {pendingAlerts > 0 && (
                        <Badge
                          variant="destructive"
                          className="ml-1.5 h-5 min-w-5 rounded-full px-1 flex items-center justify-center text-[10px]"
                        >
                          {pendingAlerts > 99 ? "99+" : pendingAlerts}
                        </Badge>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10"
                      onClick={handleRefresh}
                      aria-label="Refresh"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </header>

              <main className="flex-1 px-4 py-6 text-white lg:px-8 overflow-y-auto">
                <div className="max-w-full">
                  {children}
                </div>
              </main>
            </div>
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
        const layout = useDashboardLayoutContext();
        const setMeta = layout?.setMeta;

        useLayoutEffect(() => {
          setMeta?.({ title, subtitle });
        }, [setMeta, title, subtitle]);

        if (layout) {
          return <>{children}</>;
        }

        return (
          <DashboardShellFrame role={role} title={title} subtitle={subtitle}>
            {children}
          </DashboardShellFrame>
        );
      }