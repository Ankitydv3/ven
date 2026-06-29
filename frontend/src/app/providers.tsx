"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { FeedbackPromptProvider } from "@/components/feedback/FeedbackPromptProvider";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { createQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <FeedbackPromptProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
        <PwaRegister />
        <PwaInstallPrompt />
      </FeedbackPromptProvider>
    </QueryClientProvider>
  );
}