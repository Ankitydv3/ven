import { AlertCircle, Clock3, ListChecks, SplitSquareHorizontal, CircleCheckBig, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

const icons: Record<string, LucideIcon> = {
  total: ListChecks,
  assigned: SplitSquareHorizontal,
  inProgress: Clock3,
  completed: CircleCheckBig,
  pending: AlertCircle
};

export function StatusCards({
  data
}: {
  data: { totalComplaints: number; pending: number; assigned: number; inProgress: number; completed: number };
}) {
  const cards = [
    {
      label: "Total Complaints",
      value: data.totalComplaints,
      icon: icons.total,
      accent: "text-[#04342C] dark:text-white",
      iconClass: "bg-[#04342C]/[0.06] text-[#04342C] dark:bg-white/[0.06] dark:text-white"
    },
    {
      label: "Total Assigned",
      value: data.assigned,
      icon: icons.assigned,
      accent: "text-[#2F6B63] dark:text-[#7BE3CF]",
      iconClass: "bg-[#4F9B8C]/[0.12] text-[#2F6B63] dark:bg-[#7BE3CF]/[0.12] dark:text-[#7BE3CF]"
    },
    {
      label: "Total In Progress",
      value: data.inProgress,
      icon: icons.inProgress,
      accent: "text-[#B5740F] dark:text-[#EF9F27]",
      iconClass: "bg-[#EF9F27]/[0.12] text-[#B5740F] dark:bg-[#EF9F27]/[0.12] dark:text-[#EF9F27]"
    },
    {
      label: "Total Completed",
      value: data.completed,
      icon: icons.completed,
      accent: "text-[#2F6B63] dark:text-[#7BE3CF]",
      iconClass: "bg-[#4F9B8C]/[0.12] text-[#2F6B63] dark:bg-[#7BE3CF]/[0.12] dark:text-[#7BE3CF]"
    },
    {
      label: "Total Pending",
      value: data.pending,
      icon: icons.pending,
      accent: "text-[#B3322E] dark:text-[#E24B4A]",
      iconClass: "bg-[#E24B4A]/[0.12] text-[#B3322E] dark:bg-[#E24B4A]/[0.12] dark:text-[#E24B4A]"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.label}
            className="group relative overflow-hidden border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#020816] shadow-none transition-all hover:shadow-[0_8px_30px_-12px_rgba(47,107,99,0.25)] dark:hover:shadow-[0_8px_30px_-12px_rgba(123,227,207,0.15)]"
          >
            <div className="p-5">
              <div
                className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${card.iconClass} transition-transform duration-300 group-hover:scale-105`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium tracking-wide uppercase text-slate-400 dark:text-white/40">
                {card.label}
              </p>
              <p className={`mt-2 font-serif text-3xl font-medium ${card.accent}`}>{card.value}</p>
            </div>
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br from-[#4F9B8C]/[0.06] to-transparent dark:from-[#7BE3CF]/[0.05]" />
          </Card>
        );
      })}
    </div>
  );
}