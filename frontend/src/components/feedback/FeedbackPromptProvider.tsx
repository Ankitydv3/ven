"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CustomerRatingDialog } from "@/components/feedback/CustomerRatingDialog";
import type { FeedbackTarget } from "@/services/feedback";

interface FeedbackPromptContextValue {
  openFeedback: (target: FeedbackTarget) => void;
}

const FeedbackPromptContext = createContext<FeedbackPromptContextValue | null>(null);

export function FeedbackPromptProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<FeedbackTarget | null>(null);

  const openFeedback = useCallback((nextTarget: FeedbackTarget) => {
    setTarget(nextTarget);
    setOpen(true);
  }, []);

  return (
    <FeedbackPromptContext.Provider value={{ openFeedback }}>
      {children}
      {open && (
        <CustomerRatingDialog open={open} onOpenChange={setOpen} target={target} />
      )}
    </FeedbackPromptContext.Provider>
  );
}

export function useFeedbackPrompt() {
  const context = useContext(FeedbackPromptContext);
  if (!context) {
    return { openFeedback: () => {} };
  }
  return context;
}
