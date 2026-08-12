"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
  FileText,
  Clock,
  CheckCircle2,
  Gauge,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import { useTranslations } from "@/lib/i18n";
import { adminApi } from "@/lib/api";
import { statusOrder, priorityOrder } from "@/lib/format";
import type {
  AnalyticsSummary,
  ComplaintStatus,
  Priority,
  Locale,
} from "@/lib/types";
import { ErrorState } from "@/components/shared/states";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// AdminAnalytics — default export
//
// Renders the platform-wide analytics dashboard: KPI cards (with sparklines
// and 7-day trend badges), SLA compliance bar, and four recharts
// visualisations (trend line, status horizontal bar, priority bar, dept
// stacked bar). Each chart has a sibling text-equivalent `<Table>` wrapped
// in a shadcn Collapsible (default closed) for screen-reader parity per
// FRONTEND.md §9 — the sr-only `<TableCaption>` is always present so AT
// users still get the chart summary even when the table is collapsed.
// ---------------------------------------------------------------------------

// Hardcoded status / priority palette — civic emerald/amber palette, no
// indigo/blue brand colours. `in_progress` uses teal (not sky) to stay safely
// outside the no-blue rule for charts.
const STATUS_COLORS: Record<ComplaintStatus, string> = {
  submitted: "#64748b", // slate
  under_review: "#d97706", // amber
  in_progress: "#0d9488", // teal
  resolved: "#059669", // emerald
  rejected: "#e11d48", // rose
  reopened: "#ea580c", // orange
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#64748b", // slate
  medium: "#0d9488", // teal
  high: "#d97706", // amber
  urgent: "#e11d48", // rose
};

const TREND_FILED = "#d97706"; // amber
const TREND_RESOLVED = "#059669"; // emerald

const CHART_HEIGHT = 280;
const SPARK_HEIGHT = 40;

// Shared recharts Tooltip styling — subtle, on-palette, no shadows.
const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--background)",
  color: "var(--foreground)",
  fontSize: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

type TrendPoint = AnalyticsSummary["trend"][number];

type TrendDirection = "up" | "down" | "flat";
type TrendInfo = { pct: number; favorable: boolean; direction: TrendDirection } | null;

// Compute the % change of a metric comparing the last 7 days vs the
// previous 7 days from the 14-day trend. Returns null when there's no
// prior data to compare against (prev7 === 0). `favorable` is determined
// by the caller-supplied direction ("up" or "down") that counts as good.
function computeTrendPct(
  trend: AnalyticsSummary["trend"],
  accessor: (d: TrendPoint) => number,
  favorableDirection: "up" | "down",
): TrendInfo {
  if (trend.length < 14) return null;
  const last7 = trend.slice(-7).reduce((s, d) => s + accessor(d), 0);
  const prev7 = trend.slice(-14, -7).reduce((s, d) => s + accessor(d), 0);
  if (prev7 === 0) return null;
  const pct = ((last7 - prev7) / Math.abs(prev7)) * 100;
  const direction: TrendDirection =
    pct > 0.5 ? "up" : pct < -0.5 ? "down" : "flat";
  const favorable =
    direction === "flat" ? true : direction === favorableDirection;
  return { pct, direction, favorable };
}

// Build the cumulative open backlog sparkline (filed − resolved per day,
// accumulated and clamped at 0 so it never implies negative complaints).
function buildOpenSparkline(trend: AnalyticsSummary["trend"]): number[] {
  let cumulative = 0;
  const out: number[] = [];
  for (const d of trend) {
    cumulative += d.filed - d.resolved;
    if (cumulative < 0) cumulative = 0;
    out.push(cumulative);
  }
  return out;
}

// Type alias for the translate function so helpers can use it without
// importing the hook.
type TFunc = ReturnType<typeof useTranslations>["t"];

