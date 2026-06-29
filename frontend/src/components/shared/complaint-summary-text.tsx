import { splitComplaintSummary } from "@/lib/complaint-summary";
import { wrapTextClass } from "@/lib/responsive-text";
import { cn } from "@/lib/utils";

export function ComplaintSummaryText({
  description,
  location,
  className,
}: {
  description?: string;
  location?: string;
  className?: string;
}) {
  const lines = splitComplaintSummary(description, location);

  return (
    <div className={cn("space-y-1 text-xs leading-relaxed text-slate-400", wrapTextClass, className)}>
      {lines.map((line, index) => (
        <p key={`${index}-${line.slice(0, 24)}`}>{line}</p>
      ))}
    </div>
  );
}
