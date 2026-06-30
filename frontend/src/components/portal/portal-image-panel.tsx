import Image from "next/image";

export function PortalImagePanel() {
  return (
    <div className="fixed inset-0 z-0 h-dvh w-full">
      <Image
        src="/web-site-4-1.png"
        alt="Portal visual"
        fill
        sizes="100vw"
        priority
        className="object-cover object-center"
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(2,10,23,0.15) 0%, rgba(2,10,23,0.55) 60%, rgba(2,10,23,0.75) 100%)",
        }}
      />
    </div>
  );
}