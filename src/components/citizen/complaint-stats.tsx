"use client";

import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  Gauge,
  BarChart3,
  PieChart as PieChartIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslations } from "@/lib/i18n";
import { statusOrder } from "@/lib/format";
import type { Complaint, ComplaintStatus, Locale } from "@/lib/types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// ComplaintStats — default export
//
// A personal statistics dashboard rendered at the top of the citizen's
// complaint list. Receives the already-fetched complaints array (no separate
// query) and renders:
//   1. Four KPI cards (total, active, resolved, avg response time)
//   2. Two small charts side-by-side: status breakdown donut + 6-month
//      filing activity bar chart.
//
// Returns null when there are no complaints — the list's own empty state
// takes over in that case.
// ---------------------------------------------------------------------------

// Civic emerald/amber/teal palette — no indigo/blue. `in_progress` uses teal
// (per task spec) instead of the sky-500 used in format.ts statusConfig so
// the chart slices stay safely outside the no-blue rule. Mirrors the palette
// used in admin/analytics.tsx for visual consistency.
const STATUS_COLORS: Record<ComplaintStatus, string> = {
  submitted: "#64748b", // slate
  under_review: "#d97706", // amber
  in_progress: "#0d9488", // teal
  resolved: "#059669", // emerald
  rejected: "#e11d48", // rose
  reopened: "#ea580c", // orange
};

// Statuses that count as "active" / in-progress from the citizen's POV.
const ACTIVE_STATUSES: ReadonlySet<ComplaintStatus> = new Set([
  "submitted",
  "under_review",
  "in_progress",
]);

const CHART_HEIGHT = 180;

// Shared recharts Tooltip styling — subtle, on-palette. Mirrors admin
// analytics for consistency.
const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

type TFunc = ReturnType<typeof useTranslations>["t"];

type ComplaintStatsProps = {
  complaints: Complaint[];
};

export default function ComplaintStats({ complaints }: ComplaintStatsProps) {
  const { t, locale } = useTranslations();

  // Empty state — let the list's own empty state show.
  if (complaints.length === 0) return null;

  return (
    <section
      aria-label={t("complaint.statsTitle")}
      className="space-y-4"
    >
      {/* Section header */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("complaint.statsTitle")}
        </h2>
      </div>

      {/* KPI cards */}
      <KpiRow complaints={complaints} t={t} />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusBreakdownCard complaints={complaints} t={t} />
        <FilingActivityCard complaints={complaints} t={t} locale={locale} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// KPI row — four cards in a responsive grid (2 cols on mobile, 4 on desktop).
// ---------------------------------------------------------------------------

function KpiRow({
  complaints,
  t,
}: {
  complaints: Complaint[];
  t: TFunc;
}) {
  const stats = useMemo(() => {
    const total = complaints.length;
    let active = 0;
    let resolved = 0;
    let responseDaysSum = 0;
    for (const c of complaints) {
      if (ACTIVE_STATUSES.has(c.status)) active += 1;
      if (c.status === "resolved") {
        resolved += 1;
        const submitted = new Date(c.submitted_at).getTime();
        const updated = new Date(c.updated_at).getTime();
        const days = Math.max(0, (updated - submitted) / 86_400_000);
        responseDaysSum += days;
      }
    }
    const avgResponseDays =
      resolved > 0 ? Math.round(responseDaysSum / resolved) : null;
    return { total, active, resolved, avgResponseDays };
  }, [complaints]);

  const cards: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    tone: KpiTone;
  }> = [
    {
      icon: FileText,
      label: t("complaint.statsTotal"),
      value: String(stats.total),
      tone: "default",
    },
    {
      icon: Clock,
      label: t("complaint.statsInProgress"),
      value: String(stats.active),
      tone: "active",
    },
    {
      icon: CheckCircle2,
      label: t("complaint.statsResolved"),
      value: String(stats.resolved),
      tone: "resolved",
    },
    {
      icon: Gauge,
      label: t("complaint.statsAvgResponse"),
      value:
        stats.avgResponseDays === null
          ? "—"
          : t("complaint.statsDays", { n: stats.avgResponseDays }),
      tone: "sla",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c, i) => (
        <KpiCard key={c.label} {...c} index={i} />
      ))}
    </div>
  );
}

type KpiTone = "default" | "active" | "resolved" | "sla";

const TONE_CARD: Record<KpiTone, string> = {
  default: "border-border bg-card",
  active: "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20",
  resolved:
    "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
  sla: "border-primary/30 bg-primary/5",
};

const TONE_ICON: Record<KpiTone, string> = {
  default: "bg-primary/10 text-primary",
  active: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  sla: "bg-primary/15 text-primary",
};

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: KpiTone;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.2), ease: "easeOut" }}
    >
      <Card className={cn("h-full py-4", TONE_CARD[tone])}>
        <CardContent className="space-y-3">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              TONE_ICON[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none tabular-nums text-foreground">
              {value}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Status breakdown — small donut chart. Only statuses with count > 0 are
// rendered as slices; the legend mirrors the same set in canonical order.
// ---------------------------------------------------------------------------

function StatusBreakdownCard({
  complaints,
  t,
}: {
  complaints: Complaint[];
  t: TFunc;
}) {
  const data = useMemo(() => {
    const counts = new Map<ComplaintStatus, number>();
    for (const c of complaints) {
      counts.set(c.status, (counts.get(c.status) ?? 0) + 1);
    }
    return statusOrder
      .filter((s) => (counts.get(s) ?? 0) > 0)
      .map((s) => ({ status: s, count: counts.get(s) ?? 0 }));
  }, [complaints]);

  return (
    <Card className="py-5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <PieChartIcon className="size-4 text-primary" aria-hidden />
          {t("complaint.statsStatusBreakdown")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-12 text-center text-xs text-muted-foreground">
            {t("complaint.statsNoData")}
          </p>
        ) : (
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={68}
                  paddingAngle={2}
                  stroke="var(--background)"
                  strokeWidth={2}
                >
                  {data.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  formatter={(value: number, name: string) => [
                    value,
                    t(`status.${name}`),
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => t(`status.${value}`)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Filing activity — bar chart of complaints filed per month, last 6 months.
// Uses the civic primary colour (emerald) for bars to match the brand.
// ---------------------------------------------------------------------------

function FilingActivityCard({
  complaints,
  t,
  locale,
}: {
  complaints: Complaint[];
  t: TFunc;
  locale: Locale;
}) {
  const data = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString(locale, { month: "short" });
      months.push({ key, label, count: 0 });
    }
    for (const c of complaints) {
      const d = new Date(c.submitted_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const m = months.find((x) => x.key === key);
      if (m) m.count += 1;
    }
    return months;
  }, [complaints, locale]);

  const hasFilings = data.some((m) => m.count > 0);

  return (
    <Card className="py-5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <BarChart3 className="size-4 text-primary" aria-hidden />
          {t("complaint.statsFilingActivity")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasFilings ? (
          <p className="py-12 text-center text-xs text-muted-foreground">
            {t("complaint.statsNoData")}
          </p>
        ) : (
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
              >
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  width={32}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  formatter={(value: number) => [value, t("complaint.statsTotal")]}
                />
                <Bar
                  dataKey="count"
                  fill="var(--color-primary)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
