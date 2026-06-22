import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import type { JwtUser, UserRole } from "../types";
import { ApiError } from "../utils/ApiError";

export interface AuthRequest extends Request {
  user?: JwtUser;
}

const NOT_DELETED_FILTER = {
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

async function hydrateUser(decoded: JwtUser): Promise<JwtUser> {
  const user = await User.findOne({
    $and: [{ _id: decoded.id }, NOT_DELETED_FILTER],
  });

  if (!user) {
    throw new ApiError(401, "Invalid or expired token");
  }

  if (user.status === "disabled") {
    throw new ApiError(403, "Account is disabled. Contact administrator.");
  }

  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role as UserRole,
    team: user.team ?? user.teamName ?? undefined,
    teamId: user.teamId ? String(user.teamId) : undefined,
    teamName: user.teamName ?? user.team ?? undefined,
    employeeId: user.employeeId ?? undefined,
    subAdminType: user.subAdminType ?? undefined,
  };
}

export async function authRequired(
  req: AuthRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authorization token missing"));
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "dev-secret") as JwtUser;
    req.user = await hydrateUser(decoded);
    next();
  } catch (err) {
    if (err instanceof ApiError) {
      return next(err);
    }
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
