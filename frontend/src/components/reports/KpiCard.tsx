"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCardProps {
  label: string;
  value: string | number;
  growth: string;
  trend: "up" | "down";
  icon: LucideIcon;
  color: "blue" | "green" | "orange" | "red";
  index?: number;
}

const colorMap = {
  blue: {
    icon: "text-[#3B82F6]",
    bg: "bg-[#3B82F6]/15",
    glow: "shadow-[#3B82F6]/10",
  },
  green: {
    icon: "text-[#22C55E]",
    bg: "bg-[#22C55E]/15",
    glow: "shadow-[#22C55E]/10",
  },
  orange: {
    icon: "text-[#F59E0B]",
    bg: "bg-[#F59E0B]/15",
    glow: "shadow-[#F59E0B]/10",
  },
  red: {
    icon: "text-[#EF4444]",
    bg: "bg-[#EF4444]/15",
    glow: "shadow-[#EF4444]/10",
  },
};

export function KpiCard({ label, value, growth, trend, icon: Icon, color, index = 0 }: KpiCardProps) {
  const styles = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "rounded-2xl border p-5 backdrop-blur-xl transition-shadow duration-300",
        "border-slate-200/80 bg-white/90 shadow-lg hover:shadow-xl",
        "dark:border-[rgba(59,130,246,0.15)] dark:bg-[rgba(10,20,35,0.95)] dark:shadow-[#3B82F6]/10",
        styles.glow
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn("rounded-xl p-2.5", styles.bg)}>
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold">
          {trend === "up" ? (
            <TrendingUp className="h-3.5 w-3.5 text-[#22C55E]" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-[#EF4444]" />
          )}
          <span className={trend === "up" ? "text-[#22C55E]" : "text-[#EF4444]"}>
            {growth}
          </span>
        </div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-white">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="mt-1 text-sm font-medium text-[#94A3B8]">{label}</p>
      </div>
    </motion.div>
  );
}
