"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { getAvatarColor } from "@/lib/user-constants";
import { getUserInitials, resolveAvatarUrl } from "@/lib/avatar";

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  className?: string;
  textClassName?: string;
}

export function UserAvatar({ name, avatarUrl, className, textClassName }: UserAvatarProps) {
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const showImage = mounted && Boolean(resolvedUrl) && !imageError;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const displayName = mounted ? name : "User";

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedUrl!}
        alt={name}
        className={cn("object-cover", className)}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex items-center justify-center font-semibold",
        getAvatarColor(displayName),
        className,
        textClassName
      )}
    >
      {getUserInitials(displayName)}
    </span>
  );
}
