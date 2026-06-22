import bcrypt from "bcryptjs";
import User from "../models/User";
import { ApiError } from "../utils/ApiError";
import { generateEmployeeId, generateUsername, teamNameToSlug } from "../utils/employeeId";
import {
  canManageRole,
  getAssignableRoles,
  isAdminPortalRole,
  isProtectedFromDeletion,
  SUB_ADMIN_DEPARTMENT,
  type SubAdminType,
} from "../utils/rbac";
import { logAuditEvent } from "./auditService";
import { getTeamFields } from "./teamService";
import type { JwtUser, UserRole } from "../types";

export interface UserCreatePayload {
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: string;
  teamName?: string;
}

export interface UserUpdatePayload {
  name?: string;
  email?: string;
  mobile?: string;
  role?: string;
  status?: "active" | "disabled";
  teamName?: string;
}

export interface UserListOptions {
  q?: string;
  teamId?: string;
  role?: string;
  status?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
  scopedTeamId?: string;
  scopedTeamName?: string;
  scopedDepartment?: string;
  selfOnly?: boolean;
  actorId?: string;
}

function sanitizeUser(user: Record<string, unknown>) {
  const { password, ...rest } = user;
  return rest;
}

/** Matches users that are not soft-deleted (field missing or null). */
const NOT_DELETED_FILTER = {
  $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
};

function buildUserFilter(options: UserListOptions) {
  const and: Record<string, unknown>[] = [NOT_DELETED_FILTER];

  if (options.selfOnly && options.actorId) {
    return { $and: [NOT_DELETED_FILTER, { _id: options.actorId }] };
  }

  if (options.scopedTeamId) {
    and.push({ teamId: options.scopedTeamId });
  } else if (options.scopedTeamName) {
    and.push({
      $or: [{ teamName: options.scopedTeamName }, { team: options.scopedTeamName }],
    });
  } else if (options.teamId && options.teamId !== "all") {
    and.push({ teamId: options.teamId });
  }

  if (options.scopedDepartment) {
    and.push({ department: options.scopedDepartment });
  }

  if (options.role && options.role !== "all") {
    and.push({ role: options.role });
  }

  if (options.status && options.status !== "all") {
    and.push({ status: options.status });
  }

  if (options.q) {
    and.push({
      $or: [
        { name: { $regex: options.q, $options: "i" } },
        { email: { $regex: options.q, $options: "i" } },
        { employeeId: { $regex: options.q, $options: "i" } },
        { username: { $regex: options.q, $options: "i" } },
        { mobile: { $regex: options.q, $options: "i" } },
        { teamName: { $regex: options.q, $options: "i" } },
        { designation: { $regex: options.q, $options: "i" } },
      ],
    });
  }

  return and.length === 1 ? and[0] : { $and: and };
}

export function resolveUserListScope(user?: JwtUser) {
  if (!user) return {};

  if (user.role === "super_admin" || user.role === "admin") {
    return {};
  }

  if (user.role === "sub_admin") {
    const subAdminType = (user as JwtUser & { subAdminType?: SubAdminType }).subAdminType;
    if (subAdminType && SUB_ADMIN_DEPARTMENT[subAdminType]) {
      return { scopedDepartment: SUB_ADMIN_DEPARTMENT[subAdminType] };
    }
    return {};
  }

  if (user.role === "team_lead" || user.role === "team") {
    const teamName = user.teamName ?? user.team;
    if (teamName) return { scopedTeamName: teamName };
    if (user.teamId) return { scopedTeamId: user.teamId };
    return { selfOnly: true, actorId: user.id };
  }

  return {};
}

export function resolveUserTeamScope(user?: JwtUser): string | undefined {
  if (!user) return undefined;
  if (user.role === "super_admin" || user.role === "admin" || user.role === "sub_admin") return undefined;
  if (user.teamId) return user.teamId;
  return undefined;
}

