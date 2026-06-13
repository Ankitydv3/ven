import { cn } from "@/lib/utils";

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200", className)}>{children}</label>;
}