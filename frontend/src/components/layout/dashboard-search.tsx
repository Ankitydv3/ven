"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  LayoutDashboard,
  FileText,
  ShoppingBag,
  Users,
  CreditCard,
  Package,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/constants";
import { fetchComplaints } from "@/services/complaints";
import { fetchOrders } from "@/services/orders";
import { fetchUsers } from "@/services/users";
import { fetchPayments } from "@/services/payments";
import { fetchMaterialRequests } from "@/services/material-requests";
import { fetchTasks } from "@/services/task.service";

type SearchResultType =
  | "page"
  | "complaint"
  | "order"
  | "user"
  | "payment"
  | "material"
  | "task";

type SearchResult = {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle?: string;
  href: string;
};

const typeMeta: Record<
  SearchResultType,
  { label: string; icon: typeof Search }
> = {
  page: { label: "Pages", icon: LayoutDashboard },
  complaint: { label: "Complaints", icon: FileText },
  order: { label: "Orders", icon: ShoppingBag },
  user: { label: "Users", icon: Users },
  payment: { label: "Payments", icon: CreditCard },
  material: { label: "Material Requests", icon: Package },
  task: { label: "Schedule", icon: CalendarDays },
};

function flattenNavItems(
  items: NavItem[],
  parentLabel?: string
): Array<{ label: string; href: string; group?: string }> {
  const results: Array<{ label: string; href: string; group?: string }> = [];

  for (const item of items) {
    if (item.href) {
      results.push({ label: item.label, href: item.href, group: parentLabel });
    }
    if (item.children?.length) {
      results.push(...flattenNavItems(item.children, item.label));
    }
  }

  return results;
}

function matchesQuery(text: string, query: string) {
  return text.toLowerCase().includes(query.toLowerCase());
}

