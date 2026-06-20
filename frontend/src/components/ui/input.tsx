import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-white/12 bg-white/75 px-4 text-sm shadow-sm outline-none ring-offset-0 transition focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 dark:bg-slate-950/40 dark:text-white",
        className
      )}
      {...props}
    />
  );
  }
);
