import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  variant = "default"
}: {
  children: React.ReactNode;
  className?: string;
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "danger"
    | "destructive"
    | "info";
}) {
  const variants = {
    default: "bg-slate-900/10 text-slate-700 dark:bg-white/10 dark:text-white",
    secondary: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/80",
    outline: "border border-slate-200 bg-transparent text-slate-700 dark:border-white/15 dark:text-white",
    success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    danger: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    destructive: "bg-rose-600 text-white",
    info: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
  };

  return <span className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", variants[variant], className)}>{children}</span>;
}
