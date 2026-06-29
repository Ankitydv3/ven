/** Safe wrapping for long addresses, IDs, and unbroken strings on mobile. */
export const wrapTextClass = "min-w-0 break-words [overflow-wrap:anywhere]";

/** Modal width that stays inside the viewport on phones. */
export const modalViewportClass =
  "w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:w-full";

/** List card shell used in dashboard / KPI detail modals. */
export const summaryListCardClass =
  "min-w-0 overflow-hidden rounded-2xl border border-white/5 bg-white/[0.03] p-4 transition-all hover:border-white/10 hover:bg-white/[0.05]";
