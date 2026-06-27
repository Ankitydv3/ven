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
  const [imageError, setImageError] = useState(false);
  const resolvedUrl = resolveAvatarUrl(avatarUrl);
  const showImage = Boolean(resolvedUrl) && !imageError;

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

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
        getAvatarColor(name),
        className,
        textClassName
      )}
    >
      {getUserInitials(name)}
    </span>
  );
}
