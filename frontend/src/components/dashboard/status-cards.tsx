import { AlertCircle, Clock3, ListChecks, SplitSquareHorizontal, CircleCheckBig } from "lucide-react";
import { Card } from "@/components/ui/card";

const icons = {
  total: ListChecks,
  assigned: SplitSquareHorizontal,
  inProgress: Clock3,
  completed: CircleCheckBig,
  pending: AlertCircle
};

export function StatusCards({ data }: { data: { totalComplaints: number; pending: number; assigned: number; inProgress: number; completed: number } }) {
  const cards = [
    { label: "Total Complaints", value: data.totalComplaints, icon: icons.total, gradient: "from-slate-900 to-slate-700" },
    { label: "Total Assigned", value: data.assigned, icon: icons.assigned, gradient: "from-teal-600 to-cyan-500" },
    { label: "Total In Progress", value: data.inProgress, icon: icons.inProgress, gradient: "from-orange-600 to-amber-500" },
    { label: "Total Completed", value: data.completed, icon: icons.completed, gradient: "from-emerald-600 to-teal-500" },
    { label: "Total Pending", value: data.pending, icon: icons.pending, gradient: "from-rose-600 to-pink-500" }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label} className="group overflow-hidden">
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-lg transition duration-300 group-hover:scale-105`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{card.label}</p>
            <p className="mt-2 font-heading text-3xl font-semibold text-slate-950 dark:text-white">{card.value}</p>
          </Card>
        );
      })}
    </div>
  );
}