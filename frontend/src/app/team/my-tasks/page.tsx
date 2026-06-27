"use client";

import { Suspense } from "react";
import { MyTasksPage } from "@/components/my-tasks/MyTasksPage";
import { Loader2 } from "lucide-react";

export default function TeamMyTasksPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-app"><Loader2 className="h-8 w-8 animate-spin text-blue-400" /></div>}>
      <MyTasksPage role="team" />
    </Suspense>
  );
}
