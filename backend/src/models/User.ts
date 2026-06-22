import { Schema, model, Types } from "mongoose";

const userSchema = new Schema(
  {
    employeeId: { type: String, unique: true, sparse: true, index: true },
    username: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    mobile: { type: String, default: "", unique: true, sparse: true, index: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "admin", "sub_admin", "team", "customer", "manager", "team_lead", "accountant"],
      required: true
    },
    subAdminType: {
      type: String,
      enum: ["accountant", "plant_head"],
      required: false
    },
    designation: { type: String, default: "" },
    department: { type: String, default: "" },
    teamId: { type: Schema.Types.ObjectId, ref: "Team", index: true },
    teamName: { type: String, index: true },
    team: { type: String },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
    createdBy: { type: String, default: "System" },
    deletedAt: { type: Date, default: null, index: true }
  },
  { timestamps: true }
);

export default model("User", userSchema);

export type UserDocument = {
  _id: Types.ObjectId;
  employeeId?: string;
  username?: string;
  name: string;
  email: string;
  mobile: string;
  password: string;
  role: string;
  subAdminType?: "accountant" | "plant_head";
  designation: string;
  department: string;
  teamId?: Types.ObjectId;
  teamName?: string;
  team?: string;
  status: "active" | "disabled";
  createdBy: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
