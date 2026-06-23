"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type Accent = "blue" | "emerald" | "amber" | "rose" | "purple";

export const accentStyles: Record<Accent, { softBg: string; text: string; border: string }> = {
  blue: {
    softBg: "bg-blue-50 dark:bg-blue-500/10",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200/80 dark:border-blue-500/20",
  },
  emerald: {
    softBg: "bg-emerald-50 dark:bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200/80 dark:border-emerald-500/20",
  },
  amber: {
    softBg: "bg-amber-50 dark:bg-amber-500/10",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200/80 dark:border-amber-500/20",
  },
  rose: {
    softBg: "bg-rose-50 dark:bg-rose-500/10",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200/80 dark:border-rose-500/20",
  },
  purple: {
    softBg: "bg-purple-50 dark:bg-purple-500/10",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-200/80 dark:border-purple-500/20",
  },
};

interface CardProps {
  className?: string;
  children: React.ReactNode;
  accent?: Accent;
  delay?: number;
}

export function Card({ className, children, accent, delay = 0 }: CardProps) {
  const content = (
    <div
      className={cn(
        "rounded-3xl border bg-white/70 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:bg-slate-950/50",
        accent ? accentStyles[accent].border : "border-white/14",
        className
      )}
    >
      {children}
    </div>
  );

  if (delay > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export function CardHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mb-4 flex items-start justify-between gap-4", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={cn("font-heading text-xl font-semibold tracking-tight text-slate-900 dark:text-white", className)}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-slate-600 dark:text-slate-300", className)}>{children}</p>;
}

export function CardContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("space-y-4", className)}>{children}</div>;
}

export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5 pl-1.5">
      <h3 className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h3>
      {description ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p> : null}
    </div>
  );
}

export function TrendBadge({ growth, trend }: { growth: string; trend: "up" | "down" }) {
  const isUp = trend === "up";
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        isUp
          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
          : "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
      )}
    >
      <Icon className="h-3 w-3" />
      {growth}
    </span>
  );
}

interface SegmentedOption {
  label: string;
  value: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80",
        className
      )}
      role="tablist"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-slate-200 dark:border-slate-800", className)} />;
}
