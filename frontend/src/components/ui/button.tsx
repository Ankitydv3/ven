import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive";
  size?: "sm" | "default" | "lg" | "icon";
};

export function Button({ className, variant = "default", size = "default", ...props }: ButtonProps) {
  const variants = {
    default: "bg-teal-600 text-white hover:bg-teal-500 shadow-lg shadow-teal-600/20",
    secondary: "bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900",
    outline: "border border-white/15 bg-white/50 text-slate-900 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-white",
    ghost: "bg-transparent text-slate-900 hover:bg-slate-900/5 dark:text-white dark:hover:bg-white/10",
    destructive: "bg-rose-600 text-white hover:bg-rose-500"
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    default: "h-11 px-4",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10 p-0"
  };

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
}