// Format "X min ago" relative to a caller-supplied `now` (so the component
// can re-evaluate the relative time on a 60s tick). Mirrors the logic in
// lib/format.ts formatRelative but accepts an explicit now.
function relativeAgo(
  then: number,
  now: number,
  locale: Locale,
  t: TFunc,
): string {
  const diff = Math.max(0, now - then);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return locale === "en" ? "just now" : t("common.justNow");
  if (minutes < 60) return t("common.minutesAgo", { n: minutes });
  if (hours < 24) return t("common.hoursAgo", { n: hours });
  if (days < 30) return t("common.daysAgo", { n: days });
  return new Date(then).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminAnalytics() {
  const { t, locale } = useTranslations();

  const { data, isLoading, isError, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await adminApi.analytics();
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
    refetchInterval: 30000,
  });

  // Tick "now" every 60s so the "Updated X min ago" label stays accurate
  // without waiting for the next 30s poll to re-render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  // Memoise derived chart data — sort by canonical order so the chart
  // and the table show the EXACT same set of categories in the same
  // order (fixes the "Reopened in table but not chart" inconsistency).
  const { statusData, priorityData, trendFiledSpark, trendResolvedSpark, trendOpenSpark, trendAvgSpark } =
    useMemo(() => {
      const statusData = (data?.by_status ?? [])
        .slice()
        .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
      const priorityData = (data?.by_priority ?? [])
        .slice()
        .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));
      const trend = data?.trend ?? [];
      return {
        statusData,
        priorityData,
        trendFiledSpark: trend.map((d) => d.filed),
        trendResolvedSpark: trend.map((d) => d.resolved),
        trendOpenSpark: buildOpenSparkline(trend),
        trendAvgSpark: data ? trend.map(() => data.avg_resolution_days) : [],
      };
    }, [data]);

  // KPI trend computations.
  // - Total: filed volume, fewer filed = favorable (less workload).
  // - Open: cumulative open backlog delta, down = favorable.
  // - Resolved: resolved volume, up = favorable.
  // - Avg resolution: no per-day trend available → null badge.
  const totalTrend: TrendInfo = data
    ? computeTrendPct(data.trend, (d) => d.filed, "down")
    : null;
  const resolvedTrend: TrendInfo = data
    ? computeTrendPct(data.trend, (d) => d.resolved, "up")
    : null;
  // Open backlog trend: derive from the cumulative-open sparkline (not raw
  // filed/resolved). Treat "down" as favorable (shrinking backlog).
  const openTrend: TrendInfo = data
    ? computeTrendPct(
        buildOpenSparkline(data.trend).map((v, i) => ({
          date: data.trend[i]?.date ?? "",
          filed: v,
          resolved: 0,
        })),
        (d) => d.filed,
        "down",
      )
    : null;

  if (isLoading) return <AnalyticsSkeleton />;
  if (isError) {
    return (
      <ErrorState
        message={(error as Error)?.message ?? t("errors.generic")}
        onRetry={() => void refetch()}
      />
    );
  }
  if (!data) return null;

  // Compute the "Updated X ago" label from `now` so the 60s tick re-renders
  // the relative time even when the 30s poll hasn't landed new data.
  const lastUpdatedLabel = dataUpdatedAt
    ? t("admin.lastUpdated", {
        time: relativeAgo(new Date(dataUpdatedAt).getTime(), now, locale, t),
      })
    : null;

  return (
    <div className="space-y-5">
      {/* Header ------------------------------------------------------------- */}
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            {t("admin.analyticsTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("admin.analyticsSubtitle")}</p>
        </div>
        {lastUpdatedLabel ? (
          <span
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            aria-live="polite"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            <time dateTime={new Date(dataUpdatedAt).toISOString()}>{lastUpdatedLabel}</time>
          </span>
        ) : null}
      </div>

      {/* KPI cards ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={FileText}
          label={t("admin.totalComplaints")}
          value={data.total_complaints}
          tone="default"
          sparkData={trendFiledSpark}
          sparkColor={TREND_FILED}
          trend={totalTrend}
          t={t}
          index={0}
        />
        <KpiCard
          icon={Clock}
          label={t("admin.openComplaints")}
          value={data.open_complaints}
          tone="open"
          sparkData={trendOpenSpark}
          sparkColor={TREND_FILED}
          trend={openTrend}
          t={t}
          index={1}
        />
        <KpiCard
          icon={CheckCircle2}
          label={t("admin.resolvedComplaints")}
          value={data.resolved_complaints}
          tone="resolved"
          sparkData={trendResolvedSpark}
          sparkColor={TREND_RESOLVED}
          trend={resolvedTrend}
          t={t}
          index={2}
        />
        <KpiCard
          icon={Gauge}
          label={t("admin.avgResolution")}
          value={data.avg_resolution_days}
          tone="sla"
          sparkData={trendAvgSpark}
          sparkColor="#0d9488"
          trend={null}
          t={t}
          index={3}
        />
      </div>

      {/* SLA compliance bar ------------------------------------------------- */}
      <Card className="py-5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4 text-primary" aria-hidden />
            {t("admin.slaCompliance")}
          </CardTitle>
          <CardDescription className="flex items-baseline justify-between gap-2">
            <span>{Math.round(data.sla_compliance_pct)}%</span>
            <span className="text-xs text-muted-foreground">{t("admin.slaCompliance")}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress
            value={data.sla_compliance_pct}
            aria-label={`${t("admin.slaCompliance")}: ${Math.round(data.sla_compliance_pct)}%`}
          />
        </CardContent>
      </Card>

      {/* Trend chart -------------------------------------------------------- */}
      <ChartCard title={t("admin.trend")} description={t("admin.analyticsSubtitle")}>
        <div style={{ height: CHART_HEIGHT }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.trend} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) =>
                  new Date(d).toLocaleDateString(locale, { month: "short", day: "numeric" })
                }
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                labelFormatter={(d: string) =>
                  new Date(d).toLocaleDateString(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                }
                formatter={(value: number, name: string) => [value, name === "filed" ? t("admin.filed") : t("admin.resolved")]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="filed"
                name={t("admin.filed")}
                stroke={TREND_FILED}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                name={t("admin.resolved")}
                stroke={TREND_RESOLVED}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <CollapsibleTable
          showLabel={t("admin.showTable")}
          hideLabel={t("admin.hideTable")}
        >
          <TrendTable data={data.trend} locale={locale} t={t} />
        </CollapsibleTable>
      </ChartCard>

      {/* Status + Priority row --------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={t("admin.byStatus")} description={t("admin.analyticsSubtitle")}>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusData}
                layout="vertical"
                margin={{ top: 4, right: 28, bottom: 4, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <YAxis
                  type="category"
                  dataKey="status"
                  width={120}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                  tickFormatter={(s: string) => t(`status.${s}`)}
                />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelFormatter={(label: string) => t(`status.${label}`)}
                  formatter={(value: number) => [value, t("common.all")]}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    style={{ fontSize: 11, fill: "var(--foreground)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <CollapsibleTable
            showLabel={t("admin.showTable")}
            hideLabel={t("admin.hideTable")}
          >
            <StatusTable data={statusData} t={t} />
          </CollapsibleTable>
        </ChartCard>

        <ChartCard title={t("admin.byPriority")} description={t("admin.analyticsSubtitle")}>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData} margin={{ top: 8, right: 28, bottom: 4, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="priority"
                  tickFormatter={(p: string) => t(`priority.${p}`)}
                  tick={{ fontSize: 11 }}
                  stroke="currentColor"
                  className="text-muted-foreground"
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelFormatter={(label: string) => t(`priority.${label}`)}
                  formatter={(value: number) => [value, t("common.all")]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {priorityData.map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority]} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{ fontSize: 11, fill: "var(--foreground)" }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <CollapsibleTable
            showLabel={t("admin.showTable")}
            hideLabel={t("admin.hideTable")}
          >
            <PriorityTable data={priorityData} t={t} />
          </CollapsibleTable>
        </ChartCard>
      </div>

      {/* By department ------------------------------------------------------ */}
      <ChartCard title={t("admin.byDepartment")} description={t("admin.analyticsSubtitle")}>
        <div style={{ height: Math.max(CHART_HEIGHT, data.by_department.length * 48) }} className="w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data.by_department}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 4, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} stroke="currentColor" className="text-muted-foreground" />
              <YAxis
                type="category"
                dataKey="department_name"
                width={140}
                tick={{ fontSize: 11 }}
                stroke="currentColor"
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP_STYLE}
                formatter={(value: number, name: string) => [
                  value,
                  name === "resolved" ? t("admin.resolved") : t("admin.openComplaints"),
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                formatter={(value: string) =>
                  value === "resolved" ? t("admin.resolved") : t("admin.openComplaints")
                }
              />
              <Bar dataKey="resolved" name={t("admin.resolved")} fill={TREND_RESOLVED} radius={[0, 4, 4, 0]} stackId="a" />
              <Bar dataKey="open" name={t("admin.openComplaints")} fill={TREND_FILED} radius={[0, 4, 4, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <CollapsibleTable
          showLabel={t("admin.showTable")}
          hideLabel={t("admin.hideTable")}
        >
          <DepartmentTable data={data.by_department} t={t} />
        </CollapsibleTable>
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI card — icon top-left, big number, label, then a row with sparkline on
// the left and a trend badge on the right.
// ---------------------------------------------------------------------------
type KpiTone = "default" | "open" | "resolved" | "sla";

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
  sparkData,
  sparkColor,
  trend,
  t,
  index,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  tone: KpiTone;
  sparkData: number[];
  sparkColor: string;
  trend: TrendInfo;
  t: ReturnType<typeof useTranslations>["t"];
  index: number;
}) {
  const toneClasses: Record<KpiTone, string> = {
    default: "border-border bg-card",
    open: "border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20",
    resolved: "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20",
    sla: "border-primary/30 bg-primary/5",
  };
  const iconClasses: Record<KpiTone, string> = {
    default: "bg-primary/10 text-primary",
    open: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    resolved: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    sla: "bg-primary/15 text-primary",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.25), ease: "easeOut" }}
    >
      <Card className={cn("h-full py-4", toneClasses[tone])}>
        <CardContent className="space-y-3">
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-lg",
              iconClasses[tone],
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-semibold leading-none tabular-nums text-foreground">
              {value}
              {suffix ? (
                <span className="ml-0.5 text-sm font-normal text-muted-foreground">{suffix}</span>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{label}</p>
          </div>
          <div className="flex items-end justify-between gap-2">
            {sparkData.length > 0 ? (
              <Sparkline data={sparkData} color={sparkColor} />
            ) : (
              <span className="h-10" aria-hidden />
            )}
            <TrendBadge trend={trend} t={t} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Mini line chart — no axes, no grid, no tooltip. Pure trend shape.
// ---------------------------------------------------------------------------
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const chartData = data.map((v, i) => ({ i, v }));
  return (
    <div
      style={{ height: SPARK_HEIGHT, width: 80 }}
      role="img"
      aria-label="14-day trend"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend badge — pill showing % change vs last week. Green when favorable,
// amber when unfavorable. Direction icon reflects the actual change.
// ---------------------------------------------------------------------------
function TrendBadge({
  trend,
  t,
}: {
  trend: TrendInfo;
  t: ReturnType<typeof useTranslations>["t"];
}) {
  if (!trend) {
    return (
      <Badge
        variant="outline"
        className="border-border bg-muted/40 text-muted-foreground"
      >
        <span className="tabular-nums">{t("admin.noTrend")}</span>
      </Badge>
    );
  }
  const DirectionIcon = trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : null;
  const toneClass = trend.favorable
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300";
  const pctLabel = trend.direction === "up" ? t("admin.trendUp", { pct: Math.round(Math.abs(trend.pct)) }) : t("admin.trendDown", { pct: Math.round(Math.abs(trend.pct)) });
  return (
    <Badge variant="outline" className={cn("gap-0.5 px-1.5", toneClass)} title={t("admin.vsLastWeek")}>
      {DirectionIcon ? <DirectionIcon className="size-3" aria-hidden /> : null}
      <span className="tabular-nums">{pctLabel}</span>
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// ChartCard wrapper
// ---------------------------------------------------------------------------
function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="h-full py-5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Collapsible wrapper for a chart's sibling text table. Defaults to closed.
// The table's sr-only <TableCaption> stays present in the DOM for screen
// readers even when collapsed — only the visible rows toggle.
// ---------------------------------------------------------------------------
function CollapsibleTable({
  showLabel,
  hideLabel,
  children,
}: {
  showLabel: string;
  hideLabel: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          aria-expanded={open}
        >
          {open ? (
            <ChevronUp className="size-3.5" aria-hidden />
          ) : (
            <ChevronDown className="size-3.5" aria-hidden />
          )}
          {open ? hideLabel : showLabel}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Accessible text-equivalent tables
// ---------------------------------------------------------------------------
function TrendTable({
  data,
  locale,
  t,
}: {
  data: AnalyticsSummary["trend"];
  locale: Locale;
  t: TFunc;
}) {
  // Show the most recent 7 days in the visible companion table; the rest are
  // still reachable via the chart tooltip. Keeps the page readable.
  const recent = data.slice(-7);
  return (
    <Table>
      <TableCaption className="sr-only">
        {t("admin.trend")} — {t("admin.filed")} / {t("admin.resolved")}
      </TableCaption>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="pl-3">{t("officer.colSubmitted")}</TableHead>
          <TableHead className="text-right">{t("admin.filed")}</TableHead>
          <TableHead className="pr-3 text-right">{t("admin.resolved")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recent.map((row) => (
          <TableRow key={row.date}>
            <TableCell className="pl-3 py-2 text-xs text-muted-foreground">
              <time dateTime={row.date}>
                {new Date(row.date).toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                })}
              </time>
            </TableCell>
            <TableCell className="py-2 text-right text-xs tabular-nums">{row.filed}</TableCell>
            <TableCell className="pr-3 py-2 text-right text-xs tabular-nums">{row.resolved}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function StatusTable({
  data,
  t,
}: {
  data: AnalyticsSummary["by_status"];
  t: TFunc;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">{t("admin.byStatus")}</TableCaption>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="pl-3">{t("officer.colStatus")}</TableHead>
          <TableHead className="pr-3 text-right">{t("common.all")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.status}>
            <TableCell className="pl-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[row.status] }}
                  aria-hidden
                />
                {t(`status.${row.status}`)}
              </span>
            </TableCell>
            <TableCell className="pr-3 py-2 text-right text-xs tabular-nums">{row.count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PriorityTable({
  data,
  t,
}: {
  data: AnalyticsSummary["by_priority"];
  t: TFunc;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">{t("admin.byPriority")}</TableCaption>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="pl-3">{t("officer.colPriority")}</TableHead>
          <TableHead className="pr-3 text-right">{t("common.all")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.priority}>
            <TableCell className="pl-3 py-2 text-xs">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: PRIORITY_COLORS[row.priority] }}
                  aria-hidden
                />
                {t(`priority.${row.priority}`)}
              </span>
            </TableCell>
            <TableCell className="pr-3 py-2 text-right text-xs tabular-nums">{row.count}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DepartmentTable({
  data,
  t,
}: {
  data: AnalyticsSummary["by_department"];
  t: TFunc;
}) {
  return (
    <Table>
      <TableCaption className="sr-only">{t("admin.byDepartment")}</TableCaption>
      <TableHeader>
        <TableRow className="bg-muted/40">
          <TableHead className="pl-3">{t("admin.colDepartment")}</TableHead>
          <TableHead className="text-right">{t("admin.openComplaints")}</TableHead>
          <TableHead className="text-right">{t("admin.resolvedComplaints")}</TableHead>
          <TableHead className="pr-3 text-right">{t("admin.slaCompliance")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.department_id}>
            <TableCell className="pl-3 py-2 text-xs font-medium text-foreground/80">
              {row.department_name}
            </TableCell>
            <TableCell className="py-2 text-right text-xs tabular-nums">{row.open}</TableCell>
            <TableCell className="py-2 text-right text-xs tabular-nums">{row.resolved}</TableCell>
            <TableCell className="pr-3 py-2 text-right text-xs tabular-nums">
              {Math.round(row.sla_compliance_pct)}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-2">
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="space-y-3">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="py-5">
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-2 w-full rounded-full" />
        </CardContent>
      </Card>
      <Card className="py-5">
        <CardContent>
          <Skeleton className="h-[280px] w-full rounded-lg" />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i} className="py-5">
            <CardContent>
              <Skeleton className="h-[280px] w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
