import { Schema, model, Types } from "mongoose";

const teamSchema = new Schema(
  {
    teamName: { type: String, required: true, unique: true, trim: true, index: true },
    description: { type: String, default: "" },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdBy: { type: String, default: "System" }
  },
  { timestamps: true }
);

export default model("Team", teamSchema);

export type TeamDocument = {
  _id: Types.ObjectId;
  teamName: string;
  description: string;
  status: "active" | "inactive";
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};
