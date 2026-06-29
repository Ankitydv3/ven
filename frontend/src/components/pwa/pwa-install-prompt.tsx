"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || sessionStorage.getItem(DISMISS_KEY) === "1") return;

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos() && !isStandalone()) {
      setShowIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") dismiss();
    setDeferredPrompt(null);
  }, [deferredPrompt, dismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install app"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl border border-white/10 bg-[#042C53]/95 p-4 text-white shadow-2xl backdrop-blur-md sm:inset-x-auto sm:right-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#185FA5]">
          <Download className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Install Complaint Flow OS</p>
          <p className="mt-1 text-sm text-white/75">
            {showIosHint
              ? "Tap Share, then Add to Home Screen for quick access like a native app."
              : "Add this app to your home screen for faster access and offline support."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {!showIosHint && deferredPrompt ? (
              <Button size="sm" onClick={install} className="bg-[#378ADD] hover:bg-[#185FA5]">
                Install app
              </Button>
            ) : showIosHint ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-xs text-white/90">
                <Share className="size-3.5" aria-hidden />
                Share → Add to Home Screen
              </span>
            ) : null}
            <Button size="sm" variant="ghost" onClick={dismiss} className="text-white/80 hover:bg-white/10 hover:text-white">
              Not now
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss install prompt"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
