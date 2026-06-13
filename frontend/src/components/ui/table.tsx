import type { TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-3xl border border-white/12 bg-white/70 dark:bg-slate-950/45", className)}>{children}</div>;
}

export function TableElement({ children }: { children: React.ReactNode }) {
  return <table className="min-w-full divide-y divide-slate-200/70 dark:divide-slate-800">{children}</table>;
}

export function THead({ children }: { children: React.ReactNode }) {
  return <thead className="bg-slate-50/80 dark:bg-slate-900/80">{children}</thead>;
}

export function TH({ children, className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400", className)} {...props}>
      {children}
    </th>
  );
}

export function TD({ children, className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-4 text-sm text-slate-700 dark:text-slate-200", className)} {...props}>
      {children}
    </td>
  );
}

export function TR({ children }: { children: React.ReactNode }) {
  return <tr className="border-t border-slate-100 transition hover:bg-white/70 dark:border-slate-800 dark:hover:bg-white/5">{children}</tr>;
}