"use client";

import { ShieldCheck } from "lucide-react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useTranslations } from "@/lib/i18n";
import { useNav, type View } from "@/lib/nav";

import AdminDepartments from "./departments";
import AdminAnalytics from "./analytics";
import AdminUsers from "./users";

// ---------------------------------------------------------------------------
// AdminShell — default export
//
// The admin module has three sub-views (Departments / Analytics / Users). The
// sandbox only exposes the `/` route, so the admin "tabs" are modelled as
// in-app views driven by the nav store. This shell renders the page header +
// a controlled shadcn `<Tabs>` whose value tracks the current store view;
// changing tabs calls `navigate(view)`, and the active child renders below.
// ---------------------------------------------------------------------------

const ADMIN_TABS: { view: View; labelKey: string }[] = [
  { view: "admin_departments", labelKey: "admin.tabsDepartments" },
  { view: "admin_analytics", labelKey: "admin.tabsAnalytics" },
  { view: "admin_users", labelKey: "admin.tabsUsers" },
];

export default function AdminShell() {
  const { t } = useTranslations();
  const view = useNav((s) => s.view);
  const navigate = useNav((s) => s.navigate);

  // Defensive: if somehow rendered outside an admin view, fall back to the
  // analytics tab (the spec's default admin landing view).
  const activeTab = ADMIN_TABS.some((tab) => tab.view === view)
    ? view
    : "admin_analytics";

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6">
      {/* Page header ------------------------------------------------------- */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-4" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t("nav.adminConsole")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("admin.departmentsSubtitle")}
        </p>
      </header>

      {/* Tabs -------------------------------------------------------------- */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => navigate(v as View)}
        className="w-full"
      >
        <TabsList className="w-full max-w-md">
          {ADMIN_TABS.map((tab) => (
            <TabsTrigger key={tab.view} value={tab.view} className="flex-1">
              {t(tab.labelKey)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Active child view ------------------------------------------------- */}
      <div className="pt-2">
        {activeTab === "admin_departments" ? (
          <AdminDepartments />
        ) : activeTab === "admin_analytics" ? (
          <AdminAnalytics />
        ) : (
          <AdminUsers />
        )}
      </div>
    </section>
  );
}
