import type { ComplaintStatus, Priority, Locale } from "./types";
import { translate } from "./i18n";

// ---------------------------------------------------------------------------
// Formatting + presentational helpers shared across the app.
// ---------------------------------------------------------------------------

export function formatRelative(iso: string, locale: Locale): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  const t = (k: string, v?: Record<string, string | number>) => translate(locale, k, v);
  // Use a compact relative string; fall back to locale-aware date for older.
  if (minutes < 1) return locale === "en" ? "just now" : t("common.justNow");
  if (minutes < 60) return t("common.minutesAgo", { n: minutes });
  if (hours < 24) return t("common.hoursAgo", { n: hours });
  if (days < 30) return t("common.daysAgo", { n: days });
  return new Date(iso).toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Visual config per status — colors intentionally avoid indigo/blue.
export const statusConfig: Record<
  ComplaintStatus,
  { dot: string; badge: string; ring: string; label: string }
> = {
  submitted: {
    dot: "bg-slate-400",
    badge: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700",
    ring: "ring-slate-200 dark:ring-slate-700",
    label: "bg-slate-500",
  },
  under_review: {
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    ring: "ring-amber-200 dark:ring-amber-900",
    label: "bg-amber-500",
  },
  in_progress: {
    dot: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900",
    ring: "ring-sky-200 dark:ring-sky-900",
    label: "bg-sky-500",
  },
  resolved: {
    dot: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900",
    ring: "ring-emerald-200 dark:ring-emerald-900",
    label: "bg-emerald-500",
  },
  rejected: {
    dot: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
    ring: "ring-rose-200 dark:ring-rose-900",
    label: "bg-rose-500",
  },
  reopened: {
    dot: "bg-orange-500",
    badge: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900",
    ring: "ring-orange-200 dark:ring-orange-900",
    label: "bg-orange-500",
  },
};

export const priorityConfig: Record<Priority, { badge: string; dot: string; weight: number }> = {
  low: {
    badge: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    dot: "bg-slate-400",
    weight: 0,
  },
  medium: {
    badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900",
    dot: "bg-teal-500",
    weight: 1,
  },
  high: {
    badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
    dot: "bg-amber-500",
    weight: 2,
  },
  urgent: {
    badge: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900",
    dot: "bg-rose-500",
    weight: 3,
  },
};

export const statusOrder: ComplaintStatus[] = [
  "submitted",
  "under_review",
  "in_progress",
  "resolved",
  "rejected",
  "reopened",
];

export const priorityOrder: Priority[] = ["urgent", "high", "medium", "low"];

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
}
