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