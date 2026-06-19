export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
] as const;

export type CustomerSortField =
  | "customerId"
  | "fullName"
  | "phone"
  | "email"
  | "city"
  | "totalComplaints"
  | "createdAt";

export type CustomerStateFilter = "all" | (typeof INDIAN_STATES)[number];

export const glassCardClass =
  "rounded-2xl border border-slate-200 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0c1327] dark:shadow-black/20";

export const primaryButtonClass =
  "bg-[#2F6B63] text-white shadow-md shadow-[#2F6B63]/25 hover:bg-[#285e57] focus-visible:ring-[#4F9B8C]/40";

export const accentTextClass = "text-[#2F6B63] dark:bg-[#0c1327]";

export const inputClass =
  "h-11 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#4F9B8C] focus-visible:ring-[#4F9B8C]/20 dark:border-white/[0.08] dark:bg-[#0c1327]/60 dark:text-white dark:placeholder:text-white/40";
