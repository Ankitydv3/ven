import Counter from "../models/Counter";
import crypto from "crypto";

export async function generateEmployeeId() {
  const counter = await Counter.findOneAndUpdate(
    { key: "employee" },
    { $inc: { value: 1 }, $setOnInsert: { key: "employee" } },
    { new: true, upsert: true }
  );

  return `EMP${String(counter.value).padStart(4, "0")}`;
}

export function generateUsername(teamSlug: string, employeeId: string) {
  const slug = teamSlug.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "user";
  return `${slug}.${employeeId.toLowerCase()}`;
}

export function generateTemporaryPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
  let password = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i += 1) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

export function teamNameToSlug(teamName: string) {
  return teamName.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "team";
}
