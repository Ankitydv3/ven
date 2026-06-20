import Counter from "../models/Counter";

export async function generatePaymentId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `payment-${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `PAY-${year}-${String(counter.value).padStart(4, "0")}`;
}

export async function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `invoice-${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  );

  return `INV-${year}-${String(counter.value).padStart(4, "0")}`;
}
