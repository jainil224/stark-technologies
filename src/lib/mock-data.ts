import type {
  User,
  Department,
  Complaint,
  StatusHistoryEntry,
  Attachment,
  ComplaintStatus,
  Priority,
  AnalyticsSummary,
  DepartmentAnalytics,
} from "./types";

// ---------------------------------------------------------------------------
// Mock dataset for the Citizen Grievance Platform.
// This simulates a realistic backend so the frontend can be developed and
// demoed independently. See FRONTEND.md Section 4 (mock-mode toggle).
// ---------------------------------------------------------------------------

export const mockDepartments: Department[] = [
  {
    id: "dept_pwk",
    name: "Public Works Department",
    name_hi: "लोक निर्माण विभाग",
    name_mr: "सार्वजनिक बांधकाम विभाग",
    name_ta: "பொதுப்பணித் துறை",
    description: "Roads, bridges, drainage and civic infrastructure.",
    avg_resolution_days: 12,
    head_name: "Rajiv Menon",
    officer_count: 8,
    active_complaints: 34,
  },
  {
    id: "dept_water",
    name: "Water Supply & Sanitation",
    name_hi: "जल आपूर्ति एवं स्वच्छता",
    name_mr: "पाणीपुरवठा व स्वच्छता",
    name_ta: "தண்ணீர் வழங்கல் மற்றும் சுகாதாரம்",
    description: "Piped water, tankers, sewage and public sanitation.",
    avg_resolution_days: 6,
    head_name: "Sunita Kulkarni",
    officer_count: 5,
    active_complaints: 21,
  },
  {
    id: "dept_health",
    name: "Health & Family Welfare",
    name_hi: "स्वास्थ्य एवं परिवार कल्याण",
    name_mr: "आरोग्य व कुटुंब कल्याण",
    name_ta: "சுகாதாரம் மற்றும் குடும்ப நலன்",
    description: "Public hospitals, PHCs, vaccination and sanitation drives.",
    avg_resolution_days: 4,
    head_name: "Dr. Anjali Rao",
    officer_count: 6,
    active_complaints: 12,
  },
  {
    id: "dept_elec",
    name: "Electricity & Power",
    name_hi: "विद्युत एवं ऊर्जा",
    name_mr: "वीज आणि ऊर्जा",
    name_ta: "மின்சாரம் மற்றும் ஆற்றல்",
    description: "Street lighting, power outages and meter issues.",
    avg_resolution_days: 3,
    head_name: "Vikram Deshpande",
    officer_count: 4,
    active_complaints: 18,
  },
  {
    id: "dept_edu",
    name: "Education Department",
    name_hi: "शिक्षा विभाग",
    name_mr: "शिक्षण विभाग",
    name_ta: "கல்வித் துறை",
    description: "Government schools, midday meals and scholarships.",
    avg_resolution_days: 15,
    head_name: "Meenakshi Iyer",
    officer_count: 3,
    active_complaints: 7,
  },
  {
    id: "dept_transport",
    name: "Transport & Roads Safety",
    name_hi: "परिवहन एवं सड़क सुरक्षा",
    name_mr: "वाहतूक व रस्ते सुरक्षा",
    name_ta: "போக்குவரத்து மற்றும் சாலை பாதுகாப்பு",
    description: "Public buses, permits, signage and road safety.",
    avg_resolution_days: 9,
    head_name: "Arjun Nair",
    officer_count: 4,
    active_complaints: 14,
  },
];

export const mockUsers: User[] = [
  {
    id: "user_citizen_1",
    name: "Priya Sharma",
    email: "priya@example.com",
    role: "citizen",
    phone: "+91 98765 43210",
    preferred_language: "en",
    avatar_color: "#0d9488",
    created_at: "2024-08-12T09:30:00Z",
  },
  {
    id: "user_citizen_2",
    name: "Ramesh Yadav",
    email: "ramesh@example.com",
    role: "citizen",
    phone: "+91 99887 76655",
    preferred_language: "hi",
    avatar_color: "#d97706",
    created_at: "2024-09-01T11:00:00Z",
  },
  {
    id: "user_officer_1",
    name: "Karan Patel",
    email: "karan.officer@example.com",
    role: "officer",
    preferred_language: "en",
    department_id: "dept_pwk",
    avatar_color: "#0d9488",
    created_at: "2024-03-15T10:00:00Z",
  },
  {
    id: "user_officer_2",
    name: "Lakshmi Venkat",
    email: "lakshmi.officer@example.com",
    role: "officer",
    preferred_language: "ta",
    department_id: "dept_water",
    avatar_color: "#0891b2",
    created_at: "2024-04-20T10:00:00Z",
  },
  {
    id: "user_admin_1",
    name: "Aditya Verma",
    email: "aditya.admin@example.com",
    role: "admin",
    preferred_language: "en",
    avatar_color: "#7c3aed",
    created_at: "2023-11-01T10:00:00Z",
  },
];

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400000).toISOString();
const hoursAgo = (h: number) => new Date(now - h * 3600000).toISOString();

