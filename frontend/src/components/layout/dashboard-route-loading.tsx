import { Loader2 } from "lucide-react";

export function DashboardRouteLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center bg-[#0c0c0c]">
      <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
    </div>
  );
}
