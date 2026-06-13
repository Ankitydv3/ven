"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Define navigation items for different roles
const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/track", label: "Track" }
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Admin dashboard" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/analytics", label: "Analytics" }
];

const teamLinks = [
  { href: "/team/dashboard", label: "Team dashboard" }
];

// Auth check function - replace with your actual auth logic
const getAuthStatus = () => {
  // Example: Check localStorage or cookies
  // Replace this with your actual authentication method
  const token = localStorage.getItem("auth_token");
  const role = localStorage.getItem("user_role");

  if (!token) return { isAuthenticated: false, role: null };
  return { isAuthenticated: true, role: role as "admin" | "team" | null };
};

const logout = () => {
  // Replace with your actual logout logic
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_role");
  window.location.href = "/";
};

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "team" | null>(null);

  useEffect(() => {
    const { isAuthenticated, role } = getAuthStatus();
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        ...publicLinks,
        { href: "/admin/login", label: "Admin login" },
        { href: "/team/login", label: "Team login" }
      ];
    }

    if (userRole === "admin") {
      return [...publicLinks, ...adminLinks];
    }

    if (userRole === "team") {
      return [...publicLinks, ...teamLinks];
    }

    return publicLinks;
  };

  const navLinks = getNavLinks();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#04140F]/80">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-3.5 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#4F9B8C]/30 bg-[#4F9B8C]/[0.08] text-[#2F6B63] dark:text-[#7BE3CF]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-base font-medium text-[#04342C] dark:text-white">
              Complaint Flow OS
            </span>
            <span className="hidden text-xs text-slate-400 dark:text-white/40 md:inline">
              Service desk
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#2F6B63] text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#2F6B63] dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-[#7BE3CF]"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button
              size="sm"
              variant="outline"
              onClick={logout}
              className="hidden border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-[#04342C] dark:border-white/[0.1] dark:text-white/70 dark:hover:bg-white/[0.05] md:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          )}

          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/[0.1] dark:text-white/70 dark:hover:bg-white/[0.05] md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
        className={cn(
          "overflow-hidden border-t border-slate-200/70 bg-white/80 backdrop-blur-xl transition-[max-height,opacity] duration-300 ease-in-out dark:border-white/[0.06] dark:bg-[#04140F]/90 md:hidden",
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="flex flex-col gap-1 px-6 py-4">
          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-[#2F6B63] text-white"
                    : "text-slate-700 hover:bg-slate-50 dark:text-white/70 dark:hover:bg-white/[0.05]"
                )}
              >
                {l.label}
              </Link>
            );
          })}
          {isAuthenticated && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="mt-2 border-slate-200 text-slate-600 dark:border-white/[0.1] dark:text-white/70"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Navbar;