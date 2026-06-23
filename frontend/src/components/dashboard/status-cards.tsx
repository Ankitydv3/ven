"use client";

import { motion } from "framer-motion";
import { AlertCircle, Clock3, ListChecks, SplitSquareHorizontal, CircleCheckBig, TrendingUp, type LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  total: ListChecks,
  assigned: SplitSquareHorizontal,
  inProgress: Clock3,
  completed: CircleCheckBig,
  pending: AlertCircle,
};

const cards = [
  {
    key: "totalComplaints",
    label: "Total Complaints",
    iconKey: "total",
    gradient: "from-blue-600 to-blue-400",
    glow: "shadow-blue-500/20",
    ring: "ring-blue-500/30",
    accent: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 dark:bg-blue-500/15",
    bar: "bg-blue-500",
    trend: "+4.2%",
  },
  {
    key: "assigned",
    label: "Assigned",
    iconKey: "assigned",
    gradient: "from-violet-600 to-violet-400",
    glow: "shadow-violet-500/20",
    ring: "ring-violet-500/30",
    accent: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-500/10 dark:bg-violet-500/15",
    bar: "bg-violet-500",
    trend: "+2.1%",
  },
  {
    key: "inProgress",
    label: "In Progress",
    iconKey: "inProgress",
    gradient: "from-cyan-600 to-cyan-400",
    glow: "shadow-cyan-500/20",
    ring: "ring-cyan-500/30",
    accent: "text-cyan-600 dark:text-cyan-400",
    bg: "bg-cyan-500/10 dark:bg-cyan-500/15",
    bar: "bg-cyan-500",
    trend: "+1.8%",
  },
  {
    key: "completed",
    label: "Completed",
    iconKey: "completed",
    gradient: "from-emerald-600 to-emerald-400",
    glow: "shadow-emerald-500/20",
    ring: "ring-emerald-500/30",
    accent: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    bar: "bg-emerald-500",
    trend: "+8.5%",
  },
  {
    key: "pending",
    label: "Pending",
    iconKey: "pending",
    gradient: "from-rose-600 to-rose-400",
    glow: "shadow-rose-500/20",
    ring: "ring-rose-500/30",
    accent: "text-rose-600 dark:text-rose-400",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    bar: "bg-rose-500",
    trend: "-3.1%",
  },
];

interface StatusCardsProps {
  data: {
    totalComplaints: number;
    pending: number;
    assigned: number;
    inProgress: number;
    completed: number;
  };
}

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export function StatusCards({ data }: StatusCardsProps) {
  const total = data.totalComplaints || 1;

  return (
    <motion.div
      className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {cards.map((card) => {
        const Icon = icons[card.iconKey];
        const value = data[card.key as keyof typeof data] as number;
        const pct = Math.round((value / total) * 100);
        const isPositive = card.trend.startsWith("+");

        return (
          <motion.div
            key={card.key}
            variants={cardVariants}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            className={`
              group relative overflow-hidden rounded-2xl
              border border-slate-200/80 dark:border-white/[0.07]
              bg-white dark:bg-[#0A0F1E]
              shadow-sm hover:shadow-xl ${card.glow}
              transition-shadow duration-300 cursor-default
            `}
          >
            {/* Ambient glow orb */}
            <div
              className={`
                pointer-events-none absolute -top-8 -right-8
                h-28 w-28 rounded-full
                bg-gradient-to-br ${card.gradient} opacity-10
                group-hover:opacity-20 transition-opacity duration-500
                blur-2xl
              `}
            />

            <div className="relative p-5 flex flex-col gap-4">
              {/* Top row: icon + trend */}
              <div className="flex items-start justify-between">
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.bg} ring-1 ${card.ring}`}>
                  <Icon className={`h-5 w-5 ${card.accent}`} />
                </div>
                <span
                  className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-full ${
                    isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <TrendingUp
                    className={`h-3 w-3 ${isPositive ? "" : "rotate-180"}`}
                  />
                  {card.trend}
                </span>
              </div>

              {/* Value */}
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                  {card.label}
                </p>
                <CountUp
                  target={value}
                  className={`font-bold text-3xl leading-none ${card.accent}`}
                />
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  <span>Share of total</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-white/[0.06] overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${card.bar}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.9, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* Animated counter */
function CountUp({ target, className }: { target: number; className?: string }) {
  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {target.toLocaleString()}
    </motion.span>
  );
}