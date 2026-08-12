import type {
  ApiEnvelope,
  ApiError,
  User,
  LoginResponse,
  Complaint,
  ComplaintStatus,
  Priority,
  Department,
  AnalyticsSummary,
  StatusHistoryEntry,
  Role,
  FieldErrors,
} from "./types";
import {
  mockDepartments,
  mockUsers,
  mockComplaints,
  buildAnalytics,
} from "./mock-data";

// ---------------------------------------------------------------------------
// Typed API client.
//
// Every function returns `{ data, error }` AFTER unwrapping the standard
// `{ success, data, error }` envelope documented in FRONTEND.md Section 4.
// Components must never call `fetch` directly — they go through TanStack
// Query hooks that wrap these functions.
//
// In this frontend-only build the implementation is an in-memory mock layer.
// Swapping in a real `fetch` against `NEXT_PUBLIC_API_BASE_URL` only changes
// the body of `request()` below; the public API stays identical.
// ---------------------------------------------------------------------------

const LATENCY_MS = 420;
const wait = (ms = LATENCY_MS) => new Promise((r) => setTimeout(r, ms));

function ok<T>(data: T): { data: T; error: null } {
  return { data, error: null };
}
function fail(error: ApiError): { data: null; error: ApiError } {
  return { data: null, error };
}

// In-memory mutable copies so writes (create complaint, status update, etc.)
// persist across calls within a session — like a real backend would.
const departments = [...mockDepartments];
const users = [...mockUsers];
const complaints = [...mockComplaints];

// --- Auth -----------------------------------------------------------------
let currentUserId: string | null = null;

