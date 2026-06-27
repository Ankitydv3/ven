/** Relative paths are proxied to the backend via next.config rewrites. */
export function resolveAvatarUrl(avatarUrl?: string | null) {
  if (!avatarUrl?.trim()) return null;
  if (avatarUrl.startsWith("data:")) return avatarUrl;

  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    try {
      const parsed = new URL(avatarUrl);
      if (parsed.pathname.startsWith("/uploads/")) {
        return parsed.pathname;
      }
    } catch {
      return avatarUrl;
    }
    return avatarUrl;
  }

  return avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
}

export function getUserInitials(name?: string) {
  if (!name?.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
