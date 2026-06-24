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
    description: "Fill out the form and our team will take it from here.",
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
    <div className="flex h-screen w-full overflow-hidden flex-col bg-app md:flex-row">
      {/* Left — tabs + dynamic form */}
      <PortalImagePanel />
      <div className="relative flex w-full flex-col md:h-screen md:w-1/2">
        <div
          className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full opacity-30 blur-[120px]"
          style={{ background: "radial-gradient(circle, #378ADD, transparent)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full opacity-20 blur-[100px]"
          style={{ background: "radial-gradient(circle, #185FA5, transparent)" }}
        />

        <FloatingBubbles />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col px-6 py-8 md:py-12">
          <div className="mb-6 flex flex-wrap gap-2">
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

          <div
            className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-2xl sm:p-8"
          >
            <div className="mb-6 shrink-0">
              <p
                className="mb-1 text-[10px] font-medium uppercase tracking-[0.28em]"
                style={{ color: "rgba(133,183,235,0.65)" }}
              >
                {meta.eyebrow}
              </p>
              <h1
                className="mb-1.5 text-2xl font-light leading-tight tracking-tight text-white sm:text-3xl"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {meta.title}
              </h1>
              <p className="text-sm font-light leading-relaxed text-white/35">{meta.description}</p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pr-1">
              {activeTab === "login" && <LoginFields />}
              {activeTab === "track" && <TrackPanel />}
              {activeTab === "complaint" && <ComplaintRegistrationForm variant="portal" />}
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-white/25">
            <span
              className="block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "#378ADD", boxShadow: "0 0 6px #378ADD" }}
            />
            System online
          </div>
        </div>
      </div>

      {/* Right — fixed image */}
      
    </div>
  );
}
