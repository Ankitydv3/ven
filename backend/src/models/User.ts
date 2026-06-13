import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["admin", "team", "customer"], required: true },
    team: { type: String }
  },
  { timestamps: true }
);

export default model("User", userSchema);