import type { Response } from "express";
import type { AuthRequest } from "../middleware/auth";
import * as userService from "../services/userService";
import { ApiError } from "../utils/ApiError";
import { canCreateUsers, canDeleteUsers, canManageUsers, canResetOthersPassword } from "../utils/rbac";

const allowedSortFields = new Set([
  "employeeId",
  "name",
  "email",
  "mobile",
  "role",
  "teamName",
  "designation",
  "createdAt",
  "status",
]);

function parseUserQuery(req: AuthRequest): userService.UserListOptions {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const sortByRaw = (req.query.sortBy as string) || "createdAt";
  const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;
  const scope = userService.resolveUserListScope(req.user);

  return {
    q: req.query.q as string | undefined,
    teamId: req.query.teamId as string | undefined,
    role: req.query.role as string | undefined,
    status: req.query.status as string | undefined,
    page,
    limit,
    sortBy,
    sortOrder: sortOrder as 1 | -1,
    ...scope,
  };
}

async function resolveScopedTeamId(req: AuthRequest) {
  return userService.resolveUserTeamScope(req.user);
}

export async function createUserHandler(req: AuthRequest, res: Response) {
  if (!req.user || !canCreateUsers(req.user.role)) {
    throw new ApiError(403, "You do not have permission to create users");
  }

  const result = await userService.createUser(req.body, req.user);
  res.status(201).json({
    message: "User created successfully",
    user: result.user,
  });
}

export async function listUsers(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const options = parseUserQuery(req);

  if (req.user.role === "team_lead" && !options.scopedTeamId) {
    const scopedTeamId = await resolveScopedTeamId(req);
    if (scopedTeamId) options.scopedTeamId = scopedTeamId;
  }

  const result = await userService.getUsers(options);
  res.json({ ...result, page: options.page, limit: options.limit });
}

export async function listAssignableUsers(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const users = await userService.getAssignableUsers(req.user);
  res.json({ items: users });
}

export async function readUser(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const user = await userService.getUserById(String(req.params.id), req.user);
  res.json({ user });
}

export async function updateUserHandler(req: AuthRequest, res: Response) {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized");
  }

  const isSelfUpdate = req.user.id === String(req.params.id);
  if (!isSelfUpdate && !canManageUsers(req.user.role)) {
    throw new ApiError(403, "You do not have permission to edit users");
  }

  if (isSelfUpdate) {
    const { name, email, mobile } = req.body as Record<string, string>;
    const user = await userService.updateUserById(
      String(req.params.id),
      { name, email, mobile },
      req.user
    );
    res.json({ message: "Profile updated successfully", user });
    return;
  }

  const user = await userService.updateUserById(String(req.params.id), req.body, req.user);
  res.json({ message: "User updated successfully", user });
}

export async function deleteUserHandler(req: AuthRequest, res: Response) {
  if (!req.user || !canDeleteUsers(req.user.role)) {
    throw new ApiError(403, "You do not have permission to delete users");
  }

  await userService.deleteUserById(String(req.params.id), req.user);
  res.json({ message: "User deleted successfully" });
}

export async function resetPasswordHandler(req: AuthRequest, res: Response) {
  if (!req.user || !canResetOthersPassword(req.user.role)) {
    throw new ApiError(403, "Only Admin or Super Admin can reset passwords");
  }

  const { userId, password } = req.body as { userId: string; password: string };
  const result = await userService.resetUserPassword(userId, password, req.user);
  res.json(result);
}

export async function exportUsersCSVHandler(req: AuthRequest, res: Response) {
  if (!req.user || !canManageUsers(req.user.role)) {
    throw new ApiError(403, "Forbidden");
  }

  const options = parseUserQuery(req);
  options.limit = 10000;
  options.page = 1;
  const csv = await userService.exportUsersCSV(options);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=users-export.csv");
  res.status(200).send(csv);
}

export async function downloadCredentialsPdfHandler(req: AuthRequest, res: Response) {
  const { name, employeeId, username, temporaryPassword } = req.body as {
    name?: string;
    employeeId?: string;
    username?: string;
    temporaryPassword?: string;
  };

  if (!name || !employeeId || !username || !temporaryPassword) {
    throw new ApiError(400, "All credential fields are required");
  }

  const pdfBytes = await userService.generateCredentialsPdf({
    name,
    employeeId,
    username,
    temporaryPassword,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename=${employeeId}-credentials.pdf`);
  res.status(200).send(Buffer.from(pdfBytes));
}
