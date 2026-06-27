      "use client";

      import Link from "next/link";
      import { usePathname } from "next/navigation";
      import { useState, useEffect } from "react";
      import {
        Bell,
        LogOut,
        Workflow,
        Menu,
        X,
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
      import { DashboardSearch } from "@/components/layout/dashboard-search";
      import { usePendingAlertsCount } from "@/hooks/useAlerts";
      import { UserAvatar } from "@/components/profile/UserAvatar";

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
            onClick={onNavigate}
            className={cn(
              "group flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
              nested && "ml-4 py-2.5 rounded-xl",
              active
                ? "bg-white/10 text-white shadow-lg shadow-white/5"
                : "text-slate-300 hover:bg-white/5 hover:text-white hover:translate-x-1"
            )}
          >
            <span className="flex items-center gap-3">
              <Icon className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
              {item.label}
            </span>
            {active ? <span className="h-2 w-2 rounded-full bg-blue-400 shadow-lg shadow-blue-400/50" /> : null}
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
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className={cn(
                "group flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-200",
                childActive
                  ? "bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4 opacity-60 group-hover:opacity-100 transition-opacity" />
                {item.label}
              </span>
              {open ? (
                <ChevronDown className="h-4 w-4 opacity-60" />
              ) : (
                <ChevronRight className="h-4 w-4 opacity-60" />
              )}
            </button>
            {open && (
              <div className="space-y-1 border-l border-white/10 ml-6 pl-2">
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

      export function DashboardShell({
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

        return (
          <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
            
            {/* Desktop Sidebar - Fixed height with scroll */}
            <aside className="hidden lg:flex lg:flex-col h-screen sticky top-0 border-r border-white/10 bg-app px-5 py-6 text-white backdrop-blur-xl overflow-y-auto">
              <div className="flex-shrink-0 mb-10 bg-Black flex items-center gap-3">
              <img
                    src="/okna.png"
                    alt="Complaint Flow OS"
                    className="w-28 sm:w-36 md:w-44 lg:w-52 h-20 object-contain"
                  />
              </div>
              
            

              <nav className="flex-1 overflow-y-auto pb-4 space-y-2">
                {navItems.map((item) => (
                  <NavGroupItem key={item.label} item={item} pathname={pathname} />
                ))}
              </nav>
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
                    className="fixed left-0 top-0 z-50 h-full w-[300px] border-r border-white/10 bg-app px-5 py-6 text-white backdrop-blur-xl overflow-y-auto lg:hidden"
                  >
                    <div className="flex-shrink-0 mb-8 flex items-center justify-between">
                      <img src="/okna.png" alt="Complaint Flow OS" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 rounded-full hover:bg-white/10 flex-shrink-0"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <X className="h-5 w-5" />
                      </Button>
                    </div>

                    <nav className="flex-1 overflow-y-auto pb-4 space-y-2">
                      {navItems.map((item) => (
                        <NavGroupItem
                          key={item.label}
                          item={item}
                          pathname={pathname}
                          onNavigate={handleNavClick}
                        />
                      ))}
                    </nav>

                    <div className="flex-shrink-0 mt-4 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-4 backdrop-blur-sm">
                      <Badge variant="info" className="mb-3 bg-blue-500/20 text-blue-300 border-blue-500/20">
                        {roleBadgeLabel}
                      </Badge>
                      <p className="text-sm font-semibold text-white">{user?.name ?? "Demo user"}</p>
                      <p className="text-xs text-slate-400">{user?.email ?? "Signed in"}</p>
                    </div>
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
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full border-white/10 bg-white/5 pl-1.5 pr-2.5 text-white hover:bg-white/10"
                        >
                          <UserAvatar
                            name={user?.name ?? "User"}
                            avatarUrl={user?.avatarUrl}
                            className="h-7 w-7 rounded-full text-xs"
                            textClassName="text-blue-300"
                          />
                          <span className="hidden max-w-[120px] truncate sm:inline">
                            {user?.name ?? "Profile"}
                          </span>
                          <ChevronDown className="h-4 w-4 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-64 rounded-2xl border border-white/10 bg-app p-2 text-white shadow-xl"
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
                        <DropdownMenuItem asChild className="rounded-xl px-3 py-2.5 cursor-pointer">
                          <Link href={settingsHref} className="flex items-center gap-2 text-white">
                            <Settings className="h-4 w-4" />
                            Settings
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2 bg-white/10" />
                        <DropdownMenuItem
                          variant="destructive"
                          className="rounded-xl px-3 py-2.5 text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer"
                          onClick={handleSignOut}
                        >
                          <LogOut className="h-4 w-4" />
                          Log out
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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