function makeHistory(
  complaintId: string,
  entries: Omit<StatusHistoryEntry, "id" | "complaint_id">[]
): StatusHistoryEntry[] {
  return entries.map((e, i) => ({
    id: `hist_${complaintId}_${i}`,
    complaint_id: complaintId,
    ...e,
  }));
}

function makeAttachment(
  complaintId: string,
  idx: number,
  filename: string,
  mime: string,
  size: number,
  ocr?: string
): Attachment {
  return {
    id: `att_${complaintId}_${idx}`,
    complaint_id: complaintId,
    filename,
    mime_type: mime,
    size_bytes: size,
    url: "#",
    ocr_text: ocr,
    created_at: hoursAgo(idx + 1),
  };
}

export const mockComplaints: Complaint[] = [
  {
    id: "cmp_001",
    reference_number: "GRP-2025-001284",
    citizen_id: "user_citizen_1",
    citizen_name: "Priya Sharma",
    department_id: "dept_pwk",
    department_name: "Public Works Department",
    title: "Large pothole on MG Road causing accidents",
    description:
      "There is a massive pothole near the MG Road signal junction, right outside the bus stop. Two-wheeler riders are falling almost every evening. It has been over three weeks and no one has fixed it despite multiple verbal complaints to the ward office.",
    translated_text:
      "एमजी रोड सिग्नल जंक्शन के पास, बस स्टॉप के ठीक बाहर एक बहुत बड़ा गड्ढा है। दोपहिया वाहन चालक लगभग हर शाम गिर रहे हैं। तीन सप्ताह से अधिक हो गए हैं और वार्ड कार्यालय में कई शिकायतों के बावजूद किसी ने इसे ठीक नहीं किया है।",
    original_language: "en",
    status: "in_progress",
    priority: "high",
    ai_category: "Road Infrastructure",
    ai_category_confidence: 0.94,
    ai_priority_confidence: 0.81,
    ai_summary:
      "Citizen reports a dangerous pothole at MG Road junction causing frequent two-wheeler accidents; unresolved for 3+ weeks despite prior complaints.",
    is_voice: false,
    attachments: [
      makeAttachment("cmp_001", 0, "pothole_mg_road.jpg", "image/jpeg", 842_000, "Pothole approximately 1.5m wide near MG Road bus stop junction. Visible waterlogging."),
    ],
    status_history: makeHistory("cmp_001", [
      { status: "submitted", note: "Complaint submitted via citizen portal.", actor_name: "Priya Sharma", actor_role: "citizen", created_at: daysAgo(9) },
      { status: "under_review", note: "Assigned to PWD field inspector for site visit.", actor_name: "Karan Patel", actor_role: "officer", created_at: daysAgo(8) },
      { status: "in_progress", note: "Site inspected. Repair crew scheduled for patch work; awaiting hot-mix supply.", actor_name: "Karan Patel", actor_role: "officer", created_at: daysAgo(4) },
    ]),
    duplicate_group_id: "grp_pothole_mg",
    duplicate_count: 4,
    location_lat: 19.076,
    location_lng: 72.8777,
    location_address: "MG Road Signal Junction, near Bus Stop, Mumbai",
    estimated_resolution_date: new Date(now + 3 * 86400000).toISOString(),
    submitted_at: daysAgo(9),
    updated_at: daysAgo(4),
  },
  {
    id: "cmp_002",
    reference_number: "GRP-2025-001290",
    citizen_id: "user_citizen_1",
    citizen_name: "Priya Sharma",
    department_id: "dept_water",
    department_name: "Water Supply & Sanitation",
    title: "No water supply for 4 days in Ward 12",
    description:
      "Our entire lane in Ward 12 has not received piped water for four days. The tanker that was promised never arrived. Elderly residents are struggling. Please look into this urgently.",
    original_language: "en",
    status: "submitted",
    priority: "urgent",
    ai_category: "Water Supply Disruption",
    ai_category_confidence: 0.97,
    ai_priority_confidence: 0.89,
    ai_summary:
      "Lane-wide water outage in Ward 12 for 4 days; promised tanker did not arrive; vulnerable residents affected — flagged urgent.",
    is_voice: true,
    transcript: "Hello, this is Priya from Ward 12. We have not had piped water for four days now. The tanker that was promised never arrived. Elderly people are suffering. Please help urgently.",
    audio_url: "#",
    attachments: [],
    status_history: makeHistory("cmp_002", [
      { status: "submitted", note: "Voice complaint submitted and transcribed for review.", actor_name: "Priya Sharma", actor_role: "citizen", created_at: hoursAgo(6) },
    ]),
    location_lat: 19.082,
    location_lng: 72.881,
    location_address: "Ward 12, Lane 3, Mumbai",
    estimated_resolution_date: new Date(now + 1 * 86400000).toISOString(),
    submitted_at: hoursAgo(6),
    updated_at: hoursAgo(6),
  },
  {
    id: "cmp_003",
    reference_number: "GRP-2025-001291",
    citizen_id: "user_citizen_1",
    citizen_name: "Priya Sharma",
    department_id: "dept_elec",
    department_name: "Electricity & Power",
    title: "Street light not working for 2 weeks",
    description:
      "The street light pole number 14 on our street has been dead for two weeks. The area is completely dark at night and there have been incidents of chain-snatching. Please fix it.",
    original_language: "en",
    status: "resolved",
    priority: "medium",
    ai_category: "Street Lighting",
    ai_category_confidence: 0.96,
    ai_priority_confidence: 0.72,
    ai_summary: "Non-functional street light (pole 14) for 2 weeks; area dark at night; safety incidents reported.",
    is_voice: false,
    attachments: [],
    status_history: makeHistory("cmp_003", [
      { status: "submitted", note: "Complaint submitted via portal.", actor_name: "Priya Sharma", actor_role: "citizen", created_at: daysAgo(20) },
      { status: "under_review", note: "Ticket forwarded to street-light maintenance team.", actor_name: "Vikram Deshpande", actor_role: "officer", created_at: daysAgo(19) },
      { status: "in_progress", note: "Faulty fixture identified, replacement ordered.", actor_name: "Vikram Deshpande", actor_role: "officer", created_at: daysAgo(16) },
      { status: "resolved", note: "New LED fixture installed and tested. Pole 14 operational.", actor_name: "Vikram Deshpande", actor_role: "officer", created_at: daysAgo(14) },
    ]),
    submitted_at: daysAgo(20),
    updated_at: daysAgo(14),
  },
  {
    id: "cmp_004",
    reference_number: "GRP-2025-001305",
    citizen_id: "user_citizen_2",
    citizen_name: "Ramesh Yadav",
    department_id: "dept_pwk",
    department_name: "Public Works Department",
    title: "Broken drainage cover near school",
    description:
      "The concrete cover over the drain outside the government primary school is broken. Children walk over it daily and it is very dangerous. Please replace it immediately.",
    original_language: "en",
    status: "under_review",
    priority: "high",
    ai_category: "Drainage Infrastructure",
    ai_category_confidence: 0.91,
    ai_priority_confidence: 0.85,
    ai_summary: "Broken drain cover outside government school posing risk to children; replacement requested.",
    is_voice: false,
    attachments: [
      makeAttachment("cmp_004", 0, "broken_drain.jpg", "image/jpeg", 612_400),
    ],
    status_history: makeHistory("cmp_004", [
      { status: "submitted", note: "Complaint submitted via portal.", actor_name: "Ramesh Yadav", actor_role: "citizen", created_at: daysAgo(3) },
      { status: "under_review", note: "Assigned to field team for inspection.", actor_name: "Karan Patel", actor_role: "officer", created_at: daysAgo(2) },
    ]),
    duplicate_group_id: "grp_pothole_mg",
    duplicate_count: 4,
    submitted_at: daysAgo(3),
    updated_at: daysAgo(2),
  },
  {
    id: "cmp_005",
    reference_number: "GRP-2025-001310",
    citizen_id: "user_citizen_2",
    citizen_name: "Ramesh Yadav",
    department_id: "dept_health",
    department_name: "Health & Family Welfare",
    title: "Garbage not collected for a week",
    description:
      "The garbage van has not come to our street for a full week. Piles of waste are rotting and there is a foul smell. Mosquitoes have increased. Please send the van daily.",
    original_language: "en",
    status: "in_progress",
    priority: "medium",
    ai_category: "Waste Management",
    ai_category_confidence: 0.93,
    ai_priority_confidence: 0.68,
    ai_summary: "Missed garbage collection for one week; hygiene and mosquito concerns raised.",
    is_voice: false,
    attachments: [],
    status_history: makeHistory("cmp_005", [
      { status: "submitted", note: "Complaint submitted.", actor_name: "Ramesh Yadav", actor_role: "citizen", created_at: daysAgo(7) },
      { status: "under_review", note: "Route audit initiated.", actor_name: "Dr. Anjali Rao", actor_role: "officer", created_at: daysAgo(6) },
      { status: "in_progress", note: "Daily collection route re-routed to cover this street; monitoring for 3 days.", actor_name: "Dr. Anjali Rao", actor_role: "officer", created_at: daysAgo(3) },
    ]),
    submitted_at: daysAgo(7),
    updated_at: daysAgo(3),
  },
  {
    id: "cmp_006",
    reference_number: "GRP-2025-001320",
    citizen_id: "user_citizen_1",
    citizen_name: "Priya Sharma",
    department_id: "dept_edu",
    department_name: "Education Department",
    title: "Midday meal quality complaint",
    description:
      "The midday meal at the government school my daughter attends is often cold and sometimes undercooked. Several children complained of stomach pain last week.",
    original_language: "en",
    status: "under_review",
    priority: "high",
    ai_category: "School Services",
    ai_category_confidence: 0.88,
    ai_priority_confidence: 0.79,
    ai_summary: "Concerns over midday meal quality — cold/undercooked food; children reported stomach pain.",
    is_voice: false,
    attachments: [],
    status_history: makeHistory("cmp_006", [
      { status: "submitted", note: "Complaint submitted.", actor_name: "Priya Sharma", actor_role: "citizen", created_at: daysAgo(2) },
      { status: "under_review", note: "Surprise inspection of kitchen scheduled.", actor_name: "Meenakshi Iyer", actor_role: "officer", created_at: daysAgo(1) },
    ]),
    submitted_at: daysAgo(2),
    updated_at: daysAgo(1),
  },
];

