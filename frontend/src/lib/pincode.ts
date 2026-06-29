import type { KeyboardEvent } from "react";

export const PINCODE_MAX_LENGTH = 6;

export function sanitizePincodeDigits(value: string, maxLength = PINCODE_MAX_LENGTH) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export const pincodeInputProps = {
  type: "text" as const,
  inputMode: "numeric" as const,
  maxLength: PINCODE_MAX_LENGTH,
};

/** Block letter keys; allow navigation, edit, and digit keys. */
export function blockNonDigitPincodeKeys(e: KeyboardEvent<HTMLInputElement>) {
  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
  if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
}
