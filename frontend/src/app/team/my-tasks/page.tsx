import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { MyTasksPage } from "@/components/my-tasks/MyTasksPage";

export default function TeamMyTasksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-app">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      }
    >
      <MyTasksPage role="team" />
    </Suspense>
  );
}
