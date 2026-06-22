import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JwtUser, UserRole } from "../types";
import { ApiError } from "../utils/ApiError";

export interface AuthRequest extends Request {
  user?: JwtUser;
}

export function authRequired(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  console.log("AUTH HEADER:", req.headers.authorization);

  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authorization token missing"));
  }

  try {
    const token = authHeader.slice(7);

    req.user = jwt.verify(
      token,
      process.env.JWT_SECRET ?? "dev-secret"
    ) as JwtUser;

    next();
  } catch (err) {
    console.log("JWT ERROR:", err);
    next(new ApiError(401, "Invalid or expired token"));
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized"));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }

    next();
  };
}

const ADMIN_PORTAL_ROLES: UserRole[] = ["super_admin", "admin", "sub_admin"];

export function requireAdminPortalRole() {
  return requireRole(...ADMIN_PORTAL_ROLES);
}