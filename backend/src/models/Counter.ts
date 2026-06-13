import { Schema, model } from "mongoose";

const counterSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 }
  },
  { timestamps: true }
);

export default model("Counter", counterSchema);