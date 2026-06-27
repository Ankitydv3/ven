"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilePlus, LogIn, ScanSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { PortalImagePanel } from "@/components/portal/portal-image-panel";
import { LoginFields } from "@/components/portal/login-fields";
import { TrackPanel } from "@/components/portal/track-panel";
import { ComplaintRegistrationForm } from "@/components/forms/complaint-registration-form";

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
    description: "Admin and team users are routed to the right dashboard automatically.",
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
    <div className="min-h-screen w-full bg-[#020a17] lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,520px)]">
      {/* Left: hero image */}
      <div className="relative hidden min-h-[240px] lg:block lg:min-h-screen">
        <PortalImagePanel />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgba(2,29,56,0.15) 0%, rgba(2,29,56,0.45) 100%)",
          }}
        />
      </div>

      {/* Right: form panel */}
      <div className="relative flex min-h-screen w-full flex-col border-white/[0.06] bg-[#021D38]/90 lg:border-l lg:min-h-screen">
        <div
          className="pointer-events-none absolute -top-32 -right-20 h-80 w-80 rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #378ADD, transparent)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #185FA5, transparent)" }}
        />
        <FloatingBubbles />

        <div className="relative z-10 flex min-h-screen flex-col px-4 py-6 sm:px-6 sm:py-8 lg:max-h-screen lg:min-h-0 lg:py-10">
          <div className="mb-4 flex flex-wrap gap-2 sm:mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-medium transition-all",
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

          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#021D38]/80 p-4 backdrop-blur-2xl sm:rounded-3xl sm:p-6">
            <div className="mb-3 shrink-0 sm:mb-4">
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
              <p className="text-xs font-light leading-relaxed text-white/50 sm:text-sm">{meta.description}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain pr-1 pb-2">
              {activeTab === "login" && <LoginFields />}
              {activeTab === "track" && <TrackPanel />}
              {activeTab === "complaint" && <ComplaintRegistrationForm variant="portal" source="WEBSITE" />}
            </div>
          </div>

          <div className="mt-4 flex shrink-0 items-center gap-2 text-[11px] text-white/25">
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
