"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { FeedbackPromptProvider } from "@/components/feedback/FeedbackPromptProvider";
import { createQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <FeedbackPromptProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </FeedbackPromptProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}