import { Schema, model } from "mongoose";

const orderSchema = new Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    customerName: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },

    address: {
      type: String,
      required: true,
      trim: true
    },

    city: {
      type: String,
      required: true,
      trim: true
    },

    state: {
      type: String,
      required: true,
      trim: true
    },

    pincode: {
      type: String,
      required: true,
      trim: true
    },

    materialType: {
      type: String,
      required: true,
      enum: ["Aluminium", "uPVC"],
      index: true
    },

    salesPerson: {
      type: String,
      default: "",
      trim: true
    },

    deliveryDate: {
      type: Date,
      required: true
    },

    serviceType: {
      type: String,
      default: "General",
      trim: true
    },

    status: {
      type: String,
      default: "Pending",
      trim: true,
      index: true
    },

    amount: {
      type: Number,
      default: 0
    },

    paid: {
      type: Boolean,
      default: false
    },

    assignedTeam: {
      type: String,
      default: ""
    },

    category: {
      type: String,
      default: "General"
    },

    complaintType: {
      type: String,
      enum: [
        "Locking issue",
        "Leakage issue",
        "Difficulty in moving",
        "Alignment issue",
        "Other",
      ],
      trim: true,
    },

    complaintDescription: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

orderSchema.virtual("unpaidServiceAvailable").get(function () {
  const deliveryDate = new Date(this.deliveryDate);

  const expiryDate = new Date(deliveryDate);
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  return new Date() <= expiryDate;
});

orderSchema.virtual("paymentStatus").get(function () {
  const delivery = new Date(this.deliveryDate);

  const expiry = new Date(delivery);
  expiry.setFullYear(expiry.getFullYear() + 1);

  return new Date() > expiry ? "Paid" : "Unpaid";
});

export default model("Order", orderSchema);