// ---------------------------------------------------------------------------
// Analytics summary derived from the mock dataset.
// ---------------------------------------------------------------------------
export function buildAnalytics(): AnalyticsSummary {
  const byDept: Record<string, DepartmentAnalytics> = {};
  for (const d of mockDepartments) {
    byDept[d.id] = {
      department_id: d.id,
      department_name: d.name,
      open: 0,
      resolved: 0,
      rejected: 0,
      avg_resolution_days: d.avg_resolution_days,
      sla_compliance_pct: 100,
      urgent_open: 0,
    };
  }

  const byStatus: Record<ComplaintStatus, number> = {
    submitted: 0,
    under_review: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
    reopened: 0,
  };
  const byPriority: Record<Priority, number> = {
    low: 0,
    medium: 0,
    high: 0,
    urgent: 0,
  };

  let total = 0;
  let open = 0;
  let resolved = 0;
  let resolutionDaysSum = 0;

  for (const c of mockComplaints) {
    total++;
    byStatus[c.status]++;
    byPriority[c.priority]++;
    const dept = byDept[c.department_id];
    if (dept) {
      if (c.status === "resolved") dept.resolved++;
      else if (c.status === "rejected") dept.rejected++;
      else {
        dept.open++;
        if (c.priority === "urgent") dept.urgent_open++;
      }
    }
    if (c.status === "resolved") {
      resolved++;
      const submitted = new Date(c.submitted_at).getTime();
      const updated = new Date(c.updated_at).getTime();
      resolutionDaysSum += Math.max(1, Math.round((updated - submitted) / 86400000));
    } else {
      open++;
    }
  }

  // Simulate SLA compliance percentages.
  byDept["dept_pwk"].sla_compliance_pct = 78;
  byDept["dept_water"].sla_compliance_pct = 91;
  byDept["dept_health"].sla_compliance_pct = 88;
  byDept["dept_elec"].sla_compliance_pct = 95;
  byDept["dept_edu"].sla_compliance_pct = 72;
  byDept["dept_transport"].sla_compliance_pct = 84;

  const trend: AnalyticsSummary["trend"] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(now - i * 86400000).toISOString().slice(0, 10);
    trend.push({
      date,
      filed: Math.round(8 + Math.sin(i / 2) * 4 + Math.random() * 6),
      resolved: Math.round(6 + Math.cos(i / 3) * 3 + Math.random() * 5),
    });
  }

  return {
    total_complaints: total,
    open_complaints: open,
    resolved_complaints: resolved,
    avg_resolution_days: resolved ? Math.round((resolutionDaysSum / resolved) * 10) / 10 : 0,
    sla_compliance_pct: Math.round(
      Object.values(byDept).reduce((s, d) => s + d.sla_compliance_pct, 0) / mockDepartments.length
    ),
    by_department: Object.values(byDept),
    by_status: (Object.keys(byStatus) as ComplaintStatus[]).map((status) => ({ status, count: byStatus[status] })),
    by_priority: (Object.keys(byPriority) as Priority[]).map((priority) => ({ priority, count: byPriority[priority] })),
    trend,
  };
}
