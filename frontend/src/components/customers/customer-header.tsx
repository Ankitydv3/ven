"use client";

import { Bell, Filter, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { INDIAN_STATES, type CustomerStateFilter, glassCardClass, primaryButtonClass } from "@/lib/customer-constants";
import { cn } from "@/lib/utils";

interface CustomerHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
  stateFilter: CustomerStateFilter;
  onStateFilterChange: (value: CustomerStateFilter) => void;
  onAddCustomer: () => void;
  notificationCount?: number;
}

export function CustomerHeader({
  search,
  onSearchChange,
  stateFilter,
  onStateFilterChange,
  onAddCustomer,
  notificationCount = 3,
}: CustomerHeaderProps) {
  return (
    <div className= {cn(glassCardClass, "rounded-3xl p-4 sm:p-5 md:p-6 bg-app")}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between bg-app">
        <div className="min-w-0 ">
          <h2 className="text-2xl font-bold  tracking-tight text-slate-900 dark:text-white sm:text-3xl">
            Customers
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-white/50">
            View and manage customer details
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
          <div className="relative w-full sm:min-w-[220px] sm:flex-1 lg:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-white/40"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search customers..."
              aria-label="Search customers"
              className="h-11 w-full rounded-xl border-slate-200 bg-white pl-10 text-slate-900 placeholder:text-slate-400 focus-visible:border-[#378ADD] focus-visible:ring-[#378ADD]/20 dark:border-white/[0.08] dark:bg-app/60 dark:text-white dark:placeholder:text-white/40"
            />
          </div>

          <Select
            value={stateFilter}
            onValueChange={(value) => onStateFilterChange(value as CustomerStateFilter)}
          >
            <SelectTrigger
              aria-label="Filter by state"
              className="h-11 w-full rounded-xl border-slate-200 bg-white text-slate-900 sm:w-[160px] dark:border-white/[0.08] dark:bg-app/60 dark:text-white"
            >
              <Filter className="mr-2 h-4 w-4 shrink-0 text-slate-400 dark:text-white/40" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-slate-200 dark:border-white/[0.08] dark:bg-app">
              <SelectItem value="all">All States</SelectItem>
              {INDIAN_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            onClick={onAddCustomer}
            className={cn("h-11 w-full rounded-xl sm:w-auto", primaryButtonClass)}
          >
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="Notifications"
            className="relative h-11 w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 sm:w-11 sm:px-0 dark:border-white/[0.08] dark:bg-app/60 dark:text-white dark:hover:bg-white/5"
          >
            <Bell className="h-4 w-4" />
            <span className="sr-only">Notifications</span>
            {notificationCount > 0 && (
              <Badge
                variant="danger"
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px]"
              >
                {notificationCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
