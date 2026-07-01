import type { KeyboardEvent } from "react";

const COORDINATE_PATTERN = /^[0-9.,\s-]*$/;

export function sanitizeCoordinateInput(value: string) {
  return value.replace(/[^0-9.,\s-]/g, "");
}

export function isValidCoordinatePair(value: string) {
  return /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(value.trim());
}

export const coordinateInputProps = {
  inputMode: "decimal" as const,
  autoComplete: "off" as const,
};

/** Allow digits, decimal, comma, space, and minus for lat/long entry. */
export function blockNonCoordinateKeys(e: KeyboardEvent<HTMLInputElement>) {
  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
  if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!COORDINATE_PATTERN.test(e.key)) e.preventDefault();
}
