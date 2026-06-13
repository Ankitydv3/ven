"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Define navigation items for different roles
const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/track", label: "Track" }
];

const adminLinks = [
  { href: "/admin/dashboard", label: "Admin Dashboard" },
  { href: "/admin/complaints", label: "Complaints" },
  { href: "/admin/analytics", label: "Analytics" }
];

const teamLinks = [
  { href: "/team/dashboard", label: "Team Dashboard" }
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
    // Check auth status on mount and when pathname changes
    const { isAuthenticated, role } = getAuthStatus();
    setIsAuthenticated(isAuthenticated);
    setUserRole(role);
  }, [pathname]);

  // Determine which links to show
  const getNavLinks = () => {
    if (!isAuthenticated) {
      return [
        ...publicLinks,
        { href: "/admin/login", label: "Admin Login" },
        { href: "/team/login", label: "Team Login" }
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
    <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-white/60 backdrop-blur-md dark:bg-slate-950/60">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-heading text-lg font-semibold text-slate-900 dark:text-white">
            Complaint Flow OS
          </Link>
          <span className="hidden text-sm text-slate-500 dark:text-slate-300 md:inline">— Service desk demo</span>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-3 md:flex">
          {navLinks.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition",
                  active ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-100 dark:text-slate-300"
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={logout}
              className="hidden md:inline-flex"
            >
              Logout
            </Button>
          )}
          
          <div className="md:hidden">
            <Button size="sm" variant="outline" onClick={() => setOpen((s) => !s)}>
              {open ? "Close" : "Menu"}
            </Button>
          </div>
        </div>
      </div>

      {open ? (
        <div className="md:hidden border-t border-white/8 bg-white/60 px-4 py-3 dark:bg-slate-950/60">
          <div className="flex flex-col gap-2">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium block",
                  pathname === l.href ? "bg-teal-600 text-white" : "text-slate-700 dark:text-slate-200"
                )}
              >
                {l.label}
              </Link>
            ))}
            {isAuthenticated && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="mt-2"
              >
                Logout
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}

export default Navbar;