import type { FilterQuery } from "mongoose";

export const COMPLAINT_ISSUE_TYPES = [
  "Locking issue",
  "Leakage issue",
  "Difficulty in moving",
  "Alignment issue",
  "Other",
] as const;

export type ComplaintIssueType = (typeof COMPLAINT_ISSUE_TYPES)[number];

const SPECIFIC_ISSUE_TYPES = COMPLAINT_ISSUE_TYPES.filter((issue) => issue !== "Other");

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function issueTitleRegex(issue: string) {
  return new RegExp(`^${escapeRegex(issue)}$`, "i");
}

export function displayIssueLabel(issue: ComplaintIssueType) {
  return issue === "Other" ? "Others" : issue;
}

export function buildIssueTitleFilter(issue: ComplaintIssueType): FilterQuery<Record<string, unknown>> {
  if (issue === "Other") {
    return {
      $nor: SPECIFIC_ISSUE_TYPES.map((type) => ({ title: issueTitleRegex(type) })),
    };
  }

  return { title: issueTitleRegex(issue) };
}
