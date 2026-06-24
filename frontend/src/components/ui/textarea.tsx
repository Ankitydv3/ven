import type { TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-28 w-full rounded-2xl border border-white/12 bg-white/75 px-4 py-3 text-sm shadow-sm outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 dark:bg-app/80 dark:text-white",
        className
      )}
      {...props}
    />
  );
}