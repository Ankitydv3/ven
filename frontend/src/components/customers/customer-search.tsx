"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CustomerSearchProps {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
}

export function CustomerSearch({ query, onQueryChange, onClear }: CustomerSearchProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl lg:flex-row lg:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by name, email, or phone..."
          className="h-11 border-white/10 bg-slate-950/50 pl-11 pr-4 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 rounded-xl transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-11 px-4 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
          onClick={onClear}
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
        <span className="hidden lg:inline text-xs text-slate-500">
          {query ? `${query.length} chars` : "All customers"}
        </span>
      </div>
    </div>
  );
}