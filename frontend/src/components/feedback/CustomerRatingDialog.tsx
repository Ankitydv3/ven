"use client";

import { useState, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitFeedbackForTarget, type FeedbackTarget } from "@/services/feedback";
import { getApiErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface CustomerRatingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: FeedbackTarget | null;
  onSubmitted?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: "Very Poor",
  2: "Poor",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

export function CustomerRatingDialog({
  open,
  onOpenChange,
  target,
  onSubmitted,
}: CustomerRatingDialogProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeRating = hoverRating || rating;

  useEffect(() => {
    if (!open) {
      setRating(0);
      setHoverRating(0);
      setComment("");
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!target) return;
    if (rating < 1) {
      toast.error("Please select a star rating");
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedbackForTarget(target, { rating, comment: comment.trim() || undefined });
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast.success("Customer feedback saved!");
      onOpenChange(false);
      target.onSubmitted?.();
      onSubmitted?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to submit feedback"));
    } finally {
      setSubmitting(false);
    }
  };

  const referenceLabel = target?.label || target?.complaintId || "this task";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800/60 bg-slate-900/95 text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Customer Feedback</DialogTitle>
          <DialogDescription className="text-slate-400">
            {target?.customerName
              ? `Task completed for ${target.customerName}. Please collect their rating for ${referenceLabel}.`
              : `Task completed. Please collect the customer's rating for ${referenceLabel}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="rounded-lg p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} stars`}
                >
                  <Star
                    className={cn(
                      "h-9 w-9 transition-colors",
                      star <= activeRating
                        ? "fill-amber-400 text-amber-400"
                        : "text-slate-600"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-medium text-blue-400">
              {activeRating > 0 ? RATING_LABELS[activeRating] : "Select customer rating"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-comment" className="text-slate-300">
              Customer comments (optional)
            </Label>
            <Textarea
              id="feedback-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What did the customer say about the service?"
              className="border-slate-700/50 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
            disabled={submitting}
          >
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export type { FeedbackTarget };
