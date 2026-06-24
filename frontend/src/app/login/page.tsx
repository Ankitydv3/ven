import { Suspense } from "react";
import { PortalScreen } from "@/components/portal/portal-screen";

export default function LoginPage() {
  return (
    <main>
      <Suspense fallback={null}>
        <PortalScreen />
      </Suspense>
    </main>
  );
}
