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
<<<<<<< HEAD
=======
    title: "Raise a Complaint",

>>>>>>> b30a355ca82e4f77d0af16f5f8f521b4b450a562
    description: "Raise a Complaint in 60 Seconds",
  },
};

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
    <div className="relative h-dvh w-full overflow-hidden bg-[#020a17]">
      {/* Full-screen background image */}
      <PortalImagePanel />

      {/* Card wrapper — centers on mobile, right-aligned on desktop */}
      <div className="relative z-10 flex h-dvh w-full items-center justify-center px-4 py-6 lg:justify-end lg:px-16">
        <div
          className={cn(
<<<<<<< HEAD
            "flex w-full max-w-[440px] flex-col overflow-hidden rounded-2xl border border-white/[0.09]",
=======
            "flex w-full max-w-[570px] flex-col overflow-hidden rounded-2xl border border-white/[0.09]",
>>>>>>> b30a355ca82e4f77d0af16f5f8f521b4b450a562
            "bg-[#021D38]/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl sm:rounded-3xl"
          )}
          style={{ maxHeight: "calc(100dvh - 3rem)" }}
        >
          {/* Tab bar */}
<<<<<<< HEAD
          <div className="flex shrink-0 flex-wrap gap-2 px-5 pt-5 sm:px-7 sm:pt-7">
=======
          <div className="flex shrink-0 flex-nowrap gap-1.5 px-5 pt-5 sm:gap-2 sm:px-7 sm:pt-7">
>>>>>>> b30a355ca82e4f77d0af16f5f8f521b4b450a562
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-medium transition-all sm:h-10 sm:gap-2 sm:px-4 sm:text-sm",
                    isActive
                      ? "bg-[#185FA5] text-white shadow-[0_8px_24px_-8px_rgba(24,95,165,0.8)]"
                      : "border border-white/[0.08] bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Header */}
          <div className="shrink-0 px-5 pb-3 pt-4 sm:px-7 sm:pb-4 sm:pt-5">
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

          <div className="mx-5 shrink-0 border-t border-white/[0.06] sm:mx-7" />

          {/* Scrollable form area */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5">
            {activeTab === "login" && <LoginFields />}
            {activeTab === "track" && <TrackPanel />}
            {activeTab === "complaint" && (
              <ComplaintRegistrationForm variant="portal" source="WEBSITE" />
            )}
          </div>

          {/* Status indicator */}
<<<<<<< HEAD
          <div className="flex shrink-0 items-center gap-2 px-5 py-3 text-[11px] text-white/25 sm:px-7">
=======
          {/* <div className="flex shrink-0 items-center gap-2 px-5 py-3 text-[11px] text-white/25 sm:px-7">
>>>>>>> b30a355ca82e4f77d0af16f5f8f521b4b450a562
            <span
              className="block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "#378ADD", boxShadow: "0 0 6px #378ADD" }}
            />
            System online
          </div> */}
        </div>
      </div>
    </div>
  );
}