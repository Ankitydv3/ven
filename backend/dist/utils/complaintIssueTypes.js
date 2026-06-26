"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.COMPLAINT_ISSUE_TYPES = void 0;
exports.issueTitleRegex = issueTitleRegex;
exports.displayIssueLabel = displayIssueLabel;
exports.buildIssueTitleFilter = buildIssueTitleFilter;
exports.COMPLAINT_ISSUE_TYPES = [
    "Locking issue",
    "Leakage issue",
    "Difficulty in moving",
    "Alignment issue",
    "Other",
];
const SPECIFIC_ISSUE_TYPES = exports.COMPLAINT_ISSUE_TYPES.filter((issue) => issue !== "Other");
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function issueTitleRegex(issue) {
    return new RegExp(`^${escapeRegex(issue)}$`, "i");
}
function displayIssueLabel(issue) {
    return issue === "Other" ? "Others" : issue;
}
function buildIssueTitleFilter(issue) {
    if (issue === "Other") {
        return {
            $nor: SPECIFIC_ISSUE_TYPES.map((type) => ({ title: issueTitleRegex(type) })),
        };
    }
    return { title: issueTitleRegex(issue) };
}
