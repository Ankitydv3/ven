import Customer from "../models/Customer";
import Counter from "../models/Counter";
import { ApiError } from "../utils/ApiError";

export interface CustomerPayload {
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  alternatePhone?: string;
  notes?: string;
}

export interface CustomerListOptions {
  q?: string;
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 1 | -1;
}

async function generateCustomerId() {
  const year = new Date().getFullYear();
  const counter = await Counter.findOneAndUpdate(
    { key: `customer-${year}` },
    { $inc: { value: 1 }, $setOnInsert: { key: `customer-${year}` } },
    { new: true, upsert: true }
  );

  return `CUS-${year}-${String(counter.value).padStart(3, "0")}`;
}

export async function createCustomer(payload: CustomerPayload) {
  const customerId = await generateCustomerId();
  return Customer.create({
    ...payload,
    customerId,
    alternatePhone: payload.alternatePhone ?? "",
    notes: payload.notes ?? "",
    totalComplaints: 0
  });
}

export async function getCustomers(options: CustomerListOptions) {
  const filter: Record<string, unknown> = {};

  if (options.q) {
    filter.$or = [
      { fullName: { $regex: options.q, $options: "i" } },
      { email: { $regex: options.q, $options: "i" } },
      { phone: { $regex: options.q, $options: "i" } }
    ];
  }

  const skip = (options.page - 1) * options.limit;
  const sort: Record<string, 1 | -1> = { [options.sortBy]: options.sortOrder };

  const [items, total] = await Promise.all([
    Customer.find(filter).sort(sort).skip(skip).limit(options.limit),
    Customer.countDocuments(filter)
  ]);

  return { items, total };
}

export async function getCustomerById(id: string) {
  const customer = await Customer.findById(id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}

export async function updateCustomerById(id: string, payload: Partial<CustomerPayload>) {
  const customer = await Customer.findByIdAndUpdate(
    id,
    {
      ...payload,
      ...(payload.email ? { email: payload.email.toLowerCase() } : {})
    },
    { new: true, runValidators: true }
  );

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}

export async function deleteCustomerById(id: string) {
  const customer = await Customer.findByIdAndDelete(id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}