"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText,
  Clock,
  CheckCircle2,
  Gauge,
  TrendingUp,
  Activity,
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

import { useTranslations } from "@/lib/i18n";
import { adminApi } from "@/lib/api";
import type {
  AnalyticsSummary,
  ComplaintStatus,
  Priority,
} from "@/lib/types";
import { ErrorState } from "@/components/shared/states";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// AdminAnalytics — default export
//
// Renders the platform-wide analytics dashboard: KPI cards + four recharts
// visualisations (trend line, status pie, department horizontal bar, priority
// bar). Every chart has a sibling text-equivalent `<Table>` for screen-reader
// users per FRONTEND.md §9.
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

export default function AdminAnalytics() {
  const { t, locale } = useTranslations();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["admin", "analytics"],
    queryFn: async () => {
      const { data, error } = await adminApi.analytics();
      if (error || !data) throw error ?? new Error("Failed to load");
      return data;
    },
    refetchInterval: 30000,
  });

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

  return (
    <div className="space-y-5">
      {/* Header ------------------------------------------------------------- */}
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("admin.analyticsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("admin.analyticsSubtitle")}</p>
      </div>

      {/* KPI cards ---------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={FileText}
          label={t("admin.totalComplaints")}
          value={data.total_complaints}
          tone="default"
        />
        <KpiCard
          icon={Clock}
          label={t("admin.openComplaints")}
          value={data.open_complaints}
          tone="open"
        />
        <KpiCard
          icon={CheckCircle2}
          label={t("admin.resolvedComplaints")}
          value={data.resolved_complaints}
          tone="resolved"
        />
        <KpiCard
          icon={Gauge}
          label={t("admin.avgResolution")}
          value={data.avg_resolution_days}
          suffix=""
          tone="sla"
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
            <span>
              {Math.round(data.sla_compliance_pct)}%
            </span>
            <span className="text-xs text-muted-foreground">
              {t("admin.slaCompliance")}
            </span>
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
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  fontSize: 12,
                }}
                labelFormatter={(d: string) =>
                  new Date(d).toLocaleDateString(locale, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })
                }
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
        <TrendTable data={data.trend} locale={locale} t={t} />
      </ChartCard>

      {/* Status + Priority row --------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title={t("admin.byStatus")} description={t("admin.analyticsSubtitle")}>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.by_status}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {data.by_status.map((entry) => (
                    <Cell
                      key={entry.status}
                      fill={STATUS_COLORS[entry.status]}
                      stroke="var(--background)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [
                    value,
                    t(`status.${name}`),
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value: string) => t(`status.${value}`)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <StatusTable data={data.by_status} t={t} />
        </ChartCard>

        <ChartCard title={t("admin.byPriority")} description={t("admin.analyticsSubtitle")}>
          <div style={{ height: CHART_HEIGHT }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.by_priority} margin={{ top: 8, right: 12, bottom: 4, left: -12 }}>
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
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--background)",
                    fontSize: 12,
                  }}
                  formatter={(value: number, name: string) => [value, t(`priority.${name}`)]}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data.by_priority.map((entry) => (
                    <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <PriorityTable data={data.by_priority} t={t} />
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
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--background)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="resolved" name={t("admin.resolved")} fill={TREND_RESOLVED} radius={[0, 4, 4, 0]} stackId="a" />
              <Bar dataKey="open" name={t("admin.openComplaints")} fill={TREND_FILED} radius={[0, 4, 4, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <DepartmentTable data={data.by_department} t={t} />
      </ChartCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// KPI card
// ---------------------------------------------------------------------------
type KpiTone = "default" | "open" | "resolved" | "sla";

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  suffix?: string;
  tone: KpiTone;
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
    <Card className={cn("py-4", toneClasses[tone])}>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("flex size-8 items-center justify-center rounded-lg", iconClasses[tone])}>
            <Icon className="size-4" aria-hidden />
          </span>
          <Activity className="size-3.5 text-muted-foreground/40" aria-hidden />
        </div>
        <p className="text-2xl font-semibold leading-none tabular-nums text-foreground">
          {value}
          {suffix ? <span className="ml-0.5 text-sm font-normal text-muted-foreground">{suffix}</span> : null}
        </p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
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
    <Card className="py-5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Accessible text-equivalent tables
// ---------------------------------------------------------------------------
type TFunc = ReturnType<typeof useTranslations>["t"];
type Locale = ReturnType<typeof useTranslations>["locale"];

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
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="py-4">
            <CardContent className="space-y-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-7 w-16" />
              <Skeleton className="h-3 w-24" />
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
