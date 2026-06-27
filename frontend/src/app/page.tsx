import { Suspense } from "react";
import { PortalScreen } from "@/components/portal/portal-screen";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense
        fallback={
          <div className="flex min-h-screen items-center justify-center bg-[#020a17] text-sm text-white/60">
            Loading portal…
          </div>
        }
      >
        <PortalScreen />
      </Suspense>
    </main>
  );
}
