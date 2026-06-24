import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-2xl border border-white/12 bg-white/75 px-4 text-sm shadow-sm outline-none ring-offset-0 transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 dark:bg-app/80 dark:text-white",
        className
      )}
      {...props}
    />
  );
  }
);
