export type ComplaintStatus = "Pending Assignment" | "Assigned" | "In Progress" | "Completed";
export type Priority = "High" | "Medium" | "Low";
export type UserRole = "admin" | "team" | "customer";

export interface Customer {
  _id: string;
  customerId: string;
  fullName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  alternatePhone?: string;
  notes?: string;
  totalComplaints: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
}

export interface CustomerMutationResponse {
  message: string;
  customer: Customer;
}

export interface DashboardKpiSummary {
  totalOrders: number;
  complaintsReceived: number;
  complaintsResolved: number;
  complaintsUnresolved: number;
  paidServicesDone: number;
}

export interface DashboardTrendPoint {
  month: string;
  orders: number;
  complaintsReceived: number;
  resolved: number;
}

export interface DashboardReasonPoint {
  name: string;
  value: number;
}

export interface DashboardOverviewPoint {
  total: number;
  resolved: number;
  delayed: number;
  materialUnavailable: number;
  paymentPending: number;
}

export interface DashboardCategoryPoint {
  name: string;
  value: number;
}

export interface RecentOrder {
  _id?: string;
  orderId: string;
  customerName: string;
  serviceType: string;
  status: string;
  amount: number;
  paid: boolean;
  assignedTeam?: string;
  createdAt?: string;
}

export interface Order {
  _id: string;
  orderId: string;
  customerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;

  materialType: "Aluminium" | "uPVC";

  deliveryDate: string;

  unpaidServiceAvailable: boolean;
  paymentStatus: "Paid" | "Unpaid";

  serviceType: string;
  status: string;
  amount: number;

  paid: boolean;

  assignedTeam?: string;
  category?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface OrderFilters {
  q?: string;
  materialType?: string;
  paid?: boolean | string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

export interface OrderMutationResponse {
  message: string;
  order: Order;
}

export interface RecentComplaintItem {
  _id?: string;
  complaintId: string;
  clientName?: string;
  status: ComplaintStatus | string;
  title?: string;
  reason?: string;
  assignedTeam?: string;
  updatedAt: string;
}

export interface DashboardPageData {
  summary: DashboardKpiSummary;
  teamStats: Array<{ team: string; assigned: number; completed: number }>;
  monthlyTrend: DashboardTrendPoint[];
  unresolvedReasons: DashboardReasonPoint[];
  complaintOverview: DashboardOverviewPoint;
  categories: DashboardCategoryPoint[];
  recentOrders: RecentOrder[];
  recentComplaints: RecentComplaintItem[];
}

export interface Complaint {
  _id: string;
  complaintId: string;
  clientName: string;
  contactPerson: string;
  mobileNumber: string;
  email: string;
  title: string;
  description: string;
  priority: Priority;
  location: string;
  assignedTeam?: string;
  status: ComplaintStatus;
  remarks?: string;
  completionRemarks?: string;
  resolutionDetails?: string;
  assignedBy?: string;
  completedBy?: string;
  assignedDate?: string;
  completedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  history?: Array<{
    action: string;
    by: string;
    role: string;
    team?: string;
    remarks?: string;
    details?: string;
    status: ComplaintStatus;
    createdAt?: string;
  }>;
}

export interface DashboardResponse {
  totalComplaints: number;
  pending: number;
  assigned: number;
  inProgress: number;
  completed: number;
  teamStats: Array<{ team: string; assigned: number; completed: number }>;
  statusDistribution: Array<{ name: string; value: number }>;
  monthlyComplaints: Array<{ month: string; complaints: number }>;
  recentActivity: Array<{
    complaintId: string;
    status: ComplaintStatus;
    assignedTeam?: string;
    updatedAt: string;
    history?: Complaint["history"];
  }>;
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    team?: string;
  };
}
