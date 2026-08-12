// Core domain types for the Citizen Grievance Platform.
// These mirror the backend API contract documented in FRONTEND.md Section 4.

export type Role = "citizen" | "officer" | "admin";

export type Locale = "en" | "hi" | "mr" | "ta";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  preferred_language: Locale;
  department_id?: string | null;
  avatar_color?: string;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  name_hi?: string;
  name_mr?: string;
  name_ta?: string;
  description: string;
  avg_resolution_days: number;
  head_name?: string;
  officer_count: number;
  active_complaints: number;
}

export type ComplaintStatus =
  | "submitted"
  | "under_review"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "reopened";

export type Priority = "low" | "medium" | "high" | "urgent";

export interface Attachment {
  id: string;
  complaint_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  ocr_text?: string;
  created_at: string;
}

export interface StatusHistoryEntry {
  id: string;
  complaint_id: string;
  status: ComplaintStatus;
  note: string;
  actor_name: string;
  actor_role: Role;
  created_at: string;
}

export interface Complaint {
  id: string;
  reference_number: string;
  citizen_id: string;
  citizen_name: string;
  department_id: string;
  department_name: string;
  title: string;
  description: string;
  translated_text?: string;
  original_language: Locale;
  status: ComplaintStatus;
  priority: Priority;
  ai_category?: string;
  ai_category_confidence?: number;
  ai_priority_confidence?: number;
  ai_summary?: string;
  is_voice: boolean;
  audio_url?: string;
  transcript?: string;
  attachments: Attachment[];
  status_history: StatusHistoryEntry[];
  duplicate_group_id?: string;
  duplicate_count?: number;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  estimated_resolution_date?: string;
  submitted_at: string;
  updated_at: string;
}

// API envelope — every endpoint returns this shape.
export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
  field_errors?: Record<string, string>;
}

// Auth responses
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AnalyticsSummary {
  total_complaints: number;
  open_complaints: number;
  resolved_complaints: number;
  avg_resolution_days: number;
  sla_compliance_pct: number;
  by_department: DepartmentAnalytics[];
  by_status: { status: ComplaintStatus; count: number }[];
  by_priority: { priority: Priority; count: number }[];
  trend: { date: string; filed: number; resolved: number }[];
}

export interface DepartmentAnalytics {
  department_id: string;
  department_name: string;
  open: number;
  resolved: number;
  rejected: number;
  avg_resolution_days: number;
  sla_compliance_pct: number;
  urgent_open: number;
}

// Union of all field-level validation errors returned by the server.
export type FieldErrors = Record<string, string>;
