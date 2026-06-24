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
  "rounded-2xl border border-slate-200 bg-white/80 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-white/[0.08] dark:bg-app dark:shadow-black/20";

export const primaryButtonClass =
  "bg-[#185FA5] text-white shadow-md shadow-[#185FA5]/25 hover:bg-[#0C447C] focus-visible:ring-[#378ADD]/40";

export const accentTextClass = "text-[#185FA5] dark:bg-app";

export const inputClass =
  "h-11 rounded-xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:border-[#378ADD] focus-visible:ring-[#378ADD]/20 dark:border-white/[0.08] dark:bg-app/60 dark:text-white dark:placeholder:text-white/40";
