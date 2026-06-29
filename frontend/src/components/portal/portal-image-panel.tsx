import Image from "next/image";

export function PortalImagePanel() {
  return (
    <div className="relative h-full w-full">
      <Image
        src="/web-site-4-1.png"
        alt="Portal visual"
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
        className="object-cover object-center"
      />

      {/* Gradient overlay — subtle on mobile, richer on desktop */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(6,6,8,0.35) 0%, transparent 50%), linear-gradient(to top, rgba(6,6,8,0.6) 0%, transparent 60%)",
        }}
      />

      {/* Bottom fade into the form panel on mobile */}
      <div
        className="absolute bottom-0 left-0 right-0 h-10 lg:hidden"
        style={{
          background: "linear-gradient(to bottom, transparent, rgba(2,29,56,0.9))",
        }}
      />
    </div>
  );
}