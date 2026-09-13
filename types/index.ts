export type UserRole = 'founder' | 'supervisor';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Worker {
  id: string;
  name: string;
  contact_number: string;
  position: string;
  pay_rate: number;
  pay_rate_type: 'daily' | 'hourly';
  active: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface Project {
  id: string;
  name: string;
  client_id: string;
  location: string;
  budget_estimate: number;
  status: ProjectStatus;
  start_date: string;
  target_completion_date: string;
  created_at: string;
}

export interface ProjectSupervisor {
  id: string;
  project_id: string;
  supervisor_id: string;
  created_at: string;
}

export type InvoiceStatus = 'draft' | 'pending' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  project_id: string;
  client_id: string;
  invoice_number: string;
  amount: number;
  amount_paid: number;
  issue_date: string;
  due_date: string;
  status: InvoiceStatus;
  notes?: string;
  created_at: string;
}

export type ExpenseCategory = 'materials' | 'labor' | 'equipment' | 'permits' | 'transportation' | 'other';

export interface Expense {
  id: string;
  project_id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  receipt_url: string | null;
  notes: string | null;
  ai_category_suggestion: ExpenseCategory | null;
  ai_bale_detection: boolean | null;
  ai_approval_suggestion: string | null;
  ai_confirmed: boolean;
  created_by: string;
  created_at: string;
}

export type AdvanceStatus = 'active' | 'partially_deducted' | 'fully_deducted' | 'cancelled';

export interface Advance {
  id: string;
  worker_id: string;
  project_id: string;
  amount: number;
  amount_deducted: number;
  reason: string;
  date: string;
  status: AdvanceStatus;
  created_at: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'leave';

export interface Attendance {
  id: string;
  worker_id: string;
  project_id: string;
  date: string;
  status: AttendanceStatus;
  hours_worked: number;
  notes: string | null;
  recorded_by: string;
  is_founder_override: boolean;
  submitted_at: string;
  created_at: string;
}

export type PayrollStatus = 'draft' | 'reviewed' | 'approved' | 'paid';

export interface Payroll {
  id: string;
  worker_id: string;
  period_start: string;
  period_end: string;
  gross_pay: number;
  bale_deduction: number;
  other_deductions: number;
  net_pay: number;
  status: PayrollStatus;
  days_worked?: number;
  hours_worked?: number;
  notes?: string;
  created_at: string;
}

export type ToolCondition = 'excellent' | 'good' | 'fair' | 'needs_repair' | 'damaged';

export interface Tool {
  id: string;
  name: string;
  quantity: number;
  condition: ToolCondition;
  project_id: string | null;
  created_at: string;
}

export interface SMSLog {
  id: string;
  invoice_id: string | null;
  recipient: string;
  phone: string;
  message: string;
  status: 'delivered' | 'sent' | 'pending' | 'failed';
  sent_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
  timestamp: string;
  link?: string;
}
