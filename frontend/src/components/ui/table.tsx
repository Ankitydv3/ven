import type { TdHTMLAttributes, ThHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("overflow-x-auto rounded-3xl border border-white/12 bg-white/70 dark:bg-app/80", className)}>{children}</div>;
}

export function TableElement({ children, className }: { children: React.ReactNode; className?: string }) {
  return <table className={cn("min-w-full divide-y divide-slate-200/70 dark:divide-slate-800", className)}>{children}</table>;
}

export function THead({ children, className }: { children: React.ReactNode; className?: string }) {
  return <thead className={cn("bg-slate-50/80 dark:bg-slate-900/80", className)}>{children}</thead>;
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

export function TR({ children, className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-t border-slate-100 transition hover:bg-white/70 dark:border-slate-800 dark:hover:bg-white/5",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}