export function assertCanManageUser(actor: JwtUser, targetRole: string) {
  if (!canManageRole(actor.role, targetRole)) {
    throw new ApiError(403, "You cannot manage users with this role");
  }

  const assignable = getAssignableRoles(actor.role);
  if (assignable.length > 0 && !assignable.includes(targetRole as UserRole)) {
    throw new ApiError(403, "You cannot assign this role");
  }
}


async function assertUniqueContact(email?: string, mobile?: string, excludeId?: string) {
  if (email) {
    const duplicateEmail = await User.findOne({
      email: email.toLowerCase(),
      ...NOT_DELETED_FILTER,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (duplicateEmail) {
      throw new ApiError(409, "Email already registered");
    }
  }

  if (mobile) {
    const duplicateMobile = await User.findOne({
      mobile: mobile.trim(),
      ...NOT_DELETED_FILTER,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
    if (duplicateMobile) {
      throw new ApiError(409, "Phone number already registered");
    }
  }
}

function assertTeamAssignment(role: string, teamName?: string) {
  if (role === "team" && !teamName?.trim()) {
    throw new ApiError(400, "Team assignment is required for team users");
  }
}

function teamFields(teamName?: string) {
  const normalized = teamName?.trim();
  if (!normalized) return {};
  return {
    teamName: normalized,
    team: normalized,
  };
}

async function teamFieldsFromDb(teamName?: string) {
  if (!teamName?.trim()) return {};
  return getTeamFields(teamName);
}

export async function createUser(payload: UserCreatePayload, actor: JwtUser) {
  assertCanManageUser(actor, payload.role);
  assertTeamAssignment(payload.role, payload.teamName);

  await assertUniqueContact(payload.email, payload.mobile);

  const employeeId = await generateEmployeeId();
  const teamSlug = payload.teamName ? teamNameToSlug(payload.teamName) : "general";
  const username = generateUsername(teamSlug, employeeId);
  const hashedPassword = await bcrypt.hash(payload.password, 10);
  const teamAssignment = await teamFieldsFromDb(payload.teamName);

  const user = await User.create({
    employeeId,
    username,
    name: payload.name.trim(),
    email: payload.email.toLowerCase().trim(),
    mobile: payload.mobile.trim(),
    password: hashedPassword,
    role: payload.role,
    designation: "",
    department: "",
    status: "active",
    createdBy: actor.name ?? "Admin",
    ...teamAssignment,
  });

  return {
    user: sanitizeUser(user.toObject()),
  };
}

export async function getUsers(options: UserListOptions) {
  const filter = buildUserFilter(options);
  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.sortOrder };

  const [items, total] = await Promise.all([
    User.find(filter).select("-password").sort(sort).skip(skip).limit(options.limit),
    User.countDocuments(filter),
  ]);

  return { items, total };
}

export async function getAssignableUsers(actor: JwtUser) {
  if (!isAdminPortalRole(actor.role)) {
    throw new ApiError(403, "You do not have permission to assign tasks");
  }

  const items = await User.find({
    ...NOT_DELETED_FILTER,
    status: "active",
    role: { $in: ["team", "team_lead"] },
    $or: [
      { teamName: { $exists: true, $nin: [null, ""] } },
      { team: { $exists: true, $nin: [null, ""] } },
    ],
  })
    .select("-password")
    .sort({ name: 1 });

  return items;
}

export async function resolveAssigneeById(userId: string) {
  const assignee = await User.findOne({
    $and: [{ _id: userId }, NOT_DELETED_FILTER, { status: "active" }],
  });

  if (!assignee) {
    throw new ApiError(404, "Assigned user not found or inactive");
  }

  if (!["team", "team_lead"].includes(assignee.role)) {
    throw new ApiError(400, "Complaints can only be assigned to team users");
  }

  const team = assignee.teamName ?? assignee.team;
  if (!team) {
    throw new ApiError(
      400,
      "This user has no team. Edit them in User Management and assign a team first."
    );
  }

  return {
    assignedUserId: assignee._id,
    assignedUserName: assignee.name,
    team,
  };
}

export async function getUserById(id: string, actor: JwtUser) {
  const user = await User.findOne({ $and: [{ _id: id }, NOT_DELETED_FILTER] }).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const scope = resolveUserListScope(actor);
  if (scope.selfOnly && actor.id !== id) {
    throw new ApiError(403, "You can only view your own profile");
  }
  if (scope.scopedTeamId && String(user.teamId) !== scope.scopedTeamId) {
    throw new ApiError(403, "User not in your team scope");
  }
  if (scope.scopedTeamName) {
    const userTeam = user.teamName ?? user.team;
    if (userTeam !== scope.scopedTeamName) {
      throw new ApiError(403, "User not in your team scope");
    }
  }
  if (scope.scopedDepartment && user.department !== scope.scopedDepartment) {
    throw new ApiError(403, "User not in your department scope");
  }

  return user;
}

function optionalString(value?: string | null) {
  return value ?? undefined;
}

export async function updateUserById(id: string, payload: UserUpdatePayload, actor: JwtUser) {
  const existing = await User.findOne({ $and: [{ _id: id }, NOT_DELETED_FILTER] });
  if (!existing) {
    throw new ApiError(404, "User not found");
  }

  const scope = resolveUserListScope(actor);
  if (scope.selfOnly && actor.id !== id) {
    throw new ApiError(403, "You can only update your own profile");
  }
  if (scope.scopedTeamId && String(existing.teamId) !== scope.scopedTeamId) {
    throw new ApiError(403, "User not in your team scope");
  }
  if (scope.scopedTeamName) {
    const existingTeam = existing.teamName ?? existing.team;
    if (existingTeam !== scope.scopedTeamName) {
      throw new ApiError(403, "User not in your team scope");
    }
  }
  if (scope.scopedDepartment && existing.department !== scope.scopedDepartment) {
    throw new ApiError(403, "User not in your department scope");
  }

  if (payload.role && !canManageRole(actor.role, payload.role)) {
    throw new ApiError(403, "You cannot assign this role");
  }
  if (!canManageRole(actor.role, existing.role)) {
    throw new ApiError(403, "You cannot modify this user");
  }

  if (payload.email || payload.mobile) {
    await assertUniqueContact(payload.email, payload.mobile, id);
  }

  if (payload.role) {
    assertCanManageUser(actor, payload.role);
    assertTeamAssignment(payload.role, payload.teamName ?? optionalString(existing.teamName) ?? optionalString(existing.team));
  }

  const effectiveRole = payload.role ?? existing.role;
  const effectiveTeamName = payload.teamName ?? optionalString(existing.teamName) ?? optionalString(existing.team);
  if (effectiveRole === "team") {
    assertTeamAssignment(effectiveRole, effectiveTeamName);
  }

  const update: Record<string, unknown> = {
    ...(payload.name ? { name: payload.name.trim() } : {}),
    ...(payload.email ? { email: payload.email.toLowerCase().trim() } : {}),
    ...(payload.mobile ? { mobile: payload.mobile.trim() } : {}),
    ...(payload.role ? { role: payload.role } : {}),
    ...(payload.status ? { status: payload.status } : {}),
    ...(payload.teamName ? await teamFieldsFromDb(payload.teamName) : {}),
  };

  const user = await User.findByIdAndUpdate(id, update, { new: true, runValidators: true }).select("-password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  return user;
}

export async function deleteUserById(id: string, actor: JwtUser) {
  const user = await User.findOne({ $and: [{ _id: id }, NOT_DELETED_FILTER] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (isProtectedFromDeletion(user.role)) {
    throw new ApiError(403, "Cannot delete this account");
  }

  if (!canManageRole(actor.role, user.role)) {
    throw new ApiError(403, "You cannot delete this user");
  }

  const scope = resolveUserListScope(actor);
  if (scope.scopedTeamId && String(user.teamId) !== scope.scopedTeamId) {
    throw new ApiError(403, "User not in your team scope");
  }
  if (scope.scopedTeamName) {
    const userTeam = user.teamName ?? user.team;
    if (userTeam !== scope.scopedTeamName) {
      throw new ApiError(403, "User not in your team scope");
    }
  }
  if (scope.scopedDepartment && user.department !== scope.scopedDepartment) {
    throw new ApiError(403, "User not in your department scope");
  }

  user.deletedAt = new Date();
  user.status = "disabled";
  await user.save();

  await logAuditEvent({
    action: "user_soft_delete",
    changedBy: actor.id,
    changedByName: actor.name,
    targetUser: user._id,
    targetUserName: user.name,
  });

  return sanitizeUser(user.toObject());
}

export async function resetUserPassword(
  userId: string,
  password: string,
  actor: JwtUser
) {
  const user = await User.findOne({ $and: [{ _id: userId }, NOT_DELETED_FILTER] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (!canManageRole(actor.role, user.role)) {
    throw new ApiError(403, "You cannot reset password for this user");
  }

  const scope = resolveUserListScope(actor);
  if (scope.scopedDepartment && user.department !== scope.scopedDepartment) {
    throw new ApiError(403, "User not in your department scope");
  }

  user.password = await bcrypt.hash(password, 10);
  await user.save();

  await logAuditEvent({
    action: "password_reset",
    changedBy: actor.id,
    changedByName: actor.name,
    targetUser: user._id,
    targetUserName: user.name,
    details: { changedAt: new Date().toISOString() },
  });

  return { message: "Password reset successfully" };
}

export async function changeOwnPassword(userId: string, newPassword: string) {
  const user = await User.findOne({ $and: [{ _id: userId }, NOT_DELETED_FILTER] });
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  await logAuditEvent({
    action: "password_change_self",
    changedBy: user._id,
    changedByName: user.name,
    targetUser: user._id,
    targetUserName: user.name,
  });

  return { message: "Password changed successfully" };
}

export async function exportUsersCSV(options: UserListOptions) {
  const filter = buildUserFilter(options);
  const users = await User.find(filter).select("-password").sort({ createdAt: -1 });

  const headers = [
    "Employee ID",
    "Username",
    "Name",
    "Email",
    "Mobile",
    "Role",
    "Sub Admin Type",
    "Team",
    "Department",
    "Designation",
    "Status",
    "Created By",
    "Created Date",
  ];

  const rows = users.map((user) => [
    user.employeeId ?? "",
    user.username ?? "",
    user.name,
    user.email,
    user.mobile,
    user.role,
    user.subAdminType ?? "",
    user.teamName ?? user.team ?? "",
    user.department,
    user.designation,
    user.status,
    user.createdBy,
    user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 10) : "",
  ]);

  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;

  let csv = headers.map(escape).join(",") + "\n";
  for (const row of rows) {
    csv += row.map(escape).join(",") + "\n";
  }

  return csv;
}

export async function generateCredentialsPdf(credentials: {
  name: string;
  employeeId: string;
  username: string;
  temporaryPassword: string;
}) {
  const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 420]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const lines = [
    { text: "Employee Login Credentials", font: boldFont, size: 18, y: 360 },
    { text: `Name: ${credentials.name}`, font, size: 12, y: 310 },
    { text: `Employee ID: ${credentials.employeeId}`, font, size: 12, y: 285 },
    { text: `Username: ${credentials.username}`, font, size: 12, y: 260 },
    { text: `Temporary Password: ${credentials.temporaryPassword}`, font, size: 12, y: 235 },
    { text: "Please change your password after first login.", font, size: 10, y: 200 },
  ];

  for (const line of lines) {
    page.drawText(line.text, {
      x: 50,
      y: line.y,
      size: line.size,
      font: line.font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  return pdfDoc.save();
}
