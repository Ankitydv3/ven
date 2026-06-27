import Image from "next/image";

export function PortalImagePanel() {
  return (
    <div className="relative h-full min-h-screen w-full lg:h-screen">
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
            "linear-gradient(to right, rgba(6,6,8,0.35) 0%, transparent 50%), linear-gradient(to top, rgba(6,6,8,0.5) 0%, transparent 60%)",
        }}
      />

     

     
    </div>
  );
}