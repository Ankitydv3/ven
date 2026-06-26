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
  { href: "/track", label: "Track" },
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Admin dashboard" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/analytics", label: "Analytics" },
];

const teamLinks = [{ href: "/team/dashboard", label: "Team dashboard" }];

// Auth check function - replace with your actual auth logic
const getAuthStatus = () => {
  // Example: Check localStorage or cookies
  // Replace this with your actual authentication method
  if (typeof window === "undefined")
    return { isAuthenticated: false, role: null };

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const { isAuthenticated, role } = getAuthStatus();
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Track scroll position for subtle elevation change
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        ...publicLinks,
        { href: "/", label: "Login" },
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
    <header
    className={cn(
      "sticky top-0 z-40 w-full border-b backdrop-blur-xl transition-all duration-300",
      scrolled
        ? "border-slate-200/70 bg-app shadow-[0_4px_24px_-12px_rgba(37,99,235,0.12)] dark:border-white/[0.06] dark:bg-app"
        : "border-transparent bg-app dark:border-transparent dark:bg-app",
    )}
    >
      <div className="mx-auto flex max-w-7xl items-center  justify-between gap-4 px-6 py-3.5 lg:px-8">
        {/* Brand */}
        <Link href="/" className="group flex items-center">
          <div className="flex h-10 items-center justify-center transition-all duration-300 group-hover:scale-105">
            <img
              src="/okna.png"
              alt="Complaint Flow OS"
              className="w-28 sm:w-36 md:w-44 lg:w-52 h-auto object-contain"
            />
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
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-all duration-300",
                  active
                    ? "bg-app text-white shadow-[0_4px_14px_-4px_rgba(24,95,165,0.5)]"
                    : "text-slate-600 hover:bg-slate-100 hover:text-[#185FA5] dark:text-white/60 dark:hover:bg-white/[0.06] dark:hover:text-[#85B7EB]",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* <ThemeToggle className="hidden md:inline-flex" /> */}

          {isAuthenticated && (
            <Button
              size="sm"
              variant="outline"
              onClick={logout}
              className="hidden border-slate-200 text-slate-600 transition-all duration-300 hover:border-[#E24B4A]/30 hover:bg-[#E24B4A]/[0.06] hover:text-[#B3322E] dark:border-white/[0.1] dark:text-white/70 dark:hover:border-[#E24B4A]/30 dark:hover:bg-[#E24B4A]/[0.1] dark:hover:text-[#E24B4A] md:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          )}

          <button
            type="button"
            onClick={() => setOpen((s) => !s)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-colors duration-300 hover:bg-slate-50 dark:border-white/[0.1] dark:text-white/70 dark:hover:bg-white/[0.05] md:hidden"
          >
            <span
              className={cn(
                "absolute transition-all duration-300",
                open
                  ? "rotate-90 scale-0 opacity-0"
                  : "rotate-0 scale-100 opacity-100",
              )}
            >
              <Menu className="h-4 w-4" />
            </span>
            <span
              className={cn(
                "absolute transition-all duration-300",
                open
                  ? "rotate-0 scale-100 opacity-100"
                  : "-rotate-90 scale-0 opacity-0",
              )}
            >
              <X className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div
       className={cn(
        "overflow-hidden border-t backdrop-blur-xl transition-[max-height,opacity,border-color] duration-300 ease-in-out md:hidden",
        open
          ? "max-h-96 border-slate-200/70 bg-app text-white opacity-100 dark:border-white/[0.06]"
          : "max-h-0 border-transparent bg-app opacity-0 dark:border-transparent",
      )}
      >
        <div className="flex flex-col gap-1 px-6 py-4">
          <div
            style={{ transitionDelay: open ? "0ms" : "0ms" }}
            className={cn(
              "mb-1 flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-300",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
          >
            <span className="text-sm font-medium text-slate-700 dark:text-white/70">
              Appearance
            </span>
         
          </div>
          {navLinks.map((l, index) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                style={{
                  transitionDelay: open ? `${(index + 1) * 35}ms` : "0ms",
                }}
                className={cn(
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-300",
                  open
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-1 opacity-0",
                  active
                    ? "bg-[#185FA5] text-white"
                    : "text-slate-700 hover:bg-slate-50 hover:text-[#185FA5] dark:text-white/70 dark:hover:bg-white/[0.05] dark:hover:text-[#85B7EB]",
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
              style={{
                transitionDelay: open
                  ? `${(navLinks.length + 1) * 35}ms`
                  : "0ms",
              }}
              className={cn(
                "mt-2 border-slate-200 text-slate-600 transition-all duration-300 hover:border-[#E24B4A]/30 hover:bg-[#E24B4A]/[0.06] hover:text-[#B3322E] dark:border-white/[0.1] dark:text-white/70 dark:hover:border-[#E24B4A]/30 dark:hover:bg-[#E24B4A]/[0.1] dark:hover:text-[#E24B4A]",
                open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
              )}
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
