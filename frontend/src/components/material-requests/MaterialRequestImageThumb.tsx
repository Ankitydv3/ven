"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageOff, Loader2 } from "lucide-react";
import { fetchMaterialRequestImage } from "@/services/material-requests";
import { cn } from "@/lib/utils";

export function MaterialRequestImageThumb({
  id,
  hasImage,
  imageUrl,
  alt,
  className,
  size = "sm",
  loadImmediately = false,
  detail = false,
}: {
  id: string;
  hasImage?: boolean;
  imageUrl?: string;
  alt: string;
  className?: string;
  size?: "sm" | "md";
  loadImmediately?: boolean;
  detail?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(Boolean(imageUrl) || loadImmediately);
  const dims = detail
    ? "max-h-48 w-full object-contain"
    : size === "sm"
      ? "h-10 w-10 sm:h-12 sm:w-12"
      : "h-16 w-16";

  useEffect(() => {
    if (imageUrl || !hasImage) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasImage, imageUrl]);

  const { data, isLoading } = useQuery({
    queryKey: ["material-request-image", id],
    queryFn: () => fetchMaterialRequestImage(id),
    enabled: visible && hasImage && !imageUrl,
    staleTime: 10 * 60_000,
  });

  const resolvedUrl = imageUrl || data;

  if (!hasImage && !resolvedUrl) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  if (!resolvedUrl) {
    return (
      <div
        ref={ref}
        className={cn(
          dims,
          "flex shrink-0 items-center justify-center rounded-none border border-white/10 bg-white/[0.03]",
          className
        )}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
        ) : (
          <ImageOff className="h-4 w-4 text-slate-500" />
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("shrink-0", detail && "w-full", className)}>
      <img
        src={resolvedUrl}
        alt={alt}
        className={cn(
          detail ? dims : cn(dims, "rounded-none border border-white/10 object-cover")
        )}
      />
    </div>
  );
}