export function DashboardSearch({ navItems }: { navItems: NavItem[] }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const pages = useMemo(() => flattenNavItems(navItems), [navItems]);

  const pageResults = useMemo<SearchResult[]>(() => {
    const trimmed = query.trim();
    if (!trimmed) return [];

    return pages
      .filter(
        (page) =>
          matchesQuery(page.label, trimmed) ||
          (page.group ? matchesQuery(page.group, trimmed) : false)
      )
      .slice(0, 5)
      .map((page) => ({
        id: `page-${page.href}`,
        type: "page" as const,
        title: page.label,
        subtitle: page.group,
        href: page.href,
      }));
  }, [pages, query]);

  const runSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < 2) {
        setResults(pageResults);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [
        complaintsRes,
        ordersRes,
        usersRes,
        paymentsRes,
        materialsRes,
        tasksRes,
      ] = await Promise.allSettled([
        fetchComplaints({ q: trimmed, page: 1, limit: 4 }),
        fetchOrders({ q: trimmed, page: 1, limit: 4 }),
        fetchUsers({ q: trimmed, page: 1, limit: 4 }),
        fetchPayments({ q: trimmed, page: 1, limit: 4 }),
        fetchMaterialRequests({ q: trimmed, page: 1, limit: 4 }),
        fetchTasks({ q: trimmed, page: 1, limit: 4 }),
      ]);

      const nextResults: SearchResult[] = [...pageResults];

      if (complaintsRes.status === "fulfilled") {
        for (const item of complaintsRes.value.items) {
          nextResults.push({
            id: `complaint-${item._id}`,
            type: "complaint",
            title: item.complaintId,
            subtitle: item.clientName,
            href: `/admin/complaints?q=${encodeURIComponent(item.complaintId)}`,
          });
        }
      }

      if (ordersRes.status === "fulfilled") {
        for (const item of ordersRes.value.items) {
          nextResults.push({
            id: `order-${item._id}`,
            type: "order",
            title: item.orderId,
            subtitle: item.customerName,
            href: `/admin/orders?q=${encodeURIComponent(item.orderId)}`,
          });
        }
      }

      if (usersRes.status === "fulfilled") {
        for (const item of usersRes.value.items) {
          nextResults.push({
            id: `user-${item._id}`,
            type: "user",
            title: item.name,
            subtitle: item.email,
            href: `/admin/users?q=${encodeURIComponent(item.name)}`,
          });
        }
      }

      if (paymentsRes.status === "fulfilled") {
        for (const item of paymentsRes.value.items) {
          nextResults.push({
            id: `payment-${item._id}`,
            type: "payment",
            title: item.paymentId,
            subtitle: item.customerName,
            href: `/admin/payments?q=${encodeURIComponent(item.paymentId)}`,
          });
        }
      }

      if (materialsRes.status === "fulfilled") {
        for (const item of materialsRes.value.items) {
          nextResults.push({
            id: `material-${item._id}`,
            type: "material",
            title: item.requestId,
            subtitle: item.materialName,
            href: `/admin/material-requests?q=${encodeURIComponent(item.requestId)}`,
          });
        }
      }

      if (tasksRes.status === "fulfilled") {
        for (const item of tasksRes.value.items) {
          nextResults.push({
            id: `task-${item._id}`,
            type: "task",
            title: item.taskId,
            subtitle: item.title,
            href: `/admin/schedule?q=${encodeURIComponent(item.taskId)}`,
          });
        }
      }

      setResults(nextResults.slice(0, 20));
      setActiveIndex(0);
      setLoading(false);
    },
    [pageResults]
  );

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      void runSearch(query);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [open, query, runSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        inputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const groupedResults = useMemo(() => {
    const groups = new Map<SearchResultType, SearchResult[]>();
    for (const result of results) {
      const existing = groups.get(result.type) ?? [];
      existing.push(result);
      groups.set(result.type, existing);
    }
    return groups;
  }, [results]);

  const flatResults = useMemo(() => {
    const flat: SearchResult[] = [];
    for (const type of Object.keys(typeMeta) as SearchResultType[]) {
      const items = groupedResults.get(type);
      if (items?.length) flat.push(...items);
    }
    return flat;
  }, [groupedResults]);

  const navigateTo = (result: SearchResult) => {
    setOpen(false);
    setQuery("");
    router.push(result.href);
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (flatResults[activeIndex]) {
      navigateTo(flatResults[activeIndex]);
      return;
    }

    setOpen(false);
    router.push(`/admin/complaints?q=${encodeURIComponent(trimmed)}`);
  };

  const showPanel = open && (query.trim().length > 0 || flatResults.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, Math.max(flatResults.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter") {
              event.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Search pages, complaints, orders, users..."
          className="h-10 rounded-full border-white/10 bg-white/5 pl-9 pr-16 text-sm text-white placeholder:text-slate-400 focus:border-blue-500/40 focus:ring-blue-500/20"
        />
        <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline-block">
          Ctrl K
        </kbd>
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-white/10 bg-app p-2 shadow-2xl shadow-black/40">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching...
            </div>
          )}

          {!loading && query.trim().length < 2 && pageResults.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">
              Type at least 2 characters to search records.
            </p>
          )}

          {!loading && query.trim().length >= 2 && flatResults.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400">No results found.</p>
          )}

          {(Object.keys(typeMeta) as SearchResultType[]).map((type) => {
            const items = groupedResults.get(type);
            if (!items?.length) return null;

            const Icon = typeMeta[type].icon;

            return (
              <div key={type} className="mb-1 last:mb-0">
                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {typeMeta[type].label}
                </p>
                <div className="space-y-0.5">
                  {items.map((result) => {
                    const index = flatResults.findIndex((item) => item.id === result.id);
                    const active = index === activeIndex;

                    return (
                      <button
                        key={result.id}
                        type="button"
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => navigateTo(result)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors",
                          active
                            ? "bg-blue-500/15 text-white"
                            : "text-slate-200 hover:bg-white/5"
                        )}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/5">
                            <Icon className="h-4 w-4 text-blue-300" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {result.title}
                            </span>
                            {result.subtitle ? (
                              <span className="block truncate text-xs text-slate-400">
                                {result.subtitle}
                              </span>
                            ) : null}
                          </span>
                        </span>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 opacity-50" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
