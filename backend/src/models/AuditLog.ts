import { Schema, model, Types } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    changedByName: { type: String, required: true },
    targetUser: { type: Schema.Types.ObjectId, ref: "User" },
    targetUserName: { type: String },
    details: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default model("AuditLog", auditLogSchema);

export type AuditLogDocument = {
  _id: Types.ObjectId;
  action: string;
  changedBy: Types.ObjectId;
  changedByName: string;
  targetUser?: Types.ObjectId;
  targetUserName?: string;
  details?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};
