import Image from "next/image";

export function PortalImagePanel() {
  return (
    <div className="relative h-screen w-full md:h-auto md:w-1/2">
      <Image
        src="/web-site-4-1.png"
        alt="Portal visual"
        fill
        sizes="(max-width: 768px) 100vw, 50vw"
        priority
        className="object-cover object-center"
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(6,6,8,0.35) 0%, transparent 50%), linear-gradient(to top, rgba(6,6,8,0.5) 0%, transparent 60%)",
        }}
      />

      <div className="absolute bottom-8 left-8 z-10">
        <p
          className="mb-1 text-[10px] uppercase tracking-[0.28em]"
          style={{ color: "rgba(133,183,235,0.7)" }}
        >
          CMS Portal
        </p>
        <h2
          className="text-3xl font-light leading-tight text-white"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
        >
          Manage every<br />
          <em className="italic" style={{ color: "#85B7EB" }}>complaint</em> with clarity.
        </h2>
      </div>

      <div
        className="absolute bottom-8 right-8 z-10 flex gap-6 rounded-2xl px-5 py-4"
        style={{
          background: "rgba(0,0,0,0.45)",
          border: "0.5px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(12px)",
        }}
      >
        {[
          { value: "2.4k", label: "Resolved" },
          { value: "98%", label: "Rate" },
          { value: "4.2h", label: "Avg. response" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p
              className="text-xl font-light leading-none text-white"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              {s.value}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
