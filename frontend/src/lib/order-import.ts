import * as XLSX from "xlsx";
import type { OrderPayload } from "@/services/orders";
import { downloadBlob } from "@/lib/user-export";

const COLUMN_ALIASES: Record<string, keyof OrderPayload | "paid" | "status"> = {
  "customer name": "customerName",
  customer: "customerName",
  name: "customerName",
  phone: "phone",
  mobile: "phone",
  email: "email",
  "material type": "materialType",
  material: "materialType",
  "delivery date": "deliveryDate",
  delivery: "deliveryDate",
  address: "address",
  city: "city",
  state: "state",
  pincode: "pincode",
  pin: "pincode",
  "payment status": "paid",
  paid: "paid",
  status: "status",
  "order status": "status",
  amount: "amount",
  "amount (inr)": "amount",
  "assigned team": "assignedTeam",
  team: "assignedTeam",
  category: "category",
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseMaterialType(value: unknown): "Aluminium" | "uPVC" | null {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("alum")) return "Aluminium";
  if (normalized.includes("upvc") || normalized.includes("pvc")) return "uPVC";
  return null;
}

function parsePaid(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return false;
  if (["paid", "yes", "true", "1"].includes(normalized)) return true;
  if (["unpaid", "no", "false", "0"].includes(normalized)) return false;
  return false;
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const cleaned = String(value ?? "").replace(/[^\d.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDeliveryDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const excelDate = XLSX.SSF.parse_date_code(value);
    if (excelDate) {
      return new Date(excelDate.y, excelDate.m - 1, excelDate.d);
    }
  }

  const text = String(value ?? "").trim();
  if (!text) return null;

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) return parsed;

  const parts = text.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((part) => Number(part));
    if (c > 31) {
      const date = new Date(c, b - 1, a);
      if (!Number.isNaN(date.getTime())) return date;
    }
    const date = new Date(a, b - 1, c);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
}

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

function mapRowToOrder(row: Record<string, unknown>, rowNumber: number) {
  const mapped: Partial<OrderPayload & { paid?: boolean; status?: string }> = {};

  for (const [header, rawValue] of Object.entries(row)) {
    const key = COLUMN_ALIASES[normalizeHeader(header)];
    if (!key || rawValue === undefined || rawValue === null || String(rawValue).trim() === "") {
      continue;
    }

    if (key === "materialType") {
      mapped.materialType = parseMaterialType(rawValue) ?? undefined;
    } else if (key === "deliveryDate") {
      mapped.deliveryDate = parseDeliveryDate(rawValue)?.toISOString() ?? undefined;
    } else if (key === "paid") {
      mapped.paid = parsePaid(rawValue);
    } else if (key === "amount") {
      mapped.amount = parseAmount(rawValue);
    } else if (key === "phone") {
      mapped.phone = cleanPhone(rawValue);
    } else if (key === "customerName") {
      mapped.customerName = String(rawValue).trim();
    } else if (key === "email") {
      mapped.email = String(rawValue).trim();
    } else if (key === "address") {
      mapped.address = String(rawValue).trim();
    } else if (key === "city") {
      mapped.city = String(rawValue).trim();
    } else if (key === "state") {
      mapped.state = String(rawValue).trim();
    } else if (key === "pincode") {
      mapped.pincode = String(rawValue).trim();
    } else if (key === "assignedTeam") {
      mapped.assignedTeam = String(rawValue).trim();
    } else if (key === "category") {
      mapped.category = String(rawValue).trim();
    } else if (key === "status") {
      mapped.status = String(rawValue).trim();
    }
  }

  const errors: string[] = [];
  if (!mapped.customerName) errors.push("Customer Name is required");
  if (!mapped.phone || mapped.phone.length !== 10) errors.push("Phone must be 10 digits");
  if (!mapped.email) errors.push("Email is required");
  if (!mapped.address) errors.push("Address is required");
  if (!mapped.city) errors.push("City is required");
  if (!mapped.state) errors.push("State is required");
  if (!mapped.pincode) errors.push("Pincode is required");
  if (!mapped.materialType) errors.push("Material Type must be Aluminium or uPVC");
  if (!mapped.deliveryDate) errors.push("Delivery Date is invalid");

  if (errors.length > 0) {
    return { row: rowNumber, errors };
  }

  return {
    row: rowNumber,
    order: {
      customerName: mapped.customerName!,
      phone: mapped.phone!,
      email: mapped.email!,
      address: mapped.address!,
      city: mapped.city!,
      state: mapped.state!,
      pincode: mapped.pincode!,
      materialType: mapped.materialType!,
      deliveryDate: mapped.deliveryDate!,
      status: mapped.status || "Pending",
      amount: mapped.amount ?? 0,
      paid: mapped.paid ?? false,
      assignedTeam: mapped.assignedTeam || "",
      category: mapped.category || "General",
    } satisfies OrderPayload,
  };
}

export function parseOrdersFromWorkbook(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The uploaded file has no worksheets");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (rows.length === 0) {
    throw new Error("The uploaded file has no data rows");
  }

  const orders: OrderPayload[] = [];
  const errors: Array<{ row: number; errors: string[] }> = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const hasValues = Object.values(row).some((value) => String(value ?? "").trim() !== "");
    if (!hasValues) return;

    const result = mapRowToOrder(row, rowNumber);
    if ("errors" in result && result.errors) {
      errors.push({ row: result.row, errors: result.errors });
      return;
    }
    if ("order" in result && result.order) {
      orders.push(result.order);
    }
  });

  if (orders.length === 0 && errors.length > 0) {
    const preview = errors
      .slice(0, 3)
      .map((item) => `Row ${item.row}: ${item.errors.join(", ")}`)
      .join("; ");
    throw new Error(`No valid orders found. ${preview}`);
  }

  if (orders.length === 0) {
    throw new Error("No valid order rows found in the uploaded file");
  }

  return { orders, errors };
}

export async function parseOrdersFromFile(file: File) {
  const buffer = await file.arrayBuffer();
  return parseOrdersFromWorkbook(buffer);
}

export function downloadOrderImportTemplate() {
  const headers = [
    "Customer Name",
    "Phone",
    "Email",
    "Material Type",
    "Delivery Date",
    "Address",
    "City",
    "State",
    "Pincode",
    "Payment Status",
    "Status",
    "Amount (INR)",
    "Assigned Team",
    "Category",
  ];

  const sampleRow = [
    "John Doe",
    "9876543210",
    "john@example.com",
    "Aluminium",
    "2026-06-30",
    "123 Main Street",
    "Mumbai",
    "Maharashtra",
    "400001",
    "Unpaid",
    "Pending",
    "50000",
    "Team Alpha",
    "General",
  ];

  const worksheet = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([output], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, "orders-import-template.xlsx");
}
