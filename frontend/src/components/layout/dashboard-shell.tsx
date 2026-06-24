"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  Bell,
  LogOut,
  Shield,
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
} from "lucide-react";
import { ThemeToggle } from "@/components/navigation/theme-toggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { clearSession, readUser } from "@/lib/storage";
import { cn } from "@/lib/utils";
import { navGroups, type NavItem } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { usePendingAlertsCount } from "@/hooks/useAlerts";
import { DashboardSearch } from "@/components/layout/dashboard-search";

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
      {active ? <span className="h-2 w-2 rounded-full bg-teal-400 shadow-lg shadow-teal-400/50" /> : null}
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

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      
      {/* Desktop Sidebar - Fixed height with scroll */}
      <aside className="hidden lg:flex lg:flex-col h-screen sticky top-0 border-r border-white/10 bg-black px-5 py-6 text-white backdrop-blur-xl overflow-y-auto">
        <div className="flex-shrink-0 mb-10 bg-Black flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-teal-300">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <p className="font-heading text-lg font-semibold">Complaint Flow OS</p>
            <p className="text-xs text-slate-400">Enterprise service desk</p>
          </div>
        </div>
        
        <div className="flex-shrink-0 mb-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/10 p-4 backdrop-blur-sm">
          <Badge variant="info" className="mb-3 bg-teal-500/20 text-teal-300 border-teal-500/20">
            {role === "admin" ? "Admin Mode" : role === "store" ? "Store Manager" : user?.team ?? "Team Mode"}
          </Badge>
          <p className="text-sm font-semibold text-white">{user?.name ?? "Demo user"}</p>
          <p className="text-xs text-slate-400">{user?.email ?? "Signed in"}</p>
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
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Mobile Sidebar - Full height with scroll */}
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed left-0 top-0 z-50 h-full w-[300px] border-r border-white/10 bg-black px-5 py-6 text-white backdrop-blur-xl overflow-y-auto lg:hidden"
            >
              <div className="flex-shrink-0 mb-8 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/20 text-teal-300">
                    <Workflow className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-heading text-lg font-semibold">Complaint Flow OS</p>
                    <p className="text-xs text-slate-400">Enterprise service desk</p>
                  </div>
                </div>
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
                <Badge variant="info" className="mb-3 bg-teal-500/20 text-teal-300 border-teal-500/20">
                  {role === "admin" ? "Admin Mode" : user?.team ?? "Team Mode"}
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
        <header className="sticky top-0 z-30 flex-shrink-0 border-b border-white/10 bg-[#020817]/70 px-4 py-4 text-white backdrop-blur-xl lg:px-8">
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
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  
                </div>
                <h1 className="font-heading text-xl sm:text-2xl font-semibold text-white truncate">{title}</h1>
                <p className="text-sm text-slate-300 truncate">{subtitle}</p>
              </div>
            </div>

            {role === "admin" ? (
              <div className="w-full lg:max-w-xl lg:flex-1 lg:px-4">
                <DashboardSearch navItems={navItems} />
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2 flex-shrink-0 lg:justify-end">
              <ThemeToggle />
              <Button
                variant="outline"
                size="sm"
                className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 whitespace-nowrap"
                onClick={() => {
                  const target =
                    user?.role === "admin" || user?.role === "super_admin"
                      ? "/admin/alerts"
                      : "/team/alerts";
                  window.location.href = target;
                }}
              >
                <Bell className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">Notifications</span>
                {pendingAlerts > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1.5 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
                  >
                    {pendingAlerts > 99 ? "99+" : pendingAlerts}
                  </Badge>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full border-white/10 bg-white/5 text-white hover:bg-white/10 whitespace-nowrap"
                onClick={() => {
                  clearSession();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4 mr-1.5" /> 
                <span className="hidden sm:inline">Sign out</span>
                <span className="sm:hidden">Exit</span>
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