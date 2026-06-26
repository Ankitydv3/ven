"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PRIORITY_RANK = void 0;
exports.toDateKey = toDateKey;
exports.parseDateKey = parseDateKey;
exports.dateKeyFromValue = dateKeyFromValue;
exports.startOfDateKey = startOfDateKey;
exports.endOfDateKey = endOfDateKey;
exports.todayDateKey = todayDateKey;
exports.isDateKeyBefore = isDateKeyBefore;
exports.dominantPriority = dominantPriority;
const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Local calendar date as YYYY-MM-DD (no UTC shift). */
function toDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}
function parseDateKey(key) {
    const match = DATE_KEY_RE.exec(key);
    if (!match) {
        throw new Error(`Invalid date key: ${key}`);
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
}
function dateKeyFromValue(value) {
    if (value instanceof Date) {
        return toDateKey(value);
    }
    if (DATE_KEY_RE.test(value)) {
        return value;
    }
    return toDateKey(new Date(value));
}
function startOfDateKey(key) {
    const match = DATE_KEY_RE.exec(key);
    if (!match)
        return new Date(key);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0, 0);
}
function endOfDateKey(key) {
    const match = DATE_KEY_RE.exec(key);
    if (!match)
        return new Date(key);
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 23, 59, 59, 999);
}
function todayDateKey() {
    return toDateKey(new Date());
}
function isDateKeyBefore(a, b) {
    return a < b;
}
exports.PRIORITY_RANK = {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4,
};
function dominantPriority(counts) {
    let best = "Medium";
    let bestRank = 0;
    for (const [priority, count] of Object.entries(counts)) {
        if (count > 0 && (exports.PRIORITY_RANK[priority] ?? 0) >= bestRank) {
            best = priority;
            bestRank = exports.PRIORITY_RANK[priority] ?? 0;
        }
    }
    return best;
}
