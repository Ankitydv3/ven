import dynamic from "next/dynamic";

const PortalScreen = dynamic(
  () => import("@/components/portal/portal-screen").then((mod) => mod.PortalScreen),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center bg-[#020a17] text-sm text-white/60">
        Loading portal…
      </div>
    ),
  }
);

export default function Home() {
  return (
    <main className="min-h-screen">
      <PortalScreen />
    </main>
  );
}
