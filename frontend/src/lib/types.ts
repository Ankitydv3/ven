export type ComplaintStatus = "Pending Review" | "Declined" | "Pending Assignment" | "Assigned" | "In Progress" | "Completed" | "Resolved" | "Site Visit" | "Material Required" | "Material Granted" | "Revisit" | "Cancelled" | "Awaiting Reassignment";
export type Priority = "High" | "Medium" | "Low";
export type UserRole = "super_admin" | "admin" | "sub_admin" | "team" | "customer" | "manager" | "team_lead" | "accountant" | "store_manager";
export type SubAdminType = "accountant" | "plant_head";
export type UserStatus = "active" | "disabled";

export interface Team {
  _id: string;
  teamName: string;
  description?: string;
  status: "active" | "disabled";
  createdBy?: string;
  createdAt?: string;
}

export interface Material {
  materialName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Payment {
  _id: string;
  paymentId: string;
  complaintId?: string;
  orderId?: string;
  customerName: string;
  mobile: string;
  serviceType: string;
  materials: Material[];
  materialCost: number;
  serviceCost: number;
  additionalCost: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMode: "Cash" | "UPI" | "Card" | "Net Banking";
  transactionId?: string;
  status: "Pending" | "Completed" | "Refunded" | "Failed";
  remarks?: string;
  receivedBy: string;
  team?: string;
  invoiceNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentStats {
  totalPaymentsReceived: number;
  paidServicesDone: number;
  averagePaymentValue: number;
  pendingPayments: number;
  refunds: number;
  monthlyGrowth: number;
  thisMonthCollection: number;
  todayCollection: number;
}

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
  lockingIssue: number;
  leakageIssue: number;
  difficultyMoving: number;
  alignmentIssue: number;
  other: number;
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

  salesPerson?: string;

  deliveryDate: string;

  complaintType?: string;
  complaintDescription?: string;

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

export interface DashboardTaskSummary {
  totalTasks: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
  needMaterial?: number;
  needRevisit?: number;
}

export interface DashboardPageData {
  summary: DashboardKpiSummary;
  teamStats: Array<{ team: string; assigned: number; completed: number }>;
  taskStats: DashboardTaskSummary;
  monthlyTrend: DashboardTrendPoint[];
  unresolvedReasons: DashboardReasonPoint[];
  resolvedReasons: DashboardReasonPoint[];
  complaintOverview: DashboardOverviewPoint;
  categories: DashboardCategoryPoint[];
  todaysSiteVisits: import("@/lib/task.types").Task[];
  recentComplaints: RecentComplaintItem[];
  pendingActions: DashboardPendingAction[];
}

export type DashboardPendingRole = "admin" | "service_head" | "accountant" | "store" | "team";

export interface DashboardPendingAction {
  _id: string;
  requestId: string;
  materialName: string;
  status: string;
  complaintId: string;
  clientName: string;
  assignedTeam: string;
  requestedBy: string;
  requestDate: string;
  updatedAt?: string;
  quantity: number;
  unit: string;
  actionLabel: string;
}

export interface Complaint {
  _id: string;
  complaintId: string;
  clientName: string;
  contactPerson: string;
  mobileNumber: string;
  email: string;
  orderId?: string;
  title: string;
  description: string;
  priority: Priority;
  location: string;
  pictureUrl?: string;
  quotationUrl?: string;
  availableDate?: string;
  availableTime?: string;
  availability?: string;
  timeSlot?: string;
  locationCoordinates?: string;
  assignedTeam?: string;
  assignedUserId?: string;
  assignedUserName?: string;
  status: ComplaintStatus;
  siteVisitStatus?: "Pending" | "Completed" | "Material Required" | "Material Granted" | "Revisit" | "Awaiting Reassignment" | "";
  paymentStatus?: "Pending" | "Paid" | "Partially Paid";
  remarks?: string;
  completionRemarks?: string;
  resolutionDetails?: string;
  completionPictureUrl?: string;
  assignedBy?: string;
  completedBy?: string;
  assignedDate?: string;
  completedDate?: string;
  createdAt?: string;
  updatedAt?: string;
  complaintType?: string;
  complaintDescription?: string;
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
  taskHistory?: Array<{
    action: string;
    by: string;
    role: string;
    team?: string;
    remarks?: string;
    details?: string;
    status: string;
    photoUrl?: string;
    createdAt?: string;
  }>;
  taskScheduleStatus?: string | null;
  taskScheduleDueDate?: string | null;
  taskId?: string | null;
  materialRequestStatus?: string | null;
  materialRequestId?: string | null;
  materialRequestObjectId?: string | null;
  materialPaymentStatus?: string | null;
  materialPaidAmount?: number | null;
  materialPaymentDueAmount?: number | null;
  materialPaymentTime?: string | null;
  workflowStage?: string | null;
}

export interface TeamReport {
  team: string;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  status: "all_complete" | "has_pending" | "no_tasks";
  message: string;
  updatedAt: string;
}

export interface MaterialAlertItem {
  _id: string;
  type: string;
  requestId: string;
  complaintId?: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface AlertsResponse {
  pendingComplaints: Complaint[];
  teamReports: TeamReport[];
  taskAlerts?: Array<{
    _id: string;
    type: string;
    taskId: string;
    complaintId?: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }>;
  materialAlerts?: MaterialAlertItem[];
  counts: {
    pendingReview: number;
    teamsWithPending: number;
    taskAlerts?: number;
    materialAlerts?: number;
  };
}

export interface DashboardResponse {
  scope?: { kind: "org" | "team" | "personal"; label: string };
  totalTasks?: number;
  pending?: number;
  inProgress?: number;
  completed?: number;
  overdue?: number;
  completionRate?: number;
  totalComplaints?: number;
  assigned?: number;
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
    mobile?: string;
    role: UserRole;
    team?: string;
    teamId?: string;
    teamName?: string;
    employeeId?: string;
    designation?: string;
    department?: string;
    subAdminType?: SubAdminType;
    avatarUrl?: string;
  };
}

export interface ManagedUser {
  _id: string;
  employeeId?: string;
  username?: string;
  name: string;
  email: string;
  mobile: string;
  role: UserRole;
  subAdminType?: SubAdminType;
  designation: string;
  department: string;
  teamId?: string;
  teamName?: string;
  team?: string;
  status: UserStatus;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  avatarUrl?: string;
}

export interface UserListResponse {
  items: ManagedUser[];
  total: number;
  page: number;
  limit: number;
}

export interface UserCredentials {
  employeeId: string;
  username: string;
  temporaryPassword: string;
}

export interface CreateUserResponse {
  message: string;
  user: ManagedUser;
}
