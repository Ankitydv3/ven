"use client";

import { cn } from "@/lib/utils";

export function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        className={cn("w-full max-w-xl rounded-[28px] border border-white/12 bg-white p-5 shadow-2xl dark:bg-slate-950")}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h3 className="font-heading text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
          <button className="rounded-full px-3 py-1 text-sm text-slate-500 transition hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose} type="button">
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}