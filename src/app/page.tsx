"use client";

import { useEffect } from "react";
import { useNav } from "@/lib/nav";
import { useAuthStore } from "@/lib/auth";
import { useTranslations } from "@/lib/i18n";
import { Header } from "@/components/shared/header";
import { Footer } from "@/components/shared/footer";
import { LandingPage } from "@/components/auth/landing";
import { LoginForm, RegisterForm } from "@/components/auth/auth-forms";
import { LoadingState } from "@/components/shared/states";
import ComplaintForm from "@/components/citizen/complaint-form";
import ComplaintList from "@/components/citizen/complaint-list";
import ComplaintDetail from "@/components/citizen/complaint-detail";
import SubmittedConfirmation from "@/components/citizen/submitted-confirmation";
import OfficerQueue from "@/components/officer/queue-table";
import OfficerDetail from "@/components/officer/officer-detail";
import AdminShell from "@/components/admin/admin-shell";
import { toast } from "sonner";

export default function Home() {
  const { t } = useTranslations();
  const view = useNav((s) => s.view);
  const selectedComplaintId = useNav((s) => s.selectedComplaintId);
  const navigate = useNav((s) => s.navigate);
  const goHome = useNav((s) => s.goHome);
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  // Role-gating + missing-context redirects (FRONTEND.md Rule 7).
  useEffect(() => {
    if (!initialized) return;

    const publicViews = ["landing", "login", "register"];
    if (!user && !publicViews.includes(view)) {
      toast.error(t("errors.authRequired"));
      navigate("login");
      return;
    }

    if (user && (view === "login" || view === "register" || view === "landing")) {
      goHome(user.role);
      return;
    }

    if (user) {
      const citizenViews = ["complaint_new", "complaint_list", "complaint_detail", "complaint_submitted"];
      const officerViews = ["officer_queue", "officer_detail"];
      const adminViews = ["admin_departments", "admin_analytics", "admin_users"];

      if (user.role === "citizen" && (officerViews.includes(view) || adminViews.includes(view))) {
        toast.error(t("errors.forbiddenRedirect"));
        goHome(user.role);
        return;
      }
      if (user.role === "officer" && (citizenViews.includes(view) || adminViews.includes(view))) {
        toast.error(t("errors.forbiddenRedirect"));
        goHome(user.role);
        return;
      }
      if (user.role === "admin" && (citizenViews.includes(view) || officerViews.includes(view))) {
        toast.error(t("errors.forbiddenRedirect"));
        goHome(user.role);
        return;
      }
    }

    // Detail views require a selected complaint id; fall back to the list/queue.
    if (view === "complaint_detail" && !selectedComplaintId) {
      navigate("complaint_list");
      return;
    }
    if (view === "officer_detail" && !selectedComplaintId) {
      navigate("officer_queue");
      return;
    }
  }, [user, view, initialized, selectedComplaintId, navigate, goHome, t]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <LoadingState />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex flex-1 flex-col">{renderView(view, selectedComplaintId)}</main>
      <Footer />
    </div>
  );
}

function renderView(view: string, complaintId: string | null) {
  switch (view) {
    case "landing":
      return <LandingPage />;
    case "login":
      return (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <LoginForm />
          </div>
        </div>
      );
    case "register":
      return (
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <div className="w-full max-w-md">
            <RegisterForm />
          </div>
        </div>
      );
    // Citizen portal
    case "complaint_new":
      return (
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
          <ComplaintForm />
        </div>
      );
    case "complaint_list":
      return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <ComplaintList />
        </div>
      );
    case "complaint_detail":
      return complaintId ? (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <ComplaintDetail complaintId={complaintId} />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <LoadingState />
        </div>
      );
    case "complaint_submitted":
      return (
        <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
          <SubmittedConfirmation />
        </div>
      );
    // Officer dashboard
    case "officer_queue":
      return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <OfficerQueue />
        </div>
      );
    case "officer_detail":
      return complaintId ? (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
          <OfficerDetail complaintId={complaintId} />
        </div>
      ) : (
        <div className="mx-auto w-full max-w-6xl px-4 py-8">
          <LoadingState />
        </div>
      );
    // Admin module
    case "admin_departments":
    case "admin_analytics":
    case "admin_users":
      return (
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <AdminShell />
        </div>
      );
    default:
      return <LandingPage />;
  }
}
