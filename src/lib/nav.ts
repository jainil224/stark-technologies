"use client";

import { create } from "zustand";
import type { Role } from "./types";

// ---------------------------------------------------------------------------
// In-app navigation store.
//
// The platform is a single-route App Router app (only `/` is exposed per the
// sandbox rules), so we model role-gated "pages" as views. This store holds
// the active view plus parameters (e.g. selected complaint id). Role-gating
// is enforced in the page shell before rendering a protected view, per
// FRONTEND.md Rule 7.
// ---------------------------------------------------------------------------

export type View =
  | "landing"
  | "login"
  | "register"
  | "complaint_new"
  | "complaint_list"
  | "complaint_detail"
  | "complaint_submitted"
  | "officer_queue"
  | "officer_detail"
  | "admin_departments"
  | "admin_analytics"
  | "admin_users";

type NavState = {
  view: View;
  selectedComplaintId: string | null;
  lastSubmittedId: string | null;
  navigate: (view: View, params?: { complaintId?: string; submittedId?: string }) => void;
  goHome: (role: Role | null) => void;
};

function defaultHome(role: Role | null): View {
  if (role === "officer") return "officer_queue";
  if (role === "admin") return "admin_analytics";
  if (role === "citizen") return "complaint_list";
  return "landing";
}

export const useNav = create<NavState>((set, get) => ({
  view: "landing",
  selectedComplaintId: null,
  lastSubmittedId: null,
  navigate: (view, params) =>
    set({
      view,
      selectedComplaintId: params?.complaintId ?? get().selectedComplaintId,
      lastSubmittedId: params?.submittedId ?? get().lastSubmittedId,
    }),
  goHome: (role) =>
    set({
      view: defaultHome(role),
      selectedComplaintId: null,
      lastSubmittedId: null,
    }),
}));
