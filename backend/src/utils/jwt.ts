import jwt from "jsonwebtoken";
import type { JwtUser } from "../types";

export function signToken(user: JwtUser) {
  return jwt.sign(user, process.env.JWT_SECRET ?? "dev-secret", { expiresIn: "7d" });
}