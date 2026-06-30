"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { FilePlus, Loader2, LogIn, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalImagePanel } from "@/components/portal/portal-image-panel";
import { LoginFields } from "@/components/portal/login-fields";

const TrackPanel = dynamic(
  () => import("@/components/portal/track-panel").then((mod) => mod.TrackPanel),
  {
    loading: () => (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    ),
  }
);

const ComplaintRegistrationForm = dynamic(
  () =>
    import("@/components/forms/complaint-registration-form").then(
      (mod) => mod.ComplaintRegistrationForm
    ),
  {
    loading: () => (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-white/40" />
      </div>
    ),
  }
);

export type PortalTab = "login" | "track" | "complaint";

const tabs: { id: PortalTab; label: string; icon: typeof LogIn }[] = [
  { id: "login", label: "Login", icon: LogIn },
  { id: "track", label: "Track", icon: ScanSearch },
  { id: "complaint", label: "Complaint", icon: FilePlus },
];

const tabMeta: Record<PortalTab, { eyebrow: string; title: string; description: string }> = {
  login: {
    eyebrow: "Portal access",
    title: "Sign in",
    description: "Welcome",
  },
  track: {
    eyebrow: "Status lookup",
    title: "Track complaint",
    description: "Enter your complaint ID to view real-time status updates.",
  },
  complaint: {
    eyebrow: "New request",
    title: "Register complaint",
    description: "Raise a Complaint in 60 Seconds",
  },
};

function FloatingBubbles() {
  const bubbles = [
    { style: { top: "12%", left: "8%", width: 6, height: 6, animationDelay: "0s", animationDuration: "4s" } },
    { style: { top: "35%", left: "72%", width: 4, height: 4, animationDelay: "1s", animationDuration: "5s" } },
    { style: { top: "58%", left: "22%", width: 8, height: 8, animationDelay: "0.5s", animationDuration: "3.5s" } },
    { style: { top: "80%", left: "65%", width: 5, height: 5, animationDelay: "2s", animationDuration: "4.5s" } },
  ];

  return (
    <>
      {bubbles.map((b, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full animate-bounce motion-reduce:animate-none"
          style={{
            ...b.style,
            background: "rgba(133,183,235,0.25)",
            boxShadow: "0 0 10px 2px rgba(55,138,221,0.3)",
          }}
        />
      ))}
    </>
  );
}

function parseTab(value: string | null): PortalTab {
  if (value === "track" || value === "complaint") return value;
  return "login";
}

export function PortalScreen() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<PortalTab>("login");

  useEffect(() => {
    setActiveTab(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const meta = tabMeta[activeTab];

  return (
    /*
     * Root: full viewport, no overflow.
     *
     * Mobile  → single column, flex-col:
     *   - Image strip:  h-[35dvh]  (35% of viewport height, fixed)
     *   - Form panel:   flex-1, overflow-y-auto  (scrolls inside)
     *
     * Desktop → two-column grid, each column = 100dvh, no outer scroll.
     */
    <div
      className={cn(
        "h-dvh w-full overflow-hidden bg-[#020a17]",
        // mobile: stack vertically
        "flex flex-col",
        // desktop: side-by-side grid
        "lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,620px)] lg:flex-none"
      )}
    >
      {/* ── LEFT / TOP: hero image ─────────────────────────────────────────── */}
      {/*
       * Mobile : h-[35dvh], full width, shrink-0 so it never compresses
       * Desktop: full column height (set by the grid row = 100dvh)
       */}
      <div className="relative h-[35dvh] w-full shrink-0 lg:h-dvh">
        <PortalImagePanel />

        {/* Desktop-only right-edge gradient bleeding into form panel */}
        <div
          className="pointer-events-none absolute inset-0 hidden lg:block"
          style={{
            background:
              "linear-gradient(to right, rgba(2,29,56,0.15) 0%, rgba(2,29,56,0.45) 100%)",
          }}
        />
      </div>

      {/* ── RIGHT / BOTTOM: form panel ────────────────────────────────────── */}
      {/*
       * Mobile : flex-1 so it fills the remaining 65dvh; overflow-hidden so
       *          its inner scroll container is the only scrollable thing.
       * Desktop: h-dvh, fixed column width.
       */}
      <div
        className={cn(
          "relative flex flex-col border-white/[0.06] bg-[#021D38]/90",
          // mobile
          "h-full flex-1 overflow-hidden",
          // desktop
          "lg:h-dvh lg:flex-none lg:border-l"
        )}
      >
        {/* Ambient glows — decorative only */}
        <div
          className="pointer-events-none absolute -top-32 -right-20 h-80 w-80 rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #378ADD, transparent)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #185FA5, transparent)" }}
        />
        <FloatingBubbles />

        {/*
         * Inner layout: z-10, flex-col, full height.
         * Outer padding is shrink-0; the card below holds the scrollable area.
         */}
        <div className="relative z-10 flex h-full flex-col px-4 py-5 sm:px-6 sm:py-6 lg:py-10">

          {/* Tab bar — never scrolls */}
          <div className="mb-4 flex shrink-0 flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#185FA5] text-white shadow-[0_8px_24px_-8px_rgba(24,95,165,0.8)]"
                      : "border border-white/[0.08] bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/*
           * Card: flex-col, flex-1 so it fills remaining height.
           * The inner scroll wrapper (overflow-y-auto) is the ONLY place that scrolls.
           */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-[#021D38]/85 shadow-[0_20px_60px_-24px_rgba(0,0,0,0.65)] backdrop-blur-2xl sm:rounded-3xl">

            {/* Card header — shrink-0 so it stays visible */}
            <div className="shrink-0 px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5 lg:px-7 lg:pt-7">
              <p
                className="mb-1 text-[10px] font-medium uppercase tracking-[0.28em]"
                style={{ color: "rgba(133,183,235,0.65)" }}
              >
                {meta.eyebrow}
              </p>
              <h1
                className="mb-1 text-xl font-light leading-tight tracking-tight text-white sm:text-2xl md:text-3xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {meta.title}
              </h1>
              <p className="text-xs font-light leading-relaxed text-white/50 sm:text-sm">
                {meta.description}
              </p>
            </div>

            {/* Divider */}
            <div className="mx-4 shrink-0 border-t border-white/[0.06] sm:mx-6 lg:mx-7" />

            {/* Scrollable form area */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 lg:px-7 lg:py-6">
              {activeTab === "login" && <LoginFields />}
              {activeTab === "track" && <TrackPanel />}
              {activeTab === "complaint" && (
                <ComplaintRegistrationForm variant="portal" source="WEBSITE" />
              )}
            </div>
          </div>

          {/* Status indicator — shrink-0, always visible at bottom */}
          <div className="mt-3 flex shrink-0 items-center gap-2 text-[11px] text-white/25">
            <span
              className="block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "#378ADD", boxShadow: "0 0 6px #378ADD" }}
            />
            System online
          </div>
        </div>
      </div>
    </div>
  );
}