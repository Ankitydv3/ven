import * as React from "react";
import { cn } from "@/lib/utils";

export function Label({
  children,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200", className)}
      {...props}
    >
      {children}
    </label>
  );
}