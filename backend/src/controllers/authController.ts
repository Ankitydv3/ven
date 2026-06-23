import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import { signToken } from "../utils/jwt";
import { ApiError } from "../utils/ApiError";
import type { AuthRequest } from "../middleware/auth";
import * as userService from "../services/userService";

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await User.findOne({
    $and: [
      { $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }] },
      { $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }] },
    ],
  });

  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  if (user.status === "disabled") {
    throw new ApiError(403, "Account is disabled. Contact administrator.");
  }

  const validPassword = await bcrypt.compare(password, user.password);
  if (!validPassword) {
    throw new ApiError(401, "Invalid credentials");
  }

  const token = signToken({
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    team: user.team ?? user.teamName ?? undefined,
    teamId: user.teamId ? String(user.teamId) : undefined,
    teamName: user.teamName ?? undefined,
    employeeId: user.employeeId ?? undefined,
    subAdminType: user.subAdminType ?? undefined,
  });

  res.json({
    token,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      mobile: user.mobile ?? undefined,
      role: user.role,
      team: user.team ?? user.teamName ?? undefined,
      teamId: user.teamId ? String(user.teamId) : undefined,
      teamName: user.teamName ?? undefined,
      employeeId: user.employeeId ?? undefined,
      designation: user.designation ?? undefined,
      department: user.department ?? undefined,
      subAdminType: user.subAdminType ?? undefined,
    },
  });
}

export async function changePassword(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const { newPassword } = req.body as { newPassword: string };
  const result = await userService.changeOwnPassword(req.user.id, newPassword);
  res.json(result);
}

