import AuditLog from "../models/AuditLog";
import type { Types } from "mongoose";

export async function logAuditEvent(payload: {
  action: string;
  changedBy: Types.ObjectId | string;
  changedByName: string;
  targetUser?: Types.ObjectId | string;
  targetUserName?: string;
  details?: Record<string, unknown>;
}) {
  await AuditLog.create({
    action: payload.action,
    changedBy: payload.changedBy,
    changedByName: payload.changedByName,
    targetUser: payload.targetUser,
    targetUserName: payload.targetUserName,
    details: payload.details,
  });
}
