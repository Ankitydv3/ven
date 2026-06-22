import { Schema, model } from "mongoose";

const teamSchema = new Schema(
  {
    teamName: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["active", "disabled"],
      default: "active",
      index: true,
    },
    createdBy: { type: String, default: "System" },
  },
  { timestamps: true }
);

export default model("Team", teamSchema);