export const authApi = {
  async register(input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
    preferred_language?: User["preferred_language"];
  }): Promise<{ data: LoginResponse | null; error: ApiError | null }> {
    await wait();
    const existing = users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (existing) {
      return fail({
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
        field_errors: { email: "This email is already registered." },
      });
    }
    const colors = ["#0d9488", "#d97706", "#0891b2", "#7c3aed", "#dc2626", "#059669"];
    const user: User = {
      id: `user_${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.role,
      phone: input.phone,
      preferred_language: input.preferred_language ?? "en",
      department_id: input.role === "officer" ? "dept_pwk" : null,
      avatar_color: colors[Math.floor(Math.random() * colors.length)],
      created_at: new Date().toISOString(),
    };
    users.push(user);
    currentUserId = user.id;
    return ok({
      user,
      tokens: {
        access_token: `mock_access_${user.id}`,
        refresh_token: `mock_refresh_${user.id}`,
        expires_in: 3600,
      },
    });
  },

  async login(input: { email: string; password: string }): Promise<{ data: LoginResponse | null; error: ApiError | null }> {
    await wait();
    // Demo accounts — any password works against the mock layer.
    const user = users.find((u) => u.email.toLowerCase() === input.email.toLowerCase());
    if (!user) {
      return fail({
        code: "INVALID_CREDENTIALS",
        message: "No account found with this email. Try a demo account below.",
        field_errors: { email: "Email not recognised." },
      });
    }
    currentUserId = user.id;
    return ok({
      user,
      tokens: {
        access_token: `mock_access_${user.id}`,
        refresh_token: `mock_refresh_${user.id}`,
        expires_in: 3600,
      },
    });
  },

  async me(): Promise<{ data: User | null; error: ApiError | null }> {
    await wait(120);
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Not signed in." });
    const user = users.find((u) => u.id === currentUserId);
    if (!user) return fail({ code: "UNAUTHENTICATED", message: "Session expired." });
    return ok(user);
  },

  async logout(): Promise<{ data: null; error: null }> {
    currentUserId = null;
    return { data: null, error: null };
  },

  async updateProfile(input: Partial<Pick<User, "name" | "phone" | "preferred_language">>): Promise<{ data: User | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Not signed in." });
    const idx = users.findIndex((u) => u.id === currentUserId);
    if (idx === -1) return fail({ code: "NOT_FOUND", message: "User not found." });
    users[idx] = { ...users[idx], ...input };
    return ok(users[idx]);
  },
};

// --- Complaints (citizen) -------------------------------------------------
export const complaintsApi = {
  async create(input: {
    title: string;
    description: string;
    department_id?: string;
    is_voice: boolean;
    transcript?: string;
    audio_url?: string;
    location_lat?: number;
    location_lng?: number;
    location_address?: string;
    attachments?: { filename: string; mime_type: string; size_bytes: number }[];
  }): Promise<{ data: Complaint | null; error: ApiError | null }> {
    await wait(700);
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in to submit a complaint." });
    const citizen = users.find((u) => u.id === currentUserId);
    if (!citizen) return fail({ code: "UNAUTHENTICATED", message: "Session expired." });

    const deptId = input.department_id ?? autoRouteDepartment(input.description);
    const dept = departments.find((d) => d.id === deptId) ?? departments[0];

    const id = `cmp_${Date.now().toString().slice(-6)}`;
    const ref = `GRP-2025-${(1284 + complaints.length).toString().padStart(6, "0")}`;
    const submittedAt = new Date().toISOString();

    const complaint: Complaint = {
      id,
      reference_number: ref,
      citizen_id: citizen.id,
      citizen_name: citizen.name,
      department_id: dept.id,
      department_name: dept.name,
      title: input.title,
      description: input.description,
      is_voice: input.is_voice,
      transcript: input.transcript,
      audio_url: input.audio_url,
      location_lat: input.location_lat,
      location_lng: input.location_lng,
      location_address: input.location_address,
      attachments: (input.attachments ?? []).map((a, i) => ({
        id: `att_${id}_${i}`,
        complaint_id: id,
        filename: a.filename,
        mime_type: a.mime_type,
        size_bytes: a.size_bytes,
        url: "#",
        created_at: submittedAt,
      })),
      original_language: citizen.preferred_language,
      status: "submitted",
      // AI fields intentionally absent at creation — they arrive async.
      priority: "medium",
      status_history: [
        {
          id: `hist_${id}_0`,
          complaint_id: id,
          status: "submitted",
          note: input.is_voice ? "Voice complaint submitted and transcribed for review." : "Complaint submitted via citizen portal.",
          actor_name: citizen.name,
          actor_role: "citizen",
          created_at: submittedAt,
        },
      ],
      estimated_resolution_date: new Date(Date.now() + dept.avg_resolution_days * 86400000).toISOString(),
      submitted_at: submittedAt,
      updated_at: submittedAt,
    };
    complaints.unshift(complaint);

    // Simulate async AI classification landing a moment later.
    scheduleAiClassification(id);

    return ok(complaint);
  },

  async listMine(): Promise<{ data: Complaint[] | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    return ok(complaints.filter((c) => c.citizen_id === currentUserId));
  },

  async getById(id: string): Promise<{ data: Complaint | null; error: ApiError | null }> {
    await wait(200);
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const complaint = complaints.find((c) => c.id === id);
    if (!complaint) return fail({ code: "NOT_FOUND", message: "Complaint not found." });
    // Role scope: citizens only see their own; officers only their dept; admins any.
    const me = users.find((u) => u.id === currentUserId);
    if (!me) return fail({ code: "UNAUTHENTICATED", message: "Session expired." });
    if (me.role === "citizen" && complaint.citizen_id !== me.id) {
      return fail({ code: "FORBIDDEN", message: "You do not have access to this complaint." });
    }
    if (me.role === "officer" && complaint.department_id !== me.department_id) {
      return fail({ code: "FORBIDDEN", message: "This complaint belongs to another department." });
    }
    return ok(complaint);
  },
};

// --- Officer --------------------------------------------------------------
export const officerApi = {
  async listQueue(filters?: {
    status?: ComplaintStatus;
    priority?: Priority;
    search?: string;
  }): Promise<{ data: Complaint[] | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "officer") return fail({ code: "FORBIDDEN", message: "Officers only." });
    let list = complaints.filter((c) => c.department_id === me.department_id);
    if (filters?.status) list = list.filter((c) => c.status === filters.status);
    if (filters?.priority) list = list.filter((c) => c.priority === filters.priority);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.reference_number.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    return ok(list);
  },

  async updateStatus(input: {
    complaint_id: string;
    status: ComplaintStatus;
    note: string;
  }): Promise<{ data: Complaint | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "officer") return fail({ code: "FORBIDDEN", message: "Officers only." });
    const idx = complaints.findIndex((c) => c.id === input.complaint_id);
    if (idx === -1) return fail({ code: "NOT_FOUND", message: "Complaint not found." });
    if (complaints[idx].department_id !== me.department_id) {
      return fail({ code: "FORBIDDEN", message: "Out of department scope." });
    }
    if (!input.note.trim()) {
      return fail({
        code: "VALIDATION_ERROR",
        message: "A note is required when updating status.",
        field_errors: { note: "Please add a note explaining this status change." },
      });
    }
    const entry: StatusHistoryEntry = {
      id: `hist_${input.complaint_id}_${complaints[idx].status_history.length}`,
      complaint_id: input.complaint_id,
      status: input.status,
      note: input.note.trim(),
      actor_name: me.name,
      actor_role: "officer",
      created_at: new Date().toISOString(),
    };
    complaints[idx] = {
      ...complaints[idx],
      status: input.status,
      status_history: [...complaints[idx].status_history, entry],
      updated_at: entry.created_at,
    };
    return ok(complaints[idx]);
  },
};

// --- Admin ----------------------------------------------------------------
export const adminApi = {
  async listDepartments(): Promise<{ data: Department[] | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "admin") return fail({ code: "FORBIDDEN", message: "Admins only." });
    return ok(departments.map((d) => ({ ...d })));
  },

  async updateDepartment(input: {
    id: string;
    name?: string;
    avg_resolution_days?: number;
    head_name?: string;
  }): Promise<{ data: Department | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "admin") return fail({ code: "FORBIDDEN", message: "Admins only." });
    const idx = departments.findIndex((d) => d.id === input.id);
    if (idx === -1) return fail({ code: "NOT_FOUND", message: "Department not found." });
    departments[idx] = { ...departments[idx], ...input };
    return ok(departments[idx]);
  },

  async createDepartment(input: {
    name: string;
    description: string;
    avg_resolution_days: number;
    head_name?: string;
  }): Promise<{ data: Department | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "admin") return fail({ code: "FORBIDDEN", message: "Admins only." });
    if (!input.name.trim()) {
      return fail({ code: "VALIDATION_ERROR", message: "Department name is required.", field_errors: { name: "Required." } });
    }
    const dept: Department = {
      id: `dept_${Date.now().toString().slice(-5)}`,
      name: input.name.trim(),
      description: input.description.trim(),
      avg_resolution_days: input.avg_resolution_days,
      head_name: input.head_name,
      officer_count: 0,
      active_complaints: 0,
    };
    departments.push(dept);
    return ok(dept);
  },

  async analytics(): Promise<{ data: AnalyticsSummary | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "admin") return fail({ code: "FORBIDDEN", message: "Admins only." });
    return ok(buildAnalytics());
  },

  async listUsers(): Promise<{ data: User[] | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "admin") return fail({ code: "FORBIDDEN", message: "Admins only." });
    return ok(users.map((u) => ({ ...u })));
  },

  async updateUserRole(input: {
    user_id: string;
    role: Role;
    department_id?: string | null;
  }): Promise<{ data: User | null; error: ApiError | null }> {
    await wait();
    if (!currentUserId) return fail({ code: "UNAUTHENTICATED", message: "Sign in." });
    const me = users.find((u) => u.id === currentUserId);
    if (!me || me.role !== "admin") return fail({ code: "FORBIDDEN", message: "Admins only." });
    const idx = users.findIndex((u) => u.id === input.user_id);
    if (idx === -1) return fail({ code: "NOT_FOUND", message: "User not found." });
    users[idx] = {
      ...users[idx],
      role: input.role,
      department_id: input.role === "officer" ? input.department_id ?? users[idx].department_id : null,
    };
    return ok(users[idx]);
  },
};

// --- Helpers --------------------------------------------------------------
function autoRouteDepartment(description: string): string {
  const text = description.toLowerCase();
  if (/(water|tanker|pipe|sewage|drain|sewer|toilet|sanitation)/.test(text)) return "dept_water";
  if (/(road|pothole|street|bridge|footpath|sidewalk)/.test(text)) return "dept_pwk";
  if (/(hospital|doctor|clinic|medicine|health|vaccin)/.test(text)) return "dept_health";
  if (/(electric|power|light|meter|transformer|voltage)/.test(text)) return "dept_elec";
  if (/(school|teacher|midday|student|education|book)/.test(text)) return "dept_edu";
  if (/(bus|transport|permit|traffic|road safety)/.test(text)) return "dept_transport";
  return "dept_pwk";
}

function scheduleAiClassification(complaintId: string) {
  setTimeout(() => {
    const idx = complaints.findIndex((c) => c.id === complaintId);
    if (idx === -1) return;
    const c = complaints[idx];
    const text = `${c.title} ${c.description}`.toLowerCase();
    const category = guessCategory(text);
    const priority = guessPriority(text);
    complaints[idx] = {
      ...c,
      ai_category: category,
      ai_category_confidence: 0.9 + Math.random() * 0.08,
      ai_priority_confidence: 0.75 + Math.random() * 0.2,
      ai_summary: c.description.slice(0, 140) + (c.description.length > 140 ? "…" : ""),
      priority,
      updated_at: new Date().toISOString(),
    };
  }, 2200);
}

function guessCategory(text: string): string {
  if (/(pothole|road|bridge|footpath)/.test(text)) return "Road Infrastructure";
  if (/(water|tanker|pipe|sewage)/.test(text)) return "Water Supply Disruption";
  if (/(street light|lamp|streetlight)/.test(text)) return "Street Lighting";
  if (/(garbage|waste|trash|sweep)/.test(text)) return "Waste Management";
  if (/(school|midday|teacher)/.test(text)) return "School Services";
  if (/(drain|drainage)/.test(text)) return "Drainage Infrastructure";
  return "General Civic Issue";
}
function guessPriority(text: string): Priority {
  if (/(urgent|immediately|danger|accident|child|elderly|blood|emergency)/.test(text)) return "urgent";
  if (/(broken|dead|not working|suffering|risk|dangerous)/.test(text)) return "high";
  if (/(quality|smell|cold|delay)/.test(text)) return "medium";
  return "low";
}

// Re-export for test/dev tooling.
export const __mockState = { departments, users, complaints };

export type FieldErrorsType = FieldErrors;
