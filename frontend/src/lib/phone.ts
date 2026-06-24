import type { ChangeEvent, KeyboardEvent } from "react";

export const PHONE_MAX_LENGTH = 10;

export function sanitizePhoneDigits(value: string, maxLength = PHONE_MAX_LENGTH) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export const phoneInputProps = {
  type: "tel" as const,
  inputMode: "numeric" as const,
  autoComplete: "tel" as const,
  maxLength: PHONE_MAX_LENGTH,
};

/** Block letter keys; allow navigation, edit, and digit keys. */
export function blockNonDigitPhoneKeys(e: KeyboardEvent<HTMLInputElement>) {
  const allowed = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End"];
  if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^[0-9]$/.test(e.key)) e.preventDefault();
}

export function getPhoneChangeHandler(
  setValue: (value: string) => void,
) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    setValue(sanitizePhoneDigits(e.target.value));
  };
}
