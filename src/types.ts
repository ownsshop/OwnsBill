export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "staff" | "customer";
  zone?: string;
  area?: string;
  balance?: number;
  salary?: number;
  whatsapp?: string;
  nid?: string;
  address?: string;
  createdAt: string;
}

export interface Customer {
  id: string; // matches uid
  name: string;
  phone: string;
  whatsapp?: string;
  email: string;
  password?: string;
  pppoeUser?: string;
  pppoePassword?: string;
  address: string;
  nid: string;
  zone: string;
  area: string;
  packageId: string;
  onuMac: string;
  status: "active" | "expired" | "locked";
  dueAmount: number;
  promiseDate?: string; // YYYY-MM-DD
  lat?: number;
  lng?: number;
  staffId?: string; // Assigned staff uid
}

export interface Package {
  id: string;
  name: string;
  speed: string; // e.g. "10 Mbps"
  price: number;
  oltProfile: string;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName?: string;
  staffId?: string; // Collector staff ID
  staffName?: string;
  amount: number;
  month: string; // e.g. "2026-07"
  method: "cash" | "bkash" | "nagad";
  trxId?: string;
  status: "pending" | "approved";
  date: string;
}

export interface Deposit {
  id: string;
  staffId: string;
  staffName?: string;
  amount: number;
  method: string;
  trxId?: string;
  status: "pending" | "approved" | "rejected";
  date: string;
}

export interface SalaryRequest {
  id: string;
  staffId: string;
  staffName?: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  date: string;
}

export interface Ticket {
  id: string;
  customerId: string;
  customerName?: string;
  title: string;
  status: "open" | "closed";
  assignedTo?: string; // Staff UID
  assignedToName?: string;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "admin" | "staff" | "customer";
  message: string;
  timestamp: string;
}

export interface Zone {
  id: string;
  name: string;
}

export interface Area {
  id: string;
  name: string;
  zoneId: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  date: string;
  addedBy: string; // User UID
  addedByName?: string;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName?: string;
  amount: number;
  month: string; // YYYY-MM
  status: "paid" | "unpaid";
  createdAt: string;
}

export interface LiveChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  message: string;
  timestamp: string;
}
