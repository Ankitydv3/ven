"use client";

import { type LucideIcon } from "lucide-react";
import { Card, TrendBadge, accentStyles, type Accent } from "@/components/ui/card";

export interface KpiCardProps {
  label: string;
  value: string | number;
  growth: string;
  trend: "up" | "down";
  icon: LucideIcon;
  color: "blue" | "green" | "orange" | "red";
  index?: number;
}

// Map the legacy color prop onto the shared accent palette so callers
// don't need to change (ReportsPage still passes "green" / "red" / etc).
const colorToAccent: Record<KpiCardProps["color"], Accent> = {
  blue: "blue",
  green: "emerald",
  orange: "amber",
  red: "rose",
};

export function KpiCard({ label, value, growth, trend, icon: Icon, color, index = 0 }: KpiCardProps) {
  const accent = colorToAccent[color];
  const styles = accentStyles[accent];

  return (
    <Card accent={accent} delay={index * 0.05} className="flex flex-col gap-4">
      <div className="flex items-center justify-between pl-1.5">
        <span
          className={
            "inline-flex h-9 w-9 items-center justify-center rounded-xl " + styles.softBg
          }
        >
          <Icon className={"h-[18px] w-[18px] " + styles.text} />
        </span>
        <TrendBadge growth={growth} trend={trend} />
      </div>

      <div className="pl-1.5">
        <p className="text-[28px] font-semibold leading-tight tracking-tight tabular-nums text-slate-900 dark:text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </Card>
  );
}