import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020a17] px-6 text-center text-white">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[#185FA5]/30">
        <WifiOff className="size-8 text-[#85B7EB]" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
      <p className="max-w-sm text-sm text-white/70">
        Complaint Flow OS needs a connection for live updates. Cached pages may still be available.
      </p>
      <Link
        href="/"
        className="inline-flex h-9 items-center justify-center rounded-md bg-[#378ADD] px-4 text-sm font-medium text-white transition hover:bg-[#185FA5]"
      >
        Try again
      </Link>
    </main>
  );
}
