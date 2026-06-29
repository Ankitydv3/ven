/** Split backend complaint description into readable lines. */
export function splitComplaintSummary(description?: string, location?: string): string[] {
  const desc = description?.trim() ?? "";
  const loc = location?.trim() ?? "";

  if (desc.includes(" | ")) {
    return desc
      .split(" | ")
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const lines: string[] = [];
  if (loc) lines.push(loc);
  if (desc && desc !== loc) lines.push(desc);

  return lines.length > 0 ? lines : ["No description provided."];